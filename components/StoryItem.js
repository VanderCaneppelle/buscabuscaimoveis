import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import StoryImage from './StoryImage';
import StoryVideo from './StoryVideo';

const IMAGE_DURATION = 5000; // 5 segundos

export default function StoryItem({
    story,
    optimizedUrl,
    isActive,
    isMuted = false,
    isPaused = false,
    onComplete,
    onProgressUpdate
}) {
    const videoRef = useRef(null);
    const progressAnim = useRef(new Animated.Value(0)).current;
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const [isVideoBuffering, setIsVideoBuffering] = useState(true);
    const videoDurationRef = useRef(null); // Armazenar duração do vídeo

    // Reset progress quando o story se torna ativo
    useEffect(() => {
        if (isActive) {
            setIsVideoLoaded(false);
            setIsVideoBuffering(true);
            progressAnim.setValue(0);
            videoDurationRef.current = null; // Reset duração

            if (story.media_type === 'image' && !isPaused) {
                startImageProgress();
            }
        } else {
            // Parar vídeo quando não está ativo
            videoRef.current?.stopAsync();
            progressAnim.stopAnimation();
        }

        // Cleanup: remover listeners quando o componente desmonta
        return () => {
            progressAnim.removeAllListeners();
        };
    }, [isActive, story.id]);

    // Atualizar mute quando mudar (sem pausar o vídeo)
    useEffect(() => {
        if (videoRef.current && story.media_type === 'video' && isActive && isVideoLoaded && !isPaused) {
            // Verificar status atual do vídeo antes de mudar mute
            videoRef.current.getStatusAsync().then(status => {
                const wasPlaying = status.isPlaying;
                
                // Usar apenas setVolumeAsync (mais estável que setIsMutedAsync)
                // Volume 0 = mudo, Volume 1 = com som
                return videoRef.current.setVolumeAsync(isMuted ? 0 : 1).then(() => {
                    // Verificar status novamente após mudar volume
                    return videoRef.current.getStatusAsync();
                }).then(newStatus => {
                    // Se estava tocando mas parou após mudar volume, retomar
                    if (wasPlaying && !newStatus.isPlaying) {
                        return videoRef.current.playAsync();
                    }
                });
            }).catch(err => {
                console.warn('Erro ao atualizar volume:', err);
            });
        }
    }, [isMuted, story.media_type, isActive, isVideoLoaded, isPaused]);

    // Controlar pause/play do vídeo e animação
    useEffect(() => {
        if (!isActive) return;

        if (story.media_type === 'video') {
            if (isPaused) {
                // Pausar vídeo
                videoRef.current?.pauseAsync().catch(err => {
                    console.warn('Erro ao pausar vídeo:', err);
                });
                // Pausar animação de progresso
                progressAnim.stopAnimation();
            } else {
                // Retomar vídeo
                videoRef.current?.playAsync().catch(err => {
                    console.warn('Erro ao retomar vídeo:', err);
                });
                // Retomar animação de progresso
                if (isVideoLoaded && videoDurationRef.current) {
                    const currentValue = progressAnim._value || 0;
                    const remainingDuration = (1 - currentValue) * videoDurationRef.current;
                    
                    // Remover listener antigo antes de adicionar novo
                    progressAnim.removeAllListeners();
                    
                    Animated.timing(progressAnim, {
                        toValue: 1,
                        duration: remainingDuration,
                        useNativeDriver: false,
                    }).start(({ finished }) => {
                        if (finished) {
                            onComplete();
                        }
                    });

                    // Adicionar listener para notificar progresso
                    progressAnim.addListener(({ value }) => {
                        if (onProgressUpdate) {
                            onProgressUpdate(value, progressAnim);
                        }
                    });
                }
            }
        } else {
            // Para imagens, pausar/retomar apenas a animação
            if (isPaused) {
                progressAnim.stopAnimation();
            } else {
                const currentValue = progressAnim._value || 0;
                const remainingDuration = (1 - currentValue) * IMAGE_DURATION;
                
                // Remover listener antigo antes de adicionar novo
                progressAnim.removeAllListeners();
                
                Animated.timing(progressAnim, {
                    toValue: 1,
                    duration: remainingDuration,
                    useNativeDriver: false,
                }).start(({ finished }) => {
                    if (finished) {
                        onComplete();
                    }
                });

                // Adicionar listener para notificar progresso
                progressAnim.addListener(({ value }) => {
                    if (onProgressUpdate) {
                        onProgressUpdate(value, progressAnim);
                    }
                });
            }
        }
    }, [isPaused, isActive, story.media_type, isVideoLoaded]);

    const startImageProgress = () => {
        if (story.media_type === 'image') {
            Animated.timing(progressAnim, {
                toValue: 1,
                duration: IMAGE_DURATION,
                useNativeDriver: false,
            }).start(({ finished }) => {
                if (finished) {
                    onComplete();
                }
            });

            // Listener para notificar progresso ao componente pai
            progressAnim.addListener(({ value }) => {
                if (onProgressUpdate) {
                    onProgressUpdate(value, progressAnim);
                }
            });
        }
    };

    const handleVideoLoad = (data) => {
        setIsVideoLoaded(true);
        setIsVideoBuffering(false);

        // Armazenar duração do vídeo
        if (data.durationMillis > 0) {
            videoDurationRef.current = data.durationMillis;
        }

        // Iniciar animação de progresso para vídeo (só se não estiver pausado)
        if (data.durationMillis > 0 && !isPaused) {
            Animated.timing(progressAnim, {
                toValue: 1,
                duration: data.durationMillis,
                useNativeDriver: false,
            }).start(({ finished }) => {
                if (finished) {
                    onComplete();
                }
            });

            // Listener para notificar progresso ao componente pai
            progressAnim.addListener(({ value }) => {
                if (onProgressUpdate) {
                    onProgressUpdate(value, progressAnim);
                }
            });
        }

        // Só iniciar o vídeo se não estiver pausado
        if (!isPaused) {
            videoRef.current?.playAsync();
        }
    };

    const handleVideoProgress = (status) => {
        // Atualizar status de buffering
        if (status.isBuffering !== undefined) {
            setIsVideoBuffering(status.isBuffering);
        }

        // Apenas verificar se o vídeo terminou
        if (status.didJustFinish) {
            onComplete();
        }
    };

    const handleVideoError = () => {
        // Se o vídeo falhar, avançar para o próximo
        setTimeout(() => {
            onComplete();
        }, 2000);
    };

    if (!isActive) {
        return null;
    }

    const [currentVideoUrl, setCurrentVideoUrl] = useState(() => {
        if (story.media_type === 'video') {
            return story.video_mp4_url || story.image_url;
        }
        return story.image_url;
    });

    useEffect(() => {
        if (story.media_type === 'video') {
            setCurrentVideoUrl(story.video_mp4_url || story.image_url);
        } else {
            setCurrentVideoUrl(story.image_url);
        }
    }, [story.id, story.media_type, story.video_mp4_url, story.image_url]);

    return (
        <View style={styles.container}>
            {story.media_type === "image" ? (
                <StoryImage
                    imageUrl={story.image_url}
                    optimizedUrl={optimizedUrl}
                />
            ) : (
                <>
                    <StoryVideo
                        videoUrl={currentVideoUrl}
                        optimizedUrl={optimizedUrl || currentVideoUrl}
                        videoRef={videoRef}
                        isMuted={isMuted}
                        onLoad={handleVideoLoad}
                        onPlaybackStatusUpdate={handleVideoProgress}
                        onError={() => {
                            console.warn('⚠️ Falha ao carregar vídeo, tentando fallback HLS...', currentVideoUrl);
                            if (story.media_type === 'video' && currentVideoUrl !== story.image_url) {
                                setCurrentVideoUrl(story.image_url);
                                setIsVideoLoaded(false);
                                setIsVideoBuffering(true);
                            } else {
                                handleVideoError();
                            }
                        }}
                    />
                    {(isVideoBuffering || !isVideoLoaded) && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color="#ffffff" />
                        </View>
                    )}
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
    },
});
