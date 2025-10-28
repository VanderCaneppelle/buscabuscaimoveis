import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    Image,
    FlatList,
    Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MediaUploadModal from '../modals/MediaUploadModal';

export default function Step7Media({ formData, mediaFiles, setMediaFiles, plan }) {
    const [showUploadModal, setShowUploadModal] = useState(false);

    const imagesCount = mediaFiles.filter(f => f.type !== 'video').length;
    const videosCount = mediaFiles.filter(f => f.type === 'video').length;
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

    const renderMediaItem = ({ item, index }) => (
        <View style={styles.mediaCard}>
            <Image source={{ uri: item.uri }} style={styles.mediaImage} />
            {item.type === 'video' && (
                <View style={styles.videoOverlay}>
                    <Ionicons name="play-circle" size={32} color="#fff" />
                </View>
            )}
            <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveMedia(index)}
            >
                <Ionicons name="close-circle" size={24} color="#EF4444" />
            </TouchableOpacity>
            <View style={styles.mediaTypeTag}>
                <Text style={styles.mediaTypeText}>
                    {item.type === 'video' ? '🎥 Vídeo' : '📷 Foto'}
                </Text>
            </View>
        </View>
    );

    const canAddImages = imagesCount < maxImages;
    const canAddVideos = videosCount < maxVideos;
    const hasMedia = mediaFiles.length > 0;

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
                <Text style={styles.title}>Fotos e Vídeos</Text>
                <Text style={styles.subtitle}>
                    Imagens atrativas aumentam em até 5x as chances de visualização!
                </Text>

                {/* Plan Limits Info */}
                <View style={styles.limitsCard}>
                    <View style={styles.limitRow}>
                        <Ionicons name="images" size={20} color="#3498db" />
                        <Text style={styles.limitText}>
                            Fotos: <Text style={styles.limitValue}>{imagesCount}/{maxImages}</Text>
                        </Text>
                    </View>
                    <View style={styles.limitRow}>
                        <Ionicons name="videocam" size={20} color="#e74c3c" />
                        <Text style={styles.limitText}>
                            Vídeos: <Text style={styles.limitValue}>{videosCount}/{maxVideos}</Text>
                        </Text>
                    </View>
                </View>

                {/* Media Grid */}
                {hasMedia && (
                    <FlatList
                        data={mediaFiles}
                        renderItem={renderMediaItem}
                        keyExtractor={(item, index) => index.toString()}
                        numColumns={2}
                        columnWrapperStyle={styles.mediaRow}
                        scrollEnabled={false}
                        style={styles.mediaGrid}
                    />
                )}

                {/* Add Media Button */}
                {(canAddImages || canAddVideos) && (
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => setShowUploadModal(true)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.addButtonIcon}>
                            <Ionicons name="add" size={32} color="#3498db" />
                        </View>
                        <Text style={styles.addButtonText}>
                            {hasMedia ? 'Adicionar mais mídias' : 'Adicionar fotos e vídeos'}
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Tips */}
                <View style={styles.tipsCard}>
                    <Text style={styles.tipsTitle}>📸 Dicas para boas fotos:</Text>
                    <View style={styles.tipItem}>
                        <Ionicons name="sunny" size={16} color="#F59E0B" />
                        <Text style={styles.tipText}>Prefira luz natural</Text>
                    </View>
                    <View style={styles.tipItem}>
                        <Ionicons name="expand" size={16} color="#F59E0B" />
                        <Text style={styles.tipText}>Mostre diferentes ângulos</Text>
                    </View>
                    <View style={styles.tipItem}>
                        <Ionicons name="sparkles" size={16} color="#F59E0B" />
                        <Text style={styles.tipText}>Mantenha o ambiente limpo e organizado</Text>
                    </View>
                    <View style={styles.tipItem}>
                        <Ionicons name="images" size={16} color="#F59E0B" />
                        <Text style={styles.tipText}>Inclua todos os cômodos importantes</Text>
                    </View>
                </View>
            </View>

            {/* Upload Modal */}
            <MediaUploadModal
                visible={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                mediaFiles={mediaFiles}
                setMediaFiles={setMediaFiles}
                maxImages={maxImages}
                maxVideos={maxVideos}
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
});

