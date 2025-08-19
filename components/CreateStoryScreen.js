import React, { useState, useRef, useEffect } from 'react';
import { Animated, PanResponder } from 'react-native';
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
    TextInput,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Video } from 'expo-av';
import { useAdmin } from '../contexts/AdminContext';
import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';
import { MediaServiceOptimized as MediaService } from '../lib/mediaServiceOptimized';
import { useAuth } from '../contexts/AuthContext';

// Componente DraggableTitle
const DraggableTitle = ({ title, coordinates, onCoordinatesChange, onEdit, onDelete, onDragToTrash, scale = 1.0, onScaleChange }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [showDeleteIcon, setShowDeleteIcon] = useState(false);
    const [showControls, setShowControls] = useState(false);

    const getTitleSizeStyle = () => {
        const baseFontSize = 16;
        const basePadding = 16;
        return {
            fontSize: baseFontSize * scale,
            paddingHorizontal: basePadding * scale,
            paddingVertical: (basePadding * 0.5) * scale
        };
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                setIsDragging(true);
                setShowDeleteIcon(true);
            },
            onPanResponderMove: (evt, gestureState) => {
                console.log('🎯 DraggableTitle - PanResponder Move', { dx: gestureState.dx, dy: gestureState.dy });
                // Limites para tela cheia
                const newX = Math.max(0, Math.min(width - 200, coordinates.x + gestureState.dx));
                const newY = Math.max(100, Math.min(height - 150, coordinates.y + gestureState.dy));
                onCoordinatesChange({ x: newX, y: newY });

                // Verificar se está próximo da lixeira
                const trashX = width - 60;
                const trashY = 100;
                const distance = Math.sqrt(
                    Math.pow(newX - trashX, 2) + Math.pow(newY - trashY, 2)
                );

                if (distance < 50) {
                    setShowDeleteIcon(true);
                    onDragToTrash(true);
                } else {
                    setShowDeleteIcon(false);
                    onDragToTrash(false);
                }
            },
            onPanResponderRelease: (evt, gestureState) => {
                setIsDragging(false);

                // Verificar se soltou na lixeira
                const trashX = width - 60;
                const trashY = 100;
                const distance = Math.sqrt(
                    Math.pow(coordinates.x - trashX, 2) + Math.pow(coordinates.y - trashY, 2)
                );

                if (distance < 50) {
                    onDelete();
                }

                setShowDeleteIcon(false);
            },
        })
    ).current;

    return (
        <>
            <Animated.View
                {...panResponder.panHandlers}
                style={[
                    styles.draggableTitle,
                    getTitleSizeStyle(),
                    {
                        left: coordinates.x,
                        top: coordinates.y,
                        transform: [{ scale: isDragging ? 1.1 : 1 }],
                        opacity: isDragging ? 0.8 : 1,
                    }
                ]}
            >
                <View style={styles.draggableContent}>
                    <Text style={[styles.draggableTitleText, { fontSize: getTitleSizeStyle().fontSize }]}>{title}</Text>
                </View>
            </Animated.View>

            {/* Controles de redimensionamento - FORA do PanResponder */}
            {showControls && (
                <View style={[
                    styles.controlsContainer,
                    {
                        left: coordinates.x - 20,
                        top: coordinates.y - 30,
                    }
                ]}>
                    <TouchableOpacity
                        onPress={() => onScaleChange && onScaleChange(Math.max(0.5, scale - 0.1))}
                        style={styles.controlButton}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="remove" size={16} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={onEdit}
                        style={styles.controlButton}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="create" size={16} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => onScaleChange && onScaleChange(Math.min(2.0, scale + 0.1))}
                        style={styles.controlButton}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="add" size={16} color="#fff" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Botão para mostrar controles */}
            <TouchableOpacity
                style={[
                    styles.showControlsButton,
                    {
                        left: coordinates.x + 10,
                        top: coordinates.y + 10,
                    }
                ]}
                onPress={() => setShowControls(!showControls)}
                activeOpacity={0.7}
            >
                <Ionicons name="settings" size={12} color="#fff" />
            </TouchableOpacity>

            {/* Ícone de lixeira que aparece durante o arrasto */}
            {showDeleteIcon && (
                <View style={styles.trashIcon}>
                    <Ionicons name="trash" size={24} color="#e74c3c" />
                </View>
            )}
        </>
    );
};

