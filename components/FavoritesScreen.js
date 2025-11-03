import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    RefreshControl,
    Alert,
    Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useFavoritesStore } from '../stores/favoritesStore';
import StandardHeader from './StandardHeader';
import PropertyCard from './PropertyCard';

const { width } = Dimensions.get('window');

export default function FavoritesScreen({ navigation }) {
    console.log('Rendered FavoritesScreen');

    const { user } = useAuth();
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Zustand
    const toggleFavorite = useFavoritesStore(state => state.toggleFavorite);
    const isFavorite = useFavoritesStore(state => state.isFavorite);
    const favoritesStore = useFavoritesStore(state => state.favorites); // ✨ NOVO - Observar mudanças

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

    // ✨ NOVO: Atualizar com Realtime - Remove favoritos automaticamente
    useEffect(() => {
        if (!user?.id) return;

        console.log('🔴 [FavoritesScreen] Configurando Realtime para userId:', user.id.substring(0, 8));

        // Inscrever para mudanças nos favoritos do usuário
        const channel = supabase
            .channel('favorites-screen-sync')
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'favorites',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('🗑️ [FavoritesScreen] Favorito REMOVIDO via Realtime:', payload.old.property_id);
                    
                    // Remover da lista local
                    setFavorites(prev => 
                        prev.filter(fav => fav.property_id !== payload.old.property_id)
                    );
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'favorites',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('🔔 [FavoritesScreen] Favorito ADICIONADO via Realtime:', payload.new.property_id);
                    
                    // Recarregar favoritos para pegar os dados do imóvel
                    fetchFavorites();
                }
            )
            .subscribe((status) => {
                console.log('📡 [FavoritesScreen] Status Realtime:', status);
            });

        // Cleanup ao desmontar
        return () => {
            console.log('🔴 [FavoritesScreen] Desconectando Realtime');
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

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
                        sale_price,
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
                        status,
                        ad_status
                    )
                `)
                .eq('user_id', user.id)
                .eq('properties.status', 'approved')
                .eq('properties.ad_status', 'active') // ✨ NOVO - Filtrar apenas ativos
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

    const handleUnfavoriteLocal = useCallback((propertyId) => {
        // Remove o item da lista local quando deixar de ser favorito
        setFavorites(prev => prev.filter(fav => fav.properties?.id !== propertyId));
    }, []);

    // Render usando o mesmo card da HomeScreen
    const PropertyItem = React.memo(({ item }) => {
        const property = item.properties;
        if (!property) return null;
        const onPress = () => {
            const parent = navigation.getParent && navigation.getParent();
            const root = parent && parent.getParent ? parent.getParent() : null;
            if (root && root.navigate) {
                root.navigate('PropertyDetails', { property });
            } else {
                navigation.navigate('PropertyDetails', { property });
            }
        };
        return <PropertyCard property={property} navigation={navigation} onPress={onPress} />;
    });

    const renderFavorite = useCallback(({ item, index }) => {
        return (
            <PropertyItem item={item} />
        );
    }, [navigation, handleUnfavoriteLocal]);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header Padrão */}
            <StandardHeader
                title="Favoritos"
                subtitle={`${favorites.length} imóv${favorites.length > 1 ? 'eis' : 'el'} favoritado${favorites.length !== 1 ? 's' : ''}`}
                showBackButton={false}
                onBackPress={() => navigation.goBack()}
            />

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
        paddingTop: 15,
    },
    listContainer: {
        paddingBottom: 20,
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