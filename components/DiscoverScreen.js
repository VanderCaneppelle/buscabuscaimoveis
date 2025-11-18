import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
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
import { useBoostsStore } from '../stores/boostsStore';
import { useUserPlanStore } from '../stores/userPlanStore';
import StandardHeader from './StandardHeader';
import AdBoostingScreen from './AdBoostingScreen';
import AppText from './AppText';

const { width } = Dimensions.get('window');

export default function DiscoverScreen({ navigation }) {
    console.log('Rendered DiscoverScreen');

    const { user } = useAuth();

    // Zustand: Boosts
    const boostedProperties = useBoostsStore(state => state.boostedProperties);
    const fetchBoostedProperties = useBoostsStore(state => state.fetchBoostedProperties);
    const boostsLoading = useBoostsStore(state => state.loading);

    // Zustand: User Plan
    const isFreePlan = useUserPlanStore(state => state.isFreePlan);
    const isPlanExpired = useUserPlanStore(state => state.isPlanExpired);
    const currentAds = useUserPlanStore(state => state.currentAds);
    const canBoostAd = useUserPlanStore(state => state.canBoostAd);
    const fetchUserPlanData = useUserPlanStore(state => state.fetchUserPlanData);

    const [featuredProperties, setFeaturedProperties] = useState([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadData();
        if (user?.id) {
            fetchUserPlanData(user.id); // ✅ Usar Zustand (cache de 3 min)
        }
    }, [user?.id]);

    // Atualizar dados sempre que a tela ganhar foco
    useFocusEffect(
        React.useCallback(() => {
            console.log('🔄 DiscoverScreen: Atualizando dados...');
            loadData();
            if (user?.id) {
                fetchUserPlanData(user.id); // ✅ Usar Zustand (cache de 3 min)
            }
        }, [user?.id])
    );

    // ❌ REMOVIDO: loadUserPlan - agora usa Zustand

    const loadData = async () => {
        try {
            setLoading(true);

            // ✅ Buscar do Zustand (com cache de 5 min)
            const boostedPropertiesData = await fetchBoostedProperties();

            console.log(`✨ ${boostedPropertiesData.length} anúncios em destaque carregados`);

            // Transformar para o formato esperado pelo componente
            const properties = boostedPropertiesData.map((item, index) => ({
                id: item.property_id || `boost_${index}_${Date.now()}`, // Garantir ID único
                title: item.title,
                description: item.description,
                price: item.price,
                sale_price: item.sale_price,
                promotional_price: item.promotional_price || item.sale_price,
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
                video_urls: item.video_urls || [],
                status: item.property_status,
                created_at: item.property_created_at,
                user_id: item.user_id,
                boost_info: {
                    id: item.boost_id,
                    end_date: item.boost_end_date,
                    days_remaining: item.days_remaining
                }
            }));

            // Remover duplicatas baseado no ID da propriedade
            const uniqueProperties = properties.filter((item, index, self) =>
                index === self.findIndex(t => t.id === item.id)
            );

            console.log(`📊 Propriedades únicas: ${uniqueProperties.length} (de ${properties.length} total)`);
            setFeaturedProperties(uniqueProperties);
        } catch (error) {
            console.error('Erro ao buscar anúncios em destaque:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        // ✅ Forçar refresh do Zustand (ignora cache)
        await fetchBoostedProperties(true);
        await loadData();
        setRefreshing(false);
    };

    // Componente para renderizar propriedades (igual ao da HomeScreen)
    const PropertyItem = React.memo(({ item, index }) => {
        const property = item;

        // Memoizar o onPress para evitar re-renderizações
        // Navegar para a rota PropertyDetails do MainNavigator principal (mesma que HomeScreen usa)
        const handlePress = useCallback(() => {
            navigation.getParent()?.navigate('PropertyDetails', { property: property });
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
                        keyExtractor={(mediaItem, mediaIndex) => `media_${item.id}_${mediaIndex}`}
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
                        <AppText style={styles.boostBadgeText}>DESTAQUE</AppText>
                    </View>

                    {/* Indicador de quantidade de mídias */}
                    {hasMultipleMedia && (
                        <View style={styles.mediaCountBadge}>
                            <AppText style={styles.mediaCountText}>
                                {currentIndex + 1}/{displayMediaFiles.length}
                            </AppText>
                        </View>
                    )}

                    {/* Ícones de tipo de mídia */}
                    {(imageFiles.length > 0 || videoFiles.length > 0) && (
                        <View style={styles.mediaTypeBadge}>
                            {imageFiles.length > 0 && (
                                <View style={styles.mediaTypeItem}>
                                    <Ionicons name="image" size={14} color="#fff" />
                                    <AppText style={styles.mediaTypeText}>{imageFiles.length}</AppText>
                                </View>
                            )}
                            {videoFiles.length > 0 && (
                                <View style={styles.mediaTypeItem}>
                                    <Ionicons name="videocam" size={14} color="#fff" />
                                    <AppText style={styles.mediaTypeText}>{videoFiles.length}</AppText>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                <View style={styles.propertyInfo}>
                    <AppText style={styles.propertyTitle} numberOfLines={2}>
                        {property.title ?? 'Título indisponível'}
                    </AppText>

                    <AppText style={styles.propertyLocation}>
                        {property.neighborhood ?? 'Bairro indisponível'}, {property.city ?? 'Cidade indisponível'}
                    </AppText>
                    <View style={styles.propertyDetails}>
                        {((property.sale_price ?? property.salePrice) && parseFloat(property.sale_price ?? property.salePrice) > 0) ? (
                            <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                <AppText style={{ fontSize: 14, color: '#dc2626', textDecorationLine: 'line-through', marginBottom: 2 }}>
                                    R$ {property.price?.toLocaleString('pt-BR') ?? 'Preço indisponível'}
                                </AppText>
                                <AppText style={{ fontSize: 18, fontWeight: 'bold', color: '#059669' }}>
                                    R$ {(property.sale_price ?? property.salePrice)?.toLocaleString('pt-BR')}
                                </AppText>
                            </View>
                        ) : (
                            <AppText style={styles.propertyPrice}>
                                R$ {property.price?.toLocaleString('pt-BR') ?? 'Preço indisponível'}
                            </AppText>
                        )}
                        <View style={styles.propertyFeatures}>
                            {property.bedrooms && property.bedrooms > 0 ? (
                                <AppText style={styles.propertyFeature}>
                                    {`${String(property.bedrooms)} quartos`}
                                </AppText>
                            ) : null}
                            {property.bathrooms && property.bathrooms > 0 ? (
                                <AppText style={styles.propertyFeature}>
                                    {`${String(property.bathrooms)} banheiros`}
                                </AppText>
                            ) : null}
                            {property.area && property.area > 0 ? (
                                <AppText style={styles.propertyFeature}>
                                    {`${String(property.area)}m²`}
                                </AppText>
                            ) : null}
                        </View>
                    </View>
                    <AppText style={styles.propertyType}>
                        {(property.property_type ?? '') + ' • ' + (property.transaction_type ?? '')}
                    </AppText>

                    {/* Botão "Ver detalhes" para indicar que o card é clicável */}
                    <TouchableOpacity
                        style={styles.verDetalhesButton}
                        onPress={handlePress}
                        activeOpacity={0.8}
                    >
                        <AppText style={styles.verDetalhesText}>Ver detalhes</AppText>
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
        <SafeAreaView style={styles.container}>
            {/* Header Padrão */}
            <StandardHeader
                title="Melhores Oportunidades"
                subtitle="Descubra imóveis incríveis"
            />

            {/* Conteúdo Principal */}
            <View style={styles.contentContainer}>

                <FlatList
                    data={featuredProperties}
                    renderItem={renderProperty}
                    keyExtractor={(item, index) => `discover_${item.id}_${index}`}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }

                    ListHeaderComponent={
                        // Mostrar CTA apenas para usuários com plano pago, não expirado e com anúncios ativos
                        user && canBoostAd && currentAds > 0 ? (
                            <View style={styles.ctaContainer}>
                                <View style={styles.ctaCard}>
                                    <Ionicons name="ribbon" size={18} color="#6c5ce7" />
                                    <AppText style={styles.ctaText}>Quer dar mais visibilidade para seus anúncios?</AppText>
                                    <TouchableOpacity
                                        style={styles.ctaButton}
                                        onPress={() => navigation.navigate('Anuncie', { screen: 'AdBoosting' })}
                                    >
                                        <Ionicons name="rocket" size={16} color="#fff" />
                                        <AppText style={styles.ctaButtonText}>Impulsionar agora</AppText>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="home-outline" size={64} color="#bdc3c7" />
                            <AppText style={styles.emptyText}>Nenhum imóvel encontrado</AppText>
                            <AppText style={styles.emptySubtext}>
                                Tente novamente mais tarde
                            </AppText>
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
    ctaContainer: { paddingHorizontal: 20, paddingBottom: 10 },
    ctaCard: {
        backgroundColor: '#f5f3ff',
        borderWidth: 1,
        borderColor: '#e9e5ff',
        padding: 12,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    ctaText: { flex: 1, color: '#3f3d56', fontSize: 13, fontWeight: '600' },
    ctaButton: {
        backgroundColor: '#6c5ce7',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    ctaButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
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