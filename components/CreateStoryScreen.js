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
    const [storyLink, setStoryLink] = useState('');
    const [linkText, setLinkText] = useState('Fale conosco');
    const [linkType, setLinkType] = useState('whatsapp');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);


    const cameraRef = useRef(null);
    const [showRecorder, setShowRecorder] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [hasCamPerm, setHasCamPerm] = useState(null);
    const [hasMicPerm, setHasMicPerm] = useState(null);
    const [isCamReady, setIsCamReady] = useState(false);
    const [facing, setFacing] = useState('back');
    const [zoom, setZoom] = useState(0); // Começa em 0 (sem zoom)
    const [elapsedMs, setElapsedMs] = useState(0);
    const timerRef = useRef(null);
    const zoomBarHeight = 200; // Altura da barra de zoom

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
        setElapsedMs(0); // Reset timer to 0
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setElapsedMs((ms) => {
                const newMs = ms + 100;
                if (newMs >= 15000) {
                    // Auto stop at 15 seconds
                    stopRecording();
                    return 15000;
                }
                return newMs;
            });
        }, 100);
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
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const stopRecording = () => {
        if (cameraRef.current && isRecording) cameraRef.current.stopRecording();
        setIsRecording(false);
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const formatTime = (ms) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    };

    const handleZoomChange = (newZoom) => {
        setZoom(Math.max(0, Math.min(1, newZoom)));
    };

    const increaseZoom = () => {
        setZoom(prev => Math.min(1, prev + 0.1));
    };

    const decreaseZoom = () => {
        setZoom(prev => Math.max(0, prev - 0.1));
    };

    // Função helper para placeholders dos links
    const getLinkPlaceholder = (type) => {
        switch (type) {
            case 'whatsapp':
                return 'Número do WhatsApp (ex: 5511999999999)';
            case 'phone':
                return 'Número do telefone (ex: +5511999999999)';
            case 'email':
                return 'Email (ex: contato@seusite.com.br)';
            case 'website':
                return 'URL do site (ex: https://seusite.com.br)';
            default:
                return 'Digite o link...';
        }
    };

    // Função para formatar URL baseada no tipo
    const formatLinkUrl = (type, value) => {
        if (!value.trim()) return null;

        switch (type) {
            case 'whatsapp':
                const phone = value.replace(/\D/g, '');
                return `https://wa.me/${phone}?text=Olá! Vi seu story sobre imóveis`;
            case 'phone':
                return `tel:${value}`;
            case 'email':
                return `mailto:${value}?subject=Interesse em imóvel`;
            case 'website':
                return value.startsWith('http') ? value : `https://${value}`;
            default:
                return value;
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

            // Preparar dados do link se fornecido
            let linkData = null;
            if (storyLink.trim()) {
                const formattedUrl = formatLinkUrl(linkType, storyLink);
                if (formattedUrl) {
                    linkData = {
                        type: linkType,
                        url: formattedUrl,
                        text: linkText.trim() || 'Saiba mais'
                    };
                    console.log('🔗 Dados do link preparados:', linkData);
                }
            } else {
                console.log('🔗 Nenhum link fornecido');
            }

            // Usar o MediaServiceOptimized para upload
            const result = await MediaService.uploadStory(
                capturedMedia.uri,
                storyTitle,
                capturedMedia.type,
                (progress) => {
                    console.log(`📤 Progresso do upload handleUploadStory: ${progress}%`);
                    setUploadProgress(progress);
                },
                linkData
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

                    {/* Seção de Link */}
                    <View style={styles.linkSection}>
                        <Text style={styles.sectionLabel}>Link (opcional)</Text>

                        <View style={styles.linkTypeContainer}>
                            <Text style={styles.linkTypeLabel}>Tipo:</Text>
                            <View style={styles.linkTypeButtons}>
                                {['whatsapp', 'phone', 'email', 'website'].map((type) => (
                                    <TouchableOpacity
                                        key={type}
                                        style={[
                                            styles.linkTypeButton,
                                            linkType === type && styles.linkTypeButtonActive
                                        ]}
                                        onPress={() => setLinkType(type)}
                                    >
                                        <Text style={[
                                            styles.linkTypeButtonText,
                                            linkType === type && styles.linkTypeButtonTextActive
                                        ]}>
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <TextInput
                            style={styles.linkInput}
                            placeholder={getLinkPlaceholder(linkType)}
                            placeholderTextColor="#666"
                            value={storyLink}
                            onChangeText={setStoryLink}
                            keyboardType={linkType === 'phone' ? 'phone-pad' : 'url'}
                        />

                        <TextInput
                            style={styles.linkInput}
                            placeholder="Texto do botão (ex: Fale conosco)"
                            placeholderTextColor="#666"
                            value={linkText}
                            onChangeText={setLinkText}
                            maxLength={20}
                        />
                    </View>

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
                            facing={facing}
                            mode="video"
                            enableAudio={true}
                            zoom={zoom}
                            onCameraReady={() => {
                                console.log('📷 CameraView pronta');
                                setIsCamReady(true);
                            }}
                        />
                        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
                            {/* Topo: barra de progresso e tempos */}
                            <View style={{ paddingTop: 40, paddingHorizontal: 16 }}>
                                <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2, overflow: 'hidden' }}>
                                    <View style={{ width: `${Math.round((elapsedMs / 15000) * 100)}%`, height: '100%', backgroundColor: '#e11d48' }} />
                                </View>
                                <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>{formatTime(elapsedMs)}</Text>
                                    <Text style={{ color: '#fff' }}>{formatTime(15000 - elapsedMs)}</Text>
                                </View>
                            </View>

                            {/* Lateral: apenas flip da câmera */}
                            <View style={{ position: 'absolute', right: 16, top: 100, alignItems: 'center' }}>
                                <TouchableOpacity
                                    onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
                                    style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 999 }}
                                >
                                    <Ionicons name="camera-reverse" size={22} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            {/* Rodapé: barra de zoom, botão de gravar e cancelar */}
                            <View style={{ position: 'absolute', bottom: 24, width: '100%', alignItems: 'center' }}>
                                {/* Barra de zoom horizontal */}
                                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                    <Text style={{ color: '#fff', fontSize: 12, marginBottom: 8 }}>Zoom</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        {/* Botão - */}
                                        <TouchableOpacity
                                            onPress={decreaseZoom}
                                            style={{
                                                width: 40,
                                                height: 40,
                                                backgroundColor: 'rgba(0,0,0,0.5)',
                                                borderRadius: 20,
                                                justifyContent: 'center',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>-</Text>
                                        </TouchableOpacity>

                                        {/* Barra de zoom (apenas visual) */}
                                        <View style={{
                                            width: 200,
                                            height: 30,
                                            backgroundColor: 'rgba(0,0,0,0.3)',
                                            borderRadius: 15,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            position: 'relative'
                                        }}>
                                            {/* Barra de progresso do zoom */}
                                            <View style={{
                                                position: 'absolute',
                                                left: 0,
                                                top: 0,
                                                width: `${zoom * 100}%`,
                                                height: '100%',
                                                backgroundColor: '#e11d48',
                                                borderRadius: 15
                                            }} />

                                            {/* Indicador de zoom */}
                                            <View style={{
                                                width: 20,
                                                height: 20,
                                                borderRadius: 10,
                                                backgroundColor: '#fff',
                                                position: 'absolute',
                                                left: `${zoom * 100}%`,
                                                transform: [{ translateX: -10 }]
                                            }} />

                                            {/* Marcadores de zoom */}
                                            <View style={{ position: 'absolute', width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 }}>
                                                <Text style={{ color: '#fff', fontSize: 10 }}>1x</Text>
                                                <Text style={{ color: '#fff', fontSize: 10 }}>2x</Text>
                                            </View>
                                        </View>

                                        {/* Botão + */}
                                        <TouchableOpacity
                                            onPress={increaseZoom}
                                            style={{
                                                width: 40,
                                                height: 40,
                                                backgroundColor: 'rgba(0,0,0,0.5)',
                                                borderRadius: 20,
                                                justifyContent: 'center',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>+</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <Text style={{ color: '#fff', fontSize: 10, marginTop: 4 }}>{(zoom + 1).toFixed(1)}x</Text>
                                </View>

                                {/* Botão de gravar */}
                                <TouchableOpacity
                                    disabled={!isCamReady}
                                    onPress={() => {
                                        if (isCamReady) {
                                            if (isRecording) {
                                                stopRecording();
                                            } else {
                                                startRecording();
                                            }
                                        }
                                    }}
                                    activeOpacity={1}
                                    style={{ opacity: isCamReady ? 1 : 0.6 }}
                                >
                                    {/* Outer ring */}
                                    <View style={{
                                        width: 84,
                                        height: 84,
                                        borderRadius: 42,
                                        borderWidth: 4,
                                        borderColor: '#fff',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: 'transparent'
                                    }}>
                                        {/* Inner fill */}
                                        <View style={{
                                            width: isRecording ? 64 : 68,
                                            height: isRecording ? 64 : 68,
                                            borderRadius: 999,
                                            backgroundColor: isRecording ? '#e11d48' : 'rgba(255,255,255,0.9)'
                                        }} />
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity onPress={() => { setShowRecorder(false); if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } }} style={{ marginTop: 14 }}>
                                    <Text style={{ color: '#fff' }}>Cancelar</Text>
                                </TouchableOpacity>
                            </View>
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
    linkSection: {
        marginBottom: 20,
        padding: 15,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 10,
    },
    linkTypeContainer: {
        marginBottom: 15,
    },
    linkTypeLabel: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 8,
    },
    linkTypeButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    linkTypeButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        backgroundColor: '#e2e8f0',
        borderWidth: 1,
        borderColor: '#cbd5e1',
    },
    linkTypeButtonActive: {
        backgroundColor: '#1e3a8a',
        borderColor: '#1e3a8a',
    },
    linkTypeButtonText: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
    },
    linkTypeButtonTextActive: {
        color: '#fff',
    },
    linkInput: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        marginBottom: 10,
        backgroundColor: '#fff',
    },

});








