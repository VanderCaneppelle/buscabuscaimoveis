import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCacheStats, clearAllCache, verifyCacheIntegrity } from '../lib/mediaCacheService';
import PropertyCacheService from '../lib/propertyCacheService';

export default function CacheStatsModal({ visible, onClose }) {
    const [mediaStats, setMediaStats] = useState(null);
    const [propertyStats, setPropertyStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [clearing, setClearing] = useState(false);

    useEffect(() => {
        if (visible) {
            loadStats();
        }
    }, [visible]);

    const loadStats = async () => {
        setLoading(true);
        try {
            const [media, property] = await Promise.all([
                getCacheStats(),
                PropertyCacheService.getCacheStats()
            ]);
            setMediaStats(media);
            setPropertyStats(property);
        } catch (error) {
            console.error('❌ Erro ao carregar estatísticas:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClearAllCache = async () => {
        Alert.alert(
            'Limpar Todo o Cache',
            'Tem certeza que deseja limpar todo o cache? Isso pode afetar a performance do app.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Limpar',
                    style: 'destructive',
                    onPress: async () => {
                        setClearing(true);
                        try {
                            await Promise.all([
                                clearAllCache(),
                                PropertyCacheService.clearCache()
                            ]);
                            Alert.alert('✅ Sucesso', 'Cache limpo com sucesso!');
                            loadStats();
                        } catch (error) {
                            Alert.alert('❌ Erro', 'Erro ao limpar cache');
                        } finally {
                            setClearing(false);
                        }
                    }
                }
            ]
        );
    };

    const handleVerifyIntegrity = async () => {
        try {
            await verifyCacheIntegrity();
            Alert.alert('✅ Verificação Concluída', 'Verifique os logs para detalhes');
        } catch (error) {
            Alert.alert('❌ Erro', 'Erro ao verificar integridade');
        }
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getUsagePercentage = (used, max) => {
        return ((used / max) * 100).toFixed(1);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>📊 Estatísticas do Cache</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#00335e" />
                                <Text style={styles.loadingText}>Carregando estatísticas...</Text>
                            </View>
                        ) : (
                            <>
                                {/* Cache de Mídia */}
                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <Ionicons name="images" size={20} color="#00335e" />
                                        <Text style={styles.sectionTitle}>Cache de Mídia</Text>
                                    </View>

                                    {mediaStats && (
                                        <View style={styles.statsGrid}>
                                            <View style={styles.statItem}>
                                                <Text style={styles.statLabel}>Total de Arquivos</Text>
                                                <Text style={styles.statValue}>{mediaStats.totalFiles}</Text>
                                            </View>

                                            <View style={styles.statItem}>
                                                <Text style={styles.statLabel}>Stories</Text>
                                                <Text style={styles.statValue}>{mediaStats.storyFiles}</Text>
                                            </View>

                                            <View style={styles.statItem}>
                                                <Text style={styles.statLabel}>Outros</Text>
                                                <Text style={styles.statValue}>{mediaStats.generalFiles}</Text>
                                            </View>

                                            <View style={styles.statItem}>
                                                <Text style={styles.statLabel}>Tamanho Total</Text>
                                                <Text style={styles.statValue}>{mediaStats.totalSizeMB} MB</Text>
                                            </View>
                                        </View>
                                    )}

                                    {/* Barra de Progresso */}
                                    {mediaStats && (
                                        <View style={styles.progressContainer}>
                                            <View style={styles.progressBar}>
                                                <View
                                                    style={[
                                                        styles.progressFill,
                                                        {
                                                            width: `${getUsagePercentage(parseFloat(mediaStats.totalSizeMB), mediaStats.maxSizeMB)}%`,
                                                            backgroundColor: parseFloat(mediaStats.totalSizeMB) > mediaStats.maxSizeMB * 0.8 ? '#e74c3c' : '#27ae60'
                                                        }
                                                    ]}
                                                />
                                            </View>
                                            <Text style={styles.progressText}>
                                                {getUsagePercentage(parseFloat(mediaStats.totalSizeMB), mediaStats.maxSizeMB)}% usado
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Cache de Propriedades */}
                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <Ionicons name="home" size={20} color="#00335e" />
                                        <Text style={styles.sectionTitle}>Cache de Propriedades</Text>
                                    </View>

                                    {propertyStats && (
                                        <View style={styles.statsGrid}>
                                            <View style={styles.statItem}>
                                                <Text style={styles.statLabel}>Propriedades</Text>
                                                <Text style={styles.statValue}>{propertyStats.totalProperties}</Text>
                                            </View>

                                            <View style={styles.statItem}>
                                                <Text style={styles.statLabel}>Tamanho</Text>
                                                <Text style={styles.statValue}>{formatBytes(propertyStats.totalSizeBytes)}</Text>
                                            </View>

                                            <View style={styles.statItem}>
                                                <Text style={styles.statLabel}>Última Atualização</Text>
                                                <Text style={styles.statValue}>
                                                    {propertyStats.lastUpdate ? new Date(propertyStats.lastUpdate).toLocaleTimeString() : 'Nunca'}
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </View>

                                {/* Ações */}
                                <View style={styles.actions}>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.verifyButton]}
                                        onPress={handleVerifyIntegrity}
                                    >
                                        <Ionicons name="checkmark-circle" size={20} color="#27ae60" />
                                        <Text style={styles.actionButtonText}>Verificar Integridade</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.clearButton]}
                                        onPress={handleClearAllCache}
                                        disabled={clearing}
                                    >
                                        {clearing ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Ionicons name="trash" size={20} color="#fff" />
                                        )}
                                        <Text style={[styles.actionButtonText, styles.clearButtonText]}>
                                            {clearing ? 'Limpando...' : 'Limpar Todo Cache'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: '90%',
        maxHeight: '80%',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#00335e',
    },
    closeButton: {
        padding: 4,
    },
    content: {
        padding: 20,
    },
    loadingContainer: {
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#64748b',
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#00335e',
        marginLeft: 8,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 16,
    },
    statItem: {
        width: '50%',
        marginBottom: 12,
    },
    statLabel: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#00335e',
    },
    progressContainer: {
        marginTop: 8,
    },
    progressBar: {
        height: 8,
        backgroundColor: '#e2e8f0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 4,
        textAlign: 'center',
    },
    actions: {
        marginTop: 20,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
    },
    verifyButton: {
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#27ae60',
    },
    clearButton: {
        backgroundColor: '#e74c3c',
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
        color: '#00335e',
    },
    clearButtonText: {
        color: '#fff',
    },
});
