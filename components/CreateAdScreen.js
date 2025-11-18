import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Modal,
    KeyboardAvoidingView,
    Keyboard,
    Platform,
    FlatList,
    Dimensions,
    TouchableWithoutFeedback,
    Pressable,
    Image,
} from 'react-native';
import AppText from './AppText';
import AppTextInput from './AppTextInput';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlanService } from '../lib/planService';
import { useUserPlanStore } from '../stores/userPlanStore';
import { validateMediaLimitsByPlan } from '../lib/validation/mediaLimits';
import { PropertyService } from '../lib/propertyService';
import { MediaServiceOptimized } from '../lib/mediaServiceOptimized';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { searchAddresses } from '../lib/geocodingService';
import MapaEscolherEndereco from './MapaEscolherEndereco';
import StandardHeader from './StandardHeader';
import { DeveloperService } from '../lib/developerService';

const { width } = Dimensions.get('window');

export default function CreateAdScreen({ navigation, route }) {
    console.log('Rendered CreateAdScreen');

    const { user } = useAuth();
    const insets = useSafeAreaInsets();

    // ✅ Zustand: User Plan Store
    const plan = useUserPlanStore(state => state.plan); // Objeto completo do plano (com max_images, max_videos)
    const canCreateAd = useUserPlanStore(state => state.canCreateAd);
    const createAdReason = useUserPlanStore(state => state.createAdReason);
    const currentAds = useUserPlanStore(state => state.currentAds);
    const maxAds = useUserPlanStore(state => state.maxAds);
    const planName = useUserPlanStore(state => state.plan?.display_name);
    const isPlanExpired = useUserPlanStore(state => state.isPlanExpired);
    const fetchUserPlanData = useUserPlanStore(state => state.fetchUserPlanData);
    const incrementAdCount = useUserPlanStore(state => state.incrementAdCount);
    const userPlanLoading = useUserPlanStore(state => state.loading);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [showMediaModal, setShowMediaModal] = useState(false);
    const [isImportingMedia, setIsImportingMedia] = useState(false);
    const [mediaFiles, setMediaFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showProgressModal, setShowProgressModal] = useState(false);
    // Modais de seleção
    const [showPropertyTypeModal, setShowPropertyTypeModal] = useState(false);
    const [showTransactionTypeModal, setShowTransactionTypeModal] = useState(false);
    const [showBedroomsModal, setShowBedroomsModal] = useState(false);
    const [showBathroomsModal, setShowBathroomsModal] = useState(false);
    const [showParkingModal, setShowParkingModal] = useState(false);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [showDeveloperModal, setShowDeveloperModal] = useState(false);

    // Estados para construtoras
    const [developers, setDevelopers] = useState([]);
    const [loadingDevelopers, setLoadingDevelopers] = useState(false);
    const [developerSearchQuery, setDeveloperSearchQuery] = useState('');
    const [selectedDeveloper, setSelectedDeveloper] = useState(null);

    // Estados para autocomplete de endereço
    const [addressQuery, setAddressQuery] = useState('');
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
    const [searchingAddress, setSearchingAddress] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [showMapPicker, setShowMapPicker] = useState(false);

    // Visibilidade do teclado para permitir dismiss com um toque
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

    // Controla se algum dropdown/sugestão está aberto para desabilitar o scroll do pai
    const anyDropdownOpen = (
        showAddressSuggestions ||
        showPropertyTypeModal ||
        showTransactionTypeModal ||
        showBedroomsModal ||
        showBathroomsModal ||
        showParkingModal ||
        showAddressModal ||
        showMapPicker ||
        showDeveloperModal
    );

    // Refs e utilitários para focos/scroll com teclado
    const scrollRef = useRef(null);
    const contentRef = useRef(null);
    const titleInputRef = useRef(null);
    const descriptionInputRef = useRef(null);
    const priceInputRef = useRef(null);
    const salePriceInputRef = useRef(null);
    const areaInputRef = useRef(null);

    const scrollToInput = (inputRef, extraOffset = 100) => {
        if (!inputRef?.current || !contentRef?.current || !scrollRef?.current) return;
        try {
            inputRef.current.measureLayout(
                contentRef.current,
                (x, y) => {
                    const yOffset = Math.max(0, y - extraOffset);
                    scrollRef.current.scrollTo({ y: yOffset, animated: true });
                },
                () => { }
            );
        } catch (e) { }
    };

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        salePrice: '',
        propertyType: '',
        transactionType: '',
        bedrooms: '',
        bathrooms: '',
        parkingSpaces: '',
        area: '',
        address: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: '',
        latitude: null,
        longitude: null,
        developer_id: null
    });

    // ❌ REMOVIDO: useEffect que chamava checkUserPermissions - substituído por loadUserPlan acima

    useEffect(() => {
        const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
        const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    // Atualizar dados sempre que a tela ganhar foco
    useFocusEffect(
        React.useCallback(() => {
            if (user?.id) {
                console.log('🔄 CreateAdScreen: Atualizando dados...');
                fetchUserPlanData(user.id);
            }
        }, [user?.id])
    );

    // ❌ REMOVIDO: eligibility e checkUserPermissions - agora usa Zustand

    useEffect(() => {
        const loadUserPlan = async () => {
            if (!user?.id) return;

            try {
                setLoading(true);
                await fetchUserPlanData(user.id);

                console.log('📋 CreateAdScreen - Permissões carregadas:', {
                    canCreate: canCreateAd,
                    currentAds,
                    maxAds,
                    planName,
                    reason: createAdReason
                });

                console.log('📸 CreateAdScreen - Limites de mídia:', {
                    maxImages: plan?.max_images,
                    maxVideos: plan?.max_videos,
                    planObject: plan
                });

                if (!canCreateAd) {
                    console.log('⚠️ CreateAdScreen - Usuário NÃO pode criar anúncio:', createAdReason);
                    setShowPlanModal(true);
                } else {
                    console.log('✅ CreateAdScreen - Usuário PODE criar anúncio');
                }
            } catch (error) {
                console.error('Erro ao verificar permissões:', error);
                Alert.alert('Erro', 'Não foi possível verificar suas permissões');
            } finally {
                setLoading(false);
            }
        };

        loadUserPlan();
    }, [user?.id]);

    // Carregar construtoras
    useEffect(() => {
        const loadDevelopers = async () => {
            try {
                setLoadingDevelopers(true);
                const data = await DeveloperService.getDevelopersWithCache();
                setDevelopers(data);
                console.log('✅ Construtoras carregadas:', data.length);
            } catch (error) {
                console.error('Erro ao carregar construtoras:', error);
            } finally {
                setLoadingDevelopers(false);
            }
        };

        loadDevelopers();
    }, []);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Função para buscar endereços com debounce
    const searchAddressWithDebounce = React.useRef(null);

    const handleAddressSearch = (query) => {
        setAddressQuery(query);

        if (query.length < 3) {
            setAddressSuggestions([]);
            setShowAddressSuggestions(false);
            return;
        }

        // Limpar timeout anterior
        if (searchAddressWithDebounce.current) {
            clearTimeout(searchAddressWithDebounce.current);
        }

        // Definir novo timeout para debounce
        searchAddressWithDebounce.current = setTimeout(async () => {
            try {
                setSearchingAddress(true);
                console.log('🔍 Buscando endereços para:', query);

                const suggestions = await searchAddresses(query, { limit: 5 });
                console.log('🔍 DEBUG - Sugestões retornadas:', suggestions);
                console.log('🔍 DEBUG - Primeira sugestão:', suggestions[0]);
                if (suggestions[0]) {
                    console.log('🔍 DEBUG - Coordinates da primeira:', suggestions[0].coordinates);
                }
                
                setAddressSuggestions(suggestions);
                setShowAddressSuggestions(suggestions.length > 0);

                console.log(`✅ ${suggestions.length} sugestões encontradas`);
            } catch (error) {
                console.error('❌ Erro na busca de endereços:', error);
                setAddressSuggestions([]);
                setShowAddressSuggestions(false);
            } finally {
                setSearchingAddress(false);
            }
        }, 500); // 500ms de debounce
    };

    // Função para selecionar um endereço da lista
    const handleAddressSelect = (selectedSuggestion) => {
        console.log('📍 Endereço selecionado:', selectedSuggestion);
        console.log('🔍 DEBUG - Estrutura completa:', JSON.stringify(selectedSuggestion, null, 2));
        console.log('🔍 DEBUG - Coordinates:', selectedSuggestion.coordinates);
        console.log('🔍 DEBUG - Latitude:', selectedSuggestion.coordinates?.latitude);
        console.log('🔍 DEBUG - Longitude:', selectedSuggestion.coordinates?.longitude);

        setSelectedAddress(selectedSuggestion);
        setAddressQuery(selectedSuggestion.formattedAddress);
        setShowAddressSuggestions(false);

        // Validar coordenadas antes de salvar
        const lat = selectedSuggestion.coordinates?.latitude;
        const lng = selectedSuggestion.coordinates?.longitude;
        
        console.log('🔍 DEBUG - Validação coordenadas:');
        console.log('🔍 DEBUG - Lat raw:', lat, 'Type:', typeof lat);
        console.log('🔍 DEBUG - Lng raw:', lng, 'Type:', typeof lng);
        
        // Verificar se as coordenadas são válidas
        const isValidLat = lat !== null && lat !== undefined && !isNaN(parseFloat(lat));
        const isValidLng = lng !== null && lng !== undefined && !isNaN(parseFloat(lng));
        
        console.log('🔍 DEBUG - Is valid lat:', isValidLat);
        console.log('🔍 DEBUG - Is valid lng:', isValidLng);
        
        if (!isValidLat || !isValidLng) {
            console.error('❌ ERRO: Coordenadas inválidas!');
            console.error('❌ Latitude:', lat, 'Longitude:', lng);
            Alert.alert('Erro', 'Coordenadas inválidas encontradas. Tente selecionar outro endereço.');
            return;
        }

        // Preencher campos automaticamente
        const newFormData = {
            address: selectedSuggestion.address || selectedSuggestion.formattedAddress,
            neighborhood: selectedSuggestion.neighborhood || '',
            city: selectedSuggestion.city || '',
            state: selectedSuggestion.state || '',
            zipCode: selectedSuggestion.zipCode || '',
            latitude: parseFloat(lat),
            longitude: parseFloat(lng)
        };

        console.log('🔍 DEBUG - FormData que será salvo:', newFormData);
        console.log('🔍 DEBUG - Latitude final:', newFormData.latitude);
        console.log('🔍 DEBUG - Longitude final:', newFormData.longitude);

        setFormData(prev => ({
            ...prev,
            ...newFormData
        }));
    };

    // Fechar sugestões quando tocar fora
    const handlePressOutside = () => {
        setShowAddressSuggestions(false);
    };

    // Formatar preço para moeda brasileira
    const formatCurrency = (value) => {
        // Remover tudo que não é número
        const numericValue = value.replace(/\D/g, '');

        if (numericValue === '') return '';

        // Converter para número e dividir por 100 para ter centavos
        const number = parseFloat(numericValue) / 100;

        // Formatar para moeda brasileira
        return number.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2
        });
    };

    // Função para seleção de endereço no mapa
    const handleMapAddressSelect = (address) => {
        console.log('📍 Endereço selecionado no mapa:', address);

        setSelectedAddress(address);
        setAddressQuery(address.formattedAddress || address.address);
        setShowMapPicker(false);

        // Preencher campos automaticamente
        setFormData(prev => ({
            ...prev,
            address: address.address || address.formattedAddress,
            neighborhood: address.neighborhood || '',
            city: address.city || '',
            state: address.state || '',
            zipCode: address.zipCode || '',
            latitude: address.latitude,
            longitude: address.longitude
        }));
    };

    // Dismiss teclado e dropdowns ao tocar fora
    const handleTapOutside = () => {
        Keyboard.dismiss();
        closeAllDropdowns();
    };

    // Função para abrir seleção no mapa
    const handleOpenMapPicker = () => {
        setShowAddressSuggestions(false);
        // Pequeno delay para garantir que o modal anterior feche completamente
        setTimeout(() => {
            setShowMapPicker(true);
        }, 100);
    };

    // Função para fechar seleção no mapa
    const handleCloseMapPicker = () => {
        setShowMapPicker(false);
    };

    const handlePriceChange = (value) => {
        const formattedValue = formatCurrency(value);
        setFormData(prev => ({
            ...prev,
            price: formattedValue
        }));
    };

    const handleSalePriceChange = (value) => {
        const formattedValue = formatCurrency(value);
        setFormData(prev => ({
            ...prev,
            salePrice: formattedValue
        }));
    };

    // Extrair valor numérico do preço formatado
    const getNumericPrice = (formattedPrice) => {
        return parseFloat(formattedPrice.replace(/\D/g, '')) / 100;
    };

    // Opções para dropdowns
    const propertyTypes = [
        'Casa',
        'Apartamento',
        'Cobertura',
        'Studio',
        'Loft',
        'Sobrado',
        'Casa de Condomínio',
        'Kitnet',
        'Flat',
        'Terreno',
        'Comercial',
        'Rural'
    ];

    const transactionTypes = [
        'Venda',
        'Aluguel',
        'Temporada',
        'Permuta'
    ];

    // Opções numéricas para dropdowns (0 a 8)
    const numericOptions = Array.from({ length: 9 }, (_, i) => i.toString()); // 0 a 8

    // Função para fechar todos os seletores/modais e sugestões
    const closeAllDropdowns = () => {
        setShowPropertyTypeModal(false);
        setShowTransactionTypeModal(false);
        setShowBedroomsModal(false);
        setShowBathroomsModal(false);
        setShowParkingModal(false);
        setShowAddressSuggestions(false);
        setShowDeveloperModal(false);
    };

    // Função para selecionar construtora
    const handleDeveloperSelect = (developer) => {
        setSelectedDeveloper(developer);
        setFormData(prev => ({
            ...prev,
            developer_id: developer.id
        }));
        setShowDeveloperModal(false);
        setDeveloperSearchQuery('');
        console.log('✅ Construtora selecionada:', developer.full_name);
    };

    // Filtrar construtoras com base na busca
    const filteredDevelopers = developers.filter(dev => {
        if (!developerSearchQuery) return true;
        const searchLower = developerSearchQuery.toLowerCase();
        return (
            dev.full_name?.toLowerCase().includes(searchLower) ||
            dev.name?.toLowerCase().includes(searchLower) ||
            dev.city_name?.toLowerCase().includes(searchLower)
        );
    });

    // Função para selecionar valor numérico
    const selectNumericValue = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };



    const validateForm = () => {
        const requiredFields = ['title', 'price', 'propertyType', 'transactionType'];

        for (const field of requiredFields) {
            if (!formData[field].trim()) {
                const fieldNames = {
                    title: 'Título',
                    price: 'Preço',
                    propertyType: 'Tipo de Imóvel',
                    transactionType: 'Tipo de Transação'
                };
                Alert.alert('Campo Obrigatório', `O campo "${fieldNames[field]}" é obrigatório`);
                return false;
            }
        }

        // Validar endereço selecionado
        if (!selectedAddress) {
            Alert.alert('Endereço Obrigatório', 'Selecione um endereço da lista de sugestões');
            return false;
        }

        // Validar coordenadas
        if (!formData.latitude || !formData.longitude) {
            Alert.alert('Erro de Localização', 'Endereço sem coordenadas válidas. Selecione outro endereço.');
            return false;
        }

        const numericPrice = getNumericPrice(formData.price);
        if (isNaN(numericPrice) || numericPrice <= 0) {
            Alert.alert('Preço Inválido', 'Digite um preço válido');
            return false;
        }

        // Validar preço promocional apenas se preenchido
        if (formData.salePrice.trim()) {
            const numericSalePrice = getNumericPrice(formData.salePrice);
            if (isNaN(numericSalePrice) || numericSalePrice <= 0) {
                Alert.alert('Preço Promocional Inválido', 'Digite um preço promocional válido');
                return false;
            }
        }

        // Verificar se há arquivos muito grandes
        const maxSizeMB = 200;
        const largeFiles = mediaFiles.filter(file => file.fileSize > maxSizeMB * 1024 * 1024);

        if (largeFiles.length > 0) {
            const fileNames = largeFiles.map(file => file.fileName || 'Arquivo').join(', ');
            Alert.alert(
                'Arquivos Muito Grandes',
                `Os seguintes arquivos excedem o limite de ${maxSizeMB}MB: ${fileNames}. Por favor, remova-os antes de criar o anúncio.`
            );
            return false;
        }

        return true;
    };

    const handleAddMedia = async (type) => {
        try {
            // ✅ VALIDAÇÃO PREVENTIVA: Verificar limites ANTES de abrir o picker
            const currentImages = mediaFiles.filter(f => f.type !== 'video').length;
            const currentVideos = mediaFiles.filter(f => f.type === 'video').length;
            const maxImages = plan?.max_images || 10;
            const maxVideos = plan?.max_videos || 0;

            // Bloquear se tentar adicionar vídeo e já atingiu o limite
            if (type === 'video' && currentVideos >= maxVideos) {
                Alert.alert(
                    'Limite de vídeos atingido',
                    `Seu plano ${planName || 'atual'} permite no máximo ${maxVideos} vídeo(s) por anúncio.\n\nVocê já adicionou ${currentVideos} vídeo(s).`,
                    [{ text: 'OK' }]
                );
                return; // ❌ BLOQUEIA
            }

            // Bloquear se tentar adicionar imagem e já atingiu o limite
            if (type !== 'video' && currentImages >= maxImages) {
                Alert.alert(
                    'Limite de imagens atingido',
                    `Seu plano ${planName || 'atual'} permite no máximo ${maxImages} imagens por anúncio.\n\nVocê já adicionou ${currentImages} imagens.`,
                    [{ text: 'OK' }]
                );
                return; // ❌ BLOQUEIA
            }

            console.log('✅ Validação preventiva passou:', {
                type,
                currentImages,
                currentVideos,
                maxImages,
                maxVideos
            });

            let result = null;

            if (type === 'camera') {
                result = await MediaServiceOptimized.takePhoto();
            } else if (type === 'gallery') {
                result = await MediaServiceOptimized.pickImage();
            } else if (type === 'video') {
                result = await MediaServiceOptimized.pickVideo();
            }

            // ✅ Fechar modal de seleção imediatamente após escolher
            setShowMediaModal(false);

            if (result) {
                // Se result for um array (múltiplas imagens), processar cada uma
                const results = Array.isArray(result) ? result : [result];

                // 🔄 Mostrar loading overlay
                console.log('🔄 Importando', results.length, 'arquivo(s)...');
                setIsImportingMedia(true);

                // Aguardar um momento para o overlay renderizar
                await new Promise(resolve => setTimeout(resolve, 100));

                // ✅ VALIDAÇÃO: Verificar quantas imagens/vídeos podem ser adicionados
                const currentImagesCount = mediaFiles.filter(f => f.type !== 'video').length;
                const currentVideosCount = mediaFiles.filter(f => f.type === 'video').length;
                const maxImages = plan?.max_images || 10;
                const maxVideos = plan?.max_videos || 0;

                // Separar imagens e vídeos dos resultados selecionados
                const selectedImages = results.filter(r => r.type !== 'video');
                const selectedVideos = results.filter(r => r.type === 'video');

                // Calcular quantos ainda podem ser adicionados
                const availableImageSlots = maxImages - currentImagesCount;
                const availableVideoSlots = maxVideos - currentVideosCount;

                // Verificar se vai ultrapassar o limite de imagens
                if (selectedImages.length > availableImageSlots) {
                    setIsImportingMedia(false); // Fechar loading
                    Alert.alert(
                        'Limite de imagens excedido',
                        `Você selecionou ${selectedImages.length} imagem(ns), mas só pode adicionar mais ${availableImageSlots}.\n\nSeu plano ${planName || 'atual'} permite no máximo ${maxImages} imagens por anúncio.`,
                        [{ text: 'OK' }]
                    );
                    return; // ❌ BLOQUEIA todas se ultrapassar
                }

                // Verificar se vai ultrapassar o limite de vídeos
                if (selectedVideos.length > availableVideoSlots) {
                    setIsImportingMedia(false); // Fechar loading
                    Alert.alert(
                        'Limite de vídeos excedido',
                        `Você selecionou ${selectedVideos.length} vídeo(s), mas só pode adicionar mais ${availableVideoSlots}.\n\nSeu plano ${planName || 'atual'} permite no máximo ${maxVideos} vídeos por anúncio.`,
                        [{ text: 'OK' }]
                    );
                    return; // ❌ BLOQUEIA todos se ultrapassar
                }

                console.log('✅ Validações passaram, processando arquivos...');

                // Se passou nas validações, processar os arquivos
                const mediaToAdd = [];
                let hasLargeFiles = false;

                for (const mediaResult of results) {
                    // Verificar tamanho do arquivo
                    const fileSizeMB = (mediaResult.fileSize / 1024 / 1024).toFixed(2);
                    const maxSizeMB = 200;

                    // Bloquear arquivos maiores que 200MB
                    if (mediaResult.fileSize > maxSizeMB * 1024 * 1024) {
                        setIsImportingMedia(false);
                        Alert.alert(
                            'Arquivo Muito Grande',
                            `O arquivo ${mediaResult.fileName} tem ${fileSizeMB}MB e excede o limite de ${maxSizeMB}MB. Por favor, escolha um arquivo menor ou reduza a qualidade.`,
                            [{ text: 'OK' }]
                        );
                        continue; // Pular este arquivo
                    }

                    // Se arquivo for maior que 50MB, marcar para confirmação
                    if (mediaResult.fileSize > 50 * 1024 * 1024) {
                        hasLargeFiles = true;
                        // Fechar loading antes de mostrar alert
                        setIsImportingMedia(false);
                        
                        await new Promise((resolve) => {
                            Alert.alert(
                                'Arquivo Grande',
                                `O arquivo ${mediaResult.fileName} tem ${fileSizeMB}MB. Arquivos grandes podem demorar mais para fazer upload. Deseja continuar?`,
                                [
                                    { 
                                        text: 'Cancelar', 
                                        style: 'cancel',
                                        onPress: () => resolve(false)
                                    },
                                    {
                                        text: 'Continuar',
                                        onPress: () => {
                                            mediaToAdd.push({
                                                uri: mediaResult.uri,
                                                type: mediaResult.type || 'image',
                                                fileName: mediaResult.fileName || `media_${Date.now()}`,
                                                fileSize: mediaResult.fileSize || 0
                                            });
                                            resolve(true);
                                        }
                                    }
                                ]
                            );
                        });
                    } else {
                        mediaToAdd.push({
                            uri: mediaResult.uri,
                            type: mediaResult.type || 'image',
                            fileName: mediaResult.fileName || `media_${Date.now()}`,
                            fileSize: mediaResult.fileSize || 0
                        });
                    }
                }

                // Adicionar todas as mídias processadas de uma vez
                if (mediaToAdd.length > 0) {
                    setMediaFiles(prev => [...prev, ...mediaToAdd]);
                }

                // Aguardar um pouco antes de fechar (mínimo 800ms de visibilidade)
                if (!hasLargeFiles) {
                    await new Promise(resolve => setTimeout(resolve, 800));
                }

                // ✅ Fechar loading após processar
                console.log('🔒 Fechando loading');
                setIsImportingMedia(false);
            }
        } catch (error) {
            console.error('Erro ao adicionar mídia:', error);

            // ✅ Fechar loading em caso de erro
            setIsImportingMedia(false);

            // Verificar se é erro de arquivo muito grande
            if (error.message && error.message.includes('muito grande')) {
                Alert.alert(
                    'Arquivo Muito Grande',
                    'Este arquivo excede o limite de 50MB. Por favor, escolha um arquivo menor ou reduza a qualidade.',
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert('Erro', 'Não foi possível adicionar a mídia. Tente novamente.');
            }
        }
    };

    const handleRemoveMedia = (index) => {
        Alert.alert(
            'Remover Mídia',
            'Deseja remover esta mídia?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Remover',
                    style: 'destructive',
                    onPress: () => {
                        setMediaFiles(prev => prev.filter((_, i) => i !== index));
                    }
                }
            ]
        );
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        // ✅ Criar objeto eligibility compatível com validateMediaLimitsByPlan
        // IMPORTANTE: Passar o objeto 'plan' completo que contém max_images e max_videos
        const eligibilityData = {
            plan: plan, // Objeto completo do plano do Zustand
            planName,
            planDisplayName: planName,
            maxAds,
            currentAds,
            canCreate: canCreateAd,
            reason: createAdReason,
            isExpired: isPlanExpired
        };

        console.log('🔍 Validando limites de mídia:', {
            imagesCount: mediaFiles.filter(file => file.type !== 'video').length,
            videosCount: mediaFiles.filter(file => file.type === 'video').length,
            maxImages: plan?.max_images,
            maxVideos: plan?.max_videos,
            planName
        });

        const withinLimits = await validateMediaLimitsByPlan({
            imagesCount: mediaFiles.filter(file => file.type !== 'video').length,
            videosCount: mediaFiles.filter(file => file.type === 'video').length,
            planInfo: eligibilityData,
        });
        if (!withinLimits) return;

        try {
            setSubmitting(true);
            setUploadProgress(0);
            setShowProgressModal(true);

            const propertyData = {
                user_id: user.id,
                ...formData,
                price: getNumericPrice(formData.price).toString(),
                salePrice: formData.salePrice.trim() ? getNumericPrice(formData.salePrice).toString() : ''
            };

            // Callback para atualizar progresso
            const onUploadProgress = (progress) => {
                setUploadProgress(progress);
            };

            const newProperty = await PropertyService.createProperty(propertyData, mediaFiles, onUploadProgress);

            // ✅ Atualização otimista: incrementar contador imediatamente
            console.log('✨ Anúncio criado! Atualizando contador no Zustand...');
            incrementAdCount();

            setShowProgressModal(false);
            Alert.alert(
                'Sucesso!',
                'Anúncio criado com sucesso! Aguarde a aprovação do administrador.',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            navigation.goBack();
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Erro ao criar anúncio:', error);
            setShowProgressModal(false);

            // Verificar tipo de erro para mostrar mensagem específica
            if (error.message && error.message.includes('muito grande')) {
                Alert.alert(
                    'Arquivo Muito Grande',
                    'Um dos arquivos excede o limite de 50MB. Por favor, remova arquivos grandes e tente novamente.',
                    [{ text: 'OK' }]
                );
            } else if (error.message && error.message.includes('plano ativo')) {
                Alert.alert(
                    'Plano Necessário',
                    'Você precisa de um plano ativo para criar anúncios. Verifique suas permissões.',
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert('Erro', 'Não foi possível criar o anúncio. Verifique sua conexão e tente novamente.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpgradePlan = () => {
        setShowPlanModal(false);
        navigation.navigate('Plans', { fromAdvertise: true });
    };

    // Removido: validação local substituída por util compartilhado

    const renderMediaItem = ({ item, index }) => {
        const fileSizeMB = (item.fileSize / 1024 / 1024).toFixed(1);
        const isLargeFile = item.fileSize > 25 * 1024 * 1024; // > 25MB

        return (
            <View style={styles.mediaItem}>
                <Image source={{ uri: item.uri }} style={styles.mediaThumbnail} />
                <TouchableOpacity
                    style={styles.removeMediaButton}
                    onPress={() => handleRemoveMedia(index)}
                >
                    <Ionicons name="close-circle" size={24} color="#e74c3c" />
                </TouchableOpacity>

                {/* Indicador de tipo de mídia */}
                {item.type === 'video' && (
                    <View style={styles.videoIndicator}>
                        <Ionicons name="play" size={16} color="#fff" />
                    </View>
                )}

                {/* Indicador de tamanho do arquivo */}
                <View style={[styles.fileSizeIndicator, isLargeFile && styles.largeFileIndicator]}>
                    <AppText style={[styles.fileSizeText, isLargeFile && styles.largeFileText]}>
                        {fileSizeMB}MB
                    </AppText>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3498db" />
                    <AppText style={styles.loadingText}>Verificando permissões...</AppText>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header Amarelo com Título */}
            <StandardHeader
                title="Criar Anúncio"
                subtitle="Publique seu imóvel"
                showBackButton={true}
                onBackPress={() => navigation.goBack()}
            />

            {/* Conteúdo Principal */}
            <View
                style={styles.contentContainer}
                onStartShouldSetResponderCapture={() => isKeyboardVisible}
                onResponderRelease={handleTapOutside}
            >

                <KeyboardAvoidingView
                    style={styles.keyboardView}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <TouchableWithoutFeedback onPress={handleTapOutside} accessible={false}>
                        <KeyboardAwareScrollView
                            style={styles.content}
                            showsVerticalScrollIndicator={false}
                            enableOnAndroid
                            keyboardOpeningTime={0}
                            extraScrollHeight={100}
                            extraHeight={140}
                            keyboardShouldPersistTaps="always"
                            nestedScrollEnabled
                            scrollEnabled={!anyDropdownOpen}
                            innerRef={(ref) => { if (ref) scrollRef.current = ref.getScrollResponder ? ref.getScrollResponder() : ref; }}
                            contentContainerStyle={{ paddingBottom: 30 }}
                        >
                            {/* Plan Info Card */}
                            {planName && (
                                <View style={styles.planInfoCard}>
                                    <Ionicons name="information-circle" size={20} color="#3498db" />
                                    <View style={styles.planInfoContent}>
                                        <AppText style={styles.planInfoTitle}>
                                            Plano {planName}
                                        </AppText>
                                        <AppText style={styles.planInfoText}>
                                            {canCreateAd
                                                ? `${currentAds}/${maxAds} anúncios ativos`
                                                : createAdReason
                                            }
                                        </AppText>
                                    </View>
                                </View>
                            )}

                            {/* Media Section */}
                            <View style={styles.formSection}>
                                <AppText style={styles.sectionTitle}>Fotos e Vídeos</AppText>
                                
                                {/* Contadores de mídia */}
                                <View style={styles.mediaCountersContainer}>
                                    <View style={styles.mediaCounter}>
                                        <Ionicons name="images" size={16} color="#3498db" />
                                        <AppText style={styles.mediaCounterText}>
                                            Imagens: {mediaFiles.filter(f => f.type !== 'video').length}/{plan?.max_images || 10}
                                        </AppText>
                                    </View>
                                    <View style={styles.mediaCounter}>
                                        <Ionicons name="videocam" size={16} color="#e74c3c" />
                                        <AppText style={styles.mediaCounterText}>
                                            Vídeos: {mediaFiles.filter(f => f.type === 'video').length}/{plan?.max_videos || 0}
                                        </AppText>
                                    </View>
                                </View>

                                {mediaFiles.length > 0 && (
                                    <FlatList
                                        data={mediaFiles}
                                        renderItem={renderMediaItem}
                                        keyExtractor={(item, index) => index.toString()}
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        style={styles.mediaList}
                                    />
                                )}

                                {(() => {
                                    const currentImages = mediaFiles.filter(f => f.type !== 'video').length;
                                    const currentVideos = mediaFiles.filter(f => f.type === 'video').length;
                                    const maxImages = plan?.max_images || 10;
                                    const maxVideos = plan?.max_videos || 0;
                                    const maxTotal = maxImages + maxVideos;
                                    const hasReachedLimit = currentImages >= maxImages && currentVideos >= maxVideos;

                                    return !hasReachedLimit ? (
                                        <TouchableOpacity
                                            style={styles.addMediaButton}
                                            onPress={() => setShowMediaModal(true)}
                                        >
                                            <Ionicons name="add" size={24} color="#3498db" />
                                            <AppText style={styles.addMediaText}>Adicionar Mídia</AppText>
                                        </TouchableOpacity>
                                    ) : (
                                        <AppText style={styles.mediaLimitText}>
                                            Limite máximo atingido ({currentImages} imagens / {currentVideos} vídeos)
                                        </AppText>
                                    );
                                })()}
                            </View>

                            {/* Localização - Movida para depois da mídia */}
                            <View style={[styles.formSection, styles.addressSection]} ref={contentRef}>
                                <AppText style={styles.sectionTitle}>Localização</AppText>

                                <View style={styles.addressOuterContainer}>
                                    <View style={[styles.inputGroup, styles.addressInputGroup]}>
                                        <AppText style={styles.inputLabel}>Endereço *</AppText>
                                        <TouchableOpacity
                                            activeOpacity={0.7}
                                            onPress={() => setShowAddressModal(true)}
                                            style={{ flex: 1 }}
                                        >
                                            <AppTextInput
                                                style={[styles.textInput, styles.addressSearchInput, styles.multilineAddressInput, selectedAddress && styles.readOnlyInput]}
                                                value={selectedAddress ?
                                                    `${selectedAddress.address || ''}\n${selectedAddress.neighborhood || ''}\n${selectedAddress.city || ''}, ${selectedAddress.state || ''}`.trim() :
                                                    ''
                                                }
                                                placeholder="Digite o endereço (ex: Rua Augusta, 123, São Paulo)"
                                                placeholderTextColor="#7f8c8d"
                                                editable={false}
                                                multiline={true}
                                                numberOfLines={3}
                                                textAlignVertical="top"
                                                pointerEvents="none"
                                            />
                                        </TouchableOpacity>

                                        {/* Botão de editar endereço quando há endereço selecionado */}
                                        {selectedAddress && (
                                            <TouchableOpacity
                                                style={styles.editAddressButton}
                                                onPress={() => {
                                                    setShowAddressModal(true);
                                                }}
                                            >
                                                <Ionicons name="create-outline" size={16} color="#007AFF" />
                                                <AppText style={styles.editAddressText}>Editar Endereço</AppText>
                                            </TouchableOpacity>
                                        )}

                                        {/* Botão alternativo quando não há sugestões */}
                                        {!showAddressSuggestions && !selectedAddress && addressQuery.length > 2 && (
                                            <TouchableOpacity
                                                style={styles.mapPickerButtonAlternative}
                                                onPress={() => {
                                                    setShowAddressModal(false); // Fechar modal de endereço
                                                    handleOpenMapPicker();
                                                }}
                                            >
                                                <Ionicons name="map-outline" size={18} color="#007AFF" />
                                                <AppText style={styles.mapPickerButtonText}>Escolher endereço no mapa</AppText>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                </View>
                            </View>

                            {/* Form Fields - Unificado */}
                            <View style={[styles.formSection, styles.belowAddressSection]}>
                                {/* Informações Básicas */}
                                <AppText style={styles.sectionTitle}>Informações Básicas</AppText>

                                <View style={styles.inputGroup}>
                                    <AppText style={styles.inputLabel}>Título do Anúncio *</AppText>
                                    <AppTextInput
                                        style={styles.textInput}
                                        value={formData.title}
                                        onChangeText={(value) => handleInputChange('title', value)}
                                        placeholder="Ex: Casa com 3 quartos em condomínio"
                                        placeholderTextColor="#7f8c8d"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <AppText style={styles.inputLabel}>Descrição</AppText>
                                    <AppTextInput
                                        style={[styles.textInput, styles.textArea]}
                                        value={formData.description}
                                        onChangeText={(value) => handleInputChange('description', value)}
                                        placeholder="Descreva detalhes do imóvel..."
                                        placeholderTextColor="#7f8c8d"
                                        multiline
                                        numberOfLines={4}
                                    />
                                </View>

                                {/* Campo de Construtora (Opcional) */}
                                <View style={styles.inputGroup}>
                                    <AppText style={styles.inputLabel}>Construtora (Opcional)</AppText>
                                    <TouchableOpacity
                                        style={styles.dropdownButton}
                                        onPress={() => {
                                            closeAllDropdowns();
                                            setShowDeveloperModal(true);
                                        }}
                                    >
                                        <AppText style={[
                                            styles.dropdownButtonText,
                                            !selectedDeveloper && styles.placeholderText
                                        ]}>
                                            {selectedDeveloper 
                                                ? `${selectedDeveloper.full_name}${selectedDeveloper.city_name ? ` - ${selectedDeveloper.city_name}/${selectedDeveloper.city_uf}` : ''}`
                                                : 'Selecione a construtora (opcional)'
                                            }
                                        </AppText>
                                        <Ionicons
                                            name={showDeveloperModal ? 'chevron-up' : 'chevron-down'}
                                            size={20}
                                            color="#7f8c8d"
                                        />
                                    </TouchableOpacity>
                                    {selectedDeveloper && (
                                        <TouchableOpacity
                                            style={styles.clearButton}
                                            onPress={() => {
                                                setSelectedDeveloper(null);
                                                setFormData(prev => ({ ...prev, developer_id: null }));
                                            }}
                                        >
                                            <Ionicons name="close-circle" size={16} color="#e74c3c" />
                                            <AppText style={styles.clearButtonText}>Limpar seleção</AppText>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <View style={styles.row}>
                                    <View style={[styles.inputGroup, styles.halfWidth]}>
                                        <AppText style={styles.inputLabel}>Preço *</AppText>
                                        <AppTextInput
                                            style={styles.textInput}
                                            value={formData.price}
                                            onChangeText={handlePriceChange}
                                            placeholder="R$ 0,00"
                                            placeholderTextColor="#7f8c8d"
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    <View style={[styles.inputGroup, styles.halfWidth]}>
                                        <AppText style={styles.inputLabel}>Preço Promocional</AppText>
                                        <AppTextInput
                                            style={styles.textInput}
                                            value={formData.salePrice}
                                            onChangeText={handleSalePriceChange}
                                            placeholder="R$ 0,00"
                                            placeholderTextColor="#7f8c8d"
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </View>

                                <View style={styles.row}>
                                    <View style={[styles.inputGroup, styles.halfWidth]}>
                                        <AppText style={styles.inputLabel}>Área (m²)</AppText>
                                        <AppTextInput
                                            style={styles.textInput}
                                            value={formData.area}
                                            onChangeText={(value) => handleInputChange('area', value)}
                                            placeholder="0"
                                            placeholderTextColor="#7f8c8d"
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </View>

                                <View style={styles.row}>
                                    <View style={[styles.inputGroup, styles.halfWidth, styles.primaryDropdownContainer]}>
                                        <AppText style={styles.inputLabel}>Tipo *</AppText>
                                        <TouchableOpacity
                                            style={styles.dropdownButton}
                                            onPress={() => {
                                                closeAllDropdowns();
                                                setShowPropertyTypeModal(true);
                                            }}
                                        >
                                            <AppText style={[
                                                styles.dropdownButtonText,
                                                !formData.propertyType && styles.placeholderText
                                            ]}>
                                                {formData.propertyType || 'Selecione o tipo'}
                                            </AppText>
                                            <Ionicons
                                                name={showPropertyTypeModal ? 'chevron-up' : 'chevron-down'}
                                                size={20}
                                                color="#7f8c8d"
                                            />
                                        </TouchableOpacity>

                                        {/* Dropdown de Tipo via Modal - removido inline */}
                                    </View>
                                    <View style={[styles.inputGroup, styles.halfWidth, styles.primaryDropdownContainer]}>
                                        <AppText style={styles.inputLabel}>Transação *</AppText>
                                        <TouchableOpacity
                                            style={styles.dropdownButton}
                                            onPress={() => {
                                                closeAllDropdowns();
                                                setShowTransactionTypeModal(true);
                                            }}
                                        >
                                            <AppText style={[
                                                styles.dropdownButtonText,
                                                !formData.transactionType && styles.placeholderText
                                            ]}>
                                                {formData.transactionType || 'Selecione a transação'}
                                            </AppText>
                                            <Ionicons
                                                name={showTransactionTypeModal ? 'chevron-up' : 'chevron-down'}
                                                size={20}
                                                color="#7f8c8d"
                                            />
                                        </TouchableOpacity>
                                        {/* Dropdown de Transação via Modal */}
                                    </View>
                                </View>

                                <View style={styles.row}>
                                    <View style={[styles.inputGroup, styles.thirdWidth, styles.secondaryDropdownContainer]}>
                                        <AppText style={styles.inputLabel}>Quartos</AppText>
                                        <TouchableOpacity
                                            style={styles.dropdownButton}
                                            onPress={() => {
                                                closeAllDropdowns();
                                                setShowBedroomsModal(true);
                                            }}
                                        >
                                            <AppText style={[
                                                styles.dropdownButtonText,
                                                !formData.bedrooms && styles.placeholderText
                                            ]}>
                                                {formData.bedrooms || '0'}
                                            </AppText>
                                            <Ionicons
                                                name={showBedroomsModal ? 'chevron-up' : 'chevron-down'}
                                                size={20}
                                                color="#7f8c8d"
                                            />
                                        </TouchableOpacity>
                                        {/* Quartos via Modal */}
                                    </View>
                                    <View style={[styles.inputGroup, styles.thirdWidth, styles.secondaryDropdownContainer]}>
                                        <AppText style={styles.inputLabel}>Banheiros</AppText>
                                        <TouchableOpacity
                                            style={styles.dropdownButton}
                                            onPress={() => {
                                                closeAllDropdowns();
                                                setShowBathroomsModal(true);
                                            }}
                                        >
                                            <AppText style={[
                                                styles.dropdownButtonText,
                                                !formData.bathrooms && styles.placeholderText
                                            ]}>
                                                {formData.bathrooms || '0'}
                                            </AppText>
                                            <Ionicons
                                                name={showBathroomsModal ? 'chevron-up' : 'chevron-down'}
                                                size={20}
                                                color="#7f8c8d"
                                            />
                                        </TouchableOpacity>
                                        {/* Banheiros via Modal */}
                                    </View>
                                    <View style={[styles.inputGroup, styles.thirdWidth, styles.secondaryDropdownContainer]}>
                                        <AppText style={styles.inputLabel}>Vagas</AppText>
                                        <TouchableOpacity
                                            style={styles.dropdownButton}
                                            onPress={() => {
                                                closeAllDropdowns();
                                                setShowParkingModal(true);
                                            }}
                                        >
                                            <AppText style={[
                                                styles.dropdownButtonText,
                                                !formData.parkingSpaces && styles.placeholderText
                                            ]}>
                                                {formData.parkingSpaces || '0'}
                                            </AppText>
                                            <Ionicons
                                                name={showParkingModal ? 'chevron-up' : 'chevron-down'}
                                                size={20}
                                                color="#7f8c8d"
                                            />
                                        </TouchableOpacity>
                                        {/* Vagas via Modal */}
                                    </View>
                                </View>
                            </View>

                            {/* Submit Button */}
                            <View style={styles.submitSection}>
                                <TouchableOpacity
                                    style={[
                                        styles.submitButton,
                                        (!canCreateAd || submitting) && styles.disabledButton
                                    ]}
                                    onPress={handleSubmit}
                                    disabled={!canCreateAd || submitting}
                                >
                                    {submitting ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <AppText style={styles.submitButtonText}>Criar Anúncio</AppText>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </KeyboardAwareScrollView>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>

                {/* Media Selection Modal */}
                <Modal
                    visible={showMediaModal}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowMediaModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.mediaModalContent}>
                            <View style={styles.mediaModalHeader}>
                                <AppText style={styles.mediaModalTitle}>Adicionar Mídia</AppText>
                                <TouchableOpacity onPress={() => setShowMediaModal(false)}>
                                    <Ionicons name="close" size={24} color="#2c3e50" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.mediaOptions}>
                                <TouchableOpacity
                                    style={styles.mediaOption}
                                    onPress={() => handleAddMedia('camera')}
                                >
                                    <View style={[styles.mediaOptionIcon, { backgroundColor: '#1e3a8a' }]}>
                                        <Ionicons name="camera" size={32} color="#fff" />
                                    </View>
                                    <AppText style={styles.mediaOptionText}>Tirar Foto</AppText>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.mediaOption}
                                    onPress={() => handleAddMedia('gallery')}
                                >
                                    <View style={[styles.mediaOptionIcon, { backgroundColor: '#2ecc71' }]}>
                                        <Ionicons name="images" size={32} color="#fff" />
                                    </View>
                                    <AppText style={styles.mediaOptionText}>Galeria</AppText>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.mediaOption}
                                    onPress={() => handleAddMedia('video')}
                                >
                                    <View style={[styles.mediaOptionIcon, { backgroundColor: '#e74c3c' }]}>
                                        <Ionicons name="videocam" size={32} color="#fff" />
                                    </View>
                                    <AppText style={styles.mediaOptionText}>Vídeo</AppText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Modal - Seletor de Tipo de Imóvel */}
                <Modal
                    visible={showPropertyTypeModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowPropertyTypeModal(false)}
                >
                    <TouchableWithoutFeedback onPress={() => setShowPropertyTypeModal(false)}>
                        <View style={styles.typeModalOverlay}>
                            <TouchableWithoutFeedback>
                                <View style={styles.typeModalCard}>
                                    <View style={styles.typeModalHandleWrap}>
                                        <View style={styles.typeModalHandle} />
                                    </View>
                                    <View style={styles.typeModalHeader}>
                                        <AppText style={styles.typeModalHeaderText}>Selecione o tipo</AppText>
                                    </View>

                                    <FlatList
                                        data={propertyTypes}
                                        keyExtractor={(item, index) => `${index}-${item}`}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={styles.typeModalItem}
                                                onPress={() => {
                                                    handleInputChange('propertyType', item);
                                                    setShowPropertyTypeModal(false);
                                                }}
                                            >
                                                <AppText style={styles.typeModalItemText}>{item}</AppText>
                                            </TouchableOpacity>
                                        )}
                                        showsVerticalScrollIndicator={true}
                                        persistentScrollbar={true}
                                        initialNumToRender={12}
                                        style={styles.typeModalList}
                                    />

                                    <TouchableOpacity
                                        style={styles.typeModalCloseButton}
                                        onPress={() => setShowPropertyTypeModal(false)}
                                    >
                                        <AppText style={styles.typeModalCloseText}>Fechar</AppText>
                                    </TouchableOpacity>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>

                {/* Modal - Seletor de Transação */}
                <Modal
                    visible={showTransactionTypeModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowTransactionTypeModal(false)}
                >
                    <TouchableWithoutFeedback onPress={() => setShowTransactionTypeModal(false)}>
                        <View style={styles.typeModalOverlay}>
                            <TouchableWithoutFeedback>
                                <View style={styles.typeModalCard}>
                                    <View style={styles.typeModalHandleWrap}>
                                        <View style={styles.typeModalHandle} />
                                    </View>
                                    <View style={styles.typeModalHeader}>
                                        <AppText style={styles.typeModalHeaderText}>Selecione a transação</AppText>
                                    </View>

                                    <FlatList
                                        data={transactionTypes}
                                        keyExtractor={(item, index) => `${index}-${item}`}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={styles.typeModalItem}
                                                onPress={() => {
                                                    handleInputChange('transactionType', item);
                                                    setShowTransactionTypeModal(false);
                                                }}
                                            >
                                                <AppText style={styles.typeModalItemText}>{item}</AppText>
                                            </TouchableOpacity>
                                        )}
                                        showsVerticalScrollIndicator
                                        persistentScrollbar
                                        initialNumToRender={12}
                                        style={styles.typeModalList}
                                    />

                                    <TouchableOpacity
                                        style={styles.typeModalCloseButton}
                                        onPress={() => setShowTransactionTypeModal(false)}
                                    >
                                        <AppText style={styles.typeModalCloseText}>Fechar</AppText>
                                    </TouchableOpacity>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>

                {/* Modal - Seletor de Quartos */}
                <Modal
                    visible={showBedroomsModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowBedroomsModal(false)}
                >
                    <TouchableWithoutFeedback onPress={() => setShowBedroomsModal(false)}>
                        <View style={styles.typeModalOverlay}>
                            <TouchableWithoutFeedback>
                                <View style={styles.typeModalCard}>
                                    <View style={styles.typeModalHandleWrap}>
                                        <View style={styles.typeModalHandle} />
                                    </View>
                                    <View style={styles.typeModalHeader}>
                                        <AppText style={styles.typeModalHeaderText}>Selecione quartos</AppText>
                                    </View>

                                    <FlatList
                                        data={numericOptions}
                                        keyExtractor={(item, index) => `${index}-${item}`}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={styles.typeModalItem}
                                                onPress={() => {
                                                    selectNumericValue('bedrooms', item);
                                                    setShowBedroomsModal(false);
                                                }}
                                            >
                                                <AppText style={styles.typeModalItemText}>{item}</AppText>
                                            </TouchableOpacity>
                                        )}
                                        showsVerticalScrollIndicator
                                        persistentScrollbar
                                        initialNumToRender={12}
                                        style={styles.typeModalList}
                                    />

                                    <TouchableOpacity
                                        style={styles.typeModalCloseButton}
                                        onPress={() => setShowBedroomsModal(false)}
                                    >
                                        <AppText style={styles.typeModalCloseText}>Fechar</AppText>
                                    </TouchableOpacity>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>

                {/* Modal - Seletor de Banheiros */}
                <Modal
                    visible={showBathroomsModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowBathroomsModal(false)}
                >
                    <TouchableWithoutFeedback onPress={() => setShowBathroomsModal(false)}>
                        <View style={styles.typeModalOverlay}>
                            <TouchableWithoutFeedback>
                                <View style={styles.typeModalCard}>
                                    <View style={styles.typeModalHandleWrap}>
                                        <View style={styles.typeModalHandle} />
                                    </View>
                                    <View style={styles.typeModalHeader}>
                                        <AppText style={styles.typeModalHeaderText}>Selecione banheiros</AppText>
                                    </View>

                                    <FlatList
                                        data={numericOptions}
                                        keyExtractor={(item, index) => `${index}-${item}`}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={styles.typeModalItem}
                                                onPress={() => {
                                                    selectNumericValue('bathrooms', item);
                                                    setShowBathroomsModal(false);
                                                }}
                                            >
                                                <AppText style={styles.typeModalItemText}>{item}</AppText>
                                            </TouchableOpacity>
                                        )}
                                        showsVerticalScrollIndicator
                                        persistentScrollbar
                                        initialNumToRender={12}
                                        style={styles.typeModalList}
                                    />

                                    <TouchableOpacity
                                        style={styles.typeModalCloseButton}
                                        onPress={() => setShowBathroomsModal(false)}
                                    >
                                        <AppText style={styles.typeModalCloseText}>Fechar</AppText>
                                    </TouchableOpacity>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>

                {/* Modal - Seletor de Vagas */}
                <Modal
                    visible={showParkingModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowParkingModal(false)}
                >
                    <TouchableWithoutFeedback onPress={() => setShowParkingModal(false)}>
                        <View style={styles.typeModalOverlay}>
                            <TouchableWithoutFeedback>
                                <View style={styles.typeModalCard}>
                                    <View style={styles.typeModalHandleWrap}>
                                        <View style={styles.typeModalHandle} />
                                    </View>
                                    <View style={styles.typeModalHeader}>
                                        <AppText style={styles.typeModalHeaderText}>Selecione vagas</AppText>
                                    </View>

                                    <FlatList
                                        data={numericOptions}
                                        keyExtractor={(item, index) => `${index}-${item}`}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={styles.typeModalItem}
                                                onPress={() => {
                                                    selectNumericValue('parkingSpaces', item);
                                                    setShowParkingModal(false);
                                                }}
                                            >
                                                <AppText style={styles.typeModalItemText}>{item}</AppText>
                                            </TouchableOpacity>
                                        )}
                                        showsVerticalScrollIndicator
                                        persistentScrollbar
                                        initialNumToRender={12}
                                        style={styles.typeModalList}
                                    />

                                    <TouchableOpacity
                                        style={styles.typeModalCloseButton}
                                        onPress={() => setShowParkingModal(false)}
                                    >
                                        <AppText style={styles.typeModalCloseText}>Fechar</AppText>
                                    </TouchableOpacity>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>

                {/* Modal - Seletor de Construtora */}
                <Modal
                    visible={showDeveloperModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => {
                        setShowDeveloperModal(false);
                        setDeveloperSearchQuery('');
                    }}
                >
                    <TouchableWithoutFeedback onPress={() => {
                        setShowDeveloperModal(false);
                        setDeveloperSearchQuery('');
                    }}>
                        <View style={styles.typeModalOverlay}>
                            <TouchableWithoutFeedback>
                                <View style={styles.typeModalCard}>
                                    <View style={styles.typeModalHandleWrap}>
                                        <View style={styles.typeModalHandle} />
                                    </View>
                                    <View style={styles.typeModalHeader}>
                                        <AppText style={styles.typeModalHeaderText}>Selecione a construtora</AppText>
                                    </View>

                                    {/* Campo de busca */}
                                    <View style={styles.developerSearchContainer}>
                                        <Ionicons name="search" size={20} color="#7f8c8d" style={styles.searchIcon} />
                                        <AppTextInput
                                            style={styles.developerSearchInput}
                                            value={developerSearchQuery}
                                            onChangeText={setDeveloperSearchQuery}
                                            placeholder="Buscar construtora..."
                                            placeholderTextColor="#7f8c8d"
                                        />
                                        {developerSearchQuery.length > 0 && (
                                            <TouchableOpacity onPress={() => setDeveloperSearchQuery('')}>
                                                <Ionicons name="close-circle" size={20} color="#7f8c8d" />
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {loadingDevelopers ? (
                                        <View style={styles.loadingContainer}>
                                            <ActivityIndicator size="large" color="#3498db" />
                                            <AppText style={styles.loadingText}>Carregando construtoras...</AppText>
                                        </View>
                                    ) : filteredDevelopers.length === 0 ? (
                                        <View style={styles.emptyContainer}>
                                            <Ionicons name="business-outline" size={48} color="#bdc3c7" />
                                            <AppText style={styles.emptyText}>
                                                {developerSearchQuery 
                                                    ? 'Nenhuma construtora encontrada' 
                                                    : 'Nenhuma construtora disponível'
                                                }
                                            </AppText>
                                        </View>
                                    ) : (
                                        <FlatList
                                            data={filteredDevelopers}
                                            keyExtractor={(item) => item.id}
                                            renderItem={({ item }) => (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.typeModalItem,
                                                        styles.developerModalItem,
                                                        selectedDeveloper?.id === item.id && styles.selectedDeveloperItem
                                                    ]}
                                                    onPress={() => handleDeveloperSelect(item)}
                                                >
                                                    <View style={styles.developerItemContent}>
                                                        <AppText style={styles.developerItemName}>{item.full_name}</AppText>
                                                        {item.city_name && (
                                                            <AppText style={styles.developerItemLocation}>
                                                                {item.city_name}/{item.city_uf}
                                                            </AppText>
                                                        )}
                                                    </View>
                                                    {selectedDeveloper?.id === item.id && (
                                                        <Ionicons name="checkmark-circle" size={24} color="#27ae60" />
                                                    )}
                                                </TouchableOpacity>
                                            )}
                                            showsVerticalScrollIndicator={true}
                                            persistentScrollbar={true}
                                            initialNumToRender={20}
                                            style={styles.typeModalList}
                                        />
                                    )}

                                    <TouchableOpacity
                                        style={styles.typeModalCloseButton}
                                        onPress={() => {
                                            setShowDeveloperModal(false);
                                            setDeveloperSearchQuery('');
                                        }}
                                    >
                                        <AppText style={styles.typeModalCloseText}>Fechar</AppText>
                                    </TouchableOpacity>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>

                {/* Modal - Buscar Endereço */}
                <Modal
                    visible={showAddressModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowAddressModal(false)}
                >
                    <TouchableWithoutFeedback onPress={() => setShowAddressModal(false)}>
                        <View style={styles.typeModalOverlay}>
                            <TouchableWithoutFeedback>
                                <View style={styles.AddressModalCard}>
                                    <View style={styles.typeModalHandleWrap}>
                                        <View style={styles.typeModalHandle} />
                                    </View>
                                    <View style={styles.typeModalHeader}>
                                        <AppText style={styles.typeModalHeaderText}>Buscar Endereço</AppText>
                                    </View>

                                    <View style={{ padding: 12 }}>
                                        <View style={styles.addressSearchContainer}>
                                            <AppTextInput
                                                style={[styles.textInput, styles.addressSearchInput, styles.addressSearchInputWithClear]}
                                                value={addressQuery}
                                                onChangeText={handleAddressSearch}
                                                placeholder="Digite o endereço"
                                                placeholderTextColor="#7f8c8d"
                                                autoComplete="off"
                                                autoCorrect={false}
                                                autoFocus
                                            />
                                            {addressQuery && addressQuery.length > 0 && (
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setAddressQuery('');
                                                        setAddressSuggestions([]);
                                                        setSelectedAddress(null);
                                                    }}
                                                    style={styles.addressClearButton}
                                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                >
                                                    <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                                                </TouchableOpacity>
                                            )}
                                            {searchingAddress && (
                                                <View style={styles.searchingIndicator}>
                                                    <ActivityIndicator size="small" color="#00335e" />
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    <FlatList
                                        data={addressSuggestions}
                                        keyExtractor={(_, i) => `sugg_${i}`}
                                        renderItem={({ item, index }) => (
                                            <TouchableOpacity
                                                key={`suggestion_${index}`}
                                                style={styles.suggestionItem}
                                                onPress={() => {
                                                    handleAddressSelect(item);
                                                    setShowAddressModal(false);
                                                }}
                                            >
                                                <Ionicons
                                                    name="location-outline"
                                                    size={16}
                                                    color="#00335e"
                                                    style={styles.suggestionIcon}
                                                />
                                                <View style={styles.suggestionContent}>
                                                    <AppText style={styles.suggestionAddress}>
                                                        {item.address || item.formattedAddress.split(',')[0]}
                                                    </AppText>
                                                    <AppText style={styles.suggestionLocation}>
                                                        {[item.neighborhood, item.city, item.state].filter(Boolean).join(', ')}
                                                    </AppText>
                                                </View>
                                            </TouchableOpacity>
                                        )}
                                        showsVerticalScrollIndicator
                                        persistentScrollbar
                                        style={styles.typeModalList}
                                        ListFooterComponent={
                                            <TouchableOpacity style={styles.mapPickerButton} onPress={() => {
                                                setShowAddressModal(false); // Fechar modal de endereço
                                                handleOpenMapPicker();
                                            }}>
                                                <Ionicons name="map-outline" size={16} color="#007AFF" />
                                                <AppText style={styles.mapPickerButtonText}>Não encontrou? Escolher no mapa</AppText>
                                            </TouchableOpacity>
                                        }
                                    />

                                    <TouchableOpacity
                                        style={styles.typeModalCloseButton}
                                        onPress={() => setShowAddressModal(false)}
                                    >
                                        <AppText style={styles.typeModalCloseText}>Fechar</AppText>
                                    </TouchableOpacity>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>

                {/* Plan Upgrade Modal */}
                <Modal
                    visible={showPlanModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowPlanModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalIcon}>
                                <Ionicons name="lock-closed" size={48} color="#e74c3c" />
                            </View>
                            <AppText style={styles.modalTitle}>Você não pode criar anúncios no momento.</AppText>
                            <AppText style={styles.modalText}>
                                {!planName
                                    ? 'Não foi possível verificar suas permissões agora.'
                                    : isPlanExpired
                                        ? `Seu plano (${planName}) está vencido. Renove para criar novos anúncios.`
                                        : maxAds === 0
                                            ? 'Seu plano atual não permite criar anúncios.'
                                            : currentAds >= maxAds
                                                ? `Você atingiu o limite de ${maxAds} anúncios do seu plano (${planName}).`
                                                : createAdReason || 'Não é possível criar anúncios no momento.'
                                }
                            </AppText>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.modalCancelButton}
                                    onPress={() => setShowPlanModal(false)}
                                >
                                    <AppText style={styles.modalCancelText}>Cancelar</AppText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.modalConfirmButton}
                                    onPress={handleUpgradePlan}
                                >
                                    <AppText style={styles.modalConfirmText}>Ver Planos</AppText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Progress Modal */}
                <Modal
                    visible={showProgressModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => { }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalIcon}>
                                <Ionicons name="cloud-upload" size={48} color="#3498db" />
                            </View>

                            <AppText style={styles.modalTitle}>Enviando Mídias</AppText>
                            <AppText style={styles.modalText}>
                                Aguarde enquanto suas mídias são enviadas...
                            </AppText>

                            {/* Progress Bar */}
                            <View style={styles.progressContainer}>
                                <View style={styles.progressBar}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            { width: `${uploadProgress}%` }
                                        ]}
                                    />
                                </View>
                                <AppText style={styles.progressText}>{uploadProgress}%</AppText>
                            </View>

                            <ActivityIndicator size="large" color="#3498db" style={{ marginTop: 20 }} />
                        </View>
                    </View>
                </Modal>

                {/* Loading overlay durante importação de mídias */}
                {isImportingMedia && (
                    <View style={styles.importingOverlay}>
                        <ActivityIndicator size="large" color="#fff" />
                    </View>
                )}

                {/* Modal para escolher endereço no mapa */}
                <Modal
                    visible={showMapPicker}
                    animationType="slide"
                    presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
                    onRequestClose={handleCloseMapPicker}
                >
                    <MapaEscolherEndereco
                        onAddressSelect={handleMapAddressSelect}
                        onCancel={handleCloseMapPicker}
                    />
                </Modal>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffcc1e',
    },



    placeholder: {
        width: 40, // Adjust as needed for spacing
    },

    contentContainer: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },

    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingTop: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#7f8c8d',
    },
    planInfoCard: {
        backgroundColor: '#e8f4fd',
        margin: 20,
        borderRadius: 12,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
    },
    planInfoContent: {
        marginLeft: 15,
        flex: 1,
    },
    planInfoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#00335e',
        marginBottom: 2,
    },
    planInfoText: {
        fontSize: 14,
        color: '#7f8c8d',
    },
    formSection: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 12,
        padding: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#00335e',
        marginBottom: 10,
    },
    sectionTitleWithMargin: {
        marginTop: 20,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 15,
    },
    mediaList: {
        marginBottom: 15,
    },
    mediaItem: {
        marginRight: 10,
        position: 'relative',
    },
    mediaThumbnail: {
        width: 80,
        height: 80,
        borderRadius: 8,
    },
    removeMediaButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#fff',
        borderRadius: 12,
    },
    videoIndicator: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addMediaButton: {
        borderWidth: 2,
        borderColor: '#3498db',
        borderStyle: 'dashed',
        borderRadius: 8,
        padding: 20,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    addMediaText: {
        color: '#3498db',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    mediaLimitText: {
        color: '#e74c3c',
        fontSize: 14,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    mediaCountersContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
    },
    mediaCounter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    mediaCounterText: {
        fontSize: 14,
        color: '#2c3e50',
        fontWeight: '600',
        marginLeft: 6,
    },
    inputGroup: {
        marginBottom: 15,
        position: 'relative',
        zIndex: 1,
    },
    // Estilos para campos que não são dropdowns
    regularInputGroup: {
        marginBottom: 15,
        position: 'relative',
        zIndex: 1,
    },
    dropdownContainer: {
        zIndex: 999999, // Containers com dropdown têm prioridade máxima
    },
    // Estilos específicos para dropdowns principais (Tipo e Transação)
    primaryDropdownContainer: {
        zIndex: 9999999, // Prioridade ainda maior para dropdowns principais
    },
    // Estilos para dropdowns secundários (Quartos, Banheiros, Vagas)
    secondaryDropdownContainer: {
        zIndex: 1, // Prioridade menor para não interferir com os principais
    },
    // Estilos específicos para seção de endereço
    addressSection: {
        zIndex: 100, // Seção de endereço tem prioridade máxima
        position: 'relative',
    },
    addressOuterContainer: {
        position: 'relative',
        zIndex: 100,
    },
    addressInputGroup: {
        zIndex: 101, // Input group do endereço
        marginBottom: 25, // Mais espaço para as sugestões
    },
    belowAddressSection: {
        zIndex: 1, // Seções abaixo do endereço ficam atrás
        position: 'relative',
        marginTop: 10,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 8,
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        color: '#2c3e50',
        backgroundColor: '#fff',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
        gap: 15,
    },
    halfWidth: {
        flex: 1,
    },
    thirdWidth: {
        flex: 1,
    },
    submitSection: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    submitButton: {
        backgroundColor: '#1e3a8a',
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#bdc3c7',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    mediaModalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        width: '100%',
        maxWidth: 400,
    },
    mediaModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    mediaModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    mediaOptions: {
        padding: 20,
    },
    mediaOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    mediaOptionIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    mediaOptionText: {
        fontSize: 16,
        color: '#2c3e50',
        fontWeight: '500',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 30,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },
    modalIcon: {
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 15,
        textAlign: 'center',
    },
    modalText: {
        fontSize: 16,
        color: '#7f8c8d',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 25,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 15,
        width: '100%',
    },
    modalCancelButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#e74c3c',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalCancelText: {
        color: '#e74c3c',
        fontSize: 16,
        fontWeight: '600',
    },
    fileSizeIndicator: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    largeFileIndicator: {
        backgroundColor: 'rgba(231, 76, 60, 0.9)',
    },
    fileSizeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
    },
    largeFileText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    modalConfirmButton: {
        flex: 1,
        backgroundColor: '#3498db',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalConfirmText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    progressContainer: {
        width: '100%',
        marginBottom: 20,
    },
    progressBar: {
        width: '100%',
        height: 8,
        backgroundColor: '#ecf0f1',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 10,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#3498db',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
        color: '#2c3e50',
        textAlign: 'center',
        fontWeight: '600',
    },
    // Dropdown styles
    dropdownButton: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        backgroundColor: '#fff',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dropdownButtonText: {
        fontSize: 16,
        color: '#2c3e50',
        flex: 1,
    },
    placeholderText: {
        color: '#7f8c8d',
    },
    dropdownList: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        maxHeight: 200,
        zIndex: 999999,
        elevation: 999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        marginTop: 2,
        overflow: 'hidden', // garante que a lista não vaze
    },
    dropdownScroll: {
        maxHeight: 200,
        flexGrow: 0,
    },
    dropdownItem: {
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    dropdownItemText: {
        fontSize: 16,
        color: '#2c3e50',
    },

    // Estilos para Autocomplete de Endereços
    addressSearchContainer: {
        position: 'relative',
    },
    addressClearButton: {
        position: 'absolute',
        right: 40,
        top: '50%',
        transform: [{ translateY: -10 }],
        zIndex: 2,
    },
    addressSearchInput: {
        paddingRight: 40, // Espaço para o indicador de loading
    },
    addressSearchInputWithClear: {
        paddingRight: 68, // mais espaço para não sobrepor o botão limpar
    },
    searchingIndicator: {
        position: 'absolute',
        right: 12,
        top: '50%',
        transform: [{ translateY: -10 }],
    },
    suggestionsList: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 999,
        zIndex: 999999,
        maxHeight: 200,
    },
    suggestionsFlatList: {
        borderRadius: 8,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    suggestionIcon: {
        marginRight: 12,
    },
    suggestionContent: {
        flex: 1,
    },
    suggestionAddress: {
        fontSize: 14,
        color: '#2c3e50',
        fontWeight: '500',
    },
    suggestionLocation: {
        fontSize: 12,
        color: '#7f8c8d',
        marginTop: 2,
    },
    addressPreviewContainer: {
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 8,
        marginTop: 15,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    addressPreviewTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#00335e',
        marginBottom: 10,
    },
    readOnlyInput: {
        backgroundColor: '#f8f9fa',
        color: '#64748b',
        fontStyle: 'italic',
    },
    changeAddressButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#fff',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#e74c3c',
    },
    changeAddressText: {
        fontSize: 12,
        color: '#e74c3c',
        marginLeft: 5,
        fontWeight: '500',
    },
    fullAddressInput: {
        minHeight: 60,
        textAlignVertical: 'top',
        paddingTop: 12,
    },
    editAddressButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#fff',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    editAddressText: {
        fontSize: 12,
        color: '#007AFF',
        marginLeft: 5,
        fontWeight: '500',
    },
    multilineAddressInput: {
        minHeight: 80,
        paddingTop: 12,
        textAlignVertical: 'top',
    },

    // Estilos para botões do mapa
    mapPickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        backgroundColor: '#f8f9fa',
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
    },
    mapPickerButtonAlternative: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        backgroundColor: '#f0f8ff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#007AFF',
        marginTop: 10,
    },
    mapPickerButtonText: {
        fontSize: 14,
        color: '#007AFF',
        marginLeft: 8,
        fontWeight: '500',
    },

    // Modal de Tipo (dropdown via modal)
    typeModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    AddressModalCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        maxHeight: 380,
        width: '90%',
        maxWidth: 360,
        overflow: 'hidden',
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
    },
    typeModalCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        maxHeight: 500,
        width: '85%',
        maxWidth: 450,
        overflow: 'hidden',
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
    },
    typeModalHandleWrap: {
        alignItems: 'center',
        paddingTop: 8,
    },
    typeModalHandle: {
        width: 34,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E5E7EB',
    },
    typeModalHeader: {
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    typeModalHeaderText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#00335e',
    },
    typeModalList: {
        maxHeight: 320,
    },
    typeModalItem: {
        shadowColor: '#000',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        minHeight: 56,
    },
    typeModalItemText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#1f2937',
    },
    typeModalCloseButton: {
        paddingVertical: 10,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    typeModalCloseText: {
        color: '#2563EB',
        fontWeight: '700',
        fontSize: 14,
    },
    
    // Estilos para seleção de construtora
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingVertical: 6,
        paddingHorizontal: 10,
        alignSelf: 'flex-start',
    },
    clearButtonText: {
        color: '#e74c3c',
        fontSize: 13,
        marginLeft: 4,
    },
    developerSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        marginHorizontal: 14,
        marginVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    searchIcon: {
        marginRight: 8,
    },
    developerSearchInput: {
        flex: 1,
        paddingVertical: 10,
        fontSize: 15,
        color: '#2c3e50',
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#7f8c8d',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        marginTop: 12,
        fontSize: 14,
        color: '#7f8c8d',
        textAlign: 'center',
    },
    developerModalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        minHeight: 64,
    },
    selectedDeveloperItem: {
        backgroundColor: '#e8f5e9',
    },
    developerItemContent: {
        flex: 1,
        paddingVertical: 4,
        paddingRight: 12,
    },
    developerItemName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 4,
        lineHeight: 22,
    },
    developerItemLocation: {
        fontSize: 13,
        color: '#7f8c8d',
        lineHeight: 18,
    },
    
    importingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },

}); 