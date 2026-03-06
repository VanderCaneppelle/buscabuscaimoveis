import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Video } from 'expo-av';

export default function StoryVideo({ videoUrl, optimizedUrl, videoRef, isMuted = false, onLoad, onPlaybackStatusUpdate, onError }) {
    const videoSource = optimizedUrl || videoUrl;

    return (
        <View style={styles.mediaContainer}>
            <Video
                ref={videoRef}
                source={{ uri: videoSource }}
                style={styles.media}
                resizeMode="contain"
                shouldPlay={false}
                isLooping={false}
                useNativeControls={false}
                volume={1}
                isMuted={false}
                onLoad={onLoad}
                onPlaybackStatusUpdate={onPlaybackStatusUpdate}
                onError={onError}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    mediaContainer: {
        flex: 1,
        position: "relative",
        backgroundColor: 'black',
    },
    media: {
        width: '100%',
        height: '100%',
    },
});
