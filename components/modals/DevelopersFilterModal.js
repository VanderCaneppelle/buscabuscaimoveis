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
import { DeveloperService } from '../../lib/developerService';

/**
 * Modal para selecionar construtora
 * Mostra apenas construtoras que têm imóveis ativos
 */
export default function DevelopersFilterModal({ visible, onClose, onSelectDeveloper, selectedDeveloperId }) {
    const [developers, setDevelopers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (visible) {
            loadDevelopers();
        }
    }, [visible]);

    const loadDevelopers = async () => {
        try {
            setLoading(true);
            const data = await DeveloperService.getDevelopersWithProperties();
            console.log('📋 DevelopersModal: Dados recebidos:', data);
            console.log('📋 DevelopersModal: Quantidade:', data?.length);
            setDevelopers(data);
        } catch (error) {
            console.error('❌ Erro ao carregar construtoras:', error);
            setDevelopers([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredDevelopers = developers.filter(dev => {
        if (!searchQuery) return true;
        const searchLower = searchQuery.toLowerCase();
        return (
            dev.full_name?.toLowerCase().includes(searchLower) ||
            dev.name?.toLowerCase().includes(searchLower) ||
            dev.city_name?.toLowerCase().includes(searchLower)
        );
    });

    console.log('🔍 DevelopersModal: developers.length:', developers.length);
    console.log('🔍 DevelopersModal: filteredDevelopers.length:', filteredDevelopers.length);
    console.log('🔍 DevelopersModal: loading:', loading);

    const handleSelectDeveloper = (developer) => {
        onSelectDeveloper(developer);
        setSearchQuery('');
        onClose();
    };

    const handleClearFilter = () => {
        onSelectDeveloper(null); // Limpar filtro
        setSearchQuery('');
        onClose();
    };

    const renderDeveloper = ({ item }) => {
        const isSelected = selectedDeveloperId === item.id;
        
        return (
            <TouchableOpacity
                style={[styles.developerItem, isSelected && styles.developerItemSelected]}
                onPress={() => handleSelectDeveloper(item)}
                activeOpacity={0.7}
            >
                <View style={styles.developerInfo}>
                    <Text style={styles.developerName}>{item.full_name || item.name}</Text>
                    <Text style={styles.developerLocation}>
                        {item.city_name && item.city_uf 
                            ? `${item.city_name} - ${item.city_uf}` 
                            : 'Localização não informada'}
                    </Text>
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
                        <Text style={styles.title}>Selecionar Construtora</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={28} color="#666" />
                        </TouchableOpacity>
                    </View>

                    {/* Busca */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar construtora..."
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
                            <Text style={styles.loadingText}>Carregando construtoras...</Text>
                        </View>
                    ) : filteredDevelopers.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="business-outline" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>
                                {searchQuery 
                                    ? 'Nenhuma construtora encontrada' 
                                    : 'Nenhuma construtora com imóveis disponível'}
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredDevelopers}
                            renderItem={renderDeveloper}
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
    developerItem: {
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
    developerItemSelected: {
        borderColor: '#00335e',
        backgroundColor: '#e8f4f8',
    },
    developerInfo: {
        flex: 1,
        marginRight: 10,
    },
    developerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#00335e',
        marginBottom: 4,
    },
    developerLocation: {
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

