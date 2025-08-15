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
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function FavoritesScreen({ navigation }) {
    console.log('Rendered FavoritesScreen');

    const { user } = useAuth();
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (user?.id) {

            fetchFavorites();
        }
    }, [user?.id]);

    // Sincronizar favoritos quando a tela receber foco
    useFocusEffect(
        React.useCallback(() => {
            if (user?.id) {

                fetchFavorites();
            }
        }, [user?.id])
    );

    const fetchFavorites = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('favorites')
                .select(`
                    *,
                    properties (
                        id,
                        title,
                        description,
                        price,
                        property_type,
                        transaction_type,
                        bedrooms,
                        bathrooms,
                        area,
                        address,
                        neighborhood,
                        city,
                        state,
                        images,
                        status
                    )
                `)
                .eq('user_id', user.id)
                .eq('properties.status', 'approved')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Erro ao buscar favoritos:', error);
            } else {
                setFavorites(data || []);
            }
        } catch (error) {
            console.error('Erro ao buscar favoritos:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchFavorites();
        setRefreshing(false);
    };

    const removeFavorite = async (favoriteId) => {
        try {
            const { error } = await supabase
                .from('favorites')
                .delete()
                .eq('id', favoriteId);

            if (error) {
                console.error('Erro ao remover favorito:', error);
                Alert.alert('Erro', 'Não foi possível remover dos favoritos');
            } else {
                // Atualizar lista local
                setFavorites(prev => prev.filter(fav => fav.id !== favoriteId));
            }
        } catch (error) {
            console.error('Erro ao remover favorito:', error);
            Alert.alert('Erro', 'Não foi possível remover dos favoritos');
        }
    };

    const confirmRemoveFavorite = (favoriteId, propertyTitle) => {
        Alert.alert(
            'Remover Favorito',
            `Deseja remover "${propertyTitle}" dos favoritos?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Remover', onPress: () => removeFavorite(favoriteId), style: 'destructive' }
            ]
        );
    };

    const renderFavorite = ({ item }) => {
        const property = item.properties;
        if (!property) return null;

        return (
            <View style={styles.favoriteCard}>
                <Image
                    source={{ uri: property.images?.[0] || 'https://via.placeholder.com/300x200' }}
                    style={styles.propertyImage}
                    resizeMode="cover"
                />
                <View style={styles.propertyInfo}>
                    <View style={styles.propertyHeader}>
                        <Text style={styles.propertyTitle} numberOfLines={2}>
                            {property.title}
                        </Text>
                        <TouchableOpacity
                            onPress={() => confirmRemoveFavorite(item.id, property.title)}
                            style={styles.removeButton}
                        >
                            <Ionicons name="heart-dislike" size={20} color="#e74c3c" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.propertyLocation}>
                        {property.neighborhood}, {property.city}
                    </Text>
                    <Text style={styles.propertyPrice}>
                        R$ {property.price?.toLocaleString('pt-BR')}
                    </Text>
                    <View style={styles.propertyFeatures}>
                        {property.bedrooms && property.bedrooms != null && (
                            <Text style={styles.propertyFeature}>{property.bedrooms} quartos</Text>
                        )}
                        {property.bathrooms && property.bathrooms != null && (
                            <Text style={styles.propertyFeature}>{property.bathrooms} banheiros</Text>
                        )}
                        {property.area && property.area != null && (
                            <Text style={styles.propertyFeature}>{property.area}m²</Text>
                        )}
                    </View>
                    <Text style={styles.propertyType}>
                        {property.property_type} • {property.transaction_type}
                    </Text>
                </View>
            </View>
        );
    };

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
                    <Text style={styles.headerTitle}>Favoritos</Text>
                </View>
                <Text style={styles.headerSubtitle}>
                    {favorites.length} imóvel{favorites.length !== 1 ? 'eis' : ''} favoritado{favorites.length !== 1 ? 's' : ''}
                </Text>
            </View>

            {/* Conteúdo Principal */}
            <View style={styles.contentContainer}>

                <FlatList
                    data={favorites}
                    renderItem={renderFavorite}
                    keyExtractor={(item) => item.id}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="heart-outline" size={64} color="#bdc3c7" />
                            <Text style={styles.emptyText}>Nenhum favorito ainda</Text>
                            <Text style={styles.emptySubtext}>
                                Adicione imóveis aos favoritos para vê-los aqui
                            </Text>
                            <TouchableOpacity
                                style={styles.browseButton}
                                onPress={() => navigation.navigate('Busca')}
                            >
                                <Text style={styles.browseButtonText}>Procurar Imóveis</Text>
                            </TouchableOpacity>
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
        paddingHorizontal: 20,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
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
    headerSubtitle: {
        fontSize: 16,
        color: '#00335e',
        textAlign: 'center',
        opacity: 0.8,
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
    favoriteCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginTop: 20,
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
        height: 200,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    propertyInfo: {
        padding: 15,
    },
    propertyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    propertyTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#00335e',
        flex: 1,
        marginRight: 10,
    },
    removeButton: {
        padding: 5,
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
        marginBottom: 8,
    },
    propertyFeature: {
        fontSize: 12,
        color: '#7f8c8d',
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    propertyType: {
        fontSize: 12,
        color: '#7f8c8d',
        textTransform: 'capitalize',
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
        marginBottom: 30,
    },
    browseButton: {
        backgroundColor: '#00335e',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
    },
    browseButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
}); 