import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../../AppText';

const SectionCard = ({ title, icon, iconColor, children, onEdit }) => (
    <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: iconColor + '15' }]}>
                <Ionicons name={icon} size={20} color={iconColor} />
            </View>
            <AppText style={styles.sectionTitle}>{title}</AppText>
            <TouchableOpacity style={styles.editButton} onPress={onEdit}>
                <Ionicons name="create-outline" size={18} color="#3498db" />
                <AppText style={styles.editButtonText}>Editar</AppText>
            </TouchableOpacity>
        </View>
        <View style={styles.sectionContent}>
            {children}
        </View>
    </View>
);

const InfoRow = ({ label, value, highlight }) => (
    <View style={styles.infoRow}>
        <AppText style={styles.infoLabel}>{label}</AppText>
        <AppText style={[styles.infoValue, highlight && styles.infoValueHighlight]}>{value}</AppText>
    </View>
);

export default function Step9Review({ formData, mediaFiles, videoUrls = [], onEditStep }) {
    const imagesCount = mediaFiles.length;
    const videosCount = videoUrls.length;

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
                <AppText style={styles.title}>Revise seu anúncio</AppText>
                <AppText style={styles.subtitle}>
                    Confira se está tudo certo antes de publicar
                </AppText>

                {/* Tipo e Transação */}
                <SectionCard
                    title="Tipo de Imóvel"
                    icon="home"
                    iconColor="#3498db"
                    onEdit={() => onEditStep(1)}
                >
                    <InfoRow label="Tipo" value={formData.propertyType} highlight />
                    <InfoRow label="Finalidade" value={formData.transactionType} highlight />
                </SectionCard>

                {/* Título e Descrição */}
                <SectionCard
                    title="Informações Básicas"
                    icon="document-text"
                    iconColor="#9b59b6"
                    onEdit={() => onEditStep(2)}
                >
                    <AppText style={styles.titlePreview}>{formData.title}</AppText>
                    {formData.description && (
                        <AppText style={styles.descriptionPreview} numberOfLines={3}>
                            {formData.description}
                        </AppText>
                    )}
                </SectionCard>

                {/* Localização */}
                <SectionCard
                    title="Localização"
                    icon="location"
                    iconColor="#27ae60"
                    onEdit={() => onEditStep(3)}
                >
                    <View style={styles.addressContainer}>
                        <Ionicons name="pin" size={16} color="#27ae60" />
                        <View style={styles.addressContent}>
                            <AppText style={styles.addressText}>{formData.address}</AppText>
                            {formData.neighborhood && (
                                <AppText style={styles.addressText}>{formData.neighborhood}</AppText>
                            )}
                            <AppText style={styles.addressText}>
                                {formData.city}, {formData.state}
                            </AppText>
                        </View>
                    </View>
                </SectionCard>

                {/* Características */}
                <SectionCard
                    title="Características"
                    icon="grid"
                    iconColor="#f39c12"
                    onEdit={() => onEditStep(4)}
                >
                    <View style={styles.characteristicsGrid}>
                        <View style={styles.characteristicItem}>
                            <Ionicons name="bed" size={20} color="#3498db" />
                            <AppText style={styles.characteristicValue}>{formData.bedrooms || 0}</AppText>
                            <AppText style={styles.characteristicLabel}>Quartos</AppText>
                        </View>
                        <View style={styles.characteristicItem}>
                            <Ionicons name="water" size={20} color="#9b59b6" />
                            <AppText style={styles.characteristicValue}>{formData.bathrooms || 0}</AppText>
                            <AppText style={styles.characteristicLabel}>Banheiros</AppText>
                        </View>
                        <View style={styles.characteristicItem}>
                            <Ionicons name="car" size={20} color="#e74c3c" />
                            <AppText style={styles.characteristicValue}>{formData.parkingSpaces || 0}</AppText>
                            <AppText style={styles.characteristicLabel}>Vagas</AppText>
                        </View>
                        {formData.area && (
                            <View style={styles.characteristicItem}>
                                <Ionicons name="resize" size={20} color="#f39c12" />
                                <AppText style={styles.characteristicValue}>{formData.area}</AppText>
                                <AppText style={styles.characteristicLabel}>m²</AppText>
                            </View>
                        )}
                    </View>
                </SectionCard>

                {/* Valores */}
                <SectionCard
                    title="Valores"
                    icon="cash"
                    iconColor="#10B981"
                    onEdit={() => onEditStep(5)}
                >
                    <InfoRow 
                        label={formData.transactionType === 'Aluguel' ? 'Aluguel' : 'Preço'} 
                        value={`R$ ${formData.price}`} 
                        highlight 
                    />
                    {formData.salePrice && (
                        <InfoRow 
                            label="Preço Promocional" 
                            value={`R$ ${formData.salePrice}`} 
                            highlight 
                        />
                    )}
                </SectionCard>

                {/* Construtora (se houver) */}
                {formData.developer_id && (
                    <SectionCard
                        title="Construtora"
                        icon="business"
                        iconColor="#2563EB"
                        onEdit={() => onEditStep(6)}
                    >
                        <AppText style={styles.developerName}>
                            {/* Nome será carregado do service */}
                            Construtora selecionada
                        </AppText>
                    </SectionCard>
                )}

                {/* Mídias */}
                <SectionCard
                    title="Fotos e Vídeos"
                    icon="images"
                    iconColor="#ec4899"
                    onEdit={() => onEditStep(7)}
                >
                    <View style={styles.mediaStats}>
                        <View style={styles.mediaStat}>
                            <Ionicons name="images" size={18} color="#3498db" />
                            <AppText style={styles.mediaStatText}>{imagesCount} foto{imagesCount !== 1 ? 's' : ''}</AppText>
                        </View>
                        <View style={styles.mediaStat}>
                            <Ionicons name="videocam" size={18} color="#e74c3c" />
                            <AppText style={styles.mediaStatText}>{videosCount} vídeo{videosCount !== 1 ? 's' : ''}</AppText>
                        </View>
                    </View>
                    {(mediaFiles.length > 0 || videoUrls.length > 0) && (
                        <View style={styles.mediaPreview}>
                            {/* Fotos */}
                            {mediaFiles.slice(0, 4).map((media, index) => (
                                <View key={`photo-${index}`} style={styles.mediaThumb}>
                                    <Image source={{ uri: media.uri }} style={styles.mediaThumbImage} />
                                </View>
                            ))}
                            {/* Vídeos do YouTube */}
                            {videoUrls.slice(0, Math.max(0, 4 - mediaFiles.length)).map((url, index) => {
                                // Extrair videoId da URL
                                const videoId = url.match(/[?&]v=([^&]+)/)?.[1] || url.split('/').pop();
                                if (!videoId) return null;
                                const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                                return (
                                    <View key={`video-${index}`} style={styles.mediaThumb}>
                                        <Image source={{ uri: thumbnailUrl }} style={styles.mediaThumbImage} />
                                        <View style={styles.videoThumbOverlay}>
                                            <Ionicons name="logo-youtube" size={16} color="#fff" />
                                        </View>
                                    </View>
                                );
                            })}
                            {(mediaFiles.length + videoUrls.length) > 4 && (
                                <View style={[styles.mediaThumb, styles.mediaThumbMore]}>
                                    <AppText style={styles.mediaThumbMoreText}>+{(mediaFiles.length + videoUrls.length) - 4}</AppText>
                                </View>
                            )}
                        </View>
                    )}
                </SectionCard>

                {/* Info Final */}
                <View style={styles.finalInfo}>
                    <Ionicons name="information-circle" size={20} color="#3498db" />
                    <AppText style={styles.finalInfoText}>
                        Após publicar, seu anúncio passará por uma análise. Você será notificado assim que for aprovado.
                    </AppText>
                </View>
            </View>
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
        marginBottom: 24,
        lineHeight: 22,
    },
    sectionCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    sectionIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    sectionTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    editButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#3498db',
        marginLeft: 4,
    },
    sectionContent: {
        gap: 8,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },
    infoLabel: {
        fontSize: 14,
        color: '#6B7280',
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
    },
    infoValueHighlight: {
        color: '#3498db',
        fontWeight: '700',
    },
    titlePreview: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
        lineHeight: 22,
    },
    descriptionPreview: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    addressContent: {
        flex: 1,
        marginLeft: 8,
    },
    addressText: {
        fontSize: 14,
        color: '#1F2937',
        marginBottom: 2,
    },
    characteristicsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    characteristicItem: {
        alignItems: 'center',
        width: '22%',
    },
    characteristicValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        marginTop: 4,
    },
    characteristicLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    developerName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
    },
    mediaStats: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 12,
    },
    mediaStat: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    mediaStatText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginLeft: 6,
    },
    mediaPreview: {
        flexDirection: 'row',
        gap: 8,
    },
    mediaThumb: {
        width: 60,
        height: 60,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#E5E7EB',
    },
    mediaThumbImage: {
        width: '100%',
        height: '100%',
    },
    videoThumbOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    mediaThumbMore: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3498db15',
    },
    mediaThumbMoreText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#3498db',
    },
    finalInfo: {
        flexDirection: 'row',
        backgroundColor: '#EFF6FF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#DBEAFE',
        marginTop: 8,
    },
    finalInfoText: {
        flex: 1,
        fontSize: 13,
        color: '#1E40AF',
        marginLeft: 12,
        lineHeight: 18,
    },
});

