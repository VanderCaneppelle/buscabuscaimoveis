import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import StoryImage from './StoryImage';
import StoryVideo from './StoryVideo';

const IMAGE_DURATION = 5000; // 5 segundos

export default function StoryItem({
    story,
    optimizedUrl,
    isActive,
    onComplete,
    onProgressUpdate
}) {
    const videoRef = useRef(null);
    const progressAnim = useRef(new Animated.Value(0)).current;
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const [isVideoBuffering, setIsVideoBuffering] = useState(true);

    // Reset progress quando o story se torna ativo
    useEffect(() => {
        if (isActive) {
            setIsVideoLoaded(false);
            setIsVideoBuffering(true);
            progressAnim.setValue(0);

            if (story.media_type === 'image') {
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

        // Iniciar animação de progresso para vídeo
        if (data.durationMillis > 0) {
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

        videoRef.current?.playAsync();
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

    const videoSourceUrl = story.media_type === 'video'
        ? (story.video_mp4_url || story.image_url)
        : story.image_url;

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
                        videoUrl={videoSourceUrl}
                        optimizedUrl={optimizedUrl || videoSourceUrl}
                        videoRef={videoRef}
                        onLoad={handleVideoLoad}
                        onPlaybackStatusUpdate={handleVideoProgress}
                        onError={handleVideoError}
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
