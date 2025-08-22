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
import { PropertyService } from '../lib/propertyService';
import { supabase } from '../lib/supabase';
import { MediaServiceOptimized } from '../lib/mediaServiceOptimized';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

export default function MyPropertiesScreen({ navigation }) {
    const { user } = useAuth();
    const insets = useSafeAreaInsets();

    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [expandedItems, setExpandedItems] = useState(new Set());

    const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0 });
    const [userPlan, setUserPlan] = useState(null);

    const [editModalVisible, setEditModalVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [editingProperty, setEditingProperty] = useState(null);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [editForm, setEditForm] = useState({
        title: '', description: '', price: '', propertyType: '', transactionType: '',
        bedrooms: '', bathrooms: '', parkingSpaces: '', area: '', address: '',
        neighborhood: '', city: '', state: '', zipCode: ''
    });
    const [editImages, setEditImages] = useState([]);
    const [removedImages, setRemovedImages] = useState([]);
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

    const fetchProperties = useCallback(async (forceRefresh = false) => {
        if (!user?.id) return;
        setLoading(true);
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
            setLoading(false);
        }
    }, [user?.id, selectedFilter]);

    useEffect(() => {
        if (user?.id) {
            fetchStatsAndPlan();
            fetchProperties();
        }
    }, [user?.id]);

    // Recarregar dados quando a tela receber foco
    useFocusEffect(
        useCallback(() => {
            if (user?.id) {
                console.log('🔄 Tela MyPropertiesScreen recebeu foco, recarregando dados...');
                fetchStatsAndPlan();
                fetchProperties();
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

        setEditForm({
            title: property.title || '',
            description: property.description || '',
            price: formattedPrice,
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
            zipCode: property.zip_code || ''
        });
        setEditImages(property.images || []);
        setRemovedImages([]);
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
        if (!editForm.address.trim()) {
            Alert.alert('Erro', 'O endereço é obrigatório');
            return;
        }
        if (!editForm.city.trim()) {
            Alert.alert('Erro', 'A cidade é obrigatória');
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
                status: 'pending' // Voltar para pendente após edição
            };

            await PropertyService.updateProperty(editingProperty.id, updateData, newMediaFiles, removedImages);
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

    const handleDeleteProperty = async () => {
        if (!selectedProperty) return;
        setDeleteLoading(true);
        try {
            await PropertyService.deleteProperty(selectedProperty.id);
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
                mediaTypes: ImagePicker.MediaTypeOptions.All, // Permite imagens e vídeos
                allowsMultipleSelection: true,
                quality: 0.8,
                aspect: [4, 3],
                videoMaxDuration: 30, // Limite de 30 segundos para vídeos
            });

            if (!result.canceled && result.assets) {
                const newMedia = result.assets.map(asset => asset.uri);
                setEditImages(prev => [...prev, ...newMedia]);

                const imageCount = result.assets.filter(asset => asset.type === 'image').length;
                const videoCount = result.assets.filter(asset => asset.type === 'video').length;

                console.log(`✅ ${imageCount} imagem(ns) e ${videoCount} vídeo(s) adicionado(s) com sucesso`);
            }
        } catch (error) {
            console.error('Erro ao selecionar mídias:', error);
            Alert.alert('Erro', 'Não foi possível selecionar as mídias');
        }
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

        // Verificar se a URL contém apenas caracteres alfanuméricos e alguns especiais (não malformada)
        const urlPattern = /^https?:\/\/.+\..+/;

        // Verificar se não tem caracteres estranhos que podem causar erro
        const hasInvalidChars = /[^\w\-._~:/?#[\]@!$&'()*+,;=%]/.test(url);

        return urlPattern.test(url) && !hasInvalidChars;
    }, []);

    // Função para renderizar mídia (imagem ou vídeo)
    const renderMedia = useCallback(({ item, index, customStyle }) => {
        const mediaStyle = customStyle || styles.mediaItem;

        // Validação de URL
        if (!item || typeof item !== 'string' || item.trim() === '') {
            return (
                <View style={[mediaStyle, { backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="image-outline" size={30} color="#9ca3af" />
                    <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 5 }}>Mídia inválida</Text>
                </View>
            );
        }

        // Verificar se a URL é válida
        if (!isValidUrl(item)) {
            console.log(`⚠️ URL inválida detectada: ${item.substring(0, 50)}...`);
            return (
                <View style={[mediaStyle, { backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="warning-outline" size={30} color="#ef4444" />
                    <Text style={{ fontSize: 10, color: '#ef4444', marginTop: 5, textAlign: 'center' }}>URL malformada</Text>
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
                                <Text style={styles.propertyTitle} numberOfLines={1}>
                                    {item.title || 'Título indisponível'}
                                </Text>
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
                                                            <Text style={styles.mediaCountText}>{imageCount}</Text>
                                                        </View>
                                                    )}
                                                    {videoCount > 0 && (
                                                        <View style={styles.mediaCountItem}>
                                                            <Ionicons name="videocam" size={12} color="#64748b" />
                                                            <Text style={styles.mediaCountText}>{videoCount}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            );
                                        })()}
                                    </View>
                                )}
                            </View>
                            <View style={styles.headerRight}>
                                <View style={[
                                    styles.statusBadge,
                                    { backgroundColor: getStatusColor(item.status) }
                                ]}>
                                    <Text style={styles.statusText}>
                                        {getStatusText(item.status)}
                                    </Text>
                                </View>
                                <Ionicons
                                    name={isExpanded ? "chevron-up" : "chevron-down"}
                                    size={20}
                                    color="#64748b"
                                />
                            </View>
                        </View>
                        <Text style={styles.propertyLocation}>
                            {item.city || 'Cidade indisponível'}
                        </Text>
                        <Text style={styles.propertyPrice}>
                            R$ {item.price?.toLocaleString('pt-BR') || 'Preço indisponível'}
                        </Text>
                    </View>
                </TouchableOpacity>

                {isExpanded && (
                    <View style={styles.expandedContent}>
                        {item.description && (
                            <View style={styles.expandedSection}>
                                <Text style={styles.expandedSectionTitle}>Descrição</Text>
                                <Text style={styles.expandedSectionText}>{item.description}</Text>
                            </View>
                        )}

                        <View style={styles.expandedSection}>
                            <Text style={styles.expandedSectionTitle}>Características</Text>
                            <View style={styles.characteristicsGrid}>
                                {item.bedrooms && (
                                    <View style={styles.characteristicItem}>
                                        <Ionicons name="bed" size={16} color="#1e3a8a" />
                                        <Text style={styles.characteristicText}>{item.bedrooms} quartos</Text>
                                    </View>
                                )}
                                {item.bathrooms && (
                                    <View style={styles.characteristicItem}>
                                        <Ionicons name="water" size={16} color="#1e3a8a" />
                                        <Text style={styles.characteristicText}>{item.bathrooms} banheiros</Text>
                                    </View>
                                )}
                                {item.area && (
                                    <View style={styles.characteristicItem}>
                                        <Ionicons name="resize" size={16} color="#1e3a8a" />
                                        <Text style={styles.characteristicText}>{item.area}m²</Text>
                                    </View>
                                )}
                                {item.parking_spaces && (
                                    <View style={styles.characteristicItem}>
                                        <Ionicons name="car" size={16} color="#1e3a8a" />
                                        <Text style={styles.characteristicText}>{item.parking_spaces} vagas</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {item.images && item.images.length > 0 && (
                            <View style={styles.expandedSection}>
                                <Text style={styles.expandedSectionTitle}>Mídia</Text>
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
                                            <Text style={styles.invalidMediaText}>
                                                {invalidCount} mídia(s) com URL inválida(s) foram ocultada(s)
                                            </Text>
                                        );
                                    }
                                    return null;
                                })()}
                            </View>
                        )}

                        <View style={styles.expandedActions}>
                            {/* <TouchableOpacity
                                style={styles.viewDetailsButton}
                                onPress={() => navigation.navigate('PropertyDetails', { propertyId: item.id })}
                            >
                                <Text style={styles.viewDetailsButtonText}>Ver Detalhes Completos</Text>
                            </TouchableOpacity> */}

                            <View style={styles.actionButtons}>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.editButton]}
                                    onPress={() => openEditModal(item)}
                                >
                                    <Ionicons name="create-outline" size={18} color="#3498db" />
                                    <Text style={styles.editButtonText}>Editar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.deleteButton]}
                                    onPress={() => openDeleteModal(item)}
                                >
                                    <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                                    <Text style={styles.deleteButtonText}>Excluir</Text>
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
                    <Text style={styles.loadingText}>Carregando seus anúncios...</Text>
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
                    <Text style={styles.headerTitle}>Meus Anúncios</Text>
                    <Text style={styles.headerSubtitle}>Gerencie seus anúncios</Text>
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
                    <Text style={styles.planTitle}>
                        {userPlan?.plans?.display_name || 'Plano Básico'}
                    </Text>
                    <Text style={styles.planLimit}>
                        {stats.total}/{userPlan?.plans?.max_ads || 0} anúncios utilizados
                    </Text>
                </View>
                <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{stats.pending}</Text>
                        <Text style={styles.statLabel}>Pendentes</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{stats.approved}</Text>
                        <Text style={styles.statLabel}>Aprovados</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{stats.total}</Text>
                        <Text style={styles.statLabel}>Total</Text>
                    </View>
                </View>
            </View>

            {/* Filtros */}
            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={[styles.filterButton, selectedFilter === 'all' && styles.filterButtonActive]}
                    onPress={() => setSelectedFilter('all')}
                >
                    <Text style={[styles.filterButtonText, selectedFilter === 'all' && styles.filterButtonTextActive]}>
                        Todos
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterButton, selectedFilter === 'pending' && styles.filterButtonActive]}
                    onPress={() => setSelectedFilter('pending')}
                >
                    <Text style={[styles.filterButtonText, selectedFilter === 'pending' && styles.filterButtonTextActive]}>
                        Pendentes
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterButton, selectedFilter === 'approved' && styles.filterButtonActive]}
                    onPress={() => setSelectedFilter('approved')}
                >
                    <Text style={[styles.filterButtonText, selectedFilter === 'approved' && styles.filterButtonTextActive]}>
                        Aprovados
                    </Text>
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
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="home-outline" size={64} color="#bdc3c7" />
                        <Text style={styles.emptyText}>Nenhum anúncio encontrado</Text>
                        <Text style={styles.emptySubtext}>
                            Você ainda não criou nenhum anúncio
                        </Text>
                        <TouchableOpacity
                            style={styles.createAdButton}
                            onPress={() => navigation.navigate('CreateAd')}
                        >
                            <Text style={styles.createAdButtonText}>Criar Primeiro Anúncio</Text>
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
                        <Text style={styles.modalTitle}>Editar Anúncio</Text>
                        <TouchableOpacity
                            style={styles.modalSaveButton}
                            onPress={handleSaveEdit}
                            disabled={editLoading}
                        >
                            {editLoading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.modalSaveButtonText}>Salvar</Text>
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
                                        <Text style={styles.inputLabel}>Título do Anúncio *</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            value={editForm.title}
                                            onChangeText={(value) => setEditForm(prev => ({ ...prev, title: value }))}
                                            placeholder="Ex: Casa com 3 quartos em condomínio"
                                            placeholderTextColor="#7f8c8d"
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Descrição</Text>
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
                                            <Text style={styles.inputLabel}>Preço *</Text>
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
                                            <Text style={styles.inputLabel}>Área (m²)</Text>
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
                                    <Text style={[styles.sectionTitle, styles.sectionTitleWithMargin]}>Tipo de Imóvel</Text>

                                    <View style={styles.row}>
                                        <View style={[styles.inputGroup, styles.halfWidth]}>
                                            <Text style={styles.inputLabel}>Tipo *</Text>
                                            <TouchableOpacity
                                                style={styles.dropdownButton}
                                                onPress={() => {
                                                    closeAllDropdowns();
                                                    setShowPropertyTypeDropdown(!showPropertyTypeDropdown);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.dropdownButtonText,
                                                    !editForm.propertyType && styles.placeholderText
                                                ]}>
                                                    {editForm.propertyType || 'Selecione o tipo'}
                                                </Text>
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
                                                                <Text style={styles.dropdownItemText}>{type}</Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </ScrollView>
                                                </View>
                                            )}
                                        </View>
                                        <View style={[styles.inputGroup, styles.halfWidth]}>
                                            <Text style={styles.inputLabel}>Transação *</Text>
                                            <TouchableOpacity
                                                style={styles.dropdownButton}
                                                onPress={() => {
                                                    closeAllDropdowns();
                                                    setShowTransactionTypeDropdown(!showTransactionTypeDropdown);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.dropdownButtonText,
                                                    !editForm.transactionType && styles.placeholderText
                                                ]}>
                                                    {editForm.transactionType || 'Selecione a transação'}
                                                </Text>
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
                                                                <Text style={styles.dropdownItemText}>{type}</Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </ScrollView>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    <View style={styles.row}>
                                        <View style={[styles.inputGroup, styles.thirdWidth]}>
                                            <Text style={styles.inputLabel}>Quartos</Text>
                                            <TouchableOpacity
                                                style={styles.dropdownButton}
                                                onPress={() => {
                                                    closeAllDropdowns();
                                                    setShowBedroomsDropdown(!showBedroomsDropdown);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.dropdownButtonText,
                                                    !editForm.bedrooms && styles.placeholderText
                                                ]}>
                                                    {editForm.bedrooms || '0'}
                                                </Text>
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
                                                                <Text style={styles.dropdownItemText}>{value}</Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </ScrollView>
                                                </View>
                                            )}
                                        </View>
                                        <View style={[styles.inputGroup, styles.thirdWidth]}>
                                            <Text style={styles.inputLabel}>Banheiros</Text>
                                            <TouchableOpacity
                                                style={styles.dropdownButton}
                                                onPress={() => {
                                                    closeAllDropdowns();
                                                    setShowBathroomsDropdown(!showBathroomsDropdown);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.dropdownButtonText,
                                                    !editForm.bathrooms && styles.placeholderText
                                                ]}>
                                                    {editForm.bathrooms || '0'}
                                                </Text>
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
                                                                <Text style={styles.dropdownItemText}>{value}</Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </ScrollView>
                                                </View>
                                            )}
                                        </View>
                                        <View style={[styles.inputGroup, styles.thirdWidth]}>
                                            <Text style={styles.inputLabel}>Vagas</Text>
                                            <TouchableOpacity
                                                style={styles.dropdownButton}
                                                onPress={() => {
                                                    closeAllDropdowns();
                                                    setShowParkingDropdown(!showParkingDropdown);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.dropdownButtonText,
                                                    !editForm.parkingSpaces && styles.placeholderText
                                                ]}>
                                                    {editForm.parkingSpaces || '0'}
                                                </Text>
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
                                                                <Text style={styles.dropdownItemText}>{value}</Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </ScrollView>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    {/* Localização */}
                                    <Text style={[styles.sectionTitle, styles.sectionTitleWithMargin]}>Localização</Text>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Endereço *</Text>
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
                                            <Text style={styles.inputLabel}>Bairro</Text>
                                            <TextInput
                                                style={styles.textInput}
                                                value={editForm.neighborhood}
                                                onChangeText={(value) => setEditForm(prev => ({ ...prev, neighborhood: value }))}
                                                placeholder="Nome do bairro"
                                                placeholderTextColor="#7f8c8d"
                                            />
                                        </View>
                                        <View style={[styles.inputGroup, styles.halfWidth]}>
                                            <Text style={styles.inputLabel}>CEP</Text>
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
                                            <Text style={styles.inputLabel}>Cidade *</Text>
                                            <TextInput
                                                style={styles.textInput}
                                                value={editForm.city}
                                                onChangeText={(value) => setEditForm(prev => ({ ...prev, city: value }))}
                                                placeholder="Nome da cidade"
                                                placeholderTextColor="#7f8c8d"
                                            />
                                        </View>
                                        <View style={[styles.inputGroup, styles.halfWidth]}>
                                            <Text style={styles.inputLabel}>Estado *</Text>
                                            <TextInput
                                                style={styles.textInput}
                                                value={editForm.state}
                                                onChangeText={(value) => setEditForm(prev => ({ ...prev, state: value }))}
                                                placeholder="UF"
                                                placeholderTextColor="#7f8c8d"
                                            />
                                        </View>
                                    </View>

                                    {/* Seção de Gerenciamento de Mídias */}
                                    <View style={styles.formGroup}>
                                        <View style={styles.mediaSectionHeader}>
                                            <Text style={styles.formLabel}>Mídias (Imagens e Vídeos)</Text>
                                            <TouchableOpacity
                                                style={styles.addMediaButton}
                                                onPress={addMedia}
                                            >
                                                <Ionicons name="add" size={16} color="#fff" />
                                                <Text style={styles.addMediaButtonText}>Adicionar Mídia</Text>
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
                                                            <Ionicons name="close-circle" size={20} color="#ef4444" />
                                                        </TouchableOpacity>
                                                        {/* Ícone indicativo de tipo de mídia */}
                                                        <View style={styles.editMediaTypeIcon}>
                                                            <Ionicons
                                                                name={isVideoFile(image) ? "videocam" : "image"}
                                                                size={10}
                                                                color="#fff"
                                                            />
                                                        </View>
                                                    </View>
                                                ))}
                                            </ScrollView>
                                        ) : (
                                            <View style={styles.noMediaContainer}>
                                                <Ionicons name="images-outline" size={48} color="#bdc3c7" />
                                                <Text style={styles.noMediaText}>Nenhuma mídia adicionada</Text>
                                                <Text style={styles.noMediaSubtext}>
                                                    Toque em "Adicionar" para incluir imagens ou vídeos
                                                </Text>
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
                        <Text style={styles.deleteModalTitle}>Excluir Anúncio</Text>
                        <Text style={styles.deleteModalText}>
                            Tem certeza que deseja excluir "{selectedProperty?.title}"? Esta ação não pode ser desfeita.
                        </Text>
                        <View style={styles.deleteModalButtons}>
                            <TouchableOpacity
                                style={styles.deleteModalCancelButton}
                                onPress={() => setDeleteModalVisible(false)}
                            >
                                <Text style={styles.deleteModalCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.deleteModalConfirmButton}
                                onPress={handleDeleteProperty}
                                disabled={deleteLoading}
                            >
                                {deleteLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.deleteModalConfirmText}>Excluir</Text>
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
        paddingHorizontal: 12,
        paddingVertical: 8,
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
        top: -5,
        right: -5,
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
