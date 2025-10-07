import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { PropertyService } from '../lib/propertyService';

export default function AdBoostingScreen({ navigation }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [properties, setProperties] = useState([]);

    const loadProperties = useCallback(async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            // Buscar apenas anúncios aprovados e ativos para impulsionar
            const data = await PropertyService.getUserProperties(user.id, 'approved', true, 'active');
            setProperties(data || []);
        } catch (e) {
            console.error('Erro ao carregar propriedades para boost:', e);
            Alert.alert('Erro', 'Não foi possível carregar seus anúncios para impulsionar.');
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadProperties();
    }, [loadProperties]);

    const renderItem = ({ item }) => {
        const images = Array.isArray(item.images) ? item.images : [];
        const firstImage = images.find((uri) => typeof uri === 'string' && uri.trim())
            || 'https://via.placeholder.com/160x120?text=Imovel';

        return (
            <View style={styles.card}>
                <View style={styles.row}>
                    <View style={styles.infoCol}>
                        <View style={styles.headerRow}>
                            <Text numberOfLines={1} style={styles.title}>{item.title || 'Sem título'}</Text>
                            <Text style={styles.idText}>#{String(item.id).slice(0, 8)}</Text>
                        </View>
                        <Text numberOfLines={1} style={styles.address}>{[item.address, item.neighborhood, item.city].filter(Boolean).join(', ')}</Text>
                        <Text style={styles.price}>R$ {(item.sale_price ?? item.price ?? 0).toLocaleString('pt-BR')}</Text>
                    </View>
                    <Image
                        source={{ uri: firstImage }}
                        style={styles.thumb}
                        contentFit="cover"
                        cachePolicy="disk"
                    />
                </View>

                <TouchableOpacity
                    style={styles.boostButton}
                    onPress={() => navigation.navigate('BoostOptions', { property: item })}
                >
                    <Ionicons name="rocket" size={18} color="#fff" />
                    <Text style={styles.boostButtonText}>Impulsionar</Text>
                </TouchableOpacity>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color="#00335e" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#00335e" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Impulsionar Anúncios</Text>
                <View style={{ width: 24 }} />
            </View>

            <FlatList
                data={properties}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="alert-circle" size={48} color="#95a5a6" />
                        <Text style={styles.emptyText}>Nenhum anúncio disponível para impulsionar.</Text>
                        <Text style={styles.emptySub}>Apenas anúncios aprovados e ativos aparecem aqui.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        paddingTop: 16,
        paddingBottom: 12,
        paddingHorizontal: 16,
        backgroundColor: '#ffcc1e',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    backButton: { padding: 8 },
    headerTitle: { color: '#00335e', fontSize: 18, fontWeight: 'bold' },
    list: { padding: 16 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e9ecef',
        marginBottom: 12
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    infoCol: { flex: 1, minWidth: 0 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    title: { fontSize: 16, fontWeight: 'bold', color: '#00335e', flex: 1, marginRight: 8 },
    idText: { fontSize: 12, color: '#7f8c8d' },
    address: { fontSize: 13, color: '#7f8c8d', marginBottom: 6 },
    price: { fontSize: 16, color: '#2c3e50', fontWeight: '600', marginBottom: 12 },
    thumb: { width: 120, height: 90, borderRadius: 10, backgroundColor: '#f2f2f2' },
    boostButton: { backgroundColor: '#6c5ce7', paddingVertical: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 },
    boostButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { color: '#2c3e50', fontSize: 14, fontWeight: '600', marginTop: 10 },
    emptySub: { color: '#7f8c8d', fontSize: 12, marginTop: 4 }
});


