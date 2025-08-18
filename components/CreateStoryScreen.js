import React, { useState, useRef, useEffect } from 'react';
import { Animated } from 'react-native';
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
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        setHasPermission(imagePickerStatus === 'granted' && cameraStatus === 'granted');
    };
    // function getMimeType(ext) {
    //     switch (ext.toLowerCase()) {
    //         case 'jpg':
    //         case 'jpeg': return 'image/jpeg';
    //         case 'png': return 'image/png';
    //         case 'gif': return 'image/gif';
    //         case 'mp4': return 'video/mp4';
    //         case 'mov': return 'video/quicktime';
    //         default: return 'application/octet-stream';
    //     }
    // }

    // function base64ToUint8Array(base64) {
    //     const binaryString = atob(base64);
    //     const len = binaryString.length;
    //     const bytes = new Uint8Array(len);
    //     for (let i = 0; i < len; i++) {
    //         bytes[i] = binaryString.charCodeAt(i);
    //     }
    //     return bytes;
    // }

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
                    console.log(`📤 Progresso do upload: ${progress}%`);
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

// Funções auxiliares baseadas no MediaService
const getMimeType = (extension) => {
    if (!extension) return 'image/jpeg';

    const mimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        'm4v': 'video/mp4',
        '3gp': 'video/3gpp'
    };

    const cleanExtension = extension.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
    return mimeTypes[cleanExtension] || 'image/jpeg';
};

// Upload de vídeos usando método robusto (baseado no MediaService)
const uploadVideoWithRobustMethod = async (fileUri, fileName, mimeType) => {
    try {
        console.log('🔍 Enviando vídeo para Supabase (método robusto)');
        console.log('🧾 URI:', fileUri);
        console.log('🧾 MIME:', mimeType);
        console.log('🧾 Nome:', fileName);
        console.log('📱 Plataforma:', Platform.OS);

        // Usar método específico por plataforma
        if (Platform.OS === 'android') {
            return await uploadVideoAndroid(fileUri, fileName, mimeType);
        } else {
            return await uploadVideoIOS(fileUri, fileName, mimeType);
        }
    } catch (error) {
        console.error('Erro no upload de vídeo:', error);
        throw error;
    }
};

// Upload específico para Android
const uploadVideoAndroid = async (fileUri, fileName, mimeType) => {
    try {
        console.log('🤖 Usando método específico para Android');

        // Verificar tamanho do arquivo
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        console.log('📏 Tamanho do arquivo:', fileInfo.size, 'bytes');

        // Se arquivo > 10MB, usar upload em chunks
        if (fileInfo.size > 10 * 1024 * 1024) {
            console.log('📦 Arquivo grande detectado, usando upload em chunks');
            return await uploadVideoAndroidChunked(fileUri, fileName, mimeType);
        } else {
            console.log('📦 Arquivo pequeno, usando upload direto');
            return await uploadVideoAndroidDirect(fileUri, fileName, mimeType);
        }
    } catch (error) {
        console.error('Erro no upload de vídeo (Android):', error);
        throw error;
    }
};

