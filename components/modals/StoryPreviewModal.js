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
// Componente DraggableTitle
// ============================================================================
const DraggableTitle = ({ 
    title, 
    coordinates, 
    onCoordinatesChange, 
    onEdit, 
    onDelete, 
    onDragToTrash, 
    scale = 1.0, 
    onScaleChange 
}) => {
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
                    <Text style={[styles.draggableTitleText, { fontSize: getTitleSizeStyle().fontSize }]}>
                        {title}
                    </Text>
                </View>
            </Animated.View>

            {/* Controles de redimensionamento */}
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

// ============================================================================
// Componente DraggableLink
// ============================================================================
const DraggableLink = ({ 
    linkData, 
    coordinates, 
    onCoordinatesChange, 
    onEdit, 
    onDelete, 
    onDragToTrash, 
    scale = 1.0, 
    onScaleChange 
}) => {
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
                    <Text style={[styles.draggableLinkText, { fontSize: 14 * scale }]}>
                        {linkData.text}
                    </Text>
                </View>
            </Animated.View>

            {/* Controles de redimensionamento */}
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
    const [isDraggingToTrash, setIsDraggingToTrash] = useState(false);

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
                            useNativeControls={false}
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
                            onCoordinatesChange={onTitleCoordinatesChange}
                            onEdit={() => setShowTitleModal(true)}
                            onDelete={onTitleDelete}
                            onDragToTrash={setIsDraggingToTrash}
                            scale={titleScale}
                            onScaleChange={onTitleScaleChange}
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
                            onCoordinatesChange={onLinkCoordinatesChange}
                            onEdit={() => setShowLinkModal(true)}
                            onDelete={onLinkDelete}
                            onDragToTrash={setIsDraggingToTrash}
                            scale={linkScale}
                            onScaleChange={onLinkScaleChange}
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

                            {/* Opções de Layout */}
                            <View style={styles.layoutSection}>
                                <Text style={styles.modalLabel}>Layout:</Text>
                                <View style={styles.layoutButtons}>
                                    {[
                                        { key: 'center', label: 'Centro', icon: 'apps' },
                                        { key: 'left', label: 'Esquerda', icon: 'arrow-back' },
                                        { key: 'right', label: 'Direita', icon: 'arrow-forward' }
                                    ].map((layout) => (
                                        <TouchableOpacity
                                            key={layout.key}
                                            style={[
                                                styles.layoutButton,
                                                titleLayout === layout.key && styles.layoutButtonActive
                                            ]}
                                            onPress={() => onTitleLayoutChange(layout.key)}
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

    // Draggable elements
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
});

