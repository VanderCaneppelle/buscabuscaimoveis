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
    // const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [filteredProperties, setFilteredProperties] = useState([]);
    const [properties, setProperties] = useState([]);

    const categories = [
        { id: 1, name: 'Casa', icon: 'home', color: '#FF6B6B', count: 12 },
        { id: 2, name: 'Apartamento', icon: 'business', color: '#4ECDC4', count: 8 },
        { id: 3, name: 'Cobertura', icon: 'home', color: '#1A535C', count: 5 },
        { id: 4, name: 'Studio', icon: 'cube', color: '#FFB347', count: 3 },
        { id: 5, name: 'Loft', icon: 'aperture', color: '#6A5ACD', count: 2 },
        { id: 6, name: 'Sobrado', icon: 'home', color: '#20B2AA', count: 4 },
        { id: 7, name: 'Casa de Condomínio', icon: 'home', color: '#FF6347', count: 6 },
        { id: 8, name: 'Kitnet', icon: 'bed', color: '#32CD32', count: 1 },
        { id: 9, name: 'Flat', icon: 'business', color: '#FFD700', count: 7 },
        { id: 10, name: 'Terreno', icon: 'leaf', color: '#8B4513', count: 9 },
        { id: 11, name: 'Comercial', icon: 'briefcase', color: '#4682B4', count: 10 },
        { id: 12, name: 'Rural', icon: 'sunny', color: '#2E8B57', count: 2 },
    ];

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
                fetchRecentProperties(),
            ]);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRecentProperties = async () => {
        try {
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

            let query = supabase
                .from('properties')
                .select('*')
                .eq('status', 'approved')
                .gte('created_at', twoDaysAgo.toISOString())
                .order('created_at', { ascending: false });


            const { data, error } = await query;

            if (error) {
                console.error('Erro ao buscar propriedades:', error);
            } else {
                setProperties(data || []); // atualiza o estado principal de properties
            }
        } catch (error) {
            console.error('Erro ao buscar propriedades:', error);
        }
    };
    // Busca imóveis filtrando pelas categorias selecionadas e últimos 2 dias
    const fetchPropertiesByCategories = async (categories) => {
        try {
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

            let query = supabase
                .from('properties')
                .select('*')
                .eq('status', 'approved')
                .gte('created_at', twoDaysAgo.toISOString())
                .order('created_at', { ascending: false });

            if (categories.length > 0) {
                query = query.in('property_type', categories); // filtra múltiplas categorias
            }

            const { data, error } = await query;

            if (error) {
                console.error('Erro ao buscar propriedades:', error);
            } else {
                setFilteredProperties(data || []);
            }
        } catch (err) {
            console.error('Erro na busca de propriedades:', err);
        }
    };



    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };
    // Quando clica em uma categoria
    const handleCategoryToggle = (categoryName) => {
        setSelectedCategories(prev => {
            let updated;
            if (prev.includes(categoryName)) {
                // se já estava selecionada, remove
                updated = prev.filter(c => c !== categoryName);
            } else {
                // adiciona nova seleção
                updated = [...prev, categoryName];
            }

            // Atualiza imóveis após alterar categorias
            fetchPropertiesByCategories(updated);

            return updated;
        });
    };

    const renderCategory = ({ item }) => (
        <TouchableOpacity
            style={[
                styles.categoryCard,
                selectedCategories === item.name && { borderWidth: 2, borderColor: '#000' }, // destaque
            ]}
            onPress={() => handleCategoryToggle(item.name)}
        >
            <View style={[styles.categoryIcon, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={24} color="#fff" />
            </View>
            <Text style={styles.categoryName}>{item.name}</Text>
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
                    {(item.neighborhood ?? '')}{(item.neighborhood && item.city ? ', ' : '')}{(item.city ?? '')}
                </Text>
                <Text style={styles.propertyPrice}>
                    R$ {item.price?.toLocaleString('pt-BR')}
                </Text>
                <View style={styles.propertyFeatures}>
                    {item.bedrooms != null && (
                        <Text style={styles.propertyFeature}>{item.bedrooms} quartos</Text>
                    )}
                    {item.bathrooms != null && (
                        <Text style={styles.propertyFeature}>{item.bathrooms} banheiros</Text>
                    )}
                    {item.area != null && (
                        <Text style={styles.propertyFeature}>{item.area}m²</Text>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );


    return (
        <SafeAreaView style={styles.container}>
            {/* Header Amarelo com Título */}
            <View style={styles.headerContainer}>
                <View style={styles.titleContainer}>
                    <Image
                        source={require('../assets/logo_bb.jpg')}
                        style={styles.titleLogo}
                        resizeMode="contain"
                    />
                    <Text style={styles.headerTitle}>Melhores Oportunidades</Text>
                </View>
            </View>

            {/* Conteúdo Principal */}
            <View style={styles.contentContainer}>

                <FlatList
                    data={filteredProperties}
                    renderItem={renderFeaturedProperty}
                    keyExtractor={(item) => item.id.toString()}


                    ListHeaderComponent={
                        <>
                            {/* Categories */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Escolha o tipo de imóvel que procura:</Text>
                                <FlatList
                                    data={categories}
                                    renderItem={renderCategory}
                                    keyExtractor={(item) => item.id.toString()}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.categoriesList}
                                />
                            </View>
                            {/* Lista de imóveis filtrados */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>
                                    {selectedCategories.length > 0 ? `Mostrando: ${selectedCategories.join(', ')}` : 'Todos os imóveis'}
                                </Text>

                                <FlatList
                                    data={filteredProperties}
                                    renderItem={renderFeaturedProperty} // sua função de renderizar imóvel
                                    keyExtractor={(item) => item.id.toString()}
                                />
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
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffcc1e',
    },
    headerContainer: {
        paddingTop: 50,
        paddingBottom: 15,
        backgroundColor: '#ffcc1e',
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    titleLogo: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#00335e',
        textAlign: 'center',
    },
    contentContainer: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
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
        color: '#00335e',
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
        color: '#00335e',
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
        color: '#00335e',
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
        color: '#059669',
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