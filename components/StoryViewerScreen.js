import React, { useState, useEffect, useRef } from "react";
import { View, Image, TouchableWithoutFeedback, Dimensions, StyleSheet, Animated, Text } from "react-native";
import { Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

const { width, height } = Dimensions.get("window");
const IMAGE_DURATION = 5000; // 5 segundos para imagens

export default function ViewerScreen({ navigation }) {
    const [stories, setStories] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const progress = useRef(new Animated.Value(0)).current;
    const videoRef = useRef(null);

    useEffect(() => {
        fetchStories();
    }, []);

    useEffect(() => {
        if (stories.length > 0) startProgress();
    }, [currentIndex, stories]);

    const fetchStories = async () => {
        const { data, error } = await supabase
            .from("stories")
            .select("*")
            .eq("status", "active")
            .order("order_index", { ascending: true });

        if (!error && data) {
            console.log('Stories carregados:', data.length, 'stories');
            console.log('Stories:', data.map(s => ({ id: s.id, title: s.title, media_type: s.media_type, order_index: s.order_index })));
            setStories(data);
        } else {
            console.error('Erro ao carregar stories:', error);
        }
    };

    const startProgress = () => {
        progress.setValue(0);
        Animated.timing(progress, {
            toValue: 1,
            duration: stories[currentIndex]?.media_type === "image" ? IMAGE_DURATION : 0,
            useNativeDriver: false,
        }).start(({ finished }) => {
            if (finished && stories[currentIndex]?.media_type === "image") {
                goNext();
            }
        });
    };

    const goNext = () => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            navigation.goBack();
        }
    };

    const goPrev = () => {
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
            {/* Barra de progresso */}
            <View style={styles.progressBarContainer}>
                {stories.map((_, index) => (
                    <View key={index} style={styles.progressBarBackground}>
                        <Animated.View
                            style={[
                                styles.progressBarFill,
                                index === currentIndex && { flex: progress },
                                index < currentIndex && { flex: 1 },
                                index > currentIndex && { flex: 0 },
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
                                source={{ uri: currentStory.image_url }}
                                style={styles.media}
                                resizeMode="cover"
                                onError={(error) => {
                                    console.error('Erro ao carregar imagem:', error);
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
                                source={{ uri: currentStory.image_url }}
                                style={styles.media}
                                resizeMode="cover"
                                shouldPlay
                                onError={(error) => {
                                    console.error('Erro ao carregar vídeo:', error);
                                }}
                                onPlaybackStatusUpdate={(status) => {
                                    console.log('Status do vídeo:', status);
                                    if (status.didJustFinish) goNext();
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "black" },
    progressBarContainer: {
        flexDirection: "row",
        position: "absolute",
        top: 40,
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
        height: 3,
        backgroundColor: "white",
        borderRadius: 2,
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
