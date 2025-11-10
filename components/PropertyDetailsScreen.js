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
    Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Video } from 'expo-av';
import YoutubePlayer from 'react-native-youtube-iframe';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import FavoriteButton from './FavoriteButton';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../contexts/AdminContext';
import { useFavoritesStore } from '../stores/favoritesStore';
import { supabase } from '../lib/supabase';
import { PlanService } from '../lib/planService';
import { extractYouTubeVideoId } from '../lib/youtubeUtils';

const { width, height } = Dimensions.get('window');

export default function PropertyDetailsScreen({ route, navigation }) {
    const { property } = route.params;
    const { user } = useAuth();
    const { isAdmin } = useAdmin();
    // Zustand
    const isFavorited = useFavoritesStore(state => state.isFavorite(property.id));
    const toggleFavorite = useFavoritesStore(state => state.toggleFavorite);
    const [loading, setLoading] = useState(false);
    const [showFullscreenModal, setShowFullscreenModal] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isOwnerOnFreePlan, setIsOwnerOnFreePlan] = useState(false);
    const [mediaViewMode, setMediaViewMode] = useState('photos'); // 'photos' ou 'videos'
    
    // Verificar plano do dono do anúncio (usando RPC com fallback)
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const ownerPlan = await PlanService.getUserActivePlan(property.user_id);
                const ownerPlanName = ownerPlan?.name || ownerPlan?.plan?.name;
                const computedIsFree = !ownerPlan || ownerPlanName === 'free';
                if (mounted) setIsOwnerOnFreePlan(computedIsFree);
            } catch (e) {
                console.warn('⚠️ Não foi possível obter plano do dono, considerando FREE:', e.message);
                if (mounted) setIsOwnerOnFreePlan(true); // Fallback para free em caso de erro
            }
        })();
        return () => { mounted = false; };
    }, [property.user_id]);

    // Separar imagens e vídeos do YouTube
    const imageFiles = useMemo(() => {
        return property.images || [];
    }, [property.images]);

    const videoUrls = useMemo(() => {
        return property.video_urls || [];
    }, [property.video_urls]);

    // Determinar o que exibir baseado no modo selecionado
    const displayMedia = useMemo(() => {
        if (mediaViewMode === 'photos') {
            return imageFiles.length > 0 ? imageFiles : ['https://via.placeholder.com/400x300?text=Sem+Imagem'];
        } else {
            return videoUrls;
        }
    }, [mediaViewMode, imageFiles, videoUrls]);

    const hasPhotos = imageFiles.length > 0;
    const hasVideos = videoUrls.length > 0;



    // Cleanup quando a tela for desmontada
    useEffect(() => {
        return () => {
            // Cleanup básico
        };
    }, []);

    // Usar o estado do contexto em vez de verificar manualmente
    // isFavorited já é o valor booleano direto do Zustand

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <View style={styles.headerButton}>
                    <FavoriteButton disabled={loading} propertyId={property.id} />
                </View>
            ),
        });
    }, [loading]);

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
        setSelectedImageIndex(prev => {
            const maxLength = mediaViewMode === 'photos' ? imageFiles.length : videoUrls.length;
            return prev > 0 ? prev - 1 : maxLength - 1;
        });
    }, [mediaViewMode, imageFiles.length, videoUrls.length]);

    const handleNextFullscreen = useCallback(() => {
        setSelectedImageIndex(prev => {
            const maxLength = mediaViewMode === 'photos' ? imageFiles.length : videoUrls.length;
            return prev < maxLength - 1 ? prev + 1 : 0;
        });
    }, [mediaViewMode, imageFiles.length, videoUrls.length]);

    // Função para detectar scroll no modal fullscreen
    const handleFullscreenScroll = useCallback((event) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        const imageIndex = Math.round(contentOffset / width);
        setSelectedImageIndex(imageIndex);
    }, []);

    // Renderizar vídeo do YouTube
    const renderYouTubeVideo = useCallback((url, index) => {
        const videoId = extractYouTubeVideoId(url);
        if (!videoId) return null;

        const videoWidth = width - 40; // Largura da tela menos padding
        const videoHeight = videoWidth * (9 / 16); // Aspect ratio 16:9

        return (
            <View style={styles.youtubeContainer}>
                <YoutubePlayer
                    height={videoHeight}
                    width={videoWidth}
                    videoId={videoId}
                    play={false}
                    webViewStyle={{ backgroundColor: '#000' }}
                />
            </View>
        );
    }, []);

    // Componente para renderizar vídeo do YouTube no modal fullscreen
    const YouTubeVideoPlayer = ({ videoUrl }) => {
        const [isReady, setIsReady] = useState(false);
        const [hasError, setHasError] = useState(false);
        
        console.log('🎥 Renderizando vídeo do YouTube:', videoUrl);
        const videoId = extractYouTubeVideoId(videoUrl);
        console.log('🔗 Video ID extraído:', videoId);
        
        if (!videoId) {
            console.error('❌ Erro: Não foi possível extrair Video ID');
            return (
                <View style={styles.fullscreenVideoItem}>
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={48} color="#e74c3c" />
                        <Text style={styles.errorText}>Erro ao carregar vídeo</Text>
                        <TouchableOpacity
                            style={styles.openExternalButton}
                            onPress={() => Linking.openURL(videoUrl)}
                        >
                            <Text style={styles.openExternalText}>Abrir no YouTube</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        const videoHeight = Math.min(height - 150, width * (9 / 16)); // Aspect ratio 16:9

        return (
            <View style={styles.fullscreenVideoItem}>
                {!isReady && !hasError && (
                    <View style={styles.loadingContainer}>
                        <Text style={styles.loadingText}>Carregando vídeo...</Text>
                    </View>
                )}
                <View style={{ width: width, height: videoHeight, backgroundColor: '#000' }}>
                    <YoutubePlayer
                        height={videoHeight}
                        width={width}
                        videoId={videoId}
                        play={false}
                        webViewStyle={{ backgroundColor: '#000', opacity: isReady ? 1 : 0 }}
                        onReady={() => {
                            console.log('✅ YoutubePlayer pronto!');
                            setIsReady(true);
                        }}
                        onError={(error) => {
                            console.error('❌ YoutubePlayer error:', error);
                            setHasError(true);
                            Alert.alert(
                                'Erro ao carregar vídeo',
                                'Não foi possível carregar o vídeo. Pode estar privado ou ter restrições. Deseja abrir no YouTube?',
                                [
                                    { text: 'Cancelar', style: 'cancel' },
                                    { 
                                        text: 'Abrir no YouTube', 
                                        onPress: () => Linking.openURL(videoUrl)
                                    }
                                ]
                            );
                        }}
                        onChangeState={(state) => {
                            console.log('📊 Estado do player:', state);
                        }}
                    />
                </View>
            </View>
        );
    };

    // Renderizar vídeo do YouTube no modal fullscreen
    const renderFullscreenYouTubeVideo = useCallback(({ item, index }) => {
        return <YouTubeVideoPlayer videoUrl={item} />;
    }, []);

    // Renderizar mídia no modal fullscreen (apenas fotos)
    const renderFullscreenMedia = useCallback(({ item, index }) => {
        return (
            <View style={styles.fullscreenMediaItem}>
                <Image
                    source={{ uri: item }}
                    style={styles.fullscreenImage}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                />
            </View>
        );
    }, []);

    const renderThumbnail = useCallback(({ item, index }) => {
        const totalItems = displayMedia.length;
        const isLastTile = index === 5; // Último tile visível (6º)
        const hasMoreItems = totalItems > 6;
        const remainingCount = totalItems - 6;

        if (mediaViewMode === 'videos') {
            // Renderizar thumbnail do YouTube
            const videoId = extractYouTubeVideoId(item);
            if (!videoId) return null;
            const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

            return (
                <TouchableOpacity
                    style={styles.thumbnail}
                    onPress={() => openFullscreenImage(index)}
                    activeOpacity={0.8}
                >
                    <Image
                        source={{ uri: thumbnailUrl }}
                        style={styles.thumbnailImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />

                    {/* Overlay "+X" para o último tile se há mais vídeos */}
                    {isLastTile && hasMoreItems && (
                        <View style={styles.moreImagesOverlay}>
                            <Text style={styles.moreImagesText}>+{remainingCount}</Text>
                        </View>
                    )}

                    {/* Ícone do YouTube se não for o tile "+X" */}
                    {!(isLastTile && hasMoreItems) && (
                        <View style={styles.videoOverlay}>
                            <Ionicons name="logo-youtube" size={32} color="#fff" />
                        </View>
                    )}
                </TouchableOpacity>
            );
        }

        // Renderizar foto
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
                {isLastTile && hasMoreItems && (
                    <View style={styles.moreImagesOverlay}>
                        <Text style={styles.moreImagesText}>+{remainingCount}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    }, [mediaViewMode, displayMedia.length, openFullscreenImage]);

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

            // Se o dono estiver no plano gratuito, redirecionar para o WhatsApp do admin
            // Número fornecido: 47992414450 → formato E.164 com DDI Brasil (55)
            const adminWhatsAppE164 = '5547992414450';

            // ✨ NOVO: Buscar perfil do usuário ATUAL (quem está clicando)
            let currentUserName = 'Alguém';
            if (user?.id) {
                try {
                    const { data: currentUserProfile, error: currentUserError } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('id', user.id)
                        .single();

                    if (!currentUserError && currentUserProfile?.full_name) {
                        currentUserName = currentUserProfile.full_name;
                    }
                } catch (err) {
                    console.warn('⚠️ Não foi possível obter nome do usuário atual:', err);
                }
            }

            // ✨ NOVO: Criar notificações in-app ANTES de abrir WhatsApp
            try {
                const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://buscabusca.vercel.app';
                
                console.log('📱 Criando notificações in-app...');
                
                // Notificar dono do imóvel (SEM NOME - LGPD)
                const ownerNotificationResponse = await fetch(`${apiUrl}/api/in-app-notifications?action=create`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: property.user_id,
                        type: 'whatsapp_contact',
                        title: '💬 Novo Interessado!',
                        message: `Um usuário demonstrou interesse no seu anúncio "${property.title}" e clicou no botão de WhatsApp!`,
                        data: { 
                            property_id: property.id,
                            property_title: property.title,
                            contact_type: 'whatsapp',
                            action: 'view_property'
                        }
                    })
                });

                if (ownerNotificationResponse.ok) {
                    console.log('✅ Notificação in-app criada para o dono do imóvel');
                } else {
                    console.warn('⚠️ Erro ao criar notificação para o dono:', ownerNotificationResponse.status);
                }

                // Notificar admins (COM NOME do interessado - fins de moderação)
                const adminNotificationResponse = await fetch(`${apiUrl}/api/in-app-notifications?action=notify-admins`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        propertyId: property.id,
                        propertyTitle: property.title,
                        ownerName: userProfile.full_name,
                        interestedUserName: currentUserName // Nome de quem clicou (fins de moderação)
                    })
                });

                if (adminNotificationResponse.ok) {
                    console.log('✅ Notificações in-app criadas para admins');
                } else {
                    console.warn('⚠️ Erro ao criar notificações para admins:', adminNotificationResponse.status);
                }

            } catch (notifError) {
                console.error('⚠️ Erro ao criar notificações in-app (não-crítico):', notifError);
                // Não interrompe o fluxo - continua abrindo o WhatsApp
            }

            // Definir destino e mensagem conforme plano do dono
            let destinationPhone = '';
            let message = '';
            if (isOwnerOnFreePlan) {
                destinationPhone = adminWhatsAppE164;
                message = `Olá! Vi o anúncio "${property.title}" no Busca Busca Imóveis e gostaria de mais informações. Poderiam me encaminhar o contato do anunciante?`;
            } else {
                if (!userProfile || !userProfile.phone) {
                    Alert.alert(
                        'Contato não disponível',
                        'O anunciante não possui telefone cadastrado.',
                        [{ text: 'OK', style: 'default' }]
                    );
                    return;
                }
                const userName = userProfile.full_name || 'Anunciante';
                destinationPhone = userProfile.phone;
                message = `Olá ${userName}! Vi seu anúncio "${property.title}" no Busca Busca Imóveis e gostaria de mais informações.`;
            }

            // Formatar número de telefone (remover caracteres especiais)
            const cleanPhone = (destinationPhone || '').replace(/\D/g, '');

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

    // Handler específico para contato direto com o proprietário (usado por admins)
    const handleWhatsAppContactOwner = async () => {
        try {
            const { data: userProfile, error } = await supabase
                .from('profiles')
                .select('full_name, phone')
                .eq('id', property.user_id)
                .single();

            if (error || !userProfile?.phone) {
                Alert.alert(
                    'Contato não disponível',
                    'O anunciante não possui telefone cadastrado.',
                    [{ text: 'OK', style: 'default' }]
                );
                return;
            }

            const userName = userProfile.full_name || 'Anunciante';
            const destinationPhone = userProfile.phone;
            const message = `Olá ${userName}! Vi seu anúncio "${property.title}" no Busca Busca Imóveis e gostaria de mais informações.`;

            const cleanPhone = (destinationPhone || '').replace(/\D/g, '');
            const whatsappUrls = [
                `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`,
                `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`,
            ];

            for (const url of whatsappUrls) {
                try {
                    const canOpen = await Linking.canOpenURL(url);
                    if (canOpen) {
                        await Linking.openURL(url);
                        return;
                    }
                } catch {}
            }

            const webWhatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
            await Linking.openURL(webWhatsappUrl);
        } catch (error) {
            console.error('❌ Erro ao abrir WhatsApp (proprietário):', error);
            Alert.alert('Erro', 'Não foi possível abrir o WhatsApp para o proprietário.');
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

            {/* Galeria de Mídia */}
            <View style={styles.mediaSection}>
                {/* Botões de alternância Fotos/Vídeos */}
                {(hasPhotos && hasVideos) && (
                    <View style={styles.mediaToggleContainer}>
                        <TouchableOpacity
                            style={[styles.mediaToggleButton, mediaViewMode === 'photos' && styles.mediaToggleButtonActive]}
                            onPress={() => setMediaViewMode('photos')}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="images" size={20} color={mediaViewMode === 'photos' ? '#fff' : '#6B7280'} />
                            <Text style={[styles.mediaToggleText, mediaViewMode === 'photos' && styles.mediaToggleTextActive]}>
                                Fotos ({imageFiles.length})
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.mediaToggleButton, mediaViewMode === 'videos' && styles.mediaToggleButtonActive]}
                            onPress={() => setMediaViewMode('videos')}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="videocam" size={20} color={mediaViewMode === 'videos' ? '#fff' : '#6B7280'} />
                            <Text style={[styles.mediaToggleText, mediaViewMode === 'videos' && styles.mediaToggleTextActive]}>
                                Vídeos ({videoUrls.length})
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Conteúdo baseado no modo */}
                {mediaViewMode === 'videos' && videoUrls.length > 0 ? (
                    // Modo vídeos - mostrar grid de thumbnails ou vídeo único
                    displayMedia.length === 1 ? (
                        <View style={styles.singleVideoContainer}>
                            {renderYouTubeVideo(displayMedia[0], 0)}
                        </View>
                    ) : (
                        <View style={styles.galleryContainer}>
                            <FlatList
                                data={displayMedia.slice(0, 6)}
                                renderItem={renderThumbnail}
                                keyExtractor={(item, index) => `video-thumb-${index}-${item.substring(0, 20)}`}
                                numColumns={3}
                                scrollEnabled={false}
                                style={styles.thumbnailGrid}
                                contentContainerStyle={styles.thumbnailGridContent}
                            />
                        </View>
                    )
                ) : (
                    // Modo fotos
                    displayMedia.length === 1 ? (
                        <View style={styles.singleImageContainer}>
                            <TouchableOpacity
                                style={styles.singleImageWrapper}
                                onPress={() => openFullscreenImage(0)}
                                activeOpacity={0.9}
                            >
                                <Image
                                    source={{ uri: displayMedia[0] }}
                                    style={styles.singleImage}
                                    contentFit="cover"
                                    cachePolicy="memory-disk"
                                    placeholder={require('../assets/placeholder-image.png')}
                                />
                                <View style={styles.expandIcon}>
                                    <Ionicons name="expand" size={24} color="#fff" />
                                </View>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.galleryContainer}>
                            <FlatList
                                data={displayMedia.slice(0, 6)}
                                renderItem={renderThumbnail}
                                keyExtractor={(item, index) => `photo-thumb-${index}-${item.substring(0, 20)}`}
                                numColumns={3}
                                scrollEnabled={false}
                                style={styles.thumbnailGrid}
                                contentContainerStyle={styles.thumbnailGridContent}
                            />
                        </View>
                    )
                )}
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Informações Principais */}
                <View style={styles.mainInfo}>
                    <Text style={styles.title}>{property.title}</Text>


                    <Text style={styles.location}>
                        <Ionicons name="location" size={16} color="#64748b" />
                        {' '}{(() => {
                            // Mostrar: Endereço, Bairro, Cidade (apenas os que existirem)
                            const parts = [
                                property.address?.trim(),
                                property.neighborhood?.trim(),
                                property.city?.trim()
                            ].filter(Boolean);
                            return parts.join(', ') || 'Localização não informada';
                        })()}
                    </Text>
                    
                    {/* Preços: mostrar preço normal + promocional se houver */}
                    {property.sale_price && parseFloat(property.sale_price) > 0 ? (
                        <View style={styles.priceContainer}>
                            <Text style={styles.originalPrice}>{formatPrice(property.price)}</Text>
                            <Text style={styles.salePrice}>{formatPrice(property.sale_price)}</Text>
                        </View>
                    ) : (
                        <Text style={styles.price}>{formatPrice(property.price)}</Text>
                    )}
                    
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

            {/* Botão flutuante "Ver no mapa" */}
            <TouchableOpacity
                style={styles.floatingMapButton}
                onPress={() => {
                    navigation.navigate('MapaImovelUnico', {
                        property: property
                    });
                }}
                activeOpacity={0.85}
            >
                <Ionicons name="location" size={18} color="#fff" />
                <Text style={styles.floatingMapText}>Ver no mapa</Text>
            </TouchableOpacity>

            {/* Botões de Contato Fixos no Bottom */}
            <View style={styles.fixedBottomButtons}>
                {isAdmin ? (
                    <>
                        <TouchableOpacity
                            style={[styles.contactButton, styles.whatsappButton]}
                            onPress={handleWhatsAppContactOwner}
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
                    </>
                ) : (
                    <>
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
                    </>
                )}
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
                            {mediaViewMode === 'photos' 
                                ? `${selectedImageIndex + 1} de ${imageFiles.length}`
                                : `${selectedImageIndex + 1} de ${videoUrls.length}`
                            }
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
                    {mediaViewMode === 'photos' ? (
                        <FlatList
                            data={imageFiles}
                            renderItem={renderFullscreenMedia}
                            keyExtractor={(item, index) => `fullscreen-photo-${index}-${item.substring(0, 20)}`}
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
                    ) : (
                        <FlatList
                            data={videoUrls}
                            renderItem={renderFullscreenYouTubeVideo}
                            keyExtractor={(item, index) => `fullscreen-video-${index}-${item.substring(0, 20)}`}
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
                    )}
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
    youtubeContainer: {
        width: '100%',
        backgroundColor: '#000',
        borderRadius: 12,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    singleVideoContainer: {
        backgroundColor: '#f8f9fa',
        paddingVertical: 15,
        paddingHorizontal: 20,
    },
    mediaSection: {
        backgroundColor: '#f8f9fa',
    },
    mediaToggleContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 15,
        gap: 12,
    },
    mediaToggleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 8,
    },
    mediaToggleButtonActive: {
        backgroundColor: '#3498db',
        borderColor: '#3498db',
    },
    mediaToggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    mediaToggleTextActive: {
        color: '#fff',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#000',
    },
    errorText: {
        color: '#fff',
        fontSize: 16,
        marginTop: 16,
        marginBottom: 24,
        textAlign: 'center',
    },
    openExternalButton: {
        backgroundColor: '#e74c3c',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    openExternalText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
        zIndex: 1,
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
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
    fullscreenVideoItem: {
        width: width,
        height: height,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
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
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#00335e',
        marginBottom: 12,
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
    priceContainer: {
        marginBottom: 8,
    },
    originalPrice: {
        fontSize: 20,
        fontWeight: '600',
        color: '#94a3b8',
        textDecorationLine: 'line-through',
        marginBottom: 4,
    },
    salePrice: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#059669',
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
        padding: 5,
        paddingTop: Platform.OS === 'ios' ? 15 : 5, // ✅ Extra padding para iOS
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

    // Botão flutuante "Ver no mapa" (mesmo estilo da HomeScreen)
    floatingMapButton: {
        position: 'absolute',
        right: 16,
        bottom: 100, // Acima dos botões de contato
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#00335e',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 24,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 6,
        zIndex: 100,
    },
    floatingMapText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },

}); 