// Componente DraggableLink
const DraggableLink = ({ linkData, coordinates, onCoordinatesChange, onEdit, onDelete, onDragToTrash, scale = 1.0, onScaleChange }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [showDeleteIcon, setShowDeleteIcon] = useState(false);
    const [showControls, setShowControls] = useState(false);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                setIsDragging(true);
                setShowDeleteIcon(true);
            },
            onPanResponderMove: (evt, gestureState) => {
                console.log('🔗 DraggableLink - PanResponder Move', { dx: gestureState.dx, dy: gestureState.dy });
                // Limites para tela cheia
                const newX = Math.max(0, Math.min(width - 150, coordinates.x + gestureState.dx));
                const newY = Math.max(100, Math.min(height - 120, coordinates.y + gestureState.dy));
                onCoordinatesChange({ x: newX, y: newY });

                // Verificar se está próximo da lixeira
                const trashX = width - 60;
                const trashY = 100;
                const distance = Math.sqrt(
                    Math.pow(newX - trashX, 2) + Math.pow(newY - trashY, 2)
                );

                if (distance < 50) {
                    setShowDeleteIcon(true);
                    onDragToTrash(true);
                } else {
                    setShowDeleteIcon(false);
                    onDragToTrash(false);
                }
            },
            onPanResponderRelease: (evt, gestureState) => {
                setIsDragging(false);

                // Verificar se soltou na lixeira
                const trashX = width - 60;
                const trashY = 100;
                const distance = Math.sqrt(
                    Math.pow(coordinates.x - trashX, 2) + Math.pow(coordinates.y - trashY, 2)
                );

                if (distance < 50) {
                    onDelete();
                }

                setShowDeleteIcon(false);
            },
        })
    ).current;

    const getLinkStyle = (type) => {
        switch (type) {
            case 'whatsapp':
                return { backgroundColor: 'rgba(37, 211, 102, 0.9)' };
            case 'phone':
                return { backgroundColor: 'rgba(0, 0, 0, 0.8)' };
            case 'email':
                return { backgroundColor: 'rgba(0, 0, 0, 0.8)' };
            case 'website':
                return { backgroundColor: 'rgba(0, 0, 0, 0.8)' };
            default:
                return { backgroundColor: 'rgba(0, 0, 0, 0.8)' };
        }
    };

    return (
        <>
            <Animated.View
                {...panResponder.panHandlers}
                style={[
                    styles.draggableLink,
                    getLinkStyle(linkData.type),
                    {
                        left: coordinates.x,
                        top: coordinates.y,
                        transform: [{ scale: isDragging ? 1.1 : 1 }],
                        opacity: isDragging ? 0.8 : 1,
                    }
                ]}
            >
                <View style={styles.draggableContent}>
                    <Ionicons
                        name={linkData.type === 'whatsapp' ? 'logo-whatsapp' : 'link'}
                        size={16 * scale}
                        color="#fff"
                    />
                    <Text style={[styles.draggableLinkText, { fontSize: 14 * scale }]}>{linkData.text}</Text>
                </View>
            </Animated.View>

            {/* Controles de redimensionamento - FORA do PanResponder */}
            {showControls && (
                <View style={[
                    styles.controlsContainer,
                    {
                        left: coordinates.x - 20,
                        top: coordinates.y - 30,
                    }
                ]}>
                    <TouchableOpacity
                        onPress={() => onScaleChange && onScaleChange(Math.max(0.5, scale - 0.1))}
                        style={styles.controlButton}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="remove" size={16} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={onEdit}
                        style={styles.controlButton}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="create" size={16} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => onScaleChange && onScaleChange(Math.min(2.0, scale + 0.1))}
                        style={styles.controlButton}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="add" size={16} color="#fff" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Botão para mostrar controles */}
            <TouchableOpacity
                style={[
                    styles.showControlsButton,
                    {
                        left: coordinates.x + 10,
                        top: coordinates.y + 10,
                    }
                ]}
                onPress={() => setShowControls(!showControls)}
                activeOpacity={0.7}
            >
                <Ionicons name="settings" size={12} color="#fff" />
            </TouchableOpacity>

            {/* Ícone de lixeira que aparece durante o arrasto */}
            {showDeleteIcon && (
                <View style={styles.trashIcon}>
                    <Ionicons name="trash" size={24} color="#e74c3c" />
                </View>
            )}
        </>
    );
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
    const [hasPermission, setHasPermission] = useState(null);
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
                setShowPreview(true); // Abrir modal automaticamente
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
                setShowPreview(true); // Abrir modal automaticamente
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
            setShowPreview(true); // Abrir modal automaticamente
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
                setShowPreview(true); // Abrir modal automaticamente
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





    const renderPreview = () => (
        <Modal visible={showPreview} animationType="slide">
            <SafeAreaView style={styles.previewContainer}>
                {/* Header com botões de ação */}
                <View style={styles.previewHeader}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setShowPreview(false)}
                    >
                        <Ionicons name="close" size={30} color="#fff" />
                    </TouchableOpacity>

                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.headerActionButton}
                            onPress={() => setShowLinkModal(true)}
                        >
                            <Ionicons name="link" size={24} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.headerActionButton}
                            onPress={() => setShowTitleModal(true)}
                        >
                            <Ionicons name="text" size={24} color="#fff" />
                        </TouchableOpacity>

                        {/* Lixeira permanente */}
                        <View style={[
                            styles.permanentTrash,
                            isDraggingToTrash && styles.permanentTrashActive
                        ]}>
                            <Ionicons name="trash" size={20} color="#e74c3c" />
                        </View>
                    </View>
                </View>

                {/* Preview da Mídia em tela cheia */}
                <View style={styles.previewContent}>
                    {capturedMedia?.type === 'video' ? (
                        <Video
                            source={{ uri: capturedMedia.uri }}
                            style={styles.previewMedia}
                            useNativeControls
                            resizeMode="cover"
                            shouldPlay
                            isLooping
                        />
                    ) : (
                        <Image
                            source={{ uri: capturedMedia?.uri }}
                            style={styles.previewMedia}
                            resizeMode="cover"
                        />
                    )}

                    {/* Título Draggable */}
                    {storyTitle && storyTitle.trim() !== '' && (
                        <DraggableTitle
                            title={storyTitle}
                            coordinates={titleCoordinates}
                            onCoordinatesChange={setTitleCoordinates}
                            onEdit={handleEditTitle}
                            onDelete={handleDeleteTitle}
                            onDragToTrash={setIsDraggingToTrash}
                            scale={titleScale}
                            onScaleChange={setTitleScale}
                        />
                    )}

                    {/* Link Draggable */}
                    {storyLink.trim() && (
                        <DraggableLink
                            linkData={{
                                type: linkType,
                                text: linkText.trim() || 'Saiba mais'
                            }}
                            coordinates={linkCoordinates}
                            onCoordinatesChange={setLinkCoordinates}
                            onEdit={handleEditLink}
                            onDelete={handleDeleteLink}
                            onDragToTrash={setIsDraggingToTrash}
                            scale={linkScale}
                            onScaleChange={setLinkScale}
                        />
                    )}
                </View>

                {/* Botões flutuantes na parte inferior */}
                <View style={styles.floatingButtons}>
                    <TouchableOpacity
                        style={styles.floatingButton}
                        onPress={() => setShowTitleModal(true)}
                    >
                        <Ionicons name="text" size={24} color="#fff" />
                        <Text style={styles.floatingButtonText}>Título</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.floatingButton}
                        onPress={() => setShowLinkModal(true)}
                    >
                        <Ionicons name="link" size={24} color="#fff" />
                        <Text style={styles.floatingButtonText}>Link</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.publishButton, uploading && styles.uploadingButton]}
                        onPress={handleUploadStory}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Ionicons name="send" size={24} color="#fff" />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Modal para adicionar título */}
                <Modal visible={showTitleModal} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Adicionar Título</Text>
                                <TouchableOpacity onPress={() => setShowTitleModal(false)}>
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>

                            <TextInput
                                style={styles.modalInput}
                                placeholder="Digite o título do story..."
                                placeholderTextColor="#666"
                                value={storyTitle}
                                onChangeText={setStoryTitle}
                                maxLength={50}
                                autoFocus
                            />

                            {/* Opções de Layout */}
                            <View style={styles.layoutSection}>
                                <Text style={styles.modalLabel}>Layout:</Text>
                                <View style={styles.layoutButtons}>
                                    {[
                                        { key: 'center', label: 'Centro', icon: 'center' },
                                        { key: 'left', label: 'Esquerda', icon: 'arrow-back' },
                                        { key: 'right', label: 'Direita', icon: 'arrow-forward' }
                                    ].map((layout) => (
                                        <TouchableOpacity
                                            key={layout.key}
                                            style={[
                                                styles.layoutButton,
                                                titleLayout === layout.key && styles.layoutButtonActive
                                            ]}
                                            onPress={() => applyTitleLayout(layout.key)}
                                        >
                                            <Ionicons
                                                name={layout.icon}
                                                size={16}
                                                color={titleLayout === layout.key ? '#fff' : '#666'}
                                            />
                                            <Text style={[
                                                styles.layoutButtonText,
                                                titleLayout === layout.key && styles.layoutButtonTextActive
                                            ]}>
                                                {layout.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>



                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.modalButton}
                                    onPress={() => setShowTitleModal(false)}
                                >
                                    <Text style={styles.modalButtonText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.modalButtonPrimary]}
                                    onPress={() => setShowTitleModal(false)}
                                >
                                    <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Salvar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Modal para adicionar link */}
                <Modal visible={showLinkModal} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Adicionar Link</Text>
                                <TouchableOpacity onPress={() => setShowLinkModal(false)}>
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.linkTypeContainer}>
                                <Text style={styles.modalLabel}>Tipo de link:</Text>
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
                                style={styles.modalInput}
                                placeholder={getLinkPlaceholder(linkType)}
                                placeholderTextColor="#666"
                                value={storyLink}
                                onChangeText={setStoryLink}
                                keyboardType={linkType === 'phone' ? 'phone-pad' : 'url'}
                            />

                            <TextInput
                                style={styles.modalInput}
                                placeholder="Texto do botão (ex: Fale conosco)"
                                placeholderTextColor="#666"
                                value={linkText}
                                onChangeText={setLinkText}
                                maxLength={20}
                            />

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.modalButton}
                                    onPress={() => setShowLinkModal(false)}
                                >
                                    <Text style={styles.modalButtonText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.modalButtonPrimary]}
                                    onPress={() => setShowLinkModal(false)}
                                >
                                    <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Salvar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
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
        padding: 15,
        paddingTop: 40,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 15,
    },
    headerActionButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 20,
        padding: 10,
    },
    permanentTrash: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 20,
        padding: 10,
        borderWidth: 2,
        borderColor: '#e74c3c',
    },
    permanentTrashActive: {
        backgroundColor: '#e74c3c',
        transform: [{ scale: 1.2 }],
    },
    previewContent: {
        flex: 1,
        position: 'relative',
    },
    previewMedia: {
        width: '100%',
        height: '100%',
    },
    floatingButtons: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 1000,
    },
    floatingButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 25,
        padding: 15,
        alignItems: 'center',
        minWidth: 80,
    },
    floatingButtonText: {
        color: '#fff',
        fontSize: 12,
        marginTop: 5,
        fontWeight: '600',
    },
    publishButton: {
        backgroundColor: '#1e3a8a',
        borderRadius: 30,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        width: '100%',
        maxWidth: 400,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        padding: 15,
        fontSize: 16,
        marginBottom: 15,
        backgroundColor: '#fff',
    },
    modalLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    linkTypeContainer: {
        marginBottom: 15,
    },
    linkTypeButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    linkTypeButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 15,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
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
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
        marginTop: 10,
    },
    modalButton: {
        flex: 1,
        padding: 15,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
    },
    modalButtonPrimary: {
        backgroundColor: '#1e3a8a',
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748b',
    },
    modalButtonTextPrimary: {
        color: '#fff',
    },
    layoutSection: {
        marginBottom: 15,
    },
    layoutButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    layoutButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 6,
    },
    layoutButtonActive: {
        backgroundColor: '#1e3a8a',
        borderColor: '#1e3a8a',
    },
    layoutButtonText: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
    },
    layoutButtonTextActive: {
        color: '#fff',
    },
    sizeSection: {
        marginBottom: 15,
    },
    sizeButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    sizeButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    sizeButtonActive: {
        backgroundColor: '#1e3a8a',
        borderColor: '#1e3a8a',
    },
    sizeButtonText: {
        color: '#64748b',
        fontWeight: '500',
    },
    sizeButtonTextActive: {
        color: '#fff',
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

    draggableTitle: {
        position: 'absolute',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        zIndex: 9999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 10,
    },
    draggableContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    controlsContainer: {
        position: 'absolute',
        flexDirection: 'row',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderRadius: 20,
        padding: 8,
        gap: 8,
        zIndex: 10000,
    },
    controlButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    showControlsButton: {
        position: 'absolute',
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
    },
    editButton: {
        marginLeft: 4,
        padding: 2,
    },
    trashIcon: {
        position: 'absolute',
        top: 100,
        right: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 25,
        padding: 15,
        zIndex: 10000,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 10,
    },
    draggableTitleText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    draggableLink: {
        position: 'absolute',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        zIndex: 9999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 10,
        minWidth: 100,
    },
    draggableLinkText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    editForm: {
        backgroundColor: '#fff',
        padding: 20,
        marginTop: 20,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },

});










