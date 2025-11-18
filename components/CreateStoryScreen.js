import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Alert,
    SafeAreaView,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdmin } from '../contexts/AdminContext';
import { MediaServiceOptimized as MediaService } from '../lib/mediaServiceOptimized';
import { useAuth } from '../contexts/AuthContext';
import StoryPreviewModal from './modals/StoryPreviewModal';
import AppText from './AppText';


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
    const [notificationTitle, setNotificationTitle] = useState('');
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
            console.log('📸 CreateStoryScreen: Iniciando captura de foto...');
            
            // ✅ Usar função específica para stories (sem obrigatoriedade de edição)
            const result = await MediaService.captureStoryPhoto({
                quality: 0.8,     // Qualidade para stories
            });

            console.log('🔍 DEBUG - CreateStoryScreen takePicture: Resultado recebido:', result);
            console.log('🔍 DEBUG - CreateStoryScreen takePicture: Tipo do resultado:', typeof result);

            if (result) {
                console.log('✅ CreateStoryScreen: Foto capturada com sucesso');
                console.log('🔍 DEBUG - CreateStoryScreen takePicture: URI:', result.uri);
                console.log('🔍 DEBUG - CreateStoryScreen takePicture: Type:', result.type);
                console.log('🔍 DEBUG - CreateStoryScreen takePicture: FileName:', result.fileName);
                
                setCapturedMedia(result);
                setShowPreview(true); // Abrir modal automaticamente
                
                console.log('🔍 DEBUG - CreateStoryScreen takePicture: capturedMedia setado, showPreview = true');
            } else {
                console.log('⚠️ CreateStoryScreen: Nenhuma foto capturada');
            }
        } catch (error) {
            console.error('❌ CreateStoryScreen: Erro ao tirar foto:', error);
            Alert.alert('Erro', 'Não foi possível tirar a foto');
        }
    };



    // 🎯 Função para gravar vídeo usando MediaService
    const recordVideo = async () => {
        try {
            console.log('🎥 CreateStoryScreen: Iniciando gravação de vídeo...');
            
            const result = await MediaService.captureStoryVideo({
                aspect: [9, 16],  // Aspect ratio vertical para stories
                quality: 0.8,     // Qualidade para stories
            });

            if (result) {
                console.log('✅ CreateStoryScreen: Vídeo gravado com sucesso');
                setCapturedMedia(result);
                setShowPreview(true);
            }
        } catch (error) {
            console.error('❌ CreateStoryScreen: Erro ao gravar vídeo:', error);
            Alert.alert('Erro', 'Não foi possível gravar o vídeo');
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
            console.log('🖼️ CreateStoryScreen: Iniciando seleção da galeria...');
            
            // ✅ Usar nova função específica para stories
            const result = await MediaService.pickStoryMedia({
                // aspect: [9, 16],  // Aspect ratio vertical para stories
                quality: 0.8,     // Qualidade para stories
            });

            if (result) {             
                setCapturedMedia(result);
                setShowPreview(true);

            } else {

            }
        } catch (error) {
            console.error('❌ CreateStoryScreen: Erro ao selecionar da galeria:', error);
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

            // 🐰 TESTE: Usar Bunny.net com fallback para Cloudinary
            const result = await MediaService.uploadStoryWithBunny(
                capturedMedia.uri,
                storyTitle || null, // Permitir título vazio
                capturedMedia.type,
                (progress) => {
                    console.log(`📤 Progresso do upload: ${progress}%`);
                    setUploadProgress(progress);
                },
                linkData,
                'custom',
                titleCoordinates,
                titleLayout,
                titleScale,
                linkScale,
                user?.id, // Passar o ID do usuário
                {
                    notificationTitle: notificationTitle || null,
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
                                    setNotificationTitle('');
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
                <AppText style={styles.headerTitle}>Criar Story</AppText>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <AppText style={styles.sectionTitle}>Escolha uma opção:</AppText>

                <View style={styles.optionsContainer}>
                    <TouchableOpacity
                        style={styles.optionButton}
                        onPress={takePicture}
                    >
                        <View style={styles.optionIcon}>
                            <Ionicons name="camera" size={40} color="#1e3a8a" />
                        </View>
                        <AppText style={styles.optionText}>Foto</AppText>
                        <AppText style={styles.optionSubtext}>Tirar foto</AppText>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.optionButton}
                        onPress={recordVideo}
                    >
                        <View style={styles.optionIcon}>
                            <Ionicons name="videocam" size={40} color="#1e3a8a" />
                        </View>
                        <AppText style={styles.optionText}>Vídeo</AppText>
                        <AppText style={styles.optionSubtext}>Gravar vídeo</AppText>
                    </TouchableOpacity>


                    <TouchableOpacity
                        style={styles.optionButton}
                        onPress={pickFromGallery}
                    >
                        <View style={styles.optionIcon}>
                            <Ionicons name="images" size={40} color="#1e3a8a" />
                        </View>
                        <AppText style={styles.optionText}>Galeria</AppText>
                        <AppText style={styles.optionSubtext}>Selecionar mídia</AppText>
                    </TouchableOpacity>
                </View>



                <View style={styles.infoContainer}>
                    <Ionicons name="information-circle" size={20} color="#1e3a8a" />
                    <AppText style={styles.infoText}>
                        Stories são exibidos por 24 horas e podem conter fotos ou vídeos de até 30 segundos.
                    </AppText>
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
                notificationTitle={notificationTitle}
                onNotificationTitleChange={setNotificationTitle}
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










