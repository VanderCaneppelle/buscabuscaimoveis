import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function StoryVideo({ videoUrl, optimizedUrl, videoRef, onLoad, onPlaybackStatusUpdate, onError }) {
    const videoSource = optimizedUrl || videoUrl;

    return (
        <View style={styles.mediaContainer}>
            <Video
                ref={videoRef}
                source={{ uri: videoSource }}
                style={styles.media}
                resizeMode="cover"
                shouldPlay={false}
                isLooping={false}
                useNativeControls={false}
                volume={1}
                onLoad={onLoad}
                onPlaybackStatusUpdate={onPlaybackStatusUpdate}
                onError={onError}
            />
            <View style={styles.mediaTypeIndicator}>
                <Ionicons name="videocam" size={20} color="#fff" />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    mediaContainer: {
        position: "relative",
        width,
        height,
    },
    media: {
        width,
        height,
    },
    mediaTypeIndicator: {
        position: "absolute",
        top: 20,
        right: 20,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        borderRadius: 15,
        padding: 5,
    },
});
