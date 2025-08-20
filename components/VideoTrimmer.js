import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Dimensions,
    ActivityIndicator,
    Modal
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';

const { width, height } = Dimensions.get('window');
const MAX_FILE_SIZE_MB = 100; // Limite do Cloudinary
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function VideoTrimmerModal({
    videoUri,
    visible,
    onClose,
    onVideoTrimmed
}) {
    const [isLoading, setIsLoading] = useState(false);
    const [videoDuration, setVideoDuration] = useState(0);
    const [fileSize, setFileSize] = useState(0);
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoUri && visible) {
            getVideoInfo();
        }
    }, [videoUri, visible]);

    const getVideoInfo = async () => {
        try {
            setIsLoading(true);

            // Obter informações do arquivo
            const fileInfo = await FileSystem.getInfoAsync(videoUri);
            setFileSize(fileInfo.size || 0);

            // Obter duração do vídeo
            const { durationMillis } = await getVideoDuration(videoUri);
            const durationSeconds = durationMillis / 1000;
            setVideoDuration(durationSeconds);

        } catch (error) {
            console.error('Erro ao obter informações do vídeo:', error);
            Alert.alert('Erro', 'Não foi possível analisar o vídeo');
        } finally {
            setIsLoading(false);
        }
    };

    const getVideoDuration = (uri) => {
        return new Promise((resolve, reject) => {
            const video = new Video.createAsync(
                { uri },
                (status) => {
                    if (status.isLoaded) {
                        resolve({ durationMillis: status.durationMillis });
                    } else {
                        reject(new Error('Vídeo não carregado'));
                    }
                },
                false
            );
        });
    };

    const handleUseAsIs = () => {
        Alert.alert(
            'Vídeo Grande',
            'Este vídeo pode falhar no upload devido ao tamanho. Deseja continuar mesmo assim?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Usar Mesmo Assim',
                    onPress: () => {
                        onVideoTrimmed(videoUri);
                        onClose();
                    }
                }
            ]
        );
    };

    const handleTrimVideo = () => {
        Alert.alert(
            'Cortar Vídeo',
            'Funcionalidade de corte será implementada em breve.\n\n' +
            'Por enquanto, o vídeo será usado como está.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'OK', onPress: () => {
                        onVideoTrimmed(videoUri);
                        onClose();
                    }
                }
            ]
        );
    };

    const formatFileSize = (bytes) => {
        const mb = bytes / 1024 / 1024;
        return `${mb.toFixed(1)}MB`;
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Ionicons name="close" size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Cortar Vídeo</Text>
                    <View style={{ width: 60 }} />
                </View>

                {/* Preview do Vídeo */}
                <View style={styles.videoContainer}>
                    <Video
                        ref={videoRef}
                        source={{ uri: videoUri }}
                        style={styles.video}
                        useNativeControls
                        resizeMode="cover"
                        shouldPlay={false}
                        isLooping={false}
                    />
                </View>

                {/* Informações do Vídeo */}
                <View style={styles.infoContainer}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Duração:</Text>
                        <Text style={styles.infoValue}>{formatDuration(videoDuration)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Tamanho:</Text>
                        <Text style={[
                            styles.infoValue,
                            fileSize > MAX_FILE_SIZE_BYTES && styles.warningText
                        ]}>
                            {formatFileSize(fileSize)}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Limite:</Text>
                        <Text style={styles.infoValue}>{formatFileSize(MAX_FILE_SIZE_BYTES)}</Text>
                    </View>
                </View>

                {/* Aviso */}
                <View style={styles.warningContainer}>
                    <Ionicons name="warning" size={24} color="#ff6b6b" />
                    <Text style={styles.warningText}>
                        Este vídeo excede o limite de {MAX_FILE_SIZE_MB}MB. Corte o vídeo para reduzir o tamanho.
                    </Text>
                </View>

                {/* Opções */}
                <View style={styles.optionsContainer}>
                    <TouchableOpacity
                        style={styles.optionButton}
                        onPress={handleUseAsIs}
                        disabled={isLoading}
                    >
                        <Ionicons name="play" size={20} color="white" />
                        <Text style={styles.optionButtonText}>Usar Como Está</Text>
                        <Text style={styles.optionButtonSubtext}>Pode falhar no upload</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.optionButton, styles.primaryButton]}
                        onPress={handleTrimVideo}
                        disabled={isLoading}
                    >
                        <Ionicons name="cut" size={20} color="white" />
                        <Text style={styles.optionButtonText}>Cortar Vídeo</Text>
                        <Text style={styles.optionButtonSubtext}>Vídeo mais curto</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.optionButton, styles.secondaryButton]}
                        onPress={onClose}
                        disabled={isLoading}
                    >
                        <Ionicons name="camera" size={20} color="white" />
                        <Text style={styles.optionButtonText}>Gravar Novamente</Text>
                        <Text style={styles.optionButtonSubtext}>Vídeo mais curto</Text>
                    </TouchableOpacity>
                </View>

                {isLoading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="white" />
                        <Text style={styles.loadingText}>Processando...</Text>
                    </View>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    videoContainer: {
        flex: 1,
        marginHorizontal: 20,
        borderRadius: 10,
        overflow: 'hidden',
    },
    video: {
        flex: 1,
    },
    infoContainer: {
        padding: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        margin: 20,
        borderRadius: 10,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    infoLabel: {
        color: 'white',
        fontSize: 16,
    },
    infoValue: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    warningText: {
        color: '#ff6b6b',
        fontWeight: 'bold',
    },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,107,107,0.2)',
        padding: 15,
        marginHorizontal: 20,
        borderRadius: 10,
        marginBottom: 20,
    },
    optionsContainer: {
        padding: 20,
        gap: 15,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 15,
        borderRadius: 10,
        gap: 10,
    },
    primaryButton: {
        backgroundColor: '#007AFF',
    },
    secondaryButton: {
        backgroundColor: '#34C759',
    },
    optionButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
    },
    optionButtonSubtext: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: 'white',
        marginTop: 10,
        fontSize: 16,
    },
});
