import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList, Image,
    Alert, RefreshControl, Modal, ScrollView, TextInput, ActivityIndicator,
    Dimensions, Platform
} from 'react-native';
import { Video } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { PropertyService } from '../lib/propertyService';
import { supabase } from '../lib/supabase';

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
    const [editLoading, setEditLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

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

    const fetchProperties = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const data = await PropertyService.getUserProperties(user.id, selectedFilter === 'all' ? null : selectedFilter);
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

    useFocusEffect(
        useCallback(() => {
            if (user?.id) {
                fetchStatsAndPlan();
                fetchProperties();
            }
        }, [user?.id])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchStatsAndPlan(), fetchProperties()]);
        setRefreshing(false);
    };

    /** ------------------ MODALS ------------------ **/

    const openEditModal = (property) => {
        setEditingProperty(property);
        setEditForm({
            title: property.title || '',
            description: property.description || '',
            price: property.price?.toString() || '',
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
            await PropertyService.updateProperty(editingProperty.id, editForm);
            Alert.alert('Sucesso', 'Anúncio atualizado com sucesso!');
            setEditModalVisible(false);
            fetchProperties();
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
            fetchProperties();
        } catch (err) {
            console.error('Erro ao deletar propriedade:', err);
            Alert.alert('Erro', 'Não foi possível excluir o anúncio');
        } finally {
            setDeleteLoading(false);
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
    const renderMedia = useCallback(({ item, index }) => {
        // Validação de URL
        if (!item || typeof item !== 'string' || item.trim() === '') {
            return (
                <View style={[styles.mediaItem, { backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="image-outline" size={30} color="#9ca3af" />
                    <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 5 }}>Mídia inválida</Text>
                </View>
            );
        }

        // Verificar se a URL é válida
        if (!isValidUrl(item)) {
            console.log(`⚠️ URL inválida detectada: ${item.substring(0, 50)}...`);
            return (
                <View style={[styles.mediaItem, { backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="warning-outline" size={30} color="#ef4444" />
                    <Text style={{ fontSize: 10, color: '#ef4444', marginTop: 5, textAlign: 'center' }}>URL malformada</Text>
                </View>
            );
        }

        const isVideo = isVideoFile(item);

        if (isVideo) {
            return (
                <View style={styles.mediaContainer}>
                    <Video
                        source={{ uri: item }}
                        style={styles.mediaItem}
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
                style={styles.mediaItem}
                resizeMode="cover"
                onError={(error) => {
                    console.error(`❌ Erro na imagem ${index}:`, error);
                }}
                onLoadStart={() => {
                    console.log(`🖼️ Carregando imagem ${index}: ${item.substring(0, 50)}...`);
                }}
            />
        );
    }, [isVideoFile, isValidUrl]);

    const renderPropertyItem = ({ item }) => {
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
    };

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
                    <ScrollView style={styles.modalContent}>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Título *</Text>
                            <TextInput
                                style={styles.formInput}
                                value={editForm.title}
                                onChangeText={(text) => setEditForm(prev => ({ ...prev, title: text }))}
                                placeholder="Título do anúncio"
                            />
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Descrição</Text>
                            <TextInput
                                style={[styles.formInput, styles.textArea]}
                                value={editForm.description}
                                onChangeText={(text) => setEditForm(prev => ({ ...prev, description: text }))}
                                placeholder="Descrição detalhada"
                                multiline
                            />
                        </View>
                        <View style={styles.formRow}>
                            <View style={styles.formGroupHalf}>
                                <Text style={styles.formLabel}>Preço *</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={editForm.price}
                                    onChangeText={(text) => setEditForm(prev => ({ ...prev, price: text }))}
                                    placeholder="0,00"
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={styles.formGroupHalf}>
                                <Text style={styles.formLabel}>Tipo</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={editForm.propertyType}
                                    onChangeText={(text) => setEditForm(prev => ({ ...prev, propertyType: text }))}
                                    placeholder="Casa, Apartamento..."
                                />
                            </View>
                        </View>
                        <View style={styles.formRow}>
                            <View style={styles.formGroupHalf}>
                                <Text style={styles.formLabel}>Quartos</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={editForm.bedrooms}
                                    onChangeText={(text) => setEditForm(prev => ({ ...prev, bedrooms: text }))}
                                    placeholder="0"
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={styles.formGroupHalf}>
                                <Text style={styles.formLabel}>Banheiros</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={editForm.bathrooms}
                                    onChangeText={(text) => setEditForm(prev => ({ ...prev, bathrooms: text }))}
                                    placeholder="0"
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Endereço *</Text>
                            <TextInput
                                style={styles.formInput}
                                value={editForm.address}
                                onChangeText={(text) => setEditForm(prev => ({ ...prev, address: text }))}
                                placeholder="Endereço completo"
                            />
                        </View>
                        <View style={styles.formRow}>
                            <View style={styles.formGroupHalf}>
                                <Text style={styles.formLabel}>Cidade *</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={editForm.city}
                                    onChangeText={(text) => setEditForm(prev => ({ ...prev, city: text }))}
                                    placeholder="Cidade"
                                />
                            </View>
                            <View style={styles.formGroupHalf}>
                                <Text style={styles.formLabel}>Estado</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={editForm.state}
                                    onChangeText={(text) => setEditForm(prev => ({ ...prev, state: text }))}
                                    placeholder="Estado"
                                />
                            </View>
                        </View>
                    </ScrollView>
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
});
