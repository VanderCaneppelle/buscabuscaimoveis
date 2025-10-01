import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    FlatList,
    Dimensions,
    Alert,
    Linking,
    ScrollView,
    StatusBar,
    Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { Video } from 'expo-av';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import FavoriteButton from './FavoriteButton';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

export default function PropertyDetailsScreen({ route, navigation }) {
    const { property } = route.params;
    const { user } = useAuth();
    const { isFavorite: isFavorited, toggleFavorite } = useFavorites();
    const [loading, setLoading] = useState(false);
    const [showFullscreenModal, setShowFullscreenModal] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);

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
            // Cleanup básico
            console.log('🧹 PropertyDetailsScreen: Limpeza ao desmontar');
        };
    }, []);

    // Usar o estado do contexto em vez de verificar manualmente
    const isFavorite = isFavorited(property.id);

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <View style={styles.headerButton}>
                    <FavoriteButton isFavorited={isFavorite} disabled={loading} propertyId={property.id} />
                </View>
            ),
        });
    }, [isFavorite, loading]);

    // Removido: não precisamos mais verificar status manualmente



    // (toggle via FavoriteButton)



    // Função para abrir imagem em fullscreen
    const openFullscreenImage = useCallback((index) => {
        setSelectedImageIndex(index);
        setShowFullscreenModal(true);
    }, []);

    // Função para fechar modal fullscreen
    const closeFullscreenModal = useCallback(() => {
        setShowFullscreenModal(false);
    }, []);

    // Navegação no modal fullscreen
    const handlePreviousFullscreen = useCallback(() => {
        setSelectedImageIndex(prev =>
            prev > 0 ? prev - 1 : finalDisplayMedia.length - 1
        );
    }, [finalDisplayMedia.length]);

    const handleNextFullscreen = useCallback(() => {
        setSelectedImageIndex(prev =>
            prev < finalDisplayMedia.length - 1 ? prev + 1 : 0
        );
    }, [finalDisplayMedia.length]);

    // Função para detectar scroll no modal fullscreen
    const handleFullscreenScroll = useCallback((event) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        const imageIndex = Math.round(contentOffset / width);
        setSelectedImageIndex(imageIndex);
    }, []);

    // Renderizar mídia no modal fullscreen
    const renderFullscreenMedia = useCallback(({ item, index }) => {
        const isVideo = isVideoFile(item);

        return (
            <View style={styles.fullscreenMediaItem}>
                {isVideo ? (
                    <Video
                        source={{ uri: item }}
                        style={styles.fullscreenVideo}
                        useNativeControls={true}
                        resizeMode="contain"
                        shouldPlay={false}
                        isLooping={false}
                    />
                ) : (
                    <Image
                        source={{ uri: item }}
                        style={styles.fullscreenImage}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                    />
                )}
            </View>
        );
    }, [isVideoFile]);

    const renderThumbnail = useCallback(({ item, index }) => {
        const isVideo = isVideoFile(item);
        const totalImages = finalDisplayMedia.length;
        const isLastTile = index === 5; // Último tile visível (6º)
        const hasMoreImages = totalImages > 6;
        const remainingCount = totalImages - 6;

        return (
            <TouchableOpacity
                style={styles.thumbnail}
                onPress={() => openFullscreenImage(index)}
                activeOpacity={0.8}
            >
                <Image
                    source={{ uri: item }}
                    style={styles.thumbnailImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    placeholder={require('../assets/placeholder-image.png')}
                />

                {/* Overlay "+X" para o último tile se há mais imagens */}
                {isLastTile && hasMoreImages && (
                    <View style={styles.moreImagesOverlay}>
                        <Text style={styles.moreImagesText}>+{remainingCount}</Text>
                    </View>
                )}

                {/* Ícone de vídeo se for vídeo (apenas se não for o tile "+X") */}
                {isVideo && !(isLastTile && hasMoreImages) && (
                    <View style={styles.videoOverlay}>
                        <Ionicons name="play-circle" size={32} color="#fff" />
                    </View>
                )}

            </TouchableOpacity>
        );
    }, [isVideoFile, openFullscreenImage, finalDisplayMedia.length]);

    const formatPrice = (price) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(price);
    };

    const formatArea = (area) => {
        return `${area}m²`;
    };

    const handleWhatsAppContact = async () => {
        try {
            // Buscar dados do usuário que criou o anúncio
            const { data: userProfile, error } = await supabase
                .from('profiles')
                .select('full_name, phone')
                .eq('id', property.user_id)
                .single();

            if (error) {
                console.error('❌ Erro ao buscar perfil do usuário:', error);
                Alert.alert(
                    'Erro',
                    'Não foi possível obter as informações de contato do anunciante.',
                    [{ text: 'OK', style: 'default' }]
                );
                return;
            }

            if (!userProfile || !userProfile.phone) {
                Alert.alert(
                    'Contato não disponível',
                    'O anunciante não possui telefone cadastrado.',
                    [{ text: 'OK', style: 'default' }]
                );
                return;
            }

            const phoneNumber = userProfile.phone;
            const userName = userProfile.full_name || 'Anunciante';
            const message = `Olá ${userName}! Vi seu anúncio "${property.title}" no Busca Busca Imóveis e gostaria de mais informações.`;

            // Formatar número de telefone (remover caracteres especiais)
            const cleanPhone = phoneNumber.replace(/\D/g, '');

            // Tentar diferentes URLs do WhatsApp
            const whatsappUrls = [
                `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`,
                `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`,
            ];

            // Tentar abrir o app WhatsApp primeiro
            for (const url of whatsappUrls) {
                try {
                    const canOpen = await Linking.canOpenURL(url);
                    if (canOpen) {
                        await Linking.openURL(url);
                        return; // Sucesso, sair da função
                    }
                } catch (error) {
                    console.log('Tentativa falhou:', url, error);
                    continue; // Tentar próxima URL
                }
            }

            // Se nenhuma URL funcionar, abrir WhatsApp Web
            const webWhatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
            await Linking.openURL(webWhatsappUrl);

        } catch (error) {
            console.error('❌ Erro ao abrir WhatsApp:', error);
            Alert.alert(
                'Erro ao abrir WhatsApp',
                'Não foi possível abrir o WhatsApp. Verifique se o aplicativo está instalado ou tente abrir manualmente.',
                [
                    { text: 'OK', style: 'default' },
                    {
                        text: 'Abrir WhatsApp Web',
                        onPress: async () => {
                            try {
                                // Buscar dados do usuário novamente para o fallback
                                const { data: userProfile } = await supabase
                                    .from('profiles')
                                    .select('full_name, phone')
                                    .eq('id', property.user_id)
                                    .single();

                                if (userProfile?.phone) {
                                    const cleanPhone = userProfile.phone.replace(/\D/g, '');
                                    const userName = userProfile.full_name || 'Anunciante';
                                    const message = `Olá ${userName}! Vi seu anúncio "${property.title}" no Busca Busca Imóveis e gostaria de mais informações.`;
                                    const webUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
                                    Linking.openURL(webUrl);
                                }
                            } catch (fallbackError) {
                                console.error('❌ Erro no fallback do WhatsApp:', fallbackError);
                            }
                        }
                    }
                ]
            );
        }
    };

    const handlePhoneContact = async () => {
        try {
            // Buscar dados do usuário que criou o anúncio
            const { data: userProfile, error } = await supabase
                .from('profiles')
                .select('full_name, phone')
                .eq('id', property.user_id)
                .single();

            if (error) {
                console.error('❌ Erro ao buscar perfil do usuário:', error);
                Alert.alert(
                    'Erro',
                    'Não foi possível obter as informações de contato do anunciante.',
                    [{ text: 'OK', style: 'default' }]
                );
                return;
            }

            if (!userProfile || !userProfile.phone) {
                Alert.alert(
                    'Contato não disponível',
                    'O anunciante não possui telefone cadastrado.',
                    [{ text: 'OK', style: 'default' }]
                );
                return;
            }

            const phoneNumber = userProfile.phone;
            const phoneUrl = `tel:${phoneNumber}`;

            const supported = await Linking.canOpenURL(phoneUrl);
            if (supported) {
                await Linking.openURL(phoneUrl);
            } else {
                Alert.alert('Erro', 'Não foi possível fazer a ligação');
            }
        } catch (error) {
            console.error('❌ Erro ao fazer ligação:', error);
            Alert.alert('Erro', 'Ocorreu um erro inesperado ao tentar fazer a ligação');
        }
    };

    return (
        <SafeAreaView style={styles.container}>

            {/* Galeria de Mídia - Condicional baseada na quantidade */}
            {finalDisplayMedia.length === 1 ? (
                // Uma única imagem - mostrar maior
                <View style={styles.singleImageContainer}>
                    <TouchableOpacity
                        style={styles.singleImageWrapper}
                        onPress={() => openFullscreenImage(0)}
                        activeOpacity={0.9}
                    >
                        {isVideoFile(finalDisplayMedia[0]) ? (
                            <Video
                                source={{ uri: finalDisplayMedia[0] }}
                                style={styles.singleVideo}
                                useNativeControls={true}
                                resizeMode="cover"
                                shouldPlay={false}
                                isLooping={false}
                            />
                        ) : (
                            <Image
                                source={{ uri: finalDisplayMedia[0] }}
                                style={styles.singleImage}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                placeholder={require('../assets/placeholder-image.png')}
                            />
                        )}

                        {/* Ícone de expansão para indicar que é clicável */}
                        <View style={styles.expandIcon}>
                            <Ionicons name="expand" size={24} color="#fff" />
                        </View>
                    </TouchableOpacity>
                </View>
            ) : (
                // Múltiplas imagens - mostrar grid
                <View style={styles.galleryContainer}>
                    <FlatList
                        data={finalDisplayMedia.slice(0, 6)} // Mostrar apenas 6 tiles
                        renderItem={renderThumbnail}
                        keyExtractor={(item, index) => `thumbnail-${index}-${item.substring(0, 20)}`}
                        numColumns={3}
                        scrollEnabled={false}
                        style={styles.thumbnailGrid}
                        contentContainerStyle={styles.thumbnailGridContent}
                    />
                </View>
            )}

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Informações Principais */}
                <View style={styles.mainInfo}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.title, styles.titleWithButton]}>{property.title}</Text>

                        {/* Botão Ver Mapa - estilo discreto cinza, como na Home */}
                        <TouchableOpacity
                            style={styles.mapIconButton}
                            onPress={() => {
                                navigation.navigate('MapaImovelUnico', {
                                    property: property
                                });
                            }}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="location" size={16} color="#00335e" />
                            <Text style={styles.mapIconText}>Ver no Mapa</Text>
                        </TouchableOpacity>
                    </View>


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
                                <MaterialCommunityIcons name="toilet" size={24} color="#1e3a8a" />
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

                {/* Informações Adicionais
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
                </View> */}


            </ScrollView>

            {/* Botões de Contato Fixos no Bottom */}
            <View style={styles.fixedBottomButtons}>
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

            {/* Modal Fullscreen para Galeria */}
            <Modal
                visible={showFullscreenModal}
                transparent={true}
                animationType="fade"
                onRequestClose={closeFullscreenModal}
                statusBarTranslucent={true}
            >
                <View style={styles.fullscreenContainer}>
                    {/* Header com contador e botão fechar */}
                    <View style={styles.fullscreenHeader}>
                        <Text style={styles.fullscreenCounter}>
                            {selectedImageIndex + 1} de {finalDisplayMedia.length}
                        </Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={closeFullscreenModal}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="close" size={28} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Galeria com swipe para navegação */}
                    <FlatList
                        data={finalDisplayMedia}
                        renderItem={renderFullscreenMedia}
                        keyExtractor={(item, index) => `fullscreen-${index}-${item.substring(0, 20)}`}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={handleFullscreenScroll}
                        scrollEventThrottle={16}
                        initialScrollIndex={selectedImageIndex}
                        getItemLayout={(data, index) => ({
                            length: width,
                            offset: width * index,
                            index,
                        })}
                        style={styles.fullscreenGallery}
                        bounces={false}
                        decelerationRate="fast"
                    />
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    // Imagem única (quando há apenas 1 mídia)
    singleImageContainer: {
        backgroundColor: '#f8f9fa',
        paddingVertical: 15,
        paddingHorizontal: 20,
    },
    singleImageWrapper: {
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#e9ecef',
    },
    singleImage: {
        width: '100%',
        height: 250, // Altura maior para imagem única
    },
    singleVideo: {
        width: '100%',
        height: 250, // Altura maior para vídeo único
    },
    expandIcon: {
        position: 'absolute',
        top: 15,
        right: 15,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Galeria em Grid (múltiplas imagens)
    galleryContainer: {
        backgroundColor: '#f8f9fa',
        paddingVertical: 15,
    },
    thumbnailGrid: {
        paddingHorizontal: 15,
        alignSelf: 'center',
    },
    thumbnailGridContent: {
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
    },
    thumbnail: {
        width: (width - 60) / 3, // Largura fixa: (tela - padding) / 3 colunas
        height: (width - 60) / 3, // Altura igual à largura (quadrado)
        margin: 4,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#e9ecef',
        position: 'relative',
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    videoOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    moreImagesOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    moreImagesText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },

    // Modal Fullscreen
    fullscreenContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullscreenHeader: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
    },
    fullscreenCounter: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    closeButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullscreenGallery: {
        flex: 1,
    },
    fullscreenMediaItem: {
        width: width,
        height: height,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 50, // Espaço para o header
        paddingBottom: 50, // Espaço inferior
    },
    fullscreenImage: {
        width: width - 40,
        height: height - 200,
        maxWidth: width - 40,
        maxHeight: height - 200,
    },
    fullscreenVideo: {
        width: width - 40,
        height: height - 200,
        maxWidth: width - 40,
        maxHeight: height - 200,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    scrollContent: {
        paddingBottom: 120, // Espaço para os botões fixos no bottom
    },
    mainInfo: {
        marginBottom: 25,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#00335e',
    },
    titleWithButton: {
        flex: 1,
        marginRight: 12, // Espaço para o botão
    },
    mapIconButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 6,
        gap: 4,
    },
    mapIconText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#00335e',
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
    // Botões fixos no bottom com margens de segurança
    fixedBottomButtons: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        paddingHorizontal: 20, // Alinhado com o padding do conteúdo
        paddingTop: 15,
        paddingBottom: 25, // Extra padding para safe area
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        flexDirection: 'row',
        gap: 15,
        // Sombra sutil para destacar
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 8,
    },

}); 
