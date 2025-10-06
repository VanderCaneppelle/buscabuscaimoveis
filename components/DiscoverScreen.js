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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BoostService } from '../lib/boostService';

const { width } = Dimensions.get('window');

export default function DiscoverScreen({ navigation }) {
    console.log('Rendered DiscoverScreen');

    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const [featuredProperties, setFeaturedProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    // Atualizar dados sempre que a tela ganhar foco
    useFocusEffect(
        React.useCallback(() => {
            console.log('🔄 DiscoverScreen: Atualizando dados...');
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            setLoading(true);

            // Usar a função do banco para buscar anúncios impulsionados
            const boostedProperties = await BoostService.getBoostedProperties();

            console.log(`✨ ${boostedProperties.length} anúncios em destaque carregados`);

            // Transformar para o formato esperado pelo componente
            const properties = boostedProperties.map(item => ({
                id: item.property_id,
                title: item.title,
                description: item.description,
                price: item.price,
                sale_price: item.sale_price,
                property_type: item.property_type,
                transaction_type: item.transaction_type,
                bedrooms: item.bedrooms,
                bathrooms: item.bathrooms,
                parking_spaces: item.parking_spaces,
                area: item.area,
                address: item.address,
                neighborhood: item.neighborhood,
                city: item.city,
                state: item.state,
                zip_code: item.zip_code,
                latitude: item.latitude,
                longitude: item.longitude,
                images: item.images,
                status: item.property_status,
                views: item.property_views || 0,
                created_at: item.property_created_at,
                user_id: item.user_id,
                boost_info: {
                    id: item.boost_id,
                    end_date: item.boost_end_date,
                    days_remaining: item.days_remaining
                }
            }));

            setFeaturedProperties(properties);
        } catch (error) {
            console.error('Erro ao buscar anúncios em destaque:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    // Componente para renderizar propriedades (igual ao da HomeScreen)
    const PropertyItem = React.memo(({ item, index }) => {
        const property = item;

        // Memoizar o onPress para evitar re-renderizações
        const handlePress = useCallback(() => {
            navigation.navigate('PropertyDetails', { property: property });
        }, [navigation, property]);

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

                    {/* Badge de Destaque */}
                    <View style={styles.boostBadge}>
                        <Ionicons name="rocket" size={14} color="#fff" />
                        <Text style={styles.boostBadgeText}>DESTAQUE</Text>
                    </View>

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

    const renderProperty = useCallback(({ item, index }) => {
        return (
            <PropertyItem
                item={item}
                index={index}
            />
        );
    }, [navigation]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header Amarelo com Título */}
            <View style={styles.headerContainer}>
                <View style={styles.titleContainer}>
                    <Image
                        source={require('../assets/logo_bb.jpg')}
                        style={styles.titleLogo}
                        resizeMode="contain"
                    />
                    <Text style={styles.headerTitle}>Melhores Oportunidades</Text>
                </View>
                <Text style={styles.headerSubtitle}>Descubra imóveis incríveis</Text>
            </View>

            {/* Conteúdo Principal */}
            <View style={styles.contentContainer}>

                <FlatList
                    data={featuredProperties}
                    renderItem={renderProperty}
                    keyExtractor={(item) => item.id}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="home-outline" size={64} color="#bdc3c7" />
                            <Text style={styles.emptyText}>Nenhum imóvel encontrado</Text>
                            <Text style={styles.emptySubtext}>
                                Tente novamente mais tarde
                            </Text>
                        </View>
                    }
                    contentContainerStyle={styles.listContainer}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffcc1e',
    },
    headerContainer: {
        paddingTop: 10,
        paddingBottom: 15,
        backgroundColor: '#ffcc1e',
        paddingHorizontal: 20,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    titleLogo: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#00335e',
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#00335e',
        textAlign: 'center',
        opacity: 0.8,
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
    boostBadge: {
        position: 'absolute',
        top: 15,
        left: 15,
        backgroundColor: '#f39c12',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    boostBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 0.5,
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
}); 