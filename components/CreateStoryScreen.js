import React, { useState, useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    SafeAreaView,
    Modal,
    Dimensions,
    ActivityIndicator,
    Image,
    TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Video } from 'expo-av';
import { useAdmin } from '../contexts/AdminContext';
import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';
import { MediaServiceOptimized as MediaService } from '../lib/mediaServiceOptimized';



const { width, height } = Dimensions.get('window');

export default function CreateStoryScreen({ navigation }) {
    const { isAdmin } = useAdmin();
    const [hasPermission, setHasPermission] = useState(null);
    const [capturedMedia, setCapturedMedia] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [storyTitle, setStoryTitle] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);


    const cameraRef = useRef(null);
    const [showRecorder, setShowRecorder] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [hasCamPerm, setHasCamPerm] = useState(null);
    const [hasMicPerm, setHasMicPerm] = useState(null);
    const [isCamReady, setIsCamReady] = useState(false);

    useEffect(() => {
        if (!isAdmin) {
            Alert.alert('Acesso Negado', 'Apenas administradores podem criar stories.');
            navigation.goBack();
            return;
        }
        requestPermissions();
    }, []);

    const requestPermissions = async () => {
        const { status: imagePickerStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        const { status: expCam } = await Camera.requestCameraPermissionsAsync();
        const { status: expMic } = await Camera.requestMicrophonePermissionsAsync();

        setHasCamPerm(expCam === 'granted');
        setHasMicPerm(expMic === 'granted');
        setHasPermission(imagePickerStatus === 'granted' && expCam === 'granted');
    };


    const takePicture = async () => {
        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [9, 16],
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled && result.assets[0]) {
                setCapturedMedia(result.assets[0]);
                setShowPreview(true);
            }
        } catch (error) {
            console.error('Erro ao tirar foto:', error);
            Alert.alert('Erro', 'Não foi possível tirar a foto');
        }
    };

    const recordVideo = async () => {
        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: true,
                aspect: [9, 16],
                quality: 0.8,
                videoMaxDuration: 15,
                base64: false, // Não usar base64 para vídeos (muito pesado)
            });

            if (!result.canceled && result.assets[0]) {
                setCapturedMedia(result.assets[0]);
                setShowPreview(true);
            }
        } catch (error) {
            console.error('Erro ao gravar vídeo:', error);
            Alert.alert('Erro', 'Não foi possível gravar o vídeo');
        }
    };

    const startRecording = async () => {
        if (!cameraRef.current || !isCamReady || isRecording) return;
        setIsRecording(true);
        try {
            const video = await cameraRef.current.recordAsync({ maxDuration: 15 });
            const info = await FileSystem.getInfoAsync(video.uri);
            setCapturedMedia({ uri: video.uri, type: 'video', fileName: `video_${Date.now()}.mp4`, fileSize: info.size || 0 });
            setShowRecorder(false);
            setShowPreview(true);
        } catch (e) {
            console.warn('Erro ao gravar:', e);
        } finally {
            setIsRecording(false);
        }
    };

    const stopRecording = () => {
        if (cameraRef.current && isRecording) cameraRef.current.stopRecording();
    };

    const pickFromGallery = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsEditing: true,
                aspect: [9, 16], // Aspecto vertical para stories
                quality: 0.8,
                base64: false, // Não usar base64 (pode causar problemas com vídeos)
            });

            if (!result.canceled && result.assets[0]) {
                setCapturedMedia(result.assets[0]);
                setShowPreview(true);
            }
        } catch (error) {
            console.error('Erro ao selecionar da galeria:', error);
            Alert.alert('Erro', 'Não foi possível selecionar da galeria');
        }
    };

    const handleUploadStory = async () => {
        if (!capturedMedia || !storyTitle.trim()) {
            Alert.alert('Erro', 'Por favor, adicione um título ao story');
            return;
        }

        setUploading(true);

        try {
            console.log('🚀 Iniciando upload do story...');

            // Usar o MediaServiceOptimized para upload
            const result = await MediaService.uploadStory(
                capturedMedia.uri,
                storyTitle,
                capturedMedia.type,
                (progress) => {
                    console.log(`📤 Progresso do upload handleUploadStory: ${progress}%`);
                    setUploadProgress(progress);
                }
            );

            console.log('✅ Upload concluído:', result);

            if (result.success) {
                console.log('🎉 Story publicado com sucesso!');

                // Fechar o modal de preview primeiro
                setShowPreview(false);

                // Pequeno delay para garantir que o modal fechou
                setTimeout(() => {
                    Alert.alert(
                        '🎉 Sucesso!',
                        'Story publicado com sucesso!',
                        [
                            {
                                text: 'OK',
                                onPress: () => {
                                    setCapturedMedia(null);
                                    setStoryTitle('');
                                    navigation.goBack();
                                }
                            }
                        ]
                    );
                }, 500);
            } else {
                throw new Error('Falha no upload do story');
            }

        } catch (error) {
            console.error('❌ Erro no upload do story:', error);
            Alert.alert(
                '❌ Erro',
                `Não foi possível publicar o story: ${error.message}`,
                [{ text: 'OK' }]
            );
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };





    const renderPreview = () => (
        <Modal visible={showPreview} animationType="slide">
            <SafeAreaView style={styles.previewContainer}>
                <View style={styles.previewHeader}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setShowPreview(false)}
                    >
                        <Ionicons name="close" size={30} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.previewTitle}>Prévia do Story</Text>
                </View>

                <View style={styles.previewContent}>
                    {capturedMedia?.type === 'video' ? (
                        <Video
                            source={{ uri: capturedMedia.uri }}
                            style={styles.previewMedia}
                            useNativeControls
                            resizeMode="contain"
                            shouldPlay
                            isLooping
                        />
                    ) : (
                        <Image
                            source={{ uri: capturedMedia?.uri }}
                            style={styles.previewMedia}
                            resizeMode="contain"
                        />
                    )}
                </View>

                <View style={styles.previewForm}>
                    <TextInput
                        style={styles.titleInput}
                        placeholder="Título do story..."
                        placeholderTextColor="#666"
                        value={storyTitle}
                        onChangeText={setStoryTitle}
                        maxLength={50}
                    />

                    <TouchableOpacity
                        style={[styles.uploadButton, uploading && styles.uploadingButton]}
                        onPress={handleUploadStory}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <View style={styles.uploadingContainer}>
                                <ActivityIndicator color="#fff" size="small" />
                                <Text style={styles.uploadingText}>
                                    {uploadProgress > 0 ? `Enviando... ${uploadProgress}%` : 'Enviando...'}
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.uploadButtonText}>Publicar Story</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );

    if (hasPermission === null) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#1e3a8a" />
                <Text style={styles.loadingText}>Solicitando permissões...</Text>
            </View>
        );
    }

    if (hasPermission === false) {
        return (
            <View style={styles.container}>
                <Ionicons name="camera-off" size={64} color="#e74c3c" />
                <Text style={styles.errorText}>Permissão de câmera negada</Text>
                <TouchableOpacity style={styles.retryButton} onPress={requestPermissions}>
                    <Text style={styles.retryButtonText}>Tentar Novamente</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (

        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Criar Story</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <Text style={styles.sectionTitle}>Escolha uma opção:</Text>

                <View style={styles.optionsContainer}>
                    <TouchableOpacity
                        style={styles.optionButton}
                        onPress={takePicture}
                    >
                        <View style={styles.optionIcon}>
                            <Ionicons name="camera" size={40} color="#1e3a8a" />
                        </View>
                        <Text style={styles.optionText}>Foto</Text>
                        <Text style={styles.optionSubtext}>Tirar foto</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.optionButton}
                        onPress={recordVideo}
                    >
                        <View style={styles.optionIcon}>
                            <Ionicons name="videocam" size={40} color="#1e3a8a" />
                        </View>
                        <Text style={styles.optionText}>Vídeo</Text>
                        <Text style={styles.optionSubtext}>Gravar vídeo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.optionButton}
                        onPress={() => setShowRecorder(true)}
                    >
                        <View style={styles.optionIcon}>
                            <Ionicons name="videocam" size={40} color="#1e3a8a" />
                        </View>
                        <Text style={styles.optionText}>Vídeo - expo camera</Text>
                        <Text style={styles.optionSubtext}>Gravar vídeo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.optionButton}
                        onPress={pickFromGallery}
                    >
                        <View style={styles.optionIcon}>
                            <Ionicons name="images" size={40} color="#1e3a8a" />
                        </View>
                        <Text style={styles.optionText}>Galeria</Text>
                        <Text style={styles.optionSubtext}>Selecionar mídia</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.infoContainer}>
                    <Ionicons name="information-circle" size={20} color="#1e3a8a" />
                    <Text style={styles.infoText}>
                        Stories são exibidos por 24 horas e podem conter fotos ou vídeos de até 15 segundos.
                    </Text>
                </View>
            </View>

            {showRecorder && hasCamPerm && hasMicPerm && (
                <Modal visible animationType="slide" transparent={false}>
                    <View style={{ flex: 1, backgroundColor: '#000' }}>
                        <CameraView
                            ref={cameraRef}
                            style={{ flex: 1 }}
                            facing="back"
                            mode="video"
                            enableAudio={true}
                            onCameraReady={() => {
                                console.log('📷 CameraView pronta');
                                setIsCamReady(true);
                            }}
                        />
                        <View style={{ position: 'absolute', bottom: 30, width: '100%', alignItems: 'center' }}>
                            {!isRecording ? (
                                <TouchableOpacity onPress={startRecording} disabled={!isCamReady} style={{ backgroundColor: isCamReady ? '#e11d48' : '#64748b', padding: 16, borderRadius: 999 }}>
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Gravar (máx. 15s)</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity onPress={stopRecording} style={{ backgroundColor: '#1e3a8a', padding: 16, borderRadius: 999 }}>
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Parar</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={() => setShowRecorder(false)} style={{ marginTop: 12 }}>
                                <Text style={{ color: '#fff' }}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}

            {renderPreview()}
        </SafeAreaView>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e3a8a',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 30,
        textAlign: 'center',
    },
    optionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        flexWrap: 'wrap',
        marginBottom: 40,
        gap: 15,
    },
    optionButton: {
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 25,
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        minWidth: 100,
        flex: 1,
        maxWidth: 120,
    },
    optionIcon: {
        marginBottom: 15,
    },
    optionText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1e3a8a',
        marginBottom: 5,
    },
    optionSubtext: {
        fontSize: 12,
        color: '#64748b',
        textAlign: 'center',
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#e3f2fd',
        padding: 15,
        borderRadius: 10,
        marginTop: 20,
    },
    infoText: {
        flex: 1,
        marginLeft: 10,
        fontSize: 14,
        color: '#1e3a8a',
        lineHeight: 20,
    },

    closeButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 20,
        padding: 10,
    },
    previewContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        paddingTop: 50,
    },
    previewTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    previewContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewMedia: {
        width: width * 0.8,
        height: height * 0.5,
        borderRadius: 10,
    },
    previewForm: {
        padding: 20,
        backgroundColor: '#fff',
    },
    titleInput: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        padding: 15,
        fontSize: 16,
        marginBottom: 20,
        backgroundColor: '#fff',
    },
    uploadButton: {
        backgroundColor: '#1e3a8a',
        borderRadius: 8,
        padding: 15,
        alignItems: 'center',
    },
    uploadingButton: {
        backgroundColor: '#64748b',
    },
    uploadButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#64748b',
        textAlign: 'center',
    },
    errorText: {
        marginTop: 10,
        fontSize: 16,
        color: '#e74c3c',
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 20,
        backgroundColor: '#1e3a8a',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    uploadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    uploadingText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },

});








