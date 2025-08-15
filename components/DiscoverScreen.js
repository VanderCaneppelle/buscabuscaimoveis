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
            <Text style={styles.categoryCount}>{`${item.count} imóveis`}</Text>
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
                    <Text style={styles.headerTitle}>Descobrir</Text>
                </View>
            </View>

            {/* Conteúdo Principal */}
            <View style={styles.contentContainer}>

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