// Upload direto para vídeos pequenos no Android
const uploadVideoAndroidDirect = async (fileUri, fileName, mimeType) => {
    try {
        console.log('🤖 Upload direto para vídeo pequeno (Android)');

        // Ler arquivo como ArrayBuffer usando FileSystem
        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64
        });

        // Converter base64 para Uint8Array
        const binaryString = atob(fileContent);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        console.log('📦 Bytes criados, tamanho:', bytes.length, 'bytes');

        let retries = 3;
        let lastError = null;

        while (retries > 0) {
            try {
                console.log(`🔄 Tentativa ${4 - retries}/3 de upload direto (Android)...`);

                const { data, error } = await supabase.storage
                    .from('stories')
                    .upload(fileName, bytes, {
                        cacheControl: '3600',
                        upsert: false,
                        contentType: mimeType,
                    });

                if (error) {
                    console.error('❌ Erro do Supabase (Android):', error);
                    throw error;
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('stories')
                    .getPublicUrl(fileName);

                console.log('✅ Vídeo enviado com sucesso (Android):', publicUrl);
                return publicUrl;
            } catch (error) {
                lastError = error;
                retries--;

                if (retries > 0) {
                    console.log(`Tentativa de upload de vídeo falhou (Android), tentando novamente... (${retries} tentativas restantes)`);
                    console.log(`⚠️ Erro:`, error.message);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }

        throw lastError;
    } catch (error) {
        console.error('Erro no upload de vídeo (Android):', error);
        throw error;
    }
};

// Upload em chunks para vídeos grandes no Android
const uploadVideoAndroidChunked = async (fileUri, fileName, mimeType) => {
    try {
        console.log('🤖 Upload em chunks para vídeo grande (Android)');

        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        const chunkSize = 2 * 1024 * 1024; // 2MB por chunk
        const totalChunks = Math.ceil(fileInfo.size / chunkSize);

        console.log(`📦 Upload em ${totalChunks} chunks de ${chunkSize / (1024 * 1024)}MB cada`);

        // Criar arquivo vazio primeiro
        const { data: createData, error: createError } = await supabase.storage
            .from('stories')
            .upload(fileName, new Uint8Array(0), {
                cacheControl: '3600',
                upsert: false,
                contentType: mimeType,
            });

        if (createError) {
            console.error('❌ Erro ao criar arquivo vazio:', createError);
            throw createError;
        }

        console.log('✅ Arquivo vazio criado, iniciando upload em chunks...');

        // Upload em chunks
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            const start = chunkIndex * chunkSize;
            const end = Math.min(start + chunkSize, fileInfo.size);
            const currentChunkSize = end - start;

            console.log(`📦 Processando chunk ${chunkIndex + 1}/${totalChunks} (${currentChunkSize} bytes)`);

            // Ler chunk específico
            const chunkContent = await FileSystem.readAsStringAsync(fileUri, {
                encoding: FileSystem.EncodingType.Base64,
                length: currentChunkSize,
                position: start
            });

            // Converter base64 para Uint8Array
            const binaryString = atob(chunkContent);
            const chunkBytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                chunkBytes[i] = binaryString.charCodeAt(i);
            }

            // Atualizar arquivo com o chunk
            const { data: updateData, error: updateError } = await supabase.storage
                .from('stories')
                .update(fileName, chunkBytes, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: mimeType,
                });

            if (updateError) {
                console.error(`❌ Erro ao atualizar chunk ${chunkIndex + 1}:`, updateError);
                throw updateError;
            }

            console.log(`✅ Chunk ${chunkIndex + 1}/${totalChunks} enviado`);

            // Pequena pausa entre chunks para evitar sobrecarga
            if (chunkIndex < totalChunks - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        const { data: { publicUrl } } = supabase.storage
            .from('stories')
            .getPublicUrl(fileName);

        console.log('✅ Vídeo enviado com sucesso em chunks (Android):', publicUrl);
        return publicUrl;

    } catch (error) {
        console.error('Erro no upload de vídeo em chunks (Android):', error);
        throw error;
    }
};

// Upload específico para iOS
const uploadVideoIOS = async (fileUri, fileName, mimeType) => {
    try {
        console.log('🍎 Usando método específico para iOS');

        // Usar fetch para vídeos
        const response = await fetch(fileUri);
        if (!response.ok) {
            throw new Error(`Erro ao ler arquivo: ${response.status} ${response.statusText}`);
        }

        const rawBlob = await response.blob();
        console.log('📦 Blob criado, tamanho:', rawBlob.size, 'bytes');

        // Forçar o tipo MIME corretamente
        const blob = new Blob([rawBlob], { type: mimeType });

        let retries = 3;
        let lastError = null;

        while (retries > 0) {
            try {
                console.log(`🔄 Tentativa ${4 - retries}/3 de upload (iOS)...`);

                const { data, error } = await supabase.storage
                    .from('stories')
                    .upload(fileName, blob, {
                        cacheControl: '3600',
                        upsert: false,
                        contentType: mimeType
                    });

                if (error) {
                    console.error('❌ Erro do Supabase (iOS):', error);
                    throw error;
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('stories')
                    .getPublicUrl(fileName);

                console.log('✅ Vídeo enviado com sucesso (iOS):', publicUrl);
                return publicUrl;
            } catch (error) {
                lastError = error;
                retries--;

                if (retries > 0) {
                    console.log(`Tentativa de upload de vídeo falhou (iOS), tentando novamente... (${retries} tentativas restantes)`);
                    console.log(`⚠️ Erro:`, error.message);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }

        throw lastError;
    } catch (error) {
        console.error('Erro no upload de vídeo (iOS):', error);
        throw error;
    }
};

// Upload de imagens usando FileSystem
const uploadImageWithFileSystem = async (fileUri, fileName, mimeType) => {
    try {
        // Ler arquivo como ArrayBuffer usando FileSystem
        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64
        });

        // Converter base64 para Uint8Array
        const binaryString = atob(fileContent);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Tentar upload com retry
        let retries = 3;
        let lastError = null;

        while (retries > 0) {
            try {
                const { data, error } = await supabase.storage
                    .from('stories')
                    .upload(fileName, bytes, {
                        cacheControl: '3600',
                        upsert: false,
                        contentType: mimeType
                    });

                if (error) {
                    throw error;
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('stories')
                    .getPublicUrl(fileName);

                return publicUrl;
            } catch (error) {
                lastError = error;
                retries--;

                if (retries > 0) {
                    console.log(`Tentativa de upload de imagem falhou, tentando novamente... (${retries} tentativas restantes)`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        throw lastError;
    } catch (error) {
        console.error('Erro no upload de imagem:', error);
        throw error;
    }
};



