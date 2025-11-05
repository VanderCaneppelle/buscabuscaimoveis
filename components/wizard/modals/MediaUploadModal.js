import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function MediaUploadModal({ 
    visible, 
    onClose, 
    mediaFiles, 
    setMediaFiles,
    maxImages = 10,
    maxVideos = 0,
    imagesOnly = false
}) {
    const [uploading, setUploading] = useState(false);

    const imagesCount = mediaFiles.filter(f => f.type !== 'video').length;
    const videosCount = mediaFiles.filter(f => f.type === 'video').length;

    const canAddImages = imagesCount < maxImages;
    const canAddVideos = videosCount < maxVideos;

    const pickImages = async () => {
        if (!canAddImages) {
            Alert.alert('Limite atingido', `Você já adicionou o máximo de ${maxImages} fotos permitido pelo seu plano.`);
            return;
        }

        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar suas fotos.');
                return;
            }

            const remainingSlots = maxImages - imagesCount;

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                quality: 0.8,
                selectionLimit: remainingSlots,
            });

            if (!result.canceled) {
                const newImages = result.assets.map(asset => ({
                    uri: asset.uri,
                    type: 'image',
                    width: asset.width,
                    height: asset.height,
                }));

                setMediaFiles([...mediaFiles, ...newImages]);
                onClose();
            }
        } catch (error) {
            console.error('Erro ao selecionar imagens:', error);
            Alert.alert('Erro', 'Não foi possível selecionar as imagens.');
        }
    };

    const pickVideo = async () => {
        if (!canAddVideos) {
            Alert.alert('Limite atingido', 'Seu plano não permite adicionar vídeos ou você já atingiu o limite.');
            return;
        }

        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar seus vídeos.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsMultipleSelection: false,
                quality: 0.8,
            });

            if (!result.canceled) {
                const video = result.assets[0];
                setMediaFiles([...mediaFiles, {
                    uri: video.uri,
                    type: 'video',
                    width: video.width,
                    height: video.height,
                    duration: video.duration,
                }]);
                onClose();
            }
        } catch (error) {
            console.error('Erro ao selecionar vídeo:', error);
            Alert.alert('Erro', 'Não foi possível selecionar o vídeo.');
        }
    };

    const takePhoto = async () => {
        if (!canAddImages) {
            Alert.alert('Limite atingido', `Você já adicionou o máximo de ${maxImages} fotos permitido pelo seu plano.`);
            return;
        }

        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permissão necessária', 'Precisamos de permissão para usar a câmera.');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                quality: 0.8,
            });

            if (!result.canceled) {
                const photo = result.assets[0];
                setMediaFiles([...mediaFiles, {
                    uri: photo.uri,
                    type: 'image',
                    width: photo.width,
                    height: photo.height,
                }]);
                onClose();
            }
        } catch (error) {
            console.error('Erro ao tirar foto:', error);
            Alert.alert('Erro', 'Não foi possível tirar a foto.');
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity 
                style={styles.overlay} 
                activeOpacity={1} 
                onPress={onClose}
            >
                <View style={styles.modal}>
                    <View style={styles.handle} />
                    
                    <Text style={styles.title}>Adicionar Fotos</Text>
                    <Text style={styles.subtitle}>
                        {imagesOnly 
                            ? 'Escolha como deseja adicionar fotos'
                            : 'Escolha como deseja adicionar fotos ou vídeos'
                        }
                    </Text>

                    {/* Limits Info */}
                    <View style={styles.limitsContainer}>
                        <View style={styles.limitItem}>
                            <Ionicons name="images" size={16} color="#3498db" />
                            <Text style={styles.limitText}>
                                {imagesCount}/{maxImages} fotos
                            </Text>
                        </View>
                        {!imagesOnly && (
                            <View style={styles.limitItem}>
                                <Ionicons name="videocam" size={16} color="#e74c3c" />
                                <Text style={styles.limitText}>
                                    {videosCount}/{maxVideos} vídeos
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Options */}
                    <View style={styles.options}>
                        <TouchableOpacity
                            style={[styles.option, !canAddImages && styles.optionDisabled]}
                            onPress={takePhoto}
                            disabled={!canAddImages || uploading}
                        >
                            <View style={[styles.optionIcon, { backgroundColor: '#3498db15' }]}>
                                <Ionicons name="camera" size={28} color="#3498db" />
                            </View>
                            <Text style={styles.optionTitle}>Tirar Foto</Text>
                            <Text style={styles.optionDescription}>Use a câmera</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.option, !canAddImages && styles.optionDisabled]}
                            onPress={pickImages}
                            disabled={!canAddImages || uploading}
                        >
                            <View style={[styles.optionIcon, { backgroundColor: '#9b59b615' }]}>
                                <Ionicons name="images" size={28} color="#9b59b6" />
                            </View>
                            <Text style={styles.optionTitle}>Galeria</Text>
                            <Text style={styles.optionDescription}>Selecione fotos</Text>
                        </TouchableOpacity>

                        {!imagesOnly && (
                            <TouchableOpacity
                                style={[styles.option, !canAddVideos && styles.optionDisabled]}
                                onPress={pickVideo}
                                disabled={!canAddVideos || uploading}
                            >
                                <View style={[styles.optionIcon, { backgroundColor: '#e74c3c15' }]}>
                                    <Ionicons name="videocam" size={28} color="#e74c3c" />
                                </View>
                                <Text style={styles.optionTitle}>Vídeo</Text>
                                <Text style={styles.optionDescription}>Selecione vídeo</Text>
                                {!canAddVideos && (
                                    <View style={styles.disabledBadge}>
                                        <Text style={styles.disabledBadgeText}>Limite</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Cancel Button */}
                    <TouchableOpacity 
                        style={styles.cancelButton}
                        onPress={onClose}
                    >
                        <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modal: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 40,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 16,
    },
    limitsContainer: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
        justifyContent: 'space-around',
    },
    limitItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    limitText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
        marginLeft: 6,
    },
    options: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    option: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    optionDisabled: {
        opacity: 0.5,
        backgroundColor: '#F9FAFB',
    },
    optionIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    optionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    optionDescription: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
    },
    disabledBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#EF4444',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    disabledBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#fff',
    },
    cancelButton: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
});

