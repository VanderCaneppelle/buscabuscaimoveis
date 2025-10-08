import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    RefreshControl,
    Alert,
    Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useFavoritesStore } from '../stores/favoritesStore';
import StandardHeader from './StandardHeader';

const { width } = Dimensions.get('window');

export default function FavoritesScreen({ navigation }) {
    console.log('Rendered FavoritesScreen');

    const { user } = useAuth();
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Zustand
    const toggleFavorite = useFavoritesStore(state => state.toggleFavorite);
    const isFavorite = useFavoritesStore(state => state.isFavorite);

    useEffect(() => {
        if (user?.id) {

            fetchFavorites();
        }
    }, [user?.id]);

    // Sincronizar favoritos quando a tela receber foco
    useFocusEffect(
        React.useCallback(() => {
            if (user?.id) {

                fetchFavorites();
            }
        }, [user?.id])
    );

    const fetchFavorites = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('favorites')
                .select(`
                    *,
                    properties (
                        id,
                        title,
                        description,
                        price,
                        sale_price,
                        property_type,
                        transaction_type,
                        bedrooms,
                        bathrooms,
                        area,
                        address,
                        neighborhood,
                        city,
                        state,
                        images,
                        status
                    )
                `)
                .eq('user_id', user.id)
                .eq('properties.status', 'approved')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Erro ao buscar favoritos:', error);
            } else {
                setFavorites(data || []);
            }
        } catch (error) {
            console.error('Erro ao buscar favoritos:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchFavorites();
        setRefreshing(false);
    };

    const handleUnfavoriteLocal = useCallback((propertyId) => {
        // Remove o item da lista local quando deixar de ser favorito
        setFavorites(prev => prev.filter(fav => fav.properties?.id !== propertyId));
    }, []);

    // Componente para renderizar propriedades (igual ao da HomeScreen)
    const PropertyItem = React.memo(({ item, index, onRemoved }) => {
        const property = item.properties;
        if (!property) return null;
        // Na tela de favoritos, todos os itens são favoritos por definição
        const favNow = true; // Sempre true na FavoritesScreen

        // Memoizar o onPress para evitar re-renderizações
        const handlePress = useCallback(() => {
            navigation.navigate('PropertyDetails', { property: property });
        }, [navigation, property]);

        const handleToggleFavorite = useCallback(() => {
            // Na FavoritesScreen, pedir confirmação antes de remover
            Alert.alert(
                'Remover dos favoritos',
                `Deseja remover "${property.title ?? 'este imóvel'}" dos favoritos?`,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Remover',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await toggleFavorite(property.id);
                                if (typeof onRemoved === 'function') {
                                    onRemoved(property.id);
                                }
                            } catch (error) {
                                console.error('Erro ao desfavoritar:', error);
                                Alert.alert('Erro', 'Não foi possível remover dos favoritos');
                            }
                        }
                    }
                ]
            );
        }, [property.id, property.title, toggleFavorite, onRemoved]);

        const mediaFiles = property.images || [];
        const [currentIndex, setCurrentIndex] = useState(0);

        // Separar imagens e vídeos (simplificado)
        const imageFiles = mediaFiles.filter(file =>
            !file.includes('.mp4') && !file.includes('.mov') && !file.includes('.avi') &&
            !file.includes('.mkv') && !file.includes('.webm')
        );

        const videoFiles = mediaFiles.filter(file =>
            file.includes('.mp4') || file.includes('.mov') || file.includes('.avi') ||
            file.includes('.mkv') || file.includes('.webm')
        );

        const hasMultipleMedia = imageFiles.length > 1;
        const hasVideos = videoFiles.length > 0;

        // Fallback para quando não há imagens
        const defaultImage = 'https://via.placeholder.com/300x200?text=Sem+Imagem';
        const displayMediaFiles = imageFiles.length > 0 ? imageFiles : [defaultImage];

        const handleImageScroll = useCallback((event) => {
            const contentOffset = event.nativeEvent.contentOffset.x;
            const imageIndex = Math.round(contentOffset / (width - 40));
            setCurrentIndex(imageIndex);
        }, []);

        const renderMediaItem = useCallback(({ item: mediaItem, mediaIndex }) => {
            return (
                <Image
                    source={{ uri: mediaItem }}
                    style={styles.mediaItem}
                    contentFit="cover"
                    cachePolicy="disk"
                    placeholder={require('../assets/icon.png')}
                    transition={0} // Remover transição para melhor performance
                    priority="low"
                />
            );
        }, []);

        return (
            <View style={styles.propertyCard}>
                <View style={styles.mediaSection}>
                    <FlatList
                        data={displayMediaFiles}
                        renderItem={renderMediaItem}
                        keyExtractor={(mediaItem, mediaIndex) => `${index}-${mediaIndex}`}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={handleImageScroll}
                        scrollEventThrottle={16}
                        style={styles.mediaList}
                        nestedScrollEnabled={true}
                        scrollEnabled={true}
                        bounces={false}
                        decelerationRate="fast"
                        removeClippedSubviews={false}
                        maxToRenderPerBatch={3}
                        windowSize={3}
                        initialNumToRender={3}
                        updateCellsBatchingPeriod={100}
                    />

                    {/* Indicadores de múltiplas imagens */}
                    {hasMultipleMedia && (
                        <View style={styles.mediaIndicators}>
                            {displayMediaFiles.map((_, mediaIndex) => (
                                <View
                                    key={mediaIndex}
                                    style={[
                                        styles.mediaIndicator,
                                        mediaIndex === currentIndex && styles.mediaIndicatorActive
                                    ]}
                                />
                            ))}
                        </View>
                    )}

                    {/* Indicador de quantidade de mídias */}
                    {hasMultipleMedia && (
                        <View style={styles.mediaCountBadge}>
                            <Text style={styles.mediaCountText}>
                                {currentIndex + 1}/{displayMediaFiles.length}
                            </Text>
                        </View>
                    )}

                    {/* Ícones de tipo de mídia */}
                    {(imageFiles.length > 0 || videoFiles.length > 0) && (
                        <View style={styles.mediaTypeBadge}>
                            {imageFiles.length > 0 && (
                                <View style={styles.mediaTypeItem}>
                                    <Ionicons name="image" size={14} color="#fff" />
                                    <Text style={styles.mediaTypeText}>{imageFiles.length}</Text>
                                </View>
                            )}
                            {videoFiles.length > 0 && (
                                <View style={styles.mediaTypeItem}>
                                    <Ionicons name="videocam" size={14} color="#fff" />
                                    <Text style={styles.mediaTypeText}>{videoFiles.length}</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Botão de Desfavoritar (ícone específico para FavoritesScreen) */}
                    <TouchableOpacity
                        style={styles.favoriteButton}
                        onPress={handleToggleFavorite}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name="heart-dislike"
                            size={24}
                            color="#e74c3c"
                        />
                    </TouchableOpacity>
                </View>

                <View style={styles.propertyInfo}>
                    <Text style={styles.propertyTitle} numberOfLines={2}>
                        {property.title ?? 'Título indisponível'}
                    </Text>

                    <Text style={styles.propertyLocation}>
                        {property.neighborhood ?? 'Bairro indisponível'}, {property.city ?? 'Cidade indisponível'}
                    </Text>
                    <View style={styles.propertyDetails}>
                        {((property.sale_price ?? property.salePrice) && parseFloat(property.sale_price ?? property.salePrice) > 0) ? (
                            <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                <Text style={{ fontSize: 14, color: '#dc2626', textDecorationLine: 'line-through', marginBottom: 2 }}>
                                    R$ {property.price?.toLocaleString('pt-BR') ?? 'Preço indisponível'}
                                </Text>
                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#059669' }}>
                                    R$ {(property.sale_price ?? property.salePrice)?.toLocaleString('pt-BR')}
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.propertyPrice}>
                                R$ {property.price?.toLocaleString('pt-BR') ?? 'Preço indisponível'}
                            </Text>
                        )}
                        <View style={styles.propertyFeatures}>
                            {property.bedrooms != null && (
                                <Text style={styles.propertyFeature}>
                                    {`${property.bedrooms} quartos`}
                                </Text>
                            )}
                            {property.bathrooms != null && (
                                <Text style={styles.propertyFeature}>
                                    {`${property.bathrooms} banheiros`}
                                </Text>
                            )}
                            {property.area != null && (
                                <Text style={styles.propertyFeature}>
                                    {`${property.area}m²`}
                                </Text>
                            )}
                        </View>
                    </View>
                    <Text style={styles.propertyType}>
                        {(property.property_type ?? '') + ' • ' + (property.transaction_type ?? '')}
                    </Text>

                    {/* Botão "Ver detalhes" para indicar que o card é clicável */}
                    <TouchableOpacity
                        style={styles.verDetalhesButton}
                        onPress={handlePress}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.verDetalhesText}>Ver detalhes</Text>
                    </TouchableOpacity>
                </View>

            </View>
        );
    }, (prevProps, nextProps) => {
        // Comparação personalizada para evitar re-renderizações desnecessárias
        return (
            prevProps.item.id === nextProps.item.id &&
            prevProps.index === nextProps.index
        );
    });

    const renderFavorite = useCallback(({ item, index }) => {
        return (
            <PropertyItem
                item={item}
                index={index}
                onRemoved={handleUnfavoriteLocal}
            />
        );
    }, [navigation, handleUnfavoriteLocal]);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header Padrão */}
            <StandardHeader
                title="Favoritos"
                subtitle={`${favorites.length} imóv${favorites.length > 1 ? 'eis' : 'el'} favoritado${favorites.length !== 1 ? 's' : ''}`}
                showBackButton={false}
                onBackPress={() => navigation.goBack()}
            />

            {/* Conteúdo Principal */}
            <View style={styles.contentContainer}>

                <FlatList
                    data={favorites}
                    renderItem={renderFavorite}
                    keyExtractor={(item) => item.id}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="heart-outline" size={64} color="#bdc3c7" />
                            <Text style={styles.emptyText}>Nenhum favorito ainda</Text>
                            <Text style={styles.emptySubtext}>
                                Adicione imóveis aos favoritos para vê-los aqui
                            </Text>
                            <TouchableOpacity
                                style={styles.browseButton}
                                onPress={() => navigation.navigate('Busca')}
                            >
                                <Text style={styles.browseButtonText}>Procurar Imóveis</Text>
                            </TouchableOpacity>
                        </View>
                    }
                    contentContainerStyle={styles.listContainer}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffcc1e',
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
        paddingTop: 15,
    },
    listContainer: {
        paddingBottom: 20,
    },
    propertyCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 15,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    // Media Gallery Styles
    mediaSection: {
        position: 'relative',
        height: 200,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        overflow: 'hidden',
    },
    mediaList: {
        height: 200,
    },
    mediaItem: {
        width: width - 40, // 40 é o padding horizontal
        height: 200,
    },

    mediaIndicators: {
        position: 'absolute',
        bottom: 15,
        left: 15,
        right: 15,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    mediaIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    mediaIndicatorActive: {
        backgroundColor: '#fff',
        width: 20,
    },
    mediaCountBadge: {
        position: 'absolute',
        bottom: 15,
        left: 15,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    mediaCountText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    mediaTypeBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        flexDirection: 'row',
        gap: 8,
    },
    mediaTypeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 12,
        paddingHorizontal: 6,
        paddingVertical: 3,
        gap: 3,
    },
    mediaTypeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#fff',
    },
    favoriteButton: {
        position: 'absolute',
        top: 15,
        left: 15,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 20,
        padding: 8,
        zIndex: 10,
    },
    propertyInfo: {
        padding: 15,
        backgroundColor: '#fff',
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
    verDetalhesButton: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffcc1e',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 15,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 6,
    },
    verDetalhesText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#00335e',
        textAlign: 'center',
    },

    propertyTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#00335e',
        marginBottom: 5,
    },
    propertyLocation: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 10,
    },
    propertyDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    propertyPrice: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#059669',
    },
    propertyFeatures: {
        flexDirection: 'row',
        gap: 10,
    },
    propertyFeature: {
        fontSize: 12,
        color: '#64748b',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    propertyType: {
        fontSize: 12,
        color: '#7f8c8d',
        textTransform: 'capitalize',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyText: {
        fontSize: 18,
        color: '#7f8c8d',
        marginTop: 15,
        marginBottom: 5,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#bdc3c7',
        textAlign: 'center',
        marginBottom: 30,
    },
    browseButton: {
        backgroundColor: '#00335e',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
    },
    browseButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
}); 