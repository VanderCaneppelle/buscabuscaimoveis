import React from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Video } from 'expo-av';

const { width, height } = Dimensions.get('window');

const BBLoading = ({ visible = true }) => {
    if (!visible) return null;

    return (
        <View style={styles.container}>
            <Video
                source={require('../assets/gif_bb.mp4')}
                style={styles.video}
                resizeMode="contain"
                shouldPlay={true}
                isLooping={true}
                isMuted={true}
                useNativeControls={false}
            />
            {/* Fallback caso o vídeo não carregue */}
            <ActivityIndicator size="large" color="#1e3a8a" style={styles.fallback} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    video: {
        width: width * 0.6, // 60% da largura da tela
        height: height * 0.3, // 30% da altura da tela
    },
    fallback: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -20,
        marginTop: -20,
    },
});

export default BBLoading; 