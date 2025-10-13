import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    SafeAreaView,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useAdmin } from '../contexts/AdminContext';
import { Platform } from 'react-native';
import { MediaServiceOptimized as MediaService } from '../lib/mediaServiceOptimized';
import { useAuth } from '../contexts/AuthContext';
import StoryPreviewModal from './modals/StoryPreviewModal';

// ✅ Função helper para obter informações do vídeo
const getVideoInfo = async (uri) => {
    try {
        const { durationMillis } = await VideoThumbnails.getThumbnailAsync(uri, {
            time: 0,
        });

        return {
            duration: durationMillis ? durationMillis / 1000 : 0, // Converter ms para segundos
        };
    } catch (error) {
        console.error('Erro ao obter info do vídeo:', error);
        return { duration: 0 };
    }
};

const { width, height } = Dimensions.get('window');

// Função para calcular posições iniciais no centro da preview
const getInitialPositions = () => {
    return {
        title: {
            x: width * 0.5 - 80, // 50% da tela - metade da largura do título
            y: height * 0.35 // 35% da altura da tela
        },
        link: {
            x: width * 0.5 - 60, // 50% da tela - metade da largura do link
            y: height * 0.65 // 65% da altura da tela
        }
    };
};

export default function CreateStoryScreen({ navigation }) {
    const { isAdmin } = useAdmin();
    const { user } = useAuth();

    const [capturedMedia, setCapturedMedia] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [storyTitle, setStoryTitle] = useState('');
    const [storyLink, setStoryLink] = useState('');
    const [linkText, setLinkText] = useState('Fale conosco');
    const [linkType, setLinkType] = useState('whatsapp');

    const initialPositions = getInitialPositions();
    const [linkCoordinates, setLinkCoordinates] = useState(initialPositions.link);
    const [titleCoordinates, setTitleCoordinates] = useState(initialPositions.title);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showTitleModal, setShowTitleModal] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [isDraggingToTrash, setIsDraggingToTrash] = useState(false);

    // Estados para layout e tamanho do título
    const [titleLayout, setTitleLayout] = useState('center'); // center, left, right
    const [titleSize, setTitleSize] = useState('medium'); // small, medium, large

    // Estados para redimensionamento direto
    const [titleScale, setTitleScale] = useState(1.0); // Escala do título (0.5 a 2.0)
    const [linkScale, setLinkScale] = useState(1.0); // Escala do link (0.5 a 2.0)


    // Funções para editar e excluir elementos
    const handleEditTitle = () => {
        setShowTitleModal(true);
    };

    const handleEditLink = () => {
        setShowLinkModal(true);
    };

    const handleDeleteTitle = () => {
        setStoryTitle('');
        setTitleCoordinates(initialPositions.title);
    };

    const handleDeleteLink = () => {
        setStoryLink('');
        setLinkText('Fale conosco');
        setLinkCoordinates(initialPositions.link);
    };

    // Função para aplicar layout automático
    const applyTitleLayout = (layout) => {
        setTitleLayout(layout);

        switch (layout) {
            case 'center':
                setTitleCoordinates({
                    x: width * 0.5 - 100,
                    y: height * 0.4
                });
                break;
            case 'left':
                setTitleCoordinates({
                    x: width * 0.1,
                    y: height * 0.3
                });
                break;
            case 'right':
                setTitleCoordinates({
                    x: width * 0.7,
                    y: height * 0.3
                });
                break;
        }
    };

    // Função para aplicar tamanho
    const applyTitleSize = (size) => {
        setTitleSize(size);
    };





    useEffect(() => {
        console.log('🔍 Verificando admin:', { isAdmin });
        if (!isAdmin) {
            Alert.alert('Acesso Negado', 'Apenas administradores podem criar stories.');
            navigation.goBack();
            return;
        }
        console.log('✅ Admin verificado, tela carregada');
    }, [isAdmin]);






    const takePicture = async () => {
        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
               aspect: [9, 16],
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled && result.assets[0]) {
                setCapturedMedia(result.assets[0]);
                setShowPreview(true); // Abrir modal automaticamente
            }
        } catch (error) {
            console.error('Erro ao tirar foto:', error);
            Alert.alert('Erro', 'Não foi possível tirar a foto');
        }
    };



    // 🎯 Função para gravar vídeo com qualidade média
    const recordVideo = async () => {
        try {
            // 🎯 SOLUÇÃO HÍBRIDA: iOS vs Android
            if (Platform.OS === 'ios') {
                // ✅ iOS: videoMaxDuration funciona nativamente
                const config = {
                    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                    allowsEditing: true,
                    aspect: [9, 16],
                    base64: false,
                    allowsMultipleSelection: false,
                    exif: false,
                    videoQuality: ImagePicker.UIImagePickerControllerQualityType.IFrame1280x720,
                    videoMaxDuration: 30, // ✅ 30 segundos no iOS
                    presentationStyle: 'fullScreen',
                    cameraType: ImagePicker.CameraType.back,
                };

                const result = await ImagePicker.launchCameraAsync(config);
                if (!result.canceled && result.assets[0]) {
                    // ✅ Vai direto para preview sem compressão
                    await checkVideoAndShowPreview(result.assets[0].uri);
                }
            } else {
                // ⚠️ Android: videoMaxDuration não funciona, usar timer visual
                Alert.alert(
                    'Gravar Vídeo',
                    'Você terá 30 segundos para gravar o vídeo.\n\n' +
                    'Toque em "Gravar" para começar.',
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                            text: 'Gravar',
                            onPress: startAndroidRecording
                        }
                    ]
                );
            }
        } catch (error) {
            console.error('Erro ao gravar vídeo:', error);
            Alert.alert('Erro', 'Não foi possível gravar o vídeo');
        }
    };

    // 🎯 Função específica para Android com timer visual
    const startAndroidRecording = async () => {
        try {
            const config = {
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: true,
                aspect: [9, 16],
                base64: false,
                allowsMultipleSelection: false,
                exif: false,
                quality: 0.65,
                cameraType: ImagePicker.CameraType.back,
            };

            const result = await ImagePicker.launchCameraAsync(config);

            if (!result.canceled && result.assets[0]) {
                // ✅ Validar duração do vídeo gravado
                const asset = result.assets[0];
                const durationSeconds = asset.duration ? Math.round(asset.duration / 1000) : null; // alguns devices retornam em ms

                if (durationSeconds && durationSeconds > 30) {
                    Alert.alert(
                        'Vídeo muito longo',
                        `O vídeo tem ${durationSeconds} segundos.\n\n` +
                        'O limite é de 30 segundos. Deseja gravar novamente?',
                        [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                                text: 'Gravar Novamente',
                                onPress: startAndroidRecording
                            }
                        ]
                    );
                    return;
                }

                // ✅ Vídeo dentro do limite, vai direto para preview
                await checkVideoAndShowPreview(asset.uri);
            }
        } catch (error) {
            console.error('Erro ao gravar vídeo no Android:', error);
            Alert.alert('Erro', 'Não foi possível gravar o vídeo');
        }
    };


    // Função para verificar tamanho do vídeo e ir direto para preview
    const checkVideoAndShowPreview = async (videoUri) => {
        try {
            console.log('🔍 DEBUG - checkVideoAndShowPreview iniciado');
            console.log('🔍 DEBUG - videoUri:', videoUri);
            const fileInfo = await FileSystem.getInfoAsync(videoUri);
            const fileSizeMB = fileInfo.size / 1024 / 1024;
            const MAX_SIZE_MB = 100; // Limite do Cloudinary

            if (fileSizeMB > MAX_SIZE_MB) {
                // Vídeo muito grande, mostrar alerta
                Alert.alert(
                    'Vídeo Muito Grande',
                    `Este vídeo tem ${fileSizeMB.toFixed(1)}MB e excede o limite de ${MAX_SIZE_MB}MB.\n\n` +
                    'Grave um vídeo mais curto ou com menor qualidade.',
                    [{ text: 'OK' }]
                );
            } else {
                // Vídeo OK, ir direto para preview
                setCapturedMedia({ uri: videoUri, type: 'video' });
                setShowPreview(true);
            }
        } catch (error) {
            console.error('Erro ao verificar tamanho do vídeo:', error);
            // Em caso de erro, assume que está OK
            setCapturedMedia({ uri: videoUri, type: 'video' });
            setShowPreview(true);
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
                allowsEditing: false,
                aspect: [9, 16], // Aspecto vertical para stories
                quality: 0.8,
                base64: false, // Não usar base64 (pode causar problemas com vídeos)
            });

            if (!result.canceled && result.assets[0]) {
                const mediaAsset = result.assets[0];

                if (mediaAsset.type === 'video' || mediaAsset.uri.includes('.mp4') || mediaAsset.uri.includes('.mov')) {
                    // ✅ É um vídeo, verificar duração e tamanho
                    const videoInfo = await getVideoInfo(mediaAsset.uri);
                    const durationSeconds = videoInfo.duration;

                    if (durationSeconds > 30) {
                        Alert.alert(
                            'Vídeo muito longo',
                            `O vídeo selecionado tem ${Math.round(durationSeconds)} segundos.\n\n` +
                            'O limite é de 30 segundos. Selecione um vídeo mais curto.',
                            [{ text: 'OK' }]
                        );
                        return;
                    }

                    // ✅ Vídeo dentro do limite, vai direto para preview
                    await checkVideoAndShowPreview(mediaAsset.uri);
                } else {
                    // É uma imagem, ir direto para preview
                    setCapturedMedia(mediaAsset);
                    setShowPreview(true);
                }
            }
        } catch (error) {
            console.error('Erro ao selecionar da galeria:', error);
            Alert.alert('Erro', 'Não foi possível selecionar da galeria');
        }
    };

    const handleUploadStory = async () => {
        console.log('🔍 DEBUG - handleUploadStory iniciado');
        console.log('🔍 DEBUG - capturedMedia:', capturedMedia);
        console.log('🔍 DEBUG - storyTitle:', storyTitle);
        console.log('🔍 DEBUG - storyTitle type:', typeof storyTitle);
        console.log('🔍 DEBUG - storyTitle length:', storyTitle?.length);

        if (!capturedMedia) {
            Alert.alert('Erro', 'Nenhuma mídia capturada');
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
                        text: linkText.trim() || 'Saiba mais',
                        coordinates: linkCoordinates
                    };
                    console.log('🔗 Dados do link preparados:', linkData);
                }
            } else {
                console.log('🔗 Nenhum link fornecido');
            }

            console.log('🔍 DEBUG - Antes do upload, storyTitle:', storyTitle);
            console.log('🔍 DEBUG - storyTitle || null:', storyTitle || null);

            // Usar o MediaServiceOptimized para upload
            const result = await MediaService.uploadStory(
                capturedMedia.uri,
                storyTitle || null, // Permitir título vazio
                capturedMedia.type,
                (progress) => {
                    console.log(`📤 Progresso do upload handleUploadStory: ${progress}%`);
                    setUploadProgress(progress);
                },
                linkData,
                'custom',
                titleCoordinates,
                titleLayout,
                titleScale,
                linkScale,
                user?.id // Passar o ID do usuário
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
                        Stories são exibidos por 24 horas e podem conter fotos ou vídeos de até 30 segundos.
                    </Text>
                </View>
            </View>

            <StoryPreviewModal
                visible={showPreview}
                capturedMedia={capturedMedia}
                storyTitle={storyTitle}
                storyLink={storyLink}
                linkText={linkText}
                linkType={linkType}
                titleCoordinates={titleCoordinates}
                linkCoordinates={linkCoordinates}
                titleScale={titleScale}
                linkScale={linkScale}
                titleLayout={titleLayout}
                uploading={uploading}
                uploadProgress={uploadProgress}
                onClose={() => setShowPreview(false)}
                onUpload={handleUploadStory}
                onTitleChange={setStoryTitle}
                onLinkChange={setStoryLink}
                onLinkTextChange={setLinkText}
                onLinkTypeChange={setLinkType}
                onTitleCoordinatesChange={setTitleCoordinates}
                onLinkCoordinatesChange={setLinkCoordinates}
                onTitleScaleChange={setTitleScale}
                onLinkScaleChange={setLinkScale}
                onTitleLayoutChange={applyTitleLayout}
                onTitleDelete={handleDeleteTitle}
                onLinkDelete={handleDeleteLink}
            />
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
});










