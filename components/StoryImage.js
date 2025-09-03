import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function StoryImage({ imageUrl, optimizedUrl }) {
    const imageSource = optimizedUrl || imageUrl;

    return (
        <View style={styles.mediaContainer}>
            <Image
                source={{ uri: imageSource }}
                style={styles.media}
                resizeMode="cover"
            />
            {/* <View style={styles.mediaTypeIndicator}>
                <Ionicons name="image" size={20} color="#fff" />
            </View> */}
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
