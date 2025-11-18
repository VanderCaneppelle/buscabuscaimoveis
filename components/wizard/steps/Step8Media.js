import React, { useState } from 'react';
import { 
    View, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    Image,
    FlatList,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MediaUploadModal from '../modals/MediaUploadModal';
import { validateYouTubeUrl, normalizeYouTubeUrl, extractYouTubeVideoId } from '../../../lib/youtubeUtils';
import AppText from '../../AppText';
import AppTextInput from '../../AppTextInput';

export default function Step8Media({ formData, mediaFiles, setMediaFiles, videoUrls = [], setVideoUrls, plan }) {
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [youtubeUrlInput, setYoutubeUrlInput] = useState('');

    const imagesCount = mediaFiles.length;
    const videosCount = videoUrls.length;
    const maxImages = plan?.max_images || 10;
    const maxVideos = plan?.max_videos || 0;

    const handleRemoveMedia = (index) => {
        Alert.alert(
            'Remover mídia',
            'Deseja realmente remover esta mídia?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Remover',
                    style: 'destructive',
                    onPress: () => {
                        const newMediaFiles = [...mediaFiles];
                        newMediaFiles.splice(index, 1);
                        setMediaFiles(newMediaFiles);
                    }
                }
            ]
        );
    };

    const handleRemoveVideo = (index) => {
        Alert.alert(
            'Remover vídeo',
            'Deseja realmente remover este vídeo?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Remover',
                    style: 'destructive',
                    onPress: () => {
                        const newVideoUrls = [...videoUrls];
                        newVideoUrls.splice(index, 1);
                        setVideoUrls(newVideoUrls);
                    }
                }
            ]
        );
    };

    const handleAddYouTubeUrl = () => {
        if (!youtubeUrlInput.trim()) {
            Alert.alert('URL vazia', 'Por favor, insira uma URL do YouTube.');
            return;
        }

        if (videosCount >= maxVideos) {
            Alert.alert('Limite atingido', `Você já adicionou o máximo de ${maxVideos} vídeo(s) permitido pelo seu plano.`);
            return;
        }

        const validation = validateYouTubeUrl(youtubeUrlInput.trim());
        if (!validation.isValid) {
            Alert.alert('URL inválida', validation.error);
            return;
        }

        const normalizedUrl = validation.normalizedUrl;
        
        // Verificar se já não existe
        if (videoUrls.includes(normalizedUrl)) {
            Alert.alert('Vídeo duplicado', 'Este vídeo já foi adicionado.');
            return;
        }

        setVideoUrls([...videoUrls, normalizedUrl]);
        setYoutubeUrlInput('');
    };

    const renderMediaItem = ({ item, index }) => (
        <View style={styles.mediaCard}>
            <Image source={{ uri: item.uri }} style={styles.mediaImage} />
            <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveMedia(index)}
            >
                <Ionicons name="close-circle" size={24} color="#EF4444" />
            </TouchableOpacity>
                            <View style={styles.mediaTypeTag}>
                                <AppText style={styles.mediaTypeText}>📷 Foto</AppText>
                            </View>
        </View>
    );

    const renderVideoItem = ({ item, index }) => {
        const videoId = extractYouTubeVideoId(item);
        if (!videoId) return null;
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        
        return (
            <View style={styles.videoCard}>
                <Image source={{ uri: thumbnailUrl }} style={styles.videoThumbnail} />
                <View style={styles.videoOverlay}>
                    <Ionicons name="play-circle" size={32} color="#fff" />
                </View>
                <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveVideo(index)}
                >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
                <View style={styles.videoTypeTag}>
                    <Ionicons name="logo-youtube" size={16} color="#fff" />
                    <AppText style={styles.videoTypeText}>YouTube</AppText>
                </View>
            </View>
        );
    };

    const canAddImages = imagesCount < maxImages;
    const canAddVideos = videosCount < maxVideos;

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
                <AppText style={styles.title}>Fotos e Vídeos</AppText>
                <AppText style={styles.subtitle}>
                    Imagens atrativas aumentam em até 5x as chances de visualização!
                </AppText>

                {/* Plan Limits Info */}
                <View style={styles.limitsCard}>
                    <View style={styles.limitRow}>
                        <Ionicons name="images" size={20} color="#3498db" />
                        <AppText style={styles.limitText}>
                            Fotos: <AppText style={styles.limitValue}>{imagesCount}/{maxImages}</AppText>
                        </AppText>
                    </View>
                    <View style={styles.limitRow}>
                        <Ionicons name="videocam" size={20} color="#e74c3c" />
                        <AppText style={styles.limitText}>
                            Vídeos: <AppText style={styles.limitValue}>{videosCount}/{maxVideos}</AppText>
                        </AppText>
                    </View>
                </View>

                {/* Fotos Section */}
                <View style={styles.section}>
                    <AppText style={styles.sectionTitle}>📷 Fotos</AppText>
                    {mediaFiles.length > 0 && (
                        <FlatList
                            data={mediaFiles}
                            renderItem={renderMediaItem}
                            keyExtractor={(item, index) => `photo-${index}`}
                            numColumns={2}
                            columnWrapperStyle={styles.mediaRow}
                            scrollEnabled={false}
                            style={styles.mediaGrid}
                        />
                    )}
                    {canAddImages && (
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => setShowUploadModal(true)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.addButtonIcon}>
                                <Ionicons name="add" size={32} color="#3498db" />
                            </View>
                            <AppText style={styles.addButtonText}>
                                {mediaFiles.length > 0 ? 'Adicionar mais fotos' : 'Adicionar fotos'}
                            </AppText>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Vídeos YouTube Section */}
                <View style={styles.section}>
                    <AppText style={styles.sectionTitle}>🎥 Vídeos</AppText>
                    <AppText style={styles.sectionSubtitle}>
                        Cole o link do vídeo do YouTube (vídeos normais ou Shorts)
                    </AppText>

                    {/* YouTube URL Input */}
                    {canAddVideos && (
                        <View style={styles.youtubeInputContainer}>
                            <AppTextInput
                                style={styles.youtubeInput}
                                placeholder="https://www.youtube.com/watch?v=..."
                                value={youtubeUrlInput}
                                onChangeText={setYoutubeUrlInput}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="url"
                            />
                            <TouchableOpacity
                                style={styles.addYouTubeButton}
                                onPress={handleAddYouTubeUrl}
                                activeOpacity={0.7}
                            >
                                <AppText style={styles.addYouTubeButtonText}>Adicionar</AppText>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Videos Grid */}
                    {videoUrls.length > 0 && (
                        <FlatList
                            data={videoUrls}
                            renderItem={renderVideoItem}
                            keyExtractor={(item, index) => `video-${index}`}
                            numColumns={2}
                            columnWrapperStyle={styles.mediaRow}
                            scrollEnabled={false}
                            style={styles.mediaGrid}
                        />
                    )}

                    {!canAddVideos && videoUrls.length === 0 && (
                        <View style={styles.limitReachedCard}>
                            <Ionicons name="information-circle" size={20} color="#F59E0B" />
                            <AppText style={styles.limitReachedText}>
                                Seu plano não permite adicionar vídeos.
                            </AppText>
                        </View>
                    )}
                </View>

                {/* Tips */}
                <View style={styles.tipsCard}>
                    <AppText style={styles.tipsTitle}>📸 Dicas para boas fotos:</AppText>
                    <View style={styles.tipItem}>
                        <Ionicons name="sunny" size={16} color="#F59E0B" />
                        <AppText style={styles.tipText}>Prefira luz natural</AppText>
                    </View>
                    <View style={styles.tipItem}>
                        <Ionicons name="expand" size={16} color="#F59E0B" />
                        <AppText style={styles.tipText}>Mostre diferentes ângulos</AppText>
                    </View>
                    <View style={styles.tipItem}>
                        <Ionicons name="sparkles" size={16} color="#F59E0B" />
                        <AppText style={styles.tipText}>Mantenha o ambiente limpo e organizado</AppText>
                    </View>
                    <View style={styles.tipItem}>
                        <Ionicons name="images" size={16} color="#F59E0B" />
                        <AppText style={styles.tipText}>Inclua todos os cômodos importantes</AppText>
                    </View>
                </View>
            </View>

            {/* Upload Modal - Apenas para fotos */}
            <MediaUploadModal
                visible={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                mediaFiles={mediaFiles}
                setMediaFiles={setMediaFiles}
                maxImages={maxImages}
                maxVideos={0}
                imagesOnly={true}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    content: {
        padding: 20,
        paddingBottom: 100,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#6B7280',
        marginBottom: 20,
        lineHeight: 22,
    },
    limitsCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    limitRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    limitText: {
        fontSize: 14,
        color: '#6B7280',
        marginLeft: 8,
    },
    limitValue: {
        fontWeight: '700',
        color: '#1F2937',
    },
    mediaGrid: {
        marginBottom: 20,
    },
    mediaRow: {
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    mediaCard: {
        width: '48%',
        aspectRatio: 1,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#E5E7EB',
    },
    mediaImage: {
        width: '100%',
        height: '100%',
    },
    videoOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#fff',
        borderRadius: 12,
    },
    mediaTypeTag: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    mediaTypeText: {
        fontSize: 11,
        color: '#fff',
        fontWeight: '600',
    },
    addButton: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#3498db',
        borderStyle: 'dashed',
    },
    addButtonIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#3498db15',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    addButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#3498db',
    },
    tipsCard: {
        backgroundColor: '#FFFBEB',
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    tipsTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#92400E',
        marginBottom: 12,
    },
    tipItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    tipText: {
        fontSize: 13,
        color: '#92400E',
        marginLeft: 8,
        flex: 1,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 16,
    },
    youtubeInputContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 8,
    },
    youtubeInput: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        fontSize: 14,
        color: '#1F2937',
    },
    addYouTubeButton: {
        backgroundColor: '#e74c3c',
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 100,
    },
    addYouTubeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    videoCard: {
        width: '48%',
        aspectRatio: 16/9,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#E5E7EB',
        position: 'relative',
    },
    videoThumbnail: {
        width: '100%',
        height: '100%',
    },
    videoTypeTag: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    videoTypeText: {
        fontSize: 11,
        color: '#fff',
        fontWeight: '600',
    },
    limitReachedCard: {
        backgroundColor: '##8697A9',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    limitReachedText: {
        fontSize: 14,
        color: '#92400E',
        flex: 1,
    },
});

