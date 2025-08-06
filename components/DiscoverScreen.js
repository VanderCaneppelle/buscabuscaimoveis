import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    SafeAreaView,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';

export default function DiscoverScreen({ navigation }) {
    const [featuredProperties, setFeaturedProperties] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    // Atualizar dados sempre que a tela ganhar foco
    useFocusEffect(
        React.useCallback(() => {
            console.log('🔄 DiscoverScreen: Atualizando dados...');
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            setLoading(true);
            await Promise.all([
                fetchFeaturedProperties(),
                fetchCategories()
            ]);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFeaturedProperties = async () => {
        try {
            const { data, error } = await supabase
                .from('properties')
                .select('*')
                .eq('status', 'approved')
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) {
                console.error('Erro ao buscar propriedades em destaque:', error);
            } else {
                setFeaturedProperties(data || []);
            }
        } catch (error) {
            console.error('Erro ao buscar propriedades em destaque:', error);
        }
    };

    const fetchCategories = async () => {
        // Dados mockados para categorias
        const mockCategories = [
            { id: 1, name: 'Casas', icon: 'home', count: 45, color: '#3498db' },
            { id: 2, name: 'Apartamentos', icon: 'business', count: 32, color: '#e74c3c' },
            { id: 3, name: 'Terrenos', icon: 'map', count: 18, color: '#2ecc71' },
            { id: 4, name: 'Comercial', icon: 'storefront', count: 25, color: '#f39c12' },
            { id: 5, name: 'Rural', icon: 'leaf', count: 12, color: '#8e44ad' },
            { id: 6, name: 'Luxo', icon: 'diamond', count: 8, color: '#e67e22' },
        ];
        setCategories(mockCategories);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const renderCategory = ({ item }) => (
        <TouchableOpacity style={styles.categoryCard}>
            <View style={[styles.categoryIcon, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={24} color="#fff" />
            </View>
            <Text style={styles.categoryName}>{item.name}</Text>
            <Text style={styles.categoryCount}>{item.count} imóveis</Text>
        </TouchableOpacity>
    );

    const renderFeaturedProperty = ({ item }) => (
        <TouchableOpacity style={styles.propertyCard}>
            <Image
                source={{ uri: item.images?.[0] || 'https://via.placeholder.com/300x200' }}
                style={styles.propertyImage}
                resizeMode="cover"
            />
            <View style={styles.propertyInfo}>
                <Text style={styles.propertyTitle} numberOfLines={1}>
                    {item.title}
                </Text>
                <Text style={styles.propertyLocation}>
                    {item.neighborhood}, {item.city}
                </Text>
                <Text style={styles.propertyPrice}>
                    R$ {item.price?.toLocaleString('pt-BR')}
                </Text>
                <View style={styles.propertyFeatures}>
                    {item.bedrooms && (
                        <Text style={styles.propertyFeature}>{item.bedrooms} quartos</Text>
                    )}
                    {item.bathrooms && (
                        <Text style={styles.propertyFeature}>{item.bathrooms} banheiros</Text>
                    )}
                    {item.area && (
                        <Text style={styles.propertyFeature}>{item.area}m²</Text>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Descobrir</Text>
                <Text style={styles.headerSubtitle}>Encontre o imóvel dos seus sonhos</Text>
            </View>

            <FlatList
                data={featuredProperties}
                renderItem={renderFeaturedProperty}
                keyExtractor={(item) => item.id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListHeaderComponent={
                    <>
                        {/* Categories */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Categorias</Text>
                            <FlatList
                                data={categories}
                                renderItem={renderCategory}
                                keyExtractor={(item) => item.id.toString()}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.categoriesList}
                            />
                        </View>

                        {/* Featured Properties */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Destaques</Text>
                        </View>
                    </>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="star-outline" size={64} color="#bdc3c7" />
                        <Text style={styles.emptyText}>Nenhum destaque encontrado</Text>
                        <Text style={styles.emptySubtext}>
                            Volte mais tarde para ver novos destaques
                        </Text>
                    </View>
                }
                contentContainerStyle={styles.listContainer}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#3498db',
        padding: 20,
        paddingTop: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#fff',
        opacity: 0.9,
    },
    listContainer: {
        paddingBottom: 20,
    },
    section: {
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 15,
        paddingHorizontal: 20,
    },
    categoriesList: {
        paddingHorizontal: 20,
    },
    categoryCard: {
        width: 100,
        marginRight: 15,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 3,
    },
    categoryIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    categoryName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2c3e50',
        textAlign: 'center',
        marginBottom: 5,
    },
    categoryCount: {
        fontSize: 12,
        color: '#7f8c8d',
        textAlign: 'center',
    },
    propertyCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 15,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    propertyImage: {
        width: '100%',
        height: 180,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    propertyInfo: {
        padding: 15,
    },
    propertyTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 5,
    },
    propertyLocation: {
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 8,
    },
    propertyPrice: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#3498db',
        marginBottom: 8,
    },
    propertyFeatures: {
        flexDirection: 'row',
        gap: 10,
    },
    propertyFeature: {
        fontSize: 12,
        color: '#7f8c8d',
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyText: {
        fontSize: 18,
        color: '#7f8c8d',
        marginTop: 15,
        marginBottom: 5,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#bdc3c7',
        textAlign: 'center',
    },
}); 