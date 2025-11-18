import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    Alert, RefreshControl, Modal, ScrollView, TextInput, ActivityIndicator,
    Dimensions, Platform, KeyboardAvoidingView, TouchableWithoutFeedback
} from 'react-native';
import { Image } from 'expo-image';
import { Video } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useUserPlanStore } from '../stores/userPlanStore';
import { PropertyService } from '../lib/propertyService';
import { BoostService } from '../lib/boostService';

import { validateMediaLimitsByPlan } from '../lib/validation/mediaLimits';
import { supabase } from '../lib/supabase';
import { MediaServiceOptimized } from '../lib/mediaServiceOptimized';
import * as ImagePicker from 'expo-image-picker';
import { validateYouTubeUrl, extractYouTubeVideoId } from '../lib/youtubeUtils';

const { width } = Dimensions.get('window');

export default function MyPropertiesScreen({ navigation }) {
    const { user } = useAuth();
    const insets = useSafeAreaInsets();

    // ✅ Zustand: User Plan Store
    const canCreateAd = useUserPlanStore(state => state.canCreateAd);
    const createAdReason = useUserPlanStore(state => state.createAdReason);
    const fetchUserPlanData = useUserPlanStore(state => state.fetchUserPlanData);
    const decrementAdCount = useUserPlanStore(state => state.decrementAdCount);

    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [listLoading, setListLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [expandedItems, setExpandedItems] = useState(new Set());

    const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0 });
    const [userPlan, setUserPlan] = useState(null);
    const [activeBoosts, setActiveBoosts] = useState({}); // {propertyId: boostData}

    const [editModalVisible, setEditModalVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [editingProperty, setEditingProperty] = useState(null);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [editForm, setEditForm] = useState({
        title: '', description: '', price: '', salePrice: '', propertyType: '', transactionType: '',
        bedrooms: '', bathrooms: '', parkingSpaces: '', area: '', address: '',
        neighborhood: '', city: '', state: '', zipCode: '', latitude: null, longitude: null
    });
    const [editImages, setEditImages] = useState([]);
    const [removedImages, setRemovedImages] = useState([]);
    const [editVideoUrls, setEditVideoUrls] = useState([]);
    const [originalVideoUrls, setOriginalVideoUrls] = useState([]); // Rastrear vídeos originais
    const [removedVideoUrls, setRemovedVideoUrls] = useState([]);
    const [youtubeUrlInput, setYoutubeUrlInput] = useState('');
    const [editLoading, setEditLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Estados para dropdowns do formulário de edição
    const [showPropertyTypeDropdown, setShowPropertyTypeDropdown] = useState(false);
    const [showTransactionTypeDropdown, setShowTransactionTypeDropdown] = useState(false);
    const [showBedroomsDropdown, setShowBedroomsDropdown] = useState(false);
    const [showBathroomsDropdown, setShowBathroomsDropdown] = useState(false);
    const [showParkingDropdown, setShowParkingDropdown] = useState(false);

    /** ------------------ CONSTANTES E FUNÇÕES AUXILIARES ------------------ **/

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

    const handleEditPriceChange = (value) => {
        const formattedValue = formatCurrency(value);
        setEditForm(prev => ({
            ...prev,
            price: formattedValue
        }));
    };

    const handleEditSalePriceChange = (value) => {
        const formattedValue = formatCurrency(value);
        setEditForm(prev => ({
            ...prev,
            salePrice: formattedValue
        }));
    };

    // Extrair valor numérico do preço formatado
    const getNumericPrice = (formattedPrice) => {
        return parseFloat(formattedPrice.replace(/\D/g, '')) / 100;
    };

    // Função para fechar todos os dropdowns
    const closeAllDropdowns = () => {
        setShowPropertyTypeDropdown(false);
        setShowTransactionTypeDropdown(false);
        setShowBedroomsDropdown(false);
        setShowBathroomsDropdown(false);
        setShowParkingDropdown(false);
    };

    /** ------------------ FETCHS ------------------ **/

    const fetchUserPlan = async () => {
        if (!user?.id) return null;
        try {
            const { data, error } = await supabase
                .from('user_subscriptions')
                .select('*, plans(id, name, display_name, max_ads, price)')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Erro ao buscar plano:', error);
                return null;
            }
            return data;
        } catch (error) {
            console.error('Erro ao buscar plano:', error);
            return null;
        }
    };

    const fetchStatsAndPlan = useCallback(async () => {
        if (!user?.id) return;
        try {
            const [statsData, planData] = await Promise.all([
                PropertyService.getPropertyStats(user.id),
                fetchUserPlan()
            ]);
            setStats(statsData);
            setUserPlan(planData);
        } catch (err) {
            console.error('Erro ao buscar estatísticas e plano:', err);
        }
    }, [user?.id]);

    const fetchActiveBoosts = useCallback(async () => {
        if (!user?.id || properties.length === 0) return;

        try {
            const { data, error } = await supabase
                .from('property_boosts')
                .select('property_id, end_date, status')
                .eq('status', 'active')
                .gte('end_date', new Date().toISOString())
                .in('property_id', properties.map(p => p.id));

            if (error) throw error;

            // Criar um mapa de propertyId -> boostData
            const boostsMap = {};
            if (data) {
                data.forEach(boost => {
                    boostsMap[boost.property_id] = boost;
                });
            }
            setActiveBoosts(boostsMap);
        } catch (err) {
            console.error('Erro ao buscar boosts ativos:', err);
        }
    }, [user?.id, properties]);

    const fetchProperties = useCallback(
        async (forceRefresh = false, isFilterChange = false) => {
            if (!user?.id) return;

            if (isFilterChange) {
                setListLoading(true); // não some com a tela
            } else {
                setLoading(true); // tela inicial
            }

            try {
                const data = await PropertyService.getUserProperties(
                    user.id,
                    selectedFilter === 'all' ? null : selectedFilter,
                    forceRefresh
                );
                setProperties(data);
            } catch (err) {
                console.error('Erro ao buscar propriedades:', err);
                Alert.alert('Erro', 'Não foi possível carregar seus anúncios');
            } finally {
                if (isFilterChange) {
                    setListLoading(false);
                } else {
                    setLoading(false);
                }
            }
        },
        [user?.id, selectedFilter]
    );


    useEffect(() => {
        if (user?.id) {
            fetchStatsAndPlan();
            fetchProperties(false, true); // true = mudança de filtro (sem piscar a tela toda)
        }
    }, [selectedFilter, user?.id]);

    // Buscar boosts quando as propriedades forem carregadas
    useEffect(() => {
        if (properties.length > 0) {
            fetchActiveBoosts();
        }
    }, [properties.length]);

    // Recarregar dados quando a tela receber foco
    useFocusEffect(
        useCallback(() => {
            if (user?.id) {
                console.log('🔄 Tela MyPropertiesScreen recebeu foco, recarregando dados...');
                fetchStatsAndPlan();
                fetchProperties();
                // ✅ Carregar dados do plano (cache de 3 min)
                fetchUserPlanData(user.id);
            }
        }, [user?.id])
    );



    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchStatsAndPlan(), fetchProperties(true)]);
        setRefreshing(false);
    };

    /** ------------------ MODALS ------------------ **/

    const openEditModal = (property) => {
        setEditingProperty(property);

        // Formatar preço para moeda brasileira
        const formattedPrice = property.price ?
            new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2
            }).format(property.price) : '';

        const formattedSalePrice = property.sale_price ?
            new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2
            }).format(property.sale_price) : '';

        setEditForm({
            title: property.title || '',
            description: property.description || '',
            price: formattedPrice,
            salePrice: formattedSalePrice,
            propertyType: property.property_type || '',
            transactionType: property.transaction_type || '',
            bedrooms: property.bedrooms?.toString() || '',
            bathrooms: property.bathrooms?.toString() || '',
            parkingSpaces: property.parking_spaces?.toString() || '',
            area: property.area?.toString() || '',
            address: property.address || '',
            neighborhood: property.neighborhood || '',
            city: property.city || '',
            state: property.state || '',
            zipCode: property.zip_code || '',
            latitude: property.latitude,
            longitude: property.longitude
        });
        setEditImages(property.images || []);
        setEditVideoUrls(property.video_urls || []);
        setOriginalVideoUrls(property.video_urls || []); // Salvar vídeos originais
        setRemovedImages([]);
        setRemovedVideoUrls([]);
        setYoutubeUrlInput('');
        setEditModalVisible(true);
    };

    const openDeleteModal = (property) => {
        setSelectedProperty(property);
        setDeleteModalVisible(true);
    };

    const handleSaveEdit = async () => {
        if (!editingProperty) return;

        // Validação
        if (!editForm.title.trim()) {
            Alert.alert('Erro', 'O título é obrigatório');
            return;
        }
        if (!editForm.price || parseFloat(editForm.price) <= 0) {
            Alert.alert('Erro', 'O preço deve ser maior que zero');
            return;
        }
        // salePrice é opcional; se vazio, manter null
        if (!editForm.address.trim()) {
            Alert.alert('Erro', 'O endereço é obrigatório');
            return;
        }
        if (!editForm.city.trim()) {
            Alert.alert('Erro', 'A cidade é obrigatória');
            return;
        }

        // Validação de limites de mídias por plano (util compartilhado)
        const withinLimits = await validateMediaLimitsByPlan({
            imagesCount: (editImages || []).length, // Apenas imagens
            videosCount: (editVideoUrls || []).length, // Apenas vídeos do YouTube
            userPlan,
        });
        if (!withinLimits) {
            return;
        }

        setEditLoading(true);
        try {
            // Separar imagens existentes (URLs) de novas imagens (URIs locais)
            const existingImages = editImages.filter(img => img.startsWith('http'));
            const newImageUris = editImages.filter(img => !img.startsWith('http'));

            // Converter URIs locais para objetos de arquivo
            const newMediaFiles = newImageUris.map(uri => {
                const extension = uri.split('.').pop() || 'jpg';
                const isVideo = extension.match(/\.(mp4|mov|avi|mkv|webm)$/i);

                return {
                    uri: uri,
                    type: isVideo ? 'video' : 'image',
                    fileName: `media_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`,
                    fileSize: 0 // Será calculado durante o upload
                };
            });

            // Preparar dados para atualização
            const updateData = {
                ...editForm,
                price: getNumericPrice(editForm.price).toString(), // Converter preço formatado para número
                salePrice: editForm.salePrice ? getNumericPrice(editForm.salePrice).toString() : null,
                status: 'pending', // Voltar para pendente após edição
                ad_status: 'inactive', // Desativar anúncio enquanto aguarda aprovação
                latitude: editForm.latitude,
                longitude: editForm.longitude
            };

            // Calcular apenas os vídeos NOVOS (que não estavam na lista original)
            const newVideoUrls = editVideoUrls.filter(url => !originalVideoUrls.includes(url));
            
            console.log('📤 Enviando para updateProperty:', {
                propertyId: editingProperty.id,
                originalVideoUrls,
                editVideoUrls,
                newVideoUrls,
                removedVideoUrls,
                updateData
            });

            await PropertyService.updateProperty(
                editingProperty.id, 
                updateData, 
                newMediaFiles, 
                removedImages,
                newVideoUrls,  // Apenas URLs NOVAS do YouTube
                removedVideoUrls // URLs removidas
            );
            Alert.alert(
                'Sucesso!',
                'Anúncio atualizado com sucesso! Como houve alterações, ele voltou para o status "Pendente" e aguarda nova aprovação do administrador.',
                [{ text: 'OK' }]
            );
            setEditModalVisible(false);
            // Limpar cache e recarregar
            await PropertyService.clearUserPropertiesCache(user.id);
            fetchProperties(true);
        } catch (err) {
            console.error('Erro ao atualizar propriedade:', err);
            Alert.alert('Erro', 'Não foi possível atualizar o anúncio');
        } finally {
            setEditLoading(false);
        }
    };

    // Removido: validação local substituída por util compartilhado

    const handleDeleteProperty = async () => {
        if (!selectedProperty) return;
        setDeleteLoading(true);
        try {
            await PropertyService.deleteProperty(selectedProperty.id);

            // ✅ Atualização otimista: decrementar contador imediatamente
            console.log('🗑️ Anúncio deletado! Atualizando contador no Zustand...');
            decrementAdCount();

            Alert.alert('Sucesso', 'Anúncio excluído com sucesso!');
            setDeleteModalVisible(false);
            // Limpar cache e recarregar
            await PropertyService.clearUserPropertiesCache(user.id);
            fetchProperties(true);
        } catch (err) {
            console.error('Erro ao deletar propriedade:', err);
            Alert.alert('Erro', 'Não foi possível excluir o anúncio');
        } finally {
            setDeleteLoading(false);
        }
    };

    // Funções para gerenciar imagens
    const removeImage = (index) => {
        const imageToRemove = editImages[index];
        setEditImages(prev => prev.filter((_, i) => i !== index));
        setRemovedImages(prev => [...prev, imageToRemove]);
    };

    const addMedia = async () => {
        try {
            // Solicitar permissões
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar sua galeria');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images, // Apenas imagens
                allowsMultipleSelection: true,
                quality: 0.8,
                aspect: [4, 3],
            });

            if (!result.canceled && result.assets) {
                const newMedia = result.assets.map(asset => asset.uri);
                setEditImages(prev => [...prev, ...newMedia]);
                console.log(`✅ ${result.assets.length} imagem(ns) adicionada(s) com sucesso`);
            }
        } catch (error) {
            console.error('Erro ao selecionar imagens:', error);
            Alert.alert('Erro', 'Não foi possível selecionar as imagens');
        }
    };

    // Função para adicionar URL do YouTube
    const handleAddYouTubeUrl = () => {
        if (!youtubeUrlInput.trim()) {
            Alert.alert('Erro', 'Por favor, insira uma URL do YouTube');
            return;
        }

        const validation = validateYouTubeUrl(youtubeUrlInput.trim());
        if (!validation.isValid) {
            Alert.alert('URL inválida', validation.error || 'Por favor, insira uma URL válida do YouTube');
            return;
        }

        // Adicionar a URL normalizada
        setEditVideoUrls(prev => [...prev, validation.normalizedUrl]);
        setYoutubeUrlInput('');
        console.log('✅ URL do YouTube adicionada:', validation.normalizedUrl);
    };

    // Função para remover URL do YouTube
    const removeVideoUrl = (index) => {
        const videoToRemove = editVideoUrls[index];
        setEditVideoUrls(prev => prev.filter((_, i) => i !== index));
        setRemovedVideoUrls(prev => [...prev, videoToRemove]);
    };

    /** ------------------ RENDER ITEM ------------------ **/

    const toggleExpanded = (id) => {
        setExpandedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const getStatusColor = (status) => ({
        approved: '#27ae60',
        pending: '#f39c12',
        rejected: '#e74c3c'
    }[status] || '#95a5a6');

    const getStatusText = (status) => ({
        approved: 'Aprovado',
        pending: 'Pendente',
        rejected: 'Rejeitado'
    }[status] || 'Desconhecido');

    // estilos para botão de alternar ad_status

    // Função para verificar se é vídeo
    const isVideoFile = useCallback((url) => {
        if (!url || typeof url !== 'string') return false;
        return url.includes('.mp4') ||
            url.includes('.mov') ||
            url.includes('.avi') ||
            url.includes('.mkv') ||
            url.includes('.webm');
    }, []);

    // Função para validar URL
    const isValidUrl = useCallback((url) => {
        if (!url || typeof url !== 'string' || url.trim() === '') {
            return false;
        }

        // Aceitar http/https com domínio e URIs locais file://
        const httpPattern = /^https?:\/\/.+\..+/;
        const filePattern = /^file:\/\//;

        // Verificar se não tem caracteres estranhos que podem causar erro
        const hasInvalidChars = /[^\w\-._~:\/?#[\]@!$&'()*+,;=%]/.test(url);

        const matchesKnownScheme = httpPattern.test(url) || filePattern.test(url);
        return matchesKnownScheme && !hasInvalidChars;
    }, []);

    // Função para renderizar mídia (imagem ou vídeo)
    const renderMedia = useCallback(({ item, index, customStyle }) => {
        const mediaStyle = customStyle || styles.mediaItem;

        // Validação de URL
        if (!item || typeof item !== 'string' || item.trim() === '') {
            return (
                <View style={[mediaStyle, { backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="image-outline" size={30} color="#9ca3af" />
                    <AppText style={{ fontSize: 10, color: '#9ca3af', marginTop: 5 }}>Mídia inválida</AppText>
                </View>
            );
        }

        // Verificar se a URL é válida
        if (!isValidUrl(item)) {
            console.log(`⚠️ URL inválida detectada: ${item.substring(0, 50)}...`);
            return (
                <View style={[mediaStyle, { backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="warning-outline" size={30} color="#ef4444" />
                    <AppText style={{ fontSize: 10, color: '#ef4444', marginTop: 5, textAlign: 'center' }}>URL malformada</AppText>
                </View>
            );
        }

        const isVideo = isVideoFile(item);

        if (isVideo) {
            return (
                <View style={[styles.mediaContainer, { width: mediaStyle.width, height: mediaStyle.height }]}>
                    <Video
                        source={{ uri: item }}
                        style={mediaStyle}
                        useNativeControls={true}
                        resizeMode="cover"
                        shouldPlay={false}
                        isLooping={false}
                        isMuted={false}
                        volume={1.0}
                        onError={(error) => {
                            console.error(`❌ Erro no vídeo ${index}:`, error);
                        }}
                        onLoadStart={() => {
                            console.log(`🎥 Carregando vídeo ${index}: ${item.substring(0, 50)}...`);
                        }}
                    />
                </View>
            );
        }

        return (
            <Image
                source={{ uri: item }}
                style={mediaStyle}
                contentFit="cover"
                cachePolicy="disk"
                placeholder={require('../assets/icon.png')}
                transition={200}
                onError={(error) => {
                    console.error(`❌ Erro na imagem ${index}:`, error);
                }}
                onLoad={() => {
                    console.log(`✅ Imagem ${index} carregada do cache: ${item.substring(0, 50)}...`);
                }}
            />
        );
    }, [isVideoFile, isValidUrl]);

    const renderPropertyItem = useCallback(({ item }) => {
        const isExpanded = expandedItems.has(item.id);
        return (
            <View style={styles.propertyCard}>
                <TouchableOpacity
                    style={styles.propertyCardHeader}
                    onPress={() => toggleExpanded(item.id)}
                    activeOpacity={0.7}
                >
                    <View style={styles.propertyInfo}>
                        <View style={styles.propertyHeader}>
                            <View style={styles.titleContainer}>
                                <AppText style={styles.propertyTitle} numberOfLines={1}>
                                    {item.title || 'Título indisponível'}
                                </AppText>
                                {item.images && item.images.length > 0 && (
                                    <View style={styles.mediaCountContainer}>
                                        {(() => {
                                            const validImages = item.images.filter(uri => uri && typeof uri === 'string' && uri.trim() !== '' && isValidUrl(uri));
                                            const imageCount = validImages.filter(uri => !isVideoFile(uri)).length;
                                            const videoCount = validImages.filter(uri => isVideoFile(uri)).length;

                                            return (
                                                <View style={styles.mediaCounts}>
                                                    {imageCount > 0 && (
                                                        <View style={styles.mediaCountItem}>
                                                            <Ionicons name="image" size={12} color="#64748b" />
                                                            <AppText style={styles.mediaCountText}>{imageCount}</AppText>
                                                        </View>
                                                    )}
                                                    {videoCount > 0 && (
                                                        <View style={styles.mediaCountItem}>
                                                            <Ionicons name="videocam" size={12} color="#64748b" />
                                                            <AppText style={styles.mediaCountText}>{videoCount}</AppText>
                                                        </View>
                                                    )}
                                                </View>
                                            );
                                        })()}
                                    </View>
                                )}
                            </View>
                            <View style={styles.headerRight}>
                                <View style={styles.badgesContainer}>
                                    <View style={[
                                        styles.statusBadge,
                                        { backgroundColor: getStatusColor(item.status) }
                                    ]}>
                                        <AppText style={styles.statusText}>
                                            {getStatusText(item.status)}
                                        </AppText>
                                    </View>
                                    {/* Badge de Ativação (ad_status) */}
                                    {item.ad_status && (
                                        <View style={[styles.boostedBadge, { backgroundColor: item.ad_status === 'active' ? '#16a34a' : '#9ca3af' }]}>
                                            <Ionicons name={item.ad_status === 'active' ? 'flash' : 'pause'} size={10} color="#fff" />
                                            <AppText style={styles.boostedBadgeText}>{item.ad_status === 'active' ? 'Ativo' : 'Inativo'}</AppText>
                                        </View>
                                    )}
                                    {/* Badge de Impulsionado */}
                                    {activeBoosts[item.id] && (
                                        <View style={styles.boostedBadge}>
                                            <Ionicons name="rocket" size={10} color="#fff" />
                                            <AppText style={styles.boostedBadgeText}>Impulsionado</AppText>
                                        </View>
                                    )}
                                </View>
                                <Ionicons
                                    name={isExpanded ? "chevron-up" : "chevron-down"}
                                    size={20}
                                    color="#64748b"
                                />
                            </View>
                        </View>
                        <AppText style={styles.propertyLocation}>
                            {item.city || 'Cidade indisponível'}
                        </AppText>
                        <AppText style={styles.propertyPrice}>
                            R$ {item.price?.toLocaleString('pt-BR') || 'Preço indisponível'}
                        </AppText>
                    </View>
                </TouchableOpacity>

                {isExpanded && (
                    <View style={styles.expandedContent}>
                        {item.description && (
                            <View style={styles.expandedSection}>
                                <AppText style={styles.expandedSectionTitle}>Descrição</AppText>
                                <AppText style={styles.expandedSectionText}>{item.description}</AppText>
                            </View>
                        )}

                        <View style={styles.expandedSection}>
                            <AppText style={styles.expandedSectionTitle}>Características</AppText>
                            <View style={styles.characteristicsGrid}>
                                {item.bedrooms && (
                                    <View style={styles.characteristicItem}>
                                        <Ionicons name="bed" size={16} color="#1e3a8a" />
                                        <AppText style={styles.characteristicText}>{item.bedrooms} quartos</AppText>
                                    </View>
                                )}
                                {item.bathrooms && (
                                    <View style={styles.characteristicItem}>
                                        <Ionicons name="water" size={16} color="#1e3a8a" />
                                        <AppText style={styles.characteristicText}>{item.bathrooms} banheiros</AppText>
                                    </View>
                                )}
                                {item.area && (
                                    <View style={styles.characteristicItem}>
                                        <Ionicons name="resize" size={16} color="#1e3a8a" />
                                        <AppText style={styles.characteristicText}>{item.area}m²</AppText>
                                    </View>
                                )}
                                {item.parking_spaces && (
                                    <View style={styles.characteristicItem}>
                                        <Ionicons name="car" size={16} color="#1e3a8a" />
                                        <AppText style={styles.characteristicText}>{item.parking_spaces} vagas</AppText>
                                    </View>
                                )}
                            </View>
                        </View>

                        {item.images && item.images.length > 0 && (
                            <View style={styles.expandedSection}>
                                <AppText style={styles.expandedSectionTitle}>Mídia</AppText>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {(() => {
                                        const validImages = item.images.filter(uri => uri && typeof uri === 'string' && uri.trim() !== '' && isValidUrl(uri));
                                        const invalidCount = item.images.length - validImages.length;

                                        if (invalidCount > 0) {
                                            console.log(`⚠️ ${invalidCount} URLs inválidas filtradas do anúncio: ${item.title}`);
                                        }

                                        return validImages.map((uri, idx) => (
                                            <View key={idx} style={styles.mediaWrapper}>
                                                {renderMedia({ item: uri, index: idx })}
                                                {/* Ícone indicativo de tipo de mídia */}
                                                <View style={styles.mediaTypeIcon}>
                                                    <Ionicons
                                                        name={isVideoFile(uri) ? "videocam" : "image"}
                                                        size={12}
                                                        color="#fff"
                                                    />
                                                </View>
                                            </View>
                                        ));
                                    })()}
                                </ScrollView>
                                {(() => {
                                    const validImages = item.images.filter(uri => uri && typeof uri === 'string' && uri.trim() !== '' && isValidUrl(uri));
                                    const invalidCount = item.images.length - validImages.length;

                                    if (invalidCount > 0) {
                                        return (
                                            <AppText style={styles.invalidMediaText}>
                                                {invalidCount} mídia(s) com URL inválida(s) foram ocultada(s)
                                            </AppText>
                                        );
                                    }
                                    return null;
                                })()}
                            </View>
                        )}

                        {/* Alternar ad_status quando aprovado */}
                        {item.status === 'approved' && (
                            <View style={[styles.expandedSection, { paddingTop: 0 }]}>
                                <AppText style={styles.expandedSectionTitle}>Disponibilidade</AppText>
                                <TouchableOpacity
                                    style={[styles.toggleAdStatusBtn, { backgroundColor: item.ad_status === 'active' ? '#f59e0b' : '#16a34a' }]}
                                    onPress={async () => {
                                        try {
                                            const next = item.ad_status === 'active' ? 'inactive' : 'active';
                                            const confirmText = next === 'active' ? 'Ativar este anúncio?' : 'Inativar este anúncio?';
                                            Alert.alert('Confirmar', confirmText, [
                                                { text: 'Cancelar', style: 'cancel' },
                                                {
                                                    text: 'Confirmar', onPress: async () => {
                                                        try {
                                                            await PropertyService.updateAdStatus(item.id, next);
                                                            setProperties(prev => prev.map(p => p.id === item.id ? { ...p, ad_status: next } : p));
                                                        } catch (e) {
                                                            Alert.alert('Erro', 'Não foi possível atualizar o status.');
                                                        }
                                                    }
                                                }
                                            ]);
                                        } catch (e) { }
                                    }}
                                >
                                    <Ionicons name={item.ad_status === 'active' ? 'pause' : 'play'} size={16} color="#fff" />
                                    <AppText style={styles.toggleAdStatusText}>
                                        {item.ad_status === 'active' ? 'Inativar anúncio' : 'Ativar anúncio'}
                                    </AppText>
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.expandedActions}>
                            {/* <TouchableOpacity
                                style={styles.viewDetailsButton}
                                onPress={() => navigation.navigate('PropertyDetails', { propertyId: item.id })}
                            >
                                <AppText style={styles.viewDetailsButtonText}>Ver Detalhes Completos</AppText>
                            </TouchableOpacity> */}

                            {/* Boost Status - Mostrar se anúncio está impulsionado */}
                            {item.status === 'approved' && activeBoosts[item.id] && (
                                <View style={styles.boostStatusContainer}>
                                    <View style={styles.boostStatusHeader}>
                                        <Ionicons name="rocket" size={18} color="#27ae60" />
                                        <AppText style={styles.boostStatusTitle}>🚀 Anúncio Impulsionado</AppText>
                                    </View>
                                    <AppText style={styles.boostStatusText}>
                                        Impulsionado até {new Date(activeBoosts[item.id].end_date).toLocaleDateString('pt-BR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </AppText>
                                </View>
                            )}

                            <View style={styles.actionButtons}>
                                {item.status === 'approved' && (
                                    <TouchableOpacity
                                        style={[
                                            styles.actionButton,
                                            styles.boostButton,
                                            activeBoosts[item.id] && styles.boostButtonDisabled
                                        ]}
                                        onPress={() => navigation.navigate('BoostOptions', { property: item })}
                                        disabled={!!activeBoosts[item.id]}
                                    >
                                        <Ionicons
                                            name="rocket-outline"
                                            size={18}
                                            color={activeBoosts[item.id] ? '#95a5a6' : '#f39c12'}
                                        />
                                        <AppText style={[
                                            styles.boostButtonText,
                                            activeBoosts[item.id] && styles.boostButtonTextDisabled
                                        ]}>
                                            {activeBoosts[item.id] ? 'Impulsionado' : 'Impulsionar'}
                                        </AppText>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.editButton]}
                                    onPress={() => openEditModal(item)}
                                >
                                    <Ionicons name="create-outline" size={18} color="#3498db" />
                                    <AppText style={styles.editButtonText}>Editar</AppText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.deleteButton]}
                                    onPress={() => openDeleteModal(item)}
                                >
                                    <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                                    <AppText style={styles.deleteButtonText}>Excluir</AppText>
                                </TouchableOpacity>
                            </View>
                        </View>


                    </View>
                )}
            </View>
        );
    }, [expandedItems, toggleExpanded, isValidUrl, isVideoFile, getStatusColor, getStatusText, openEditModal, openDeleteModal, navigation]);

    /** ------------------ MAIN RENDER ------------------ **/

    if (loading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#00335e" />
                    <AppText style={styles.loadingText}>Carregando seus anúncios...</AppText>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#00335e" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <AppText style={styles.headerTitle}>Meus Anúncios</AppText>
                    <AppText style={styles.headerSubtitle}>Gerencie seus anúncios</AppText>
                </View>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => navigation.navigate('CreateAd')}
                >
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.addButton, { marginLeft: 10 }]}
                    onPress={() => {
                        // Teste manual de cache
                        console.log('🧪 Teste manual de cache iniciado');
                        fetchProperties(true);
                    }}
                >
                    <Ionicons name="refresh" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Estatísticas */}
            <View style={styles.statsContainer}>
                <View style={styles.planSummary}>
                    <AppText style={styles.planTitle}>
                        {userPlan?.plans?.display_name || 'Plano Básico'}
                    </AppText>
                    <AppText style={styles.planLimit}>
                        {stats.total}/{userPlan?.plans?.max_ads || 0} anúncios utilizados
                    </AppText>
                </View>
                <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                        <AppText style={styles.statNumber}>{stats.pending}</AppText>
                        <AppText style={styles.statLabel}>Pendentes</AppText>
                    </View>
                    <View style={styles.statItem}>
                        <AppText style={styles.statNumber}>{stats.approved}</AppText>
                        <AppText style={styles.statLabel}>Aprovados</AppText>
                    </View>
                    <View style={styles.statItem}>
                        <AppText style={styles.statNumber}>{stats.total}</AppText>
                        <AppText style={styles.statLabel}>Total</AppText>
                    </View>
                </View>
            </View>

            {/* Filtros */}
            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={[styles.filterButton, selectedFilter === 'all' && styles.filterButtonActive]}
                    onPress={() => setSelectedFilter('all')}
                >
                    <AppText style={[styles.filterButtonText, selectedFilter === 'all' && styles.filterButtonTextActive]}>
                        Todos
                    </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterButton, selectedFilter === 'pending' && styles.filterButtonActive]}
                    onPress={() => setSelectedFilter('pending')}
                >
                    <AppText style={[styles.filterButtonText, selectedFilter === 'pending' && styles.filterButtonTextActive]}>
                        Pendentes
                    </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterButton, selectedFilter === 'approved' && styles.filterButtonActive]}
                    onPress={() => setSelectedFilter('approved')}
                >
                    <AppText style={[styles.filterButtonText, selectedFilter === 'approved' && styles.filterButtonTextActive]}>
                        Aprovados
                    </AppText>
                </TouchableOpacity>
            </View>

            {/* Lista */}
            <FlatList
                data={properties}
                removeClippedSubviews={true}
                maxToRenderPerBatch={5}
                windowSize={10}
                initialNumToRender={5}
                getItemLayout={(data, index) => ({
                    length: 200, // altura estimada de cada item
                    offset: 200 * index,
                    index,
                })}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderPropertyItem}
                contentContainerStyle={styles.listContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListFooterComponent={
                    listLoading ? (
                        <View style={{ paddingVertical: 20 }}>
                            <ActivityIndicator size="small" color="#00335e" />
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="home-outline" size={64} color="#bdc3c7" />
                        <AppText style={styles.emptyText}>Nenhum anúncio encontrado</AppText>
                        <AppText style={styles.emptySubtext}>
                            Você ainda não criou nenhum anúncio
                        </AppText>
                        <TouchableOpacity
                            style={styles.createAdButton}
                            onPress={() => {
                                // ✅ Usar dados do Zustand (sem chamada ao banco)
                                if (canCreateAd) {
                                    navigation.navigate('CreateAd');
                                } else {
                                    Alert.alert(
                                        'Não é possível criar anúncio',
                                        createAdReason || 'Verifique seu plano.',
                                        [
                                            { text: 'Cancelar', style: 'cancel' },
                                            { text: 'Ver Planos', onPress: () => navigation.navigate('Plans') }
                                        ]
                                    );
                                }
                            }}
                        >
                            <AppText style={styles.createAdButtonText}>Criar Primeiro Anúncio</AppText>
                        </TouchableOpacity>
                    </View>
                }
            />

            {/* Modal de Edição */}
            <Modal
                visible={editModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setEditModalVisible(false)}
                        >
                            <Ionicons name="close" size={24} color="#00335e" />
                        </TouchableOpacity>
                        <AppText style={styles.modalTitle}>Editar Anúncio</AppText>
                        <TouchableOpacity
                            style={styles.modalSaveButton}
                            onPress={handleSaveEdit}
                            disabled={editLoading}
                        >
                            {editLoading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <AppText style={styles.modalSaveButtonText}>Salvar</AppText>
                            )}
                        </TouchableOpacity>
                    </View>

                    <KeyboardAvoidingView
                        style={{ flex: 1 }}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    >
                        <TouchableWithoutFeedback onPress={closeAllDropdowns}>
                            <ScrollView style={styles.modalContent}>
                                <View style={styles.formContainer}>
                                    <View style={styles.inputGroup}>
                                        <AppText style={styles.inputLabel}>Título do Anúncio *</AppText>
                                        <TextInput
                                            style={styles.textInput}
                                            value={editForm.title}
                                            onChangeText={(value) => setEditForm(prev => ({ ...prev, title: value }))}
                                            placeholder="Ex: Casa com 3 quartos em condomínio"
                                            placeholderTextColor="#7f8c8d"
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <AppText style={styles.inputLabel}>Descrição</AppText>
                                        <TextInput
                                            style={[styles.textInput, styles.textArea]}
                                            value={editForm.description}
                                            onChangeText={(value) => setEditForm(prev => ({ ...prev, description: value }))}
                                            placeholder="Descreva detalhes do imóvel..."
                                            placeholderTextColor="#7f8c8d"
                                            multiline
                                            numberOfLines={4}
                                        />
                                    </View>

                                    <View style={styles.row}>
                                        <View style={[styles.inputGroup, styles.halfWidth]}>
                                            <AppText style={styles.inputLabel}>Preço *</AppText>
                                            <TextInput
                                                style={styles.textInput}
                                                value={editForm.price}
                                                onChangeText={handleEditPriceChange}
                                                placeholder="R$ 0,00"
                                                placeholderTextColor="#7f8c8d"
                                                keyboardType="numeric"
                                            />
                                        </View>
                                        <View style={[styles.inputGroup, styles.halfWidth]}>
                                            <AppText style={styles.inputLabel}>Preço Promocional</AppText>
                                            <TextInput
                                                style={styles.textInput}
                                                value={editForm.salePrice}
                                                onChangeText={handleEditSalePriceChange}
                                                placeholder="R$ 0,00"
                                                placeholderTextColor="#7f8c8d"
                                                keyboardType="numeric"
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.row}>
                                        <View style={[styles.inputGroup, styles.halfWidth]}>
                                            <AppText style={styles.inputLabel}>Área (m²)</AppText>
                                            <TextInput
                                                style={styles.textInput}
                                                value={editForm.area}
                                                onChangeText={(value) => setEditForm(prev => ({ ...prev, area: value }))}
                                                placeholder="0"
                                                placeholderTextColor="#7f8c8d"
                                                keyboardType="numeric"
                                            />
                                        </View>
                                    </View>

                                    {/* Tipo de Imóvel */}
                                    <AppText style={[styles.sectionTitle, styles.sectionTitleWithMargin]}>Tipo de Imóvel</AppText>

                                    <View style={styles.row}>
                                        <View style={[styles.inputGroup, styles.halfWidth]}>
                                            <AppText style={styles.inputLabel}>Tipo *</AppText>
                                            <TouchableOpacity
                                                style={styles.dropdownButton}
                                                onPress={() => {
                                                    closeAllDropdowns();
                                                    setShowPropertyTypeDropdown(!showPropertyTypeDropdown);
                                                }}
                                            >
                                                <AppText style={[
                                                    styles.dropdownButtonText,
                                                    !editForm.propertyType && styles.placeholderText
                                                ]}>
                                                    {editForm.propertyType || 'Selecione o tipo'}
                                                </AppText>
                                                <Ionicons
                                                    name={showPropertyTypeDropdown ? 'chevron-up' : 'chevron-down'}
                                                    size={20}
                                                    color="#7f8c8d"
                                                />
                                            </TouchableOpacity>

                                            {showPropertyTypeDropdown && (
                                                <View style={styles.dropdownList}>
                                                    <ScrollView
                                                        style={styles.dropdownScroll}
                                                        showsVerticalScrollIndicator={true}
                                                        indicatorStyle="black"
                                                        nestedScrollEnabled={true}
                                                    >
                                                        {propertyTypes.map((type, index) => (
                                                            <TouchableOpacity
                                                                key={index}
                                                                style={styles.dropdownItem}
                                                                onPress={() => {
                                                                    setEditForm(prev => ({ ...prev, propertyType: type }));
                                                                    setShowPropertyTypeDropdown(false);
                                                                }}
                                                            >
                                                                <AppText style={styles.dropdownItemText}>{type}</AppText>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </ScrollView>
                                                </View>
                                            )}
                                        </View>
                                        <View style={[styles.inputGroup, styles.halfWidth]}>
                                            <AppText style={styles.inputLabel}>Transação *</AppText>
                                            <TouchableOpacity
                                                style={styles.dropdownButton}
                                                onPress={() => {
                                                    closeAllDropdowns();
                                                    setShowTransactionTypeDropdown(!showTransactionTypeDropdown);
                                                }}
                                            >
                                                <AppText style={[
                                                    styles.dropdownButtonText,
                                                    !editForm.transactionType && styles.placeholderText
                                                ]}>
                                                    {editForm.transactionType || 'Selecione a transação'}
                                                </AppText>
                                                <Ionicons
                                                    name={showTransactionTypeDropdown ? 'chevron-up' : 'chevron-down'}
                                                    size={20}
                                                    color="#7f8c8d"
                                                />
                                            </TouchableOpacity>

                                            {showTransactionTypeDropdown && (
                                                <View style={styles.dropdownList}>
                                                    <ScrollView
                                                        style={styles.dropdownScroll}
                                                        showsVerticalScrollIndicator={true}
                                                        indicatorStyle="black"
                                                        nestedScrollEnabled={true}
                                                    >
                                                        {transactionTypes.map((type, index) => (
                                                            <TouchableOpacity
                                                                key={index}
                                                                style={styles.dropdownItem}
                                                                onPress={() => {
                                                                    setEditForm(prev => ({ ...prev, transactionType: type }));
                                                                    setShowTransactionTypeDropdown(false);
                                                                }}
                                                            >
                                                                <AppText style={styles.dropdownItemText}>{type}</AppText>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </ScrollView>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    <View style={styles.row}>
                                        <View style={[styles.inputGroup, styles.thirdWidth]}>
                                            <AppText style={styles.inputLabel}>Quartos</AppText>
                                            <TouchableOpacity
                                                style={styles.dropdownButton}
                                                onPress={() => {
                                                    closeAllDropdowns();
                                                    setShowBedroomsDropdown(!showBedroomsDropdown);
                                                }}
                                            >
                                                <AppText style={[
                                                    styles.dropdownButtonText,
                                                    !editForm.bedrooms && styles.placeholderText
                                                ]}>
                                                    {editForm.bedrooms || '0'}
                                                </AppText>
                                                <Ionicons
                                                    name={showBedroomsDropdown ? 'chevron-up' : 'chevron-down'}
                                                    size={20}
                                                    color="#7f8c8d"
                                                />
                                            </TouchableOpacity>

                                            {showBedroomsDropdown && (
                                                <View style={styles.dropdownList}>
                                                    <ScrollView
                                                        style={styles.dropdownScroll}
                                                        showsVerticalScrollIndicator={true}
                                                        indicatorStyle="black"
                                                        nestedScrollEnabled={true}
                                                    >
                                                        {numericOptions.map((value, index) => (
                                                            <TouchableOpacity
                                                                key={index}
                                                                style={styles.dropdownItem}
                                                                onPress={() => {
                                                                    setEditForm(prev => ({ ...prev, bedrooms: value }));
                                                                    setShowBedroomsDropdown(false);
                                                                }}
                                                            >
                                                                <AppText style={styles.dropdownItemText}>{value}</AppText>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </ScrollView>
                                                </View>
                                            )}
                                        </View>
                                        <View style={[styles.inputGroup, styles.thirdWidth]}>
                                            <AppText style={styles.inputLabel}>Banheiros</AppText>
                                            <TouchableOpacity
                                                style={styles.dropdownButton}
                                                onPress={() => {
                                                    closeAllDropdowns();
                                                    setShowBathroomsDropdown(!showBathroomsDropdown);
                                                }}
                                            >
                                                <AppText style={[
                                                    styles.dropdownButtonText,
                                                    !editForm.bathrooms && styles.placeholderText
                                                ]}>
                                                    {editForm.bathrooms || '0'}
                                                </AppText>
                                                <Ionicons
                                                    name={showBathroomsDropdown ? 'chevron-up' : 'chevron-down'}
                                                    size={20}
                                                    color="#7f8c8d"
                                                />
                                            </TouchableOpacity>

                                            {showBathroomsDropdown && (
                                                <View style={styles.dropdownList}>
                                                    <ScrollView
                                                        style={styles.dropdownScroll}
                                                        showsVerticalScrollIndicator={true}
                                                        indicatorStyle="black"
                                                        nestedScrollEnabled={true}
                                                    >
                                                        {numericOptions.map((value, index) => (
                                                            <TouchableOpacity
                                                                key={index}
                                                                style={styles.dropdownItem}
                                                                onPress={() => {
                                                                    setEditForm(prev => ({ ...prev, bathrooms: value }));
                                                                    setShowBathroomsDropdown(false);
                                                                }}
                                                            >
                                                                <AppText style={styles.dropdownItemText}>{value}</AppText>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </ScrollView>
                                                </View>
                                            )}
                                        </View>
                                        <View style={[styles.inputGroup, styles.thirdWidth]}>
                                            <AppText style={styles.inputLabel}>Vagas</AppText>
                                            <TouchableOpacity
                                                style={styles.dropdownButton}
                                                onPress={() => {
                                                    closeAllDropdowns();
                                                    setShowParkingDropdown(!showParkingDropdown);
                                                }}
                                            >
                                                <AppText style={[
                                                    styles.dropdownButtonText,
                                                    !editForm.parkingSpaces && styles.placeholderText
                                                ]}>
                                                    {editForm.parkingSpaces || '0'}
                                                </AppText>
                                                <Ionicons
                                                    name={showParkingDropdown ? 'chevron-up' : 'chevron-down'}
                                                    size={20}
                                                    color="#7f8c8d"
                                                />
                                            </TouchableOpacity>

                                            {showParkingDropdown && (
                                                <View style={styles.dropdownList}>
                                                    <ScrollView
                                                        style={styles.dropdownScroll}
                                                        showsVerticalScrollIndicator={true}
                                                        indicatorStyle="black"
                                                        nestedScrollEnabled={true}
                                                    >
                                                        {numericOptions.map((value, index) => (
                                                            <TouchableOpacity
                                                                key={index}
                                                                style={styles.dropdownItem}
                                                                onPress={() => {
                                                                    setEditForm(prev => ({ ...prev, parkingSpaces: value }));
                                                                    setShowParkingDropdown(false);
                                                                }}
                                                            >
                                                                <AppText style={styles.dropdownItemText}>{value}</AppText>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </ScrollView>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    {/* Localização */}
                                    <AppText style={[styles.sectionTitle, styles.sectionTitleWithMargin]}>Localização</AppText>

                                    <View style={styles.inputGroup}>
                                        <AppText style={styles.inputLabel}>Endereço *</AppText>
                                        <TextInput
                                            style={styles.textInput}
                                            value={editForm.address}
                                            onChangeText={(value) => setEditForm(prev => ({ ...prev, address: value }))}
                                            placeholder="Rua, número..."
                                            placeholderTextColor="#7f8c8d"
                                        />
                                    </View>

                                    <View style={styles.row}>
                                        <View style={[styles.inputGroup, styles.halfWidth]}>
                                            <AppText style={styles.inputLabel}>Bairro</AppText>
                                            <TextInput
                                                style={styles.textInput}
                                                value={editForm.neighborhood}
                                                onChangeText={(value) => setEditForm(prev => ({ ...prev, neighborhood: value }))}
                                                placeholder="Nome do bairro"
                                                placeholderTextColor="#7f8c8d"
                                            />
                                        </View>
                                        <View style={[styles.inputGroup, styles.halfWidth]}>
                                            <AppText style={styles.inputLabel}>CEP</AppText>
                                            <TextInput
                                                style={styles.textInput}
                                                value={editForm.zipCode}
                                                onChangeText={(value) => setEditForm(prev => ({ ...prev, zipCode: value }))}
                                                placeholder="00000-000"
                                                placeholderTextColor="#7f8c8d"
                                                keyboardType="numeric"
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.row}>
                                        <View style={[styles.inputGroup, styles.halfWidth]}>
                                            <AppText style={styles.inputLabel}>Cidade *</AppText>
                                            <TextInput
                                                style={styles.textInput}
                                                value={editForm.city}
                                                onChangeText={(value) => setEditForm(prev => ({ ...prev, city: value }))}
                                                placeholder="Nome da cidade"
                                                placeholderTextColor="#7f8c8d"
                                            />
                                        </View>
                                        <View style={[styles.inputGroup, styles.halfWidth]}>
                                            <AppText style={styles.inputLabel}>Estado *</AppText>
                                            <TextInput
                                                style={styles.textInput}
                                                value={editForm.state}
                                                onChangeText={(value) => setEditForm(prev => ({ ...prev, state: value }))}
                                                placeholder="UF"
                                                placeholderTextColor="#7f8c8d"
                                            />
                                        </View>
                                    </View>

                                    {/* Seção de Gerenciamento de Imagens */}
                                    <View style={styles.formGroup}>
                                        <View style={styles.mediaSectionHeader}>
                                            <AppText style={styles.formLabel}>Fotos</AppText>
                                            <TouchableOpacity
                                                style={styles.addMediaButton}
                                                onPress={addMedia}
                                            >
                                                <Ionicons name="add" size={16} color="#fff" />
                                                <AppText style={styles.addMediaButtonText}>Adicionar Fotos</AppText>
                                            </TouchableOpacity>
                                        </View>

                                        {editImages.length > 0 ? (
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                {editImages.map((image, index) => (
                                                    <View key={index} style={styles.editMediaItem}>
                                                        {renderMedia({ item: image, index, customStyle: styles.editMediaItemContent })}
                                                        <TouchableOpacity
                                                            style={styles.removeMediaButton}
                                                            onPress={() => removeImage(index)}
                                                        >
                                                            <Ionicons name="close-circle" size={26} color="#ef4444" />
                                                        </TouchableOpacity>
                                                        <View style={styles.editMediaTypeIcon}>
                                                            <Ionicons name="image" size={10} color="#fff" />
                                                        </View>
                                                    </View>
                                                ))}
                                            </ScrollView>
                                        ) : (
                                            <View style={styles.noMediaContainer}>
                                                <Ionicons name="images-outline" size={48} color="#bdc3c7" />
                                                <AppText style={styles.noMediaText}>Nenhuma foto adicionada</AppText>
                                                <AppText style={styles.noMediaSubtext}>
                                                    Toque em "Adicionar Fotos" para incluir imagens
                                                </AppText>
                                            </View>
                                        )}
                                    </View>

                                    {/* Seção de Gerenciamento de Vídeos do YouTube */}
                                    <View style={styles.formGroup}>
                                        <AppText style={styles.formLabel}>Vídeos do YouTube</AppText>
                                        <View style={styles.youtubeInputContainer}>
                                            <TextInput
                                                style={styles.youtubeInput}
                                                value={youtubeUrlInput}
                                                onChangeText={setYoutubeUrlInput}
                                                placeholder="Cole o link do YouTube aqui"
                                                placeholderTextColor="#7f8c8d"
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                            />
                                            <TouchableOpacity
                                                style={styles.addYoutubeButton}
                                                onPress={handleAddYouTubeUrl}
                                            >
                                                <AppText style={styles.addYoutubeButtonText}>Adicionar</AppText>
                                            </TouchableOpacity>
                                        </View>

                                        {editVideoUrls.length > 0 ? (
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                {editVideoUrls.map((videoUrl, index) => {
                                                    const videoId = extractYouTubeVideoId(videoUrl);
                                                    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                                                    
                                                    return (
                                                        <View key={index} style={styles.editMediaItem}>
                                                            <Image
                                                                source={{ uri: thumbnailUrl }}
                                                                style={styles.editMediaItemContent}
                                                                contentFit="cover"
                                                            />
                                                            <TouchableOpacity
                                                                style={styles.removeMediaButton}
                                                                onPress={() => removeVideoUrl(index)}
                                                            >
                                                                <Ionicons name="close-circle" size={26} color="#ef4444" />
                                                            </TouchableOpacity>
                                                            <View style={styles.editMediaTypeIcon}>
                                                                <Ionicons name="logo-youtube" size={10} color="#fff" />
                                                            </View>
                                                        </View>
                                                    );
                                                })}
                                            </ScrollView>
                                        ) : (
                                            <View style={styles.noMediaContainer}>
                                                <Ionicons name="logo-youtube" size={48} color="#bdc3c7" />
                                                <AppText style={styles.noMediaText}>Nenhum vídeo adicionado</AppText>
                                                <AppText style={styles.noMediaSubtext}>
                                                    Cole uma URL do YouTube acima e toque em "+"
                                                </AppText>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </ScrollView>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Modal de Confirmação de Exclusão */}
            <Modal
                visible={deleteModalVisible}
                transparent
                animationType="fade"
            >
                <View style={styles.deleteModalOverlay}>
                    <View style={styles.deleteModalContent}>
                        <Ionicons name="warning" size={48} color="#e74c3c" />
                        <AppText style={styles.deleteModalTitle}>Excluir Anúncio</AppText>
                        <AppText style={styles.deleteModalText}>
                            Tem certeza que deseja excluir "{selectedProperty?.title}"? Esta ação não pode ser desfeita.
                        </AppText>
                        <View style={styles.deleteModalButtons}>
                            <TouchableOpacity
                                style={styles.deleteModalCancelButton}
                                onPress={() => setDeleteModalVisible(false)}
                            >
                                <AppText style={styles.deleteModalCancelText}>Cancelar</AppText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.deleteModalConfirmButton}
                                onPress={handleDeleteProperty}
                                disabled={deleteLoading}
                            >
                                {deleteLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <AppText style={styles.deleteModalConfirmText}>Excluir</AppText>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#64748b',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#ffcc1e',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    backButton: {
        padding: 8,
    },
    headerContent: {
        flex: 1,
        marginHorizontal: 15,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#00335e',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    addButton: {
        backgroundColor: '#00335e',
        borderRadius: 20,
        padding: 8,
    },
    statsContainer: {
        backgroundColor: '#fff',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    planSummary: {
        marginBottom: 15,
    },
    planTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#00335e',
    },
    planLimit: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 2,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#00335e',
    },
    statLabel: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    filterContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    filterButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginHorizontal: 5,
        borderRadius: 20,
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
    },
    filterButtonActive: {
        backgroundColor: '#00335e',
    },
    filterButtonText: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '500',
    },
    filterButtonTextActive: {
        color: '#fff',
    },
    listContainer: {
        padding: 20,
    },
    propertyCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    propertyCardHeader: {
        padding: 15,
    },
    propertyInfo: {
        flex: 1,
    },
    propertyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    titleContainer: {
        flex: 1,
        marginRight: 10,
    },
    mediaCountContainer: {
        marginTop: 4,
    },
    mediaCounts: {
        flexDirection: 'row',
        gap: 8,
    },
    mediaCountItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    mediaCountText: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '500',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    badgesContainer: {
        flexDirection: 'column',
        gap: 4,
        alignItems: 'flex-end',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    boostedBadge: {
        backgroundColor: '#27ae60',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    boostedBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
    },
    toggleAdStatusBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        alignSelf: 'flex-start',
        marginTop: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    toggleAdStatusText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    propertyTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#00335e',
        flex: 1,
    },
    propertyLocation: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 5,
    },
    propertyPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#059669',
    },
    expandedContent: {
        paddingHorizontal: 15,
        paddingBottom: 15,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    expandedSection: {
        marginBottom: 15,
    },
    expandedSectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#00335e',
        marginBottom: 8,
    },
    expandedSectionText: {
        fontSize: 14,
        color: '#64748b',
        lineHeight: 20,
    },
    characteristicsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15,
    },
    characteristicItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    characteristicText: {
        fontSize: 14,
        color: '#64748b',
    },
    expandedImage: {
        width: width / 3,
        height: 100,
        marginRight: 10,
        borderRadius: 8,
    },
    mediaWrapper: {
        position: 'relative',
        marginRight: 10,
    },
    mediaContainer: {
        width: width / 3,
        height: 100,
        borderRadius: 8,
        overflow: 'hidden',
    },
    mediaItem: {
        width: width / 3,
        height: 100,
        borderRadius: 8,
    },
    // Estilo específico para mídia no modal de edição
    editMediaItemContent: {
        width: 80,
        height: 80,
        borderRadius: 8,
    },
    mediaTypeIcon: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 10,
        padding: 3,
    },
    invalidMediaText: {
        fontSize: 12,
        color: '#ef4444',
        textAlign: 'center',
        marginTop: 8,
        fontStyle: 'italic',
    },
    // Estilos para gerenciamento de mídia no modal
    mediaSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    addMediaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#00335e',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 5,
    },
    addMediaButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    editMediaItem: {
        position: 'relative',
        marginRight: 10,
        width: 80,
        height: 80,
    },
    removeMediaButton: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 10,
        zIndex: 1,
    },
    editMediaTypeIcon: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 8,
        padding: 2,
    },
    noMediaContainer: {
        alignItems: 'center',
        paddingVertical: 30,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderStyle: 'dashed',
    },
    noMediaText: {
        fontSize: 16,
        color: '#64748b',
        marginTop: 10,
        fontWeight: '500',
    },
    noMediaSubtext: {
        fontSize: 12,
        color: '#94a3b8',
        textAlign: 'center',
        marginTop: 5,
        lineHeight: 16,
    },
    youtubeInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 15,
    },
    youtubeInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 14,
        color: '#2c3e50',
        backgroundColor: '#fff',
    },
    addYoutubeButton: {
        backgroundColor: '#c4302b',
        borderRadius: 8,
        paddingHorizontal: 20,
        paddingVertical: 12,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 100,
    },
    addYoutubeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    expandedActions: {
        marginTop: 15,
    },
    viewDetailsButton: {
        backgroundColor: '#00335e',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
    },
    viewDetailsButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        gap: 5,
    },
    editButton: {
        backgroundColor: '#ebf8ff',
        borderWidth: 1,
        borderColor: '#3498db',
    },
    editButtonText: {
        color: '#3498db',
        fontSize: 14,
        fontWeight: '600',
    },
    deleteButton: {
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#e74c3c',
    },
    deleteButtonText: {
        color: '#e74c3c',
        fontSize: 14,
        fontWeight: '600',
    },
    boostButton: {
        backgroundColor: '#fff8e1',
        borderWidth: 1,
        borderColor: '#f39c12',
    },
    boostButtonText: {
        color: '#f39c12',
        fontSize: 14,
        fontWeight: '600',
    },
    boostButtonDisabled: {
        backgroundColor: '#f5f5f5',
        borderColor: '#95a5a6',
        opacity: 0.6,
    },
    boostButtonTextDisabled: {
        color: '#95a5a6',
    },
    boostStatusContainer: {
        backgroundColor: '#e8f5e9',
        borderLeftWidth: 4,
        borderLeftColor: '#27ae60',
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
    },
    boostStatusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 5,
    },
    boostStatusTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#27ae60',
    },
    boostStatusText: {
        fontSize: 13,
        color: '#2c3e50',
        marginLeft: 26,
    },
    viewDetailsButton: {
        backgroundColor: '#00335e',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
    },
    viewDetailsButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        gap: 5,
    },
    editButton: {
        backgroundColor: '#ebf8ff',
        borderWidth: 1,
        borderColor: '#3498db',
    },
    editButtonText: {
        color: '#3498db',
        fontSize: 14,
        fontWeight: '600',
    },
    deleteButton: {
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#e74c3c',
    },
    deleteButtonText: {
        color: '#e74c3c',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#64748b',
        marginTop: 15,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#94a3b8',
        textAlign: 'center',
        marginTop: 5,
        marginBottom: 20,
    },
    createAdButton: {
        backgroundColor: '#00335e',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    createAdButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    // Modal styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#ffcc1e',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    modalCloseButton: {
        padding: 8,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#00335e',
    },
    modalSaveButton: {
        backgroundColor: '#00335e',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 8,
    },
    modalSaveButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    formGroup: {
        marginBottom: 20,
    },
    formGroupHalf: {
        flex: 1,
        marginRight: 10,
    },
    formRow: {
        flexDirection: 'row',
        gap: 10,
    },
    formLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#00335e',
        marginBottom: 8,
    },
    formInput: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        color: '#1e3a8a',
        backgroundColor: '#fff',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    // Delete modal styles
    deleteModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteModalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 30,
        marginHorizontal: 40,
        alignItems: 'center',
    },
    deleteModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#00335e',
        marginTop: 15,
        marginBottom: 10,
    },
    deleteModalText: {
        fontSize: 16,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 25,
    },
    deleteModalButtons: {
        flexDirection: 'row',
        gap: 15,
    },
    deleteModalCancelButton: {
        borderWidth: 1,
        borderColor: '#00335e',
        borderRadius: 8,
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    deleteModalCancelText: {
        color: '#00335e',
        fontSize: 16,
        fontWeight: '600',
    },
    deleteModalConfirmButton: {
        backgroundColor: '#e74c3c',
        borderRadius: 8,
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    deleteModalConfirmText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },

    // Estilos do formulário de edição (iguais ao CreateAdScreen)
    formContainer: {
        padding: 20,
    },
    inputGroup: {
        marginBottom: 15,
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
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#00335e',
        marginBottom: 10,
    },
    sectionTitleWithMargin: {
        marginTop: 20,
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
        zIndex: 9999,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        marginTop: 2,
        overflow: 'hidden',
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
});
