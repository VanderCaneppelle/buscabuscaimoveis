import React, { useState, useRef } from 'react';
import { Animated, PanResponder } from 'react-native';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Modal,
    Dimensions,
    ActivityIndicator,
    Image,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';

const { width, height } = Dimensions.get('window');

// ============================================================================
// Componente InteractiveTitle - Título com gestos (pinch + pan)
// ============================================================================
const InteractiveTitle = ({ 
    title, 
    coordinates,
    scale = 1.0,
    onCoordinatesChange,
    onScaleChange,
    onEdit 
}) => {
    const [isGesturing, setIsGesturing] = useState(false);
    const baseScale = useRef(scale);
    const baseDistance = useRef(0);
    const lastTouches = useRef([]);
    const translateX = useRef(new Animated.Value(coordinates.x)).current;
    const translateY = useRef(new Animated.Value(coordinates.y)).current;
    const animatedScale = useRef(new Animated.Value(scale)).current;

    // Atualizar posição quando coordinates mudam externamente
    React.useEffect(() => {
        translateX.setValue(coordinates.x);
        translateY.setValue(coordinates.y);
    }, [coordinates.x, coordinates.y]);

    // Atualizar escala quando scale muda externamente
    React.useEffect(() => {
        animatedScale.setValue(scale);
        baseScale.current = scale;
    }, [scale]);

    // Calcular distância entre dois toques (para pinch)
    const getDistance = (touches) => {
        if (touches.length < 2) return 0;
        const [touch1, touch2] = touches;
        return Math.sqrt(
            Math.pow(touch2.pageX - touch1.pageX, 2) +
            Math.pow(touch2.pageY - touch1.pageY, 2)
        );
    };

    // Calcular centro entre dois toques
    const getCenter = (touches) => {
        if (touches.length < 2) return { x: touches[0].pageX, y: touches[0].pageY };
        const [touch1, touch2] = touches;
        return {
            x: (touch1.pageX + touch2.pageX) / 2,
            y: (touch1.pageY + touch2.pageY) / 2,
        };
    };

    const handleTouchStart = (event) => {
        const touches = event.nativeEvent.touches;
        lastTouches.current = Array.from(touches);
        
        if (touches.length === 2) {
            // Pinch iniciado
            baseDistance.current = getDistance(touches);
            baseScale.current = scale;
            setIsGesturing(true);
        } else if (touches.length === 1) {
            // Pan iniciado
            setIsGesturing(true);
        }
    };

    const handleTouchMove = (event) => {
        const touches = event.nativeEvent.touches;
        
        if (touches.length === 2) {
            // Pinch gesture - REDUZIR SENSIBILIDADE
            const distance = getDistance(touches);
            if (baseDistance.current > 0) {
                // Só começa a escalar se mudou mais de 10px
                const distanceDiff = Math.abs(distance - baseDistance.current);
                if (distanceDiff > 10) {
                    const scaleMultiplier = distance / baseDistance.current;
                    
                    // Reduzir sensibilidade: usar 50% da mudança
                    const dampedMultiplier = 1 + (scaleMultiplier - 1) * 0.5;
                    let newScale = baseScale.current * dampedMultiplier;
                    
                    // Limitar escala entre 0.5 e 3.0
                    newScale = Math.max(0.5, Math.min(3.0, newScale));
                    
                    animatedScale.setValue(newScale);
                    onScaleChange(newScale);
                }
            }
        } else if (touches.length === 1 && lastTouches.current.length === 1) {
            // Pan gesture - REDUZIR SENSIBILIDADE
            const touch = touches[0];
            const lastTouch = lastTouches.current[0];
            
            const deltaX = touch.pageX - lastTouch.pageX;
            const deltaY = touch.pageY - lastTouch.pageY;
            
            // Só move se passou de 3px (evita tremidas)
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            if (distance > 3) {
                // Reduzir velocidade: usar 70% do movimento
                const dampedDeltaX = deltaX * 0.7;
                const dampedDeltaY = deltaY * 0.7;
                
                const newX = Math.max(0, Math.min(width - 200, coordinates.x + dampedDeltaX));
                const newY = Math.max(60, Math.min(height - 150, coordinates.y + dampedDeltaY));
                
                translateX.setValue(newX);
                translateY.setValue(newY);
                onCoordinatesChange({ x: newX, y: newY });
            }
        }
        
        lastTouches.current = Array.from(touches);
    };

    const handleTouchEnd = () => {
        setIsGesturing(false);
        lastTouches.current = [];
    };

    const baseFontSize = 20;
    const baseLineHeight = 26;

    return (
        <Animated.View
            style={[
                styles.interactiveTitleContainer,
                {
                    transform: [
                        { translateX: translateX },
                        { translateY: translateY },
                        { scale: animatedScale },
                    ],
                    opacity: isGesturing ? 0.8 : 1,
                }
            ]}
        >
            {/* Área de toque expandida (invisível) */}
            <View
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                style={styles.expandedTouchArea}
            >
                <TouchableOpacity 
                    onLongPress={onEdit}
                    delayLongPress={500}
                    activeOpacity={0.9}
                    style={styles.titleTouchArea}
                >
                    <View style={styles.titleBackground}>
                        <Text 
                            style={[
                                styles.fixedTitleText, 
                                { 
                                    fontSize: baseFontSize,
                                    lineHeight: baseLineHeight,
                                }
                            ]}
                            numberOfLines={3}
                        >
                            {title}
                        </Text>
                    </View>
                    
                    {/* Hint visual para gestos */}
                    {!isGesturing && (
                        <View style={styles.gestureHint}>
                            <Ionicons name="hand-left-outline" size={12} color="rgba(255, 255, 255, 0.6)" />
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

// ============================================================================
// Componente InteractiveLink - Link com gestos (pinch + pan)
// ============================================================================
const InteractiveLink = ({ 
    linkData, 
    coordinates,
    scale = 1.0,
    onCoordinatesChange,
    onScaleChange,
    onEdit 
}) => {
    const [isGesturing, setIsGesturing] = useState(false);
    const baseScale = useRef(scale);
    const baseDistance = useRef(0);
    const lastTouches = useRef([]);
    const translateX = useRef(new Animated.Value(coordinates.x)).current;
    const translateY = useRef(new Animated.Value(coordinates.y)).current;
    const animatedScale = useRef(new Animated.Value(scale)).current;

    // Atualizar posição quando coordinates mudam externamente
    React.useEffect(() => {
        translateX.setValue(coordinates.x);
        translateY.setValue(coordinates.y);
    }, [coordinates.x, coordinates.y]);

    // Atualizar escala quando scale muda externamente
    React.useEffect(() => {
        animatedScale.setValue(scale);
        baseScale.current = scale;
    }, [scale]);

    // Calcular distância entre dois toques
    const getDistance = (touches) => {
        if (touches.length < 2) return 0;
        const [touch1, touch2] = touches;
        return Math.sqrt(
            Math.pow(touch2.pageX - touch1.pageX, 2) +
            Math.pow(touch2.pageY - touch1.pageY, 2)
        );
    };

    const handleTouchStart = (event) => {
        const touches = event.nativeEvent.touches;
        lastTouches.current = Array.from(touches);
        
        if (touches.length === 2) {
            baseDistance.current = getDistance(touches);
            baseScale.current = scale;
            setIsGesturing(true);
        } else if (touches.length === 1) {
            setIsGesturing(true);
        }
    };

    const handleTouchMove = (event) => {
        const touches = event.nativeEvent.touches;
        
        if (touches.length === 2) {
            // Pinch gesture - mesma sensibilidade do título
            const distance = getDistance(touches);
            if (baseDistance.current > 0) {
                const distanceDiff = Math.abs(distance - baseDistance.current);
                if (distanceDiff > 10) {
                    const scaleMultiplier = distance / baseDistance.current;
                    const dampedMultiplier = 1 + (scaleMultiplier - 1) * 0.5;
                    let newScale = baseScale.current * dampedMultiplier;
                    
                    newScale = Math.max(0.5, Math.min(3.0, newScale));
                    
                    animatedScale.setValue(newScale);
                    onScaleChange(newScale);
                }
            }
        } else if (touches.length === 1 && lastTouches.current.length === 1) {
            // Pan gesture - mesma sensibilidade do título
            const touch = touches[0];
            const lastTouch = lastTouches.current[0];
            
            const deltaX = touch.pageX - lastTouch.pageX;
            const deltaY = touch.pageY - lastTouch.pageY;
            
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            if (distance > 3) {
                const dampedDeltaX = deltaX * 0.7;
                const dampedDeltaY = deltaY * 0.7;
                
                const newX = Math.max(0, Math.min(width - 150, coordinates.x + dampedDeltaX));
                const newY = Math.max(100, Math.min(height - 120, coordinates.y + dampedDeltaY));
                
                translateX.setValue(newX);
                translateY.setValue(newY);
                onCoordinatesChange({ x: newX, y: newY });
            }
        }
        
        lastTouches.current = Array.from(touches);
    };

    const handleTouchEnd = () => {
        setIsGesturing(false);
        lastTouches.current = [];
    };

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

    const baseFontSize = 14;
    const baseIconSize = 16;

    return (
        <Animated.View
            style={[
                styles.interactiveLinkContainer,
                {
                    transform: [
                        { translateX: translateX },
                        { translateY: translateY },
                        { scale: animatedScale },
                    ],
                    opacity: isGesturing ? 0.8 : 1,
                }
            ]}
        >
            {/* Área de toque expandida */}
            <View
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                style={styles.expandedTouchArea}
            >
                <TouchableOpacity 
                    onLongPress={onEdit}
                    delayLongPress={500}
                    activeOpacity={0.9}
                    style={[styles.linkTouchArea, getLinkStyle(linkData.type)]}
                >
                    <View style={styles.draggableContent}>
                        <Ionicons
                            name={linkData.type === 'whatsapp' ? 'logo-whatsapp' : 'link'}
                            size={baseIconSize}
                            color="#fff"
                        />
                        <Text style={[styles.draggableLinkText, { fontSize: baseFontSize }]}>
                            {linkData.text}
                        </Text>
                    </View>
                    
                    {/* Hint visual */}
                    {!isGesturing && (
                        <View style={styles.gestureHint}>
                            <Ionicons name="hand-left-outline" size={12} color="rgba(255, 255, 255, 0.6)" />
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

// ============================================================================
// Modal Principal - StoryPreviewModal
// ============================================================================
export default function StoryPreviewModal({
    visible,
    capturedMedia,
    storyTitle,
    storyLink,
    linkText,
    linkType,
    titleCoordinates,
    linkCoordinates,
    titleScale,
    linkScale,
    titleLayout,
    uploading,
    uploadProgress,
    onClose,
    onUpload,
    onTitleChange,
    onLinkChange,
    onLinkTextChange,
    onLinkTypeChange,
    onTitleCoordinatesChange,
    onLinkCoordinatesChange,
    onTitleScaleChange,
    onLinkScaleChange,
    onTitleLayoutChange,
    onTitleDelete,
    onLinkDelete,
}) {
    const [showTitleModal, setShowTitleModal] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);

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

    return (
        <Modal visible={visible} animationType="slide">
            <SafeAreaView style={styles.previewContainer}>
                {/* Header com botões de ação */}
                <View style={styles.previewHeader}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
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
                    </View>
                </View>

                {/* Preview da Mídia em tela cheia */}
                <View style={styles.previewContent}>
                    {capturedMedia?.type === 'video' ? (
                        <Video
                            source={{ uri: capturedMedia.uri }}
                            style={styles.previewMedia}
                            useNativeControls={false}
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

                    {/* Título Interativo (com gestos de pinça e arrasto) */}
                    {storyTitle && storyTitle.trim() !== '' && (
                        <InteractiveTitle
                            title={storyTitle}
                            coordinates={titleCoordinates}
                            scale={titleScale}
                            onCoordinatesChange={onTitleCoordinatesChange}
                            onScaleChange={onTitleScaleChange}
                            onEdit={() => setShowTitleModal(true)}
                        />
                    )}

                    {/* Link Interativo (com gestos de pinça e arrasto) */}
                    {storyLink.trim() && (
                        <InteractiveLink
                            linkData={{
                                type: linkType,
                                text: linkText.trim() || 'Saiba mais'
                            }}
                            coordinates={linkCoordinates}
                            scale={linkScale}
                            onCoordinatesChange={onLinkCoordinatesChange}
                            onScaleChange={onLinkScaleChange}
                            onEdit={() => setShowLinkModal(true)}
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
                        onPress={onUpload}
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
                                onChangeText={onTitleChange}
                                maxLength={50}
                                autoFocus
                            />

                            {/* Dica de uso dos gestos */}
                            <View style={styles.gestureInfoBox}>
                                <Ionicons name="information-circle-outline" size={18} color="#1e3a8a" />
                                <Text style={styles.gestureInfoText}>
                                    Use <Text style={styles.gestureInfoBold}>1 dedo</Text> para arrastar e <Text style={styles.gestureInfoBold}>2 dedos</Text> para aumentar/diminuir
                                </Text>
                            </View>

                            <View style={styles.modalActions}>
                                {storyTitle && storyTitle.trim() !== '' && (
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.modalButtonDanger]}
                                        onPress={() => {
                                            onTitleDelete();
                                            setShowTitleModal(false);
                                        }}
                                    >
                                        <Ionicons name="trash-outline" size={18} color="#fff" />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={[styles.modalButton, { flex: 1 }]}
                                    onPress={() => setShowTitleModal(false)}
                                >
                                    <Text style={styles.modalButtonText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.modalButtonPrimary, { flex: 1 }]}
                                    onPress={() => setShowTitleModal(false)}
                                >
                                    <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                                        Salvar
                                    </Text>
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
                                            onPress={() => onLinkTypeChange(type)}
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
                                onChangeText={onLinkChange}
                                keyboardType={linkType === 'phone' ? 'phone-pad' : 'url'}
                            />

                            <TextInput
                                style={styles.modalInput}
                                placeholder="Texto do botão (ex: Fale conosco)"
                                placeholderTextColor="#666"
                                value={linkText}
                                onChangeText={onLinkTextChange}
                                maxLength={20}
                            />

                            <View style={styles.modalActions}>
                                {storyLink && storyLink.trim() !== '' && (
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.modalButtonDanger]}
                                        onPress={() => {
                                            onLinkDelete();
                                            setShowLinkModal(false);
                                        }}
                                    >
                                        <Ionicons name="trash-outline" size={18} color="#fff" />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={[styles.modalButton, { flex: 1 }]}
                                    onPress={() => setShowLinkModal(false)}
                                >
                                    <Text style={styles.modalButtonText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.modalButtonPrimary, { flex: 1 }]}
                                    onPress={() => setShowLinkModal(false)}
                                >
                                    <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                                        Salvar
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </Modal>
    );
}

// ============================================================================
// Estilos
// ============================================================================
const styles = StyleSheet.create({
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
    closeButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 20,
        padding: 10,
        marginTop: 25,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 15,
        paddingTop: 30,
    },
    headerActionButton: {
        backgroundColor: 'rgba(11, 11, 11, 0.78)',
        borderRadius: 20,
        padding: 10,
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
        marginBottom: 25,
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
        marginBottom: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadingButton: {
        backgroundColor: '#64748b',
    },
    
    // Modais internos
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
        padding: 15,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
    },
    modalButtonPrimary: {
        backgroundColor: '#1e3a8a',
    },
    modalButtonDanger: {
        backgroundColor: '#e74c3c',
        minWidth: 50,
        flex: 0,
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748b',
    },
    modalButtonTextPrimary: {
        color: '#fff',
    },

    // Interactive Title (com gestos)
    interactiveTitleContainer: {
        position: 'absolute',
        zIndex: 999,
        maxWidth: width - 40,
    },
    expandedTouchArea: {
        // Área de toque expandida - padding invisível de 40px em todos os lados
        padding: 40,
        margin: -40, // Compensa o padding para não afetar o layout
    },
    titleTouchArea: {
        position: 'relative',
    },
    titleBackground: {
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    fixedTitleText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    gestureHint: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 10,
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Info box para gestos
    gestureInfoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e3f2fd',
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
        gap: 8,
    },
    gestureInfoText: {
        flex: 1,
        fontSize: 12,
        color: '#1e3a8a',
        lineHeight: 18,
    },
    gestureInfoBold: {
        fontWeight: 'bold',
        color: '#0d47a1',
    },
    
    // Interactive Link (com gestos)
    interactiveLinkContainer: {
        position: 'absolute',
        zIndex: 999,
    },
    linkTouchArea: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        minWidth: 100,
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
    draggableLinkText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

