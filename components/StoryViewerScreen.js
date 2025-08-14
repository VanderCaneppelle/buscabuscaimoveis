import React, { useState, useEffect, useRef } from "react";
import { View, Image, TouchableWithoutFeedback, Dimensions, StyleSheet, Animated, Text, SafeAreaView, Platform } from "react-native";
import { Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { getOptimizedUrl } from "../lib/mediaCacheService";

const { width, height } = Dimensions.get("window");
const IMAGE_DURATION = 5000; // 5 segundos para imagens

export default function ViewerScreen({ navigation, route }) {
    const [stories, setStories] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [optimizedUrls, setOptimizedUrls] = useState({});
    const progress = useRef(new Animated.Value(0)).current;
    const videoRef = useRef(null);
    const [videoDuration, setVideoDuration] = useState(0);
    const safetyTimeoutRef = useRef(null);

    useEffect(() => {
        fetchStories();
    }, []);

    // Definir índice inicial baseado no parâmetro da rota
    useEffect(() => {
        if (route.params?.initialStoryIndex !== undefined) {
            setCurrentIndex(route.params.initialStoryIndex);
        }
    }, [route.params?.initialStoryIndex]);

    useEffect(() => {
        if (stories.length > 0 && currentIndex < stories.length) {
            const currentStory = stories[currentIndex];
            console.log('🔄 Story mudou, iniciando progresso para:', currentStory?.title);
            startProgress();
        }
    }, [currentIndex, stories]);

    // Forçar reprodução do vídeo quando o story mudar
    useEffect(() => {
        if (stories.length > 0 && currentIndex < stories.length) {
            const currentStory = stories[currentIndex];
            if (currentStory && currentStory.media_type === 'video' && videoRef.current) {
                console.log('🎬 Story de vídeo detectado, forçando reprodução...');
                // Resetar duração do vídeo
                setVideoDuration(0);
                // Resetar progresso
                progress.setValue(0);
                // Pequeno delay para garantir que o componente está montado
                setTimeout(() => {
                    if (videoRef.current) {
                        videoRef.current.playAsync();
                    }
                }, 300);
            }
        }
    }, [currentIndex, stories]);

    const fetchStories = async () => {
        const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { data, error } = await supabase
            .from("stories")
            .select("*")
            .eq("status", "active")
            .gte("created_at", cutoffDate)
            .order("order_index", { ascending: true });

        if (!error && data) {
            console.log('Stories carregados:', data.length, 'stories');
            console.log('Stories:', data.map(s => ({ id: s.id, title: s.title, media_type: s.media_type, order_index: s.order_index })));
            setStories(data);

            // Otimizar URLs dos stories
            optimizeStoryUrls(data);
        } else {
            console.error('Erro ao carregar stories:', error);
        }
    };

    // Otimizar URLs dos stories para cache
    const optimizeStoryUrls = async (stories) => {
        try {
            console.log('🔄 Otimizando URLs dos stories...');

            const optimizedUrlsMap = {};

            for (const story of stories) {
                const mediaUrl = story.image_url;
                if (mediaUrl) {
                    const fileType = story.media_type === 'video' ? 'video' : 'image';
                    const optimizedUrl = await getOptimizedUrl(mediaUrl, fileType);
                    optimizedUrlsMap[story.id] = optimizedUrl;
                }
            }

            setOptimizedUrls(optimizedUrlsMap);
            console.log('✅ URLs otimizadas carregadas', optimizedUrlsMap);

        } catch (error) {
            console.error('❌ Erro ao otimizar URLs:', error);
        }
    };

    const startProgress = () => {
        // Limpar timeout anterior se existir
        if (safetyTimeoutRef.current) {
            clearTimeout(safetyTimeoutRef.current);
            safetyTimeoutRef.current = null;
        }

        progress.setValue(0);
        const currentStory = stories[currentIndex];

        if (!currentStory) {
            console.log('❌ Nenhum story encontrado para o índice:', currentIndex);
            return;
        }

        console.log('🎯 Iniciando progresso:', {
            mediaType: currentStory.media_type,
            title: currentStory.title,
            isVideo: currentStory.media_type === "video"
        });

        // Para imagens, usar animação automática
        if (currentStory.media_type === "image") {
            console.log('🖼️ Iniciando progresso para imagem (5 segundos)');

            // Pequeno delay para garantir que a imagem carregou
            setTimeout(() => {
                Animated.timing(progress, {
                    toValue: 1,
                    duration: IMAGE_DURATION,
                    useNativeDriver: false,
                }).start(({ finished }) => {
                    if (finished) {
                        console.log('🖼️ Imagem terminou, indo para próximo');
                        goNext();
                    }
                });
            }, 100);

            // Timeout de segurança para garantir que a imagem avance
            safetyTimeoutRef.current = setTimeout(() => {
                console.log('🖼️ Timeout de segurança ativado, avançando imagem');
                goNext();
            }, IMAGE_DURATION + 2000); // 7 segundos total (mais tempo de segurança)
        } else if (currentStory.media_type === "video") {
            console.log('🎬 Story de vídeo - progresso será controlado pelo vídeo');
        }
        // Para vídeos, o progresso será controlado pelo onPlaybackStatusUpdate
    };

    const goNext = () => {
        console.log('🔄 Indo para próximo story...');

        // Limpar timeout de segurança
        if (safetyTimeoutRef.current) {
            clearTimeout(safetyTimeoutRef.current);
            safetyTimeoutRef.current = null;
        }

        // Resetar progresso e duração do vídeo
        progress.setValue(0);
        setVideoDuration(0);

        // Parar vídeo atual se existir
        if (videoRef.current) {
            videoRef.current.stopAsync();
        }

        if (currentIndex < stories.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            console.log('🏁 Último story, voltando para tela anterior');
            navigation.goBack();
        }
    };

    const goPrev = () => {
        console.log('🔄 Indo para story anterior...');

        // Limpar timeout de segurança
        if (safetyTimeoutRef.current) {
            clearTimeout(safetyTimeoutRef.current);
            safetyTimeoutRef.current = null;
        }

        // Resetar progresso e duração do vídeo
        progress.setValue(0);
        setVideoDuration(0);

        // Parar vídeo atual se existir
        if (videoRef.current) {
            videoRef.current.stopAsync();
        }

        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    if (stories.length === 0) return null;
    const currentStory = stories[currentIndex];

    // Debug logs
    console.log('Story atual:', {
        id: currentStory.id,
        title: currentStory.title,
        media_type: currentStory.media_type,
        order_index: currentStory.order_index,
        image_url: currentStory.image_url
    });

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                {/* Barra de progresso */}
                <View style={styles.progressBarContainer}>
                    {stories.map((_, index) => (
                        <View key={index} style={styles.progressBarBackground}>
                            <Animated.View
                                style={[
                                    styles.progressBarFill,
                                    index === currentIndex && {
                                        width: progress.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ['0%', '100%']
                                        })
                                    },
                                    index < currentIndex && { width: '100%' },
                                    index > currentIndex && { width: '0%' },
                                ]}
                            />
                        </View>
                    ))}
                </View>

                {/* Conteúdo do story */}
                <TouchableWithoutFeedback onPress={(e) => {
                    const touchX = e.nativeEvent.locationX;
                    if (touchX < width / 2) goPrev();
                    else goNext();
                }}>
                    <View style={styles.storyContainer}>
                        {currentStory.media_type === "image" ? (
                            <View style={styles.mediaContainer}>
                                <Image
                                    source={{ uri: optimizedUrls[currentStory.id] || currentStory.image_url }}
                                    style={styles.media}
                                    resizeMode="cover"
                                    onLoad={() => {
                                        console.log('🖼️ Imagem carregada com sucesso');
                                        // Garantir que o progresso seja iniciado quando a imagem carregar
                                        if (currentStory.media_type === 'image') {
                                            setTimeout(() => {
                                                startProgress();
                                            }, 50);
                                        }
                                    }}
                                    onError={(error) => {
                                        console.error('Erro ao carregar imagem:', error);
                                        // Se der erro, avançar automaticamente após 2 segundos
                                        setTimeout(() => {
                                            console.log('🖼️ Erro na imagem, avançando automaticamente');
                                            goNext();
                                        }, 2000);
                                    }}
                                />
                                <View style={styles.mediaTypeIndicator}>
                                    <Ionicons name="image" size={20} color="#fff" />
                                </View>
                            </View>
                        ) : (
                            <View style={styles.mediaContainer}>
                                <Video
                                    ref={videoRef}
                                    source={{ uri: optimizedUrls[currentStory.id] || currentStory.image_url }}
                                    style={styles.media}
                                    resizeMode="cover"
                                    shouldPlay={true}
                                    isLooping={false}
                                    useNativeControls={false}
                                    volume={1.0}
                                    isMuted={false}
                                    shouldCorrectPitch={true}
                                    {...(Platform.OS === 'ios' && {
                                        audioMode: 'playback',
                                        allowsAirPlay: true,
                                        staysActiveInBackground: false,
                                    })}
                                    onLoadStart={() => {
                                        console.log('🎬 Iniciando carregamento do vídeo');
                                    }}
                                    onLoad={(data) => {
                                        console.log('✅ Vídeo carregado, iniciando reprodução...');
                                        console.log('📏 Duração do vídeo:', data.durationMillis);
                                        // Definir duração do vídeo para a barra de progresso
                                        setVideoDuration(data.durationMillis || 0);
                                        // Forçar início da reprodução
                                        if (videoRef.current) {
                                            videoRef.current.playAsync();
                                        }
                                    }}
                                    onError={(error) => {
                                        console.error('❌ Erro ao carregar vídeo:', error);
                                    }}
                                    onPlaybackStatusUpdate={(status) => {
                                        console.log('📺 Status do vídeo:', {
                                            isPlaying: status.isPlaying,
                                            position: status.positionMillis,
                                            duration: status.durationMillis,
                                            didJustFinish: status.didJustFinish
                                        });

                                        // Atualizar progresso da barra baseado na posição do vídeo
                                        if (status.isLoaded && status.durationMillis > 0) {
                                            const progressValue = status.positionMillis / status.durationMillis;
                                            // Só atualizar a cada 100ms para evitar pulos
                                            if (status.positionMillis % 100 < 50) {
                                                console.log('📊 Progresso:', progressValue, '(', status.positionMillis, '/', status.durationMillis, ')');
                                                // Usar animação suave para evitar pulos
                                                Animated.timing(progress, {
                                                    toValue: progressValue,
                                                    duration: 100,
                                                    useNativeDriver: false,
                                                }).start();
                                            }
                                        }

                                        if (status.didJustFinish) {
                                            console.log('🎬 Vídeo terminou, indo para próximo');
                                            goNext();
                                        }
                                    }}
                                />
                                <View style={styles.mediaTypeIndicator}>
                                    <Ionicons name="videocam" size={20} color="#fff" />
                                </View>
                            </View>
                        )}

                        {/* Título do story */}
                        <View style={styles.storyTitleContainer}>
                            <Text style={styles.storyTitle}>{currentStory.title}</Text>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "black" },
    safeArea: { flex: 1 },
    progressBarContainer: {
        flexDirection: "row",
        position: "absolute",
        top: Platform.OS === 'ios' ? 50 : 20,
        left: 10,
        right: 10,
        zIndex: 1,
    },
    progressBarBackground: {
        flex: 1,
        height: 3,
        backgroundColor: "rgba(255,255,255,0.3)",
        marginHorizontal: 2,
        borderRadius: 2,
    },
    progressBarFill: {
        height: 6,
        backgroundColor: "#ff0000",
        borderRadius: 3,
        shadowColor: "#ff0000",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 3,
        elevation: 5,
    },
    storyContainer: {
        flex: 1,
        justifyContent: "center",
        position: "relative"
    },
    mediaContainer: {
        position: "relative",
        width: width,
        height: height,
    },
    media: {
        width: width,
        height: height
    },
    mediaTypeIndicator: {
        position: "absolute",
        top: 20,
        right: 20,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        borderRadius: 15,
        padding: 5,
    },
    storyTitleContainer: {
        position: "absolute",
        bottom: 100,
        left: 20,
        right: 20,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        padding: 10,
        borderRadius: 8,
    },
    storyTitle: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
        textAlign: "center",
    },

});
