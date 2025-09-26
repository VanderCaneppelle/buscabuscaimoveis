import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
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

    // Reset progress quando o story se torna ativo
    useEffect(() => {
        if (isActive) {
            setIsVideoLoaded(false);
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

    return (
        <View style={styles.container}>
            {story.media_type === "image" ? (
                <StoryImage
                    imageUrl={story.image_url}
                    optimizedUrl={optimizedUrl}
                />
            ) : (
                <StoryVideo
                    videoUrl={story.image_url}
                    optimizedUrl={optimizedUrl}
                    videoRef={videoRef}
                    onLoad={handleVideoLoad}
                    onPlaybackStatusUpdate={handleVideoProgress}
                    onError={handleVideoError}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
    },
});
