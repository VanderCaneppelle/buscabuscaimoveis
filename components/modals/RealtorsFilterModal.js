import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RealtorService } from '../../lib/realtorService';

/**
 * Modal para selecionar corretor
 * Mostra apenas corretores que têm imóveis ativos
 */
export default function RealtorsFilterModal({ visible, onClose, onSelectRealtor, selectedRealtorId }) {
    const [realtors, setRealtors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (visible) {
            loadRealtors();
        }
    }, [visible]);

    const loadRealtors = async () => {
        try {
            setLoading(true);
            const data = await RealtorService.getRealtorsWithProperties();
            console.log('📋 RealtorsModal: Dados recebidos:', data);
            console.log('📋 RealtorsModal: Quantidade:', data?.length);
            setRealtors(data);
        } catch (error) {
            console.error('❌ Erro ao carregar corretores:', error);
            setRealtors([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredRealtors = realtors.filter(realtor => {
        if (!searchQuery) return true;
        const searchLower = searchQuery.toLowerCase();
        return (
            realtor.full_name?.toLowerCase().includes(searchLower) ||
            realtor.email?.toLowerCase().includes(searchLower)
        );
    });

    console.log('🔍 RealtorsModal: realtors.length:', realtors.length);
    console.log('🔍 RealtorsModal: filteredRealtors.length:', filteredRealtors.length);
    console.log('🔍 RealtorsModal: loading:', loading);

    const handleSelectRealtor = (realtor) => {
        onSelectRealtor(realtor);
        setSearchQuery('');
        onClose();
    };

    const handleClearFilter = () => {
        onSelectRealtor(null); // Limpar filtro
        setSearchQuery('');
        onClose();
    };

    const renderRealtor = ({ item }) => {
        const isSelected = selectedRealtorId === item.id;
        
        return (
            <TouchableOpacity
                style={[styles.realtorItem, isSelected && styles.realtorItemSelected]}
                onPress={() => handleSelectRealtor(item)}
                activeOpacity={0.7}
            >
                <View style={styles.realtorInfo}>
                    <Text style={styles.realtorName}>{item.full_name}</Text>
                    {item.email && (
                        <Text style={styles.realtorEmail}>{item.email}</Text>
                    )}
                    <Text style={styles.propertyCount}>
                        {item.property_count} {item.property_count === 1 ? 'imóvel' : 'imóveis'}
                    </Text>
                </View>
                {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color="#00335e" />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Selecionar Corretor</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={28} color="#666" />
                        </TouchableOpacity>
                    </View>

                    {/* Busca */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar corretor..."
                            placeholderTextColor="#999"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCorrect={false}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color="#999" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Lista */}
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#00335e" />
                            <Text style={styles.loadingText}>Carregando corretores...</Text>
                        </View>
                    ) : filteredRealtors.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>
                                {searchQuery 
                                    ? 'Nenhum corretor encontrado' 
                                    : 'Nenhum corretor com imóveis disponível'}
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredRealtors}
                            renderItem={renderRealtor}
                            keyExtractor={(item) => item.id}
                            style={styles.list}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={true}
                        />
                    )}

                    {/* Botões */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.clearButton}
                            onPress={handleClearFilter}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="close-circle-outline" size={20} color="#00335e" />
                            <Text style={styles.clearButtonText}>Limpar Filtro</Text>
                        </TouchableOpacity>
                    </View>
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
        padding: 20,
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        height: '80%',
        width: '100%',
        maxWidth: 500,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#00335e',
    },
    closeButton: {
        padding: 5,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 10,
        margin: 20,
        marginBottom: 10,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    list: {
        flexGrow: 1,
        flexShrink: 1,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    realtorItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f9f9f9',
        padding: 16,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    realtorItemSelected: {
        borderColor: '#00335e',
        backgroundColor: '#e8f4f8',
    },
    realtorInfo: {
        flex: 1,
        marginRight: 10,
    },
    realtorName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#00335e',
        marginBottom: 4,
    },
    realtorEmail: {
        fontSize: 13,
        color: '#666',
        marginBottom: 4,
    },
    propertyCount: {
        fontSize: 12,
        color: '#999',
        fontWeight: '500',
    },
    loadingContainer: {
        minHeight: 200,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
        color: '#666',
    },
    emptyContainer: {
        minHeight: 200,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        marginTop: 15,
        fontSize: 16,
        color: '#999',
        textAlign: 'center',
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 20,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f0f0',
        paddingVertical: 14,
        borderRadius: 12,
    },
    clearButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#00335e',
        marginLeft: 8,
    },
});

