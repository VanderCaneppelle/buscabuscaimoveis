import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

export default function StoryImage({ imageUrl, optimizedUrl }) {
    const imageSource = optimizedUrl || imageUrl;

    return (
        <View style={styles.mediaContainer}>
            <Image
                source={{ uri: imageSource }}
                style={styles.media}
                resizeMode="contain"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    mediaContainer: {
        flex: 1,
        position: "relative",
        backgroundColor: 'black',
        alignItems: 'center',
        justifyContent: 'center',
    },
    media: {
        width: '100%',
        height: '100%',
    },
});
