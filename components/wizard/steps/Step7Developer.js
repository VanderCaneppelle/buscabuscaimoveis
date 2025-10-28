import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DeveloperService } from '../../../lib/developerService';

export default function Step6Developer({ formData, updateFormData }) {
    const [developers, setDevelopers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDeveloper, setSelectedDeveloper] = useState(null);

    useEffect(() => {
        loadDevelopers();
    }, []);

    useEffect(() => {
        // Se já tem um developer_id selecionado, encontrar e definir
        if (formData.developer_id && developers.length > 0) {
            const dev = developers.find(d => d.id === formData.developer_id);
            if (dev) setSelectedDeveloper(dev);
        }
    }, [formData.developer_id, developers]);

    const loadDevelopers = async () => {
        try {
            setLoading(true);
            const data = await DeveloperService.getDevelopersWithCache();
            setDevelopers(data);
        } catch (error) {
            console.error('Erro ao carregar construtoras:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredDevelopers = developers.filter(dev => {
        if (!searchQuery) return true;
        const search = searchQuery.toLowerCase();
        return (
            dev.full_name?.toLowerCase().includes(search) ||
            dev.name?.toLowerCase().includes(search) ||
            dev.city_name?.toLowerCase().includes(search)
        );
    });

    const handleSelect = (developer) => {
        setSelectedDeveloper(developer);
        updateFormData('developer_id', developer.id);
        setSearchQuery('');
    };

    const handleClear = () => {
        setSelectedDeveloper(null);
        updateFormData('developer_id', null);
        setSearchQuery('');
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
                <Text style={styles.title}>Construtora ou Incorporadora</Text>
                <Text style={styles.subtitle}>
                    Informe a construtora responsável pelo imóvel (opcional)
                </Text>

                {/* Selected Developer */}
                {selectedDeveloper ? (
                    <View style={styles.selectedCard}>
                        <View style={styles.selectedHeader}>
                            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                            <Text style={styles.selectedTitle}>Construtora selecionada</Text>
                        </View>
                        <View style={styles.selectedContent}>
                            <View style={styles.selectedIconContainer}>
                                <Ionicons name="business" size={32} color="#3498db" />
                            </View>
                            <View style={styles.selectedInfo}>
                                <Text style={styles.selectedName}>{selectedDeveloper.full_name}</Text>
                                {selectedDeveloper.city_name && (
                                    <Text style={styles.selectedLocation}>
                                        📍 {selectedDeveloper.city_name}/{selectedDeveloper.city_uf}
                                    </Text>
                                )}
                            </View>
                        </View>
                        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                            <Ionicons name="close-circle" size={18} color="#EF4444" />
                            <Text style={styles.clearButtonText}>Remover seleção</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {/* Search */}
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder="Buscar construtora por nome ou cidade..."
                                placeholderTextColor="#9CA3AF"
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Results */}
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#ffcc1e" />
                                <Text style={styles.loadingText}>Carregando construtoras...</Text>
                            </View>
                        ) : filteredDevelopers.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="business-outline" size={64} color="#D1D5DB" />
                                <Text style={styles.emptyTitle}>Nenhuma construtora encontrada</Text>
                                <Text style={styles.emptyText}>
                                    {searchQuery 
                                        ? 'Tente buscar com outro termo'
                                        : 'Não há construtoras cadastradas'
                                    }
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.resultsContainer}>
                                <Text style={styles.resultsCount}>
                                    {filteredDevelopers.length} construtora{filteredDevelopers.length !== 1 ? 's' : ''} encontrada{filteredDevelopers.length !== 1 ? 's' : ''}
                                </Text>
                                <FlatList
                                    data={filteredDevelopers}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.developerCard}
                                            onPress={() => handleSelect(item)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.developerIcon}>
                                                <Ionicons name="business" size={24} color="#3498db" />
                                            </View>
                                            <View style={styles.developerInfo}>
                                                <Text style={styles.developerName}>{item.full_name}</Text>
                                                {item.city_name && (
                                                    <Text style={styles.developerLocation}>
                                                        📍 {item.city_name}/{item.city_uf}
                                                    </Text>
                                                )}
                                            </View>
                                            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                                        </TouchableOpacity>
                                    )}
                                    scrollEnabled={false}
                                />
                            </View>
                        )}
                    </>
                )}

                {/* Skip Button */}
                {!selectedDeveloper && (
                    <TouchableOpacity 
                        style={styles.skipButton}
                        onPress={() => updateFormData('developer_id', null)}
                    >
                        <Text style={styles.skipButtonText}>Pular esta etapa</Text>
                        <Ionicons name="arrow-forward" size={18} color="#6B7280" />
                    </TouchableOpacity>
                )}
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
    selectedCard: {
        backgroundColor: '#F0FDF4',
        borderRadius: 16,
        padding: 20,
        borderWidth: 2,
        borderColor: '#D1FAE5',
    },
    selectedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    selectedTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#065F46',
        marginLeft: 8,
    },
    selectedContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    selectedIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#3498db15',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    selectedInfo: {
        flex: 1,
    },
    selectedName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#047857',
        marginBottom: 4,
    },
    selectedLocation: {
        fontSize: 14,
        color: '#059669',
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    clearButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#EF4444',
        marginLeft: 6,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        paddingHorizontal: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#1F2937',
        paddingVertical: 16,
    },
    loadingContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        color: '#6B7280',
    },
    emptyContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6B7280',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
    },
    resultsContainer: {
        marginBottom: 20,
    },
    resultsCount: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 12,
    },
    developerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    developerIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#3498db15',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    developerInfo: {
        flex: 1,
    },
    developerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    developerLocation: {
        fontSize: 13,
        color: '#6B7280',
    },
    skipButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
    },
    skipButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6B7280',
        marginRight: 8,
    },
});

