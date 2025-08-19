import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    FlatList,
    Image,
    Dimensions,
    Alert,
    Linking,
    ScrollView,
    StatusBar,
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

export default function PropertyDetailsScreen({ route, navigation }) {
    const { property } = route.params;
    const { user } = useAuth();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isFavorite, setIsFavorite] = useState(false);
    const [loading, setLoading] = useState(false);
    const [videoRefs, setVideoRefs] = useState({});

    // Separar imagens e vídeos usando useMemo para evitar re-cálculos
    // Função para verificar se é vídeo
    const isVideoFile = useCallback((url) => {
        return url.includes('.mp4') ||
            url.includes('.mov') ||
            url.includes('.avi') ||
            url.includes('.mkv') ||
            url.includes('.webm');
    }, []);

    const { imageFiles, videoFiles, finalDisplayMedia } = useMemo(() => {
        const mediaFiles = property.images || [];
        const imageFiles = mediaFiles.filter(file => !isVideoFile(file));
        const videoFiles = mediaFiles.filter(file => isVideoFile(file));

        // Combinar imagens e vídeos para exibição
        const displayMedia = [...imageFiles, ...videoFiles];
        const finalDisplayMedia = displayMedia.length > 0 ? displayMedia : ['https://via.placeholder.com/400x300?text=Sem+Imagem'];

        return { imageFiles, videoFiles, finalDisplayMedia };
    }, [property.images, isVideoFile]);



    // Cleanup quando a tela for desmontada
    useEffect(() => {
        return () => {
            // Limpar referências
            setVideoRefs({});
        };
    }, []);

    useEffect(() => {
        checkFavoriteStatus();
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={toggleFavorite}
                    disabled={loading}
                >
                    <Ionicons
                        name={isFavorite ? "heart" : "heart-outline"}
                        size={24}
                        color={isFavorite ? "#dc2626" : "#1e3a8a"}
                    />
                </TouchableOpacity>
            ),
        });
    }, [isFavorite, loading]);

    // Sincronizar status de favorito quando a tela receber foco
    useFocusEffect(
        React.useCallback(() => {
            if (user?.id && property?.id) {
                checkFavoriteStatus();
            }
        }, [user?.id, property?.id])
    );



    const checkFavoriteStatus = async () => {
        if (!user?.id) return;

        try {
            const { data, error } = await supabase
                .from('favorites')
                .select('*')
                .eq('user_id', user.id)
                .eq('property_id', property.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('❌ Erro ao verificar favorito:', error);
            } else {
                setIsFavorite(!!data);
            }
        } catch (error) {
            console.error('❌ Erro ao verificar favorito:', error);
        }
    };

    const toggleFavorite = async () => {
        if (!user?.id) {
            Alert.alert('Atenção', 'Você precisa estar logado para favoritar imóveis');
            return;
        }

        setLoading(true);
        try {
            if (isFavorite) {
                // Remover dos favoritos
                const { error } = await supabase
                    .from('favorites')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('property_id', property.id);

                if (error) {
                    console.error('❌ Erro ao remover favorito:', error);
                    Alert.alert('Erro', 'Não foi possível remover dos favoritos');
                } else {
                    setIsFavorite(false);
                }
            } else {
                // Adicionar aos favoritos
                const { error } = await supabase
                    .from('favorites')
                    .insert({
                        user_id: user.id,
                        property_id: property.id,
                    });

                if (error) {
                    console.error('❌ Erro ao adicionar favorito:', error);
                    Alert.alert('Erro', 'Não foi possível adicionar aos favoritos');
                } else {
                    setIsFavorite(true);
                }
            }
        } catch (error) {
            console.error('❌ Erro ao gerenciar favorito:', error);
            Alert.alert('Erro', 'Ocorreu um erro inesperado');
        } finally {
            setLoading(false);
        }
    };



    const handleImageScroll = useCallback((event) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        const imageIndex = Math.round(contentOffset / width);
        setCurrentImageIndex(imageIndex);
    }, [width]);

    const renderMedia = useCallback(({ item, index }) => {
        const isVideo = isVideoFile(item);

        if (isVideo) {
            return (
                <View style={styles.mediaContainer}>
                    <Video
                        source={{ uri: item }}
                        style={styles.video}
                        useNativeControls={true}
                        resizeMode="cover"
                        shouldPlay={false}
                        isLooping={false}
                        isMuted={false}
                        volume={1.0}
                        onError={(error) => {
                            console.error(`❌ Erro no vídeo ${index}:`, error);
                        }}
                    />
                </View>
            );
        }

        return (
            <Image
                source={{ uri: item }}
                style={styles.image}
                resizeMode="cover"
            />
        );
    }, [isVideoFile]);

    const formatPrice = (price) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(price);
    };

    const formatArea = (area) => {
        return `${area}m²`;
    };

    const handleWhatsAppContact = () => {
        const phoneNumber = property.contact_phone || '5511999999999';
        const message = `Olá! Vi seu anúncio "${property.title}" no BuscaBusca Imóveis e gostaria de mais informações.`;
        const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;

        Linking.canOpenURL(whatsappUrl).then(supported => {
            if (supported) {
                Linking.openURL(whatsappUrl);
            } else {
                Alert.alert('Erro', 'WhatsApp não está instalado no seu dispositivo');
            }
        });
    };

    const handlePhoneContact = () => {
        const phoneNumber = property.contact_phone || '11999999999';
        const phoneUrl = `tel:${phoneNumber}`;

        Linking.canOpenURL(phoneUrl).then(supported => {
            if (supported) {
                Linking.openURL(phoneUrl);
            } else {
                Alert.alert('Erro', 'Não foi possível fazer a ligação');
            }
        });
    };

    return (
        <SafeAreaView style={styles.container}>

            {/* Galeria de Mídia */}
            <View style={styles.imageContainer}>
                <FlatList
                    data={finalDisplayMedia}
                    renderItem={renderMedia}
                    keyExtractor={(item, index) => `media-${index}-${item.substring(0, 20)}`}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleImageScroll}
                    scrollEventThrottle={16}
                    nestedScrollEnabled={true}
                    removeClippedSubviews={false}

                />

                {/* Indicadores de mídia */}
                {finalDisplayMedia.length > 1 && (
                    <View style={styles.imageIndicators}>
                        {finalDisplayMedia.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.imageIndicator,
                                    index === currentImageIndex && styles.imageIndicatorActive
                                ]}
                            />
                        ))}
                    </View>
                )}

                {/* Contador de mídia */}
                {finalDisplayMedia.length > 1 && (
                    <View style={styles.imageCounter}>
                        <Text style={styles.imageCounterText}>
                            {currentImageIndex + 1}/{finalDisplayMedia.length}
                        </Text>
                    </View>
                )}

                {/* Indicadores de tipo de mídia */}
                {finalDisplayMedia.length > 1 && (
                    <View style={styles.mediaTypeIndicators}>
                        {finalDisplayMedia.map((item, index) => {
                            const isVideo = isVideoFile(item);
                            return (
                                <View key={index} style={styles.mediaTypeIndicator}>
                                    <Ionicons
                                        name={isVideo ? "videocam" : "image"}
                                        size={12}
                                        color={index === currentImageIndex ? "#1e3a8a" : "#64748b"}
                                    />
                                </View>
                            );
                        })}
                    </View>
                )}
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Informações Principais */}
                <View style={styles.mainInfo}>
                    <Text style={styles.title}>{property.title}</Text>
                    <Text style={styles.location}>
                        <Ionicons name="location" size={16} color="#64748b" />
                        {' '}{property.neighborhood}, {property.city}
                    </Text>
                    <Text style={styles.price}>{formatPrice(property.price)}</Text>
                    <Text style={styles.type}>
                        {property.property_type} • {property.transaction_type}
                    </Text>
                </View>

                {/* Características */}
                <View style={styles.characteristics}>
                    <Text style={styles.sectionTitle}>Características</Text>
                    <View style={styles.characteristicsGrid}>
                        {property.bedrooms && (
                            <View style={styles.characteristicItem}>
                                <Ionicons name="bed" size={24} color="#1e3a8a" />
                                <Text style={styles.characteristicText}>{property.bedrooms} quartos</Text>
                            </View>
                        )}
                        {property.bathrooms && (
                            <View style={styles.characteristicItem}>
                                <Ionicons name="water" size={24} color="#1e3a8a" />
                                <Text style={styles.characteristicText}>{property.bathrooms} banheiros</Text>
                            </View>
                        )}
                        {property.area && (
                            <View style={styles.characteristicItem}>
                                <Ionicons name="resize" size={24} color="#1e3a8a" />
                                <Text style={styles.characteristicText}>{formatArea(property.area)}</Text>
                            </View>
                        )}
                        {property.parking_spaces && (
                            <View style={styles.characteristicItem}>
                                <Ionicons name="car" size={24} color="#1e3a8a" />
                                <Text style={styles.characteristicText}>{property.parking_spaces} vagas</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Descrição */}
                {property.description && (
                    <View style={styles.description}>
                        <Text style={styles.sectionTitle}>Descrição</Text>
                        <Text style={styles.descriptionText}>{property.description}</Text>
                    </View>
                )}

                {/* Informações Adicionais */}
                <View style={styles.additionalInfo}>
                    <Text style={styles.sectionTitle}>Informações Adicionais</Text>
                    <View style={styles.infoList}>
                        {property.construction_year && (
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Ano de Construção:</Text>
                                <Text style={styles.infoValue}>{property.construction_year}</Text>
                            </View>
                        )}
                        {property.floor && (
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Andar:</Text>
                                <Text style={styles.infoValue}>{property.floor}</Text>
                            </View>
                        )}
                        {property.condominium_fee && (
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Taxa do Condomínio:</Text>
                                <Text style={styles.infoValue}>{formatPrice(property.condominium_fee)}</Text>
                            </View>
                        )}
                        {property.iptu && (
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>IPTU:</Text>
                                <Text style={styles.infoValue}>{formatPrice(property.iptu)}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Botões de Contato */}
                <View style={styles.contactSection}>
                    <Text style={styles.sectionTitle}>Entre em Contato</Text>
                    <View style={styles.contactButtons}>
                        <TouchableOpacity
                            style={[styles.contactButton, styles.whatsappButton]}
                            onPress={handleWhatsAppContact}
                        >
                            <Ionicons name="logo-whatsapp" size={24} color="#fff" />
                            <Text style={styles.contactButtonText}>WhatsApp</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.contactButton, styles.phoneButton]}
                            onPress={handlePhoneContact}
                        >
                            <Ionicons name="call" size={24} color="#fff" />
                            <Text style={styles.contactButtonText}>Ligar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    imageContainer: {
        height: 300,
        position: 'relative',
    },
    image: {
        width: width,
        height: 300,
    },
    video: {
        width: width,
        height: 300,
    },
    mediaContainer: {
        width: width,
        height: 300,
        position: 'relative',
        zIndex: 0,
    },



    mediaTypeIndicators: {
        position: 'absolute',
        bottom: 60,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        zIndex: 1,
    },
    mediaTypeIndicator: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageIndicators: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        zIndex: 1,
    },
    imageIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    imageIndicatorActive: {
        backgroundColor: '#fff',
        width: 20,
    },
    imageCounter: {
        position: 'absolute',
        top: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        zIndex: 1,
    },
    imageCounterText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    mainInfo: {
        marginBottom: 25,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#00335e',
        marginBottom: 8,
    },
    location: {
        fontSize: 16,
        color: '#64748b',
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    price: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#059669',
        marginBottom: 8,
    },
    type: {
        fontSize: 16,
        color: '#64748b',
        textTransform: 'capitalize',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#00335e',
        marginBottom: 15,
    },
    characteristics: {
        marginBottom: 25,
    },
    characteristicsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
    },
    characteristicItem: {
        alignItems: 'center',
        minWidth: 80,
    },
    characteristicText: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 5,
        textAlign: 'center',
    },
    description: {
        marginBottom: 25,
    },
    descriptionText: {
        fontSize: 16,
        color: '#374151',
        lineHeight: 24,
    },
    additionalInfo: {
        marginBottom: 25,
    },
    infoList: {
        gap: 12,
    },
    infoItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    infoLabel: {
        fontSize: 16,
        color: '#64748b',
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 16,
        color: '#00335e',
        fontWeight: '600',
    },
    contactSection: {
        marginBottom: 30,
    },
    contactButtons: {
        flexDirection: 'row',
        gap: 15,
    },
    contactButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 12,
        gap: 8,
    },
    whatsappButton: {
        backgroundColor: '#25d366',
    },
    phoneButton: {
        backgroundColor: '#00335e',
    },
    contactButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    headerButton: {
        padding: 8,
    },
}); 