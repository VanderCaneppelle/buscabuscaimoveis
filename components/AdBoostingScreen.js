import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { PropertyService } from '../lib/propertyService';
import { BoostService } from '../lib/boostService';
import StandardHeader from './StandardHeader';
import AppText from './AppText';

export default function AdBoostingScreen({ navigation }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [properties, setProperties] = useState([]);
    const [boostedIds, setBoostedIds] = useState(new Set());

    const loadProperties = useCallback(async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            // Buscar apenas anúncios aprovados e ativos para impulsionar
            const data = await PropertyService.getUserProperties(user.id, 'approved', true, 'active');
            setProperties(data || []);

            // Buscar quais anúncios já estão impulsionados
            if (data && data.length > 0) {
                const propertyIds = data.map(p => p.id);
                const boosted = await BoostService.getBoostedPropertyIds(propertyIds);
                setBoostedIds(boosted);
            }
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

        const isBoosted = boostedIds.has(item.id);

        return (
            <View style={styles.card}>
                <View style={styles.row}>
                    <View style={styles.infoCol}>
                        <View style={styles.headerRow}>
                            <AppText numberOfLines={1} style={styles.title}>{item.title || 'Sem título'}</AppText>
                            <AppText style={styles.idText}>#{String(item.id).slice(0, 8)}</AppText>
                        </View>
                        <AppText numberOfLines={1} style={styles.address}>{[item.address, item.neighborhood, item.city].filter(Boolean).join(', ')}</AppText>
                        <AppText style={styles.price}>R$ {(item.sale_price ?? item.price ?? 0).toLocaleString('pt-BR')}</AppText>

                        {/* Badge de impulsionado */}
                        {isBoosted && (
                            <View style={styles.boostedBadge}>
                                <Ionicons name="rocket" size={12} color="#27ae60" />
                                <AppText style={styles.boostedBadgeText}>Impulsionado</AppText>
                            </View>
                        )}
                    </View>
                    <Image
                        source={{ uri: firstImage }}
                        style={styles.thumb}
                        contentFit="cover"
                        cachePolicy="disk"
                    />
                </View>

                <TouchableOpacity
                    style={[styles.boostButton, isBoosted && styles.boostButtonDisabled]}
                    onPress={() => navigation.navigate('BoostOptions', { property: item })}
                    disabled={isBoosted}
                >
                    <Ionicons name="rocket" size={18} color={isBoosted ? '#95a5a6' : '#fff'} />
                    <AppText style={[styles.boostButtonText, isBoosted && styles.boostButtonTextDisabled]}>
                        {isBoosted ? 'Já Impulsionado' : 'Impulsionar'}
                    </AppText>
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
            <StandardHeader
                title="Impulsionar Anúncios"
                subtitle="Impulse seus anúncios"
                showBackButton={true}
                onBackPress={() => navigation.goBack()}
            />

            <FlatList
                data={properties}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="alert-circle" size={48} color="#95a5a6" />
                        <AppText style={styles.emptyText}>Nenhum anúncio disponível para impulsionar.</AppText>
                        <AppText style={styles.emptySub}>Apenas anúncios aprovados e ativos aparecem aqui.</AppText>
                        <AppText style={styles.emptySub}>Se você tiver anúncios criados, acesse Anuncie - Gerenciar anúncios</AppText>
                        <View style={styles.emptyButton}>
                            <TouchableOpacity
                                style={styles.emptyButtonTouchable}
                                onPress={() => navigation.replace('MyProperties')}
                            >
                                <AppText style={styles.emptyButtonText}>Acessar Gerenciar anúncios</AppText>
                            </TouchableOpacity>
                        </View>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    emptyButton: {
        marginTop: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyButtonText: {
        color: '#fff',
        backgroundColor: '#00335e',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        fontSize: 14,
        fontWeight: '600',
    },

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
    boostedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#d4edda',
        borderColor: '#c3e6cb',
        borderWidth: 1,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginTop: 4
    },
    boostedBadgeText: { color: '#27ae60', fontSize: 11, fontWeight: '600' },
    boostButton: { backgroundColor: '#6c5ce7', paddingVertical: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 },
    boostButtonDisabled: { backgroundColor: '#e9ecef' },
    boostButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
    boostButtonTextDisabled: { color: '#95a5a6' },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { color: '#2c3e50', fontSize: 14, fontWeight: '600', marginTop: 10 },
    emptySub: { color: '#7f8c8d', fontSize: 12, marginTop: 4 },
    emptyButton: { marginTop: 20 },
    emptyButtonTouchable: {
        backgroundColor: '#6c5ce7',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 10,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    emptyButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    }
});


