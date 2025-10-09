import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StandardHeader from './StandardHeader';
import { PlanService } from '../lib/planService';
import { PropertyService } from '../lib/propertyService';

export default function InactiveAdsSelectScreen({ route, navigation }) {
    const { userId, validation, plan } = route.params || {};
    const [ads, setAds] = useState([]);
    const [selected, setSelected] = useState([]);
    const [loading, setLoading] = useState(false);
    const required = validation?.adsToRemove || 0;

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const data = await PlanService.getInactiveAds(userId);
                setAds(data);
            } catch (e) {
                Alert.alert('Erro', 'Não foi possível carregar os anúncios inativos');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [userId]);

    const toggle = (id) => {
        setSelected(prev => {
            if (prev.includes(id)) {
                return prev.filter(x => x !== id);
            }
            if (prev.length >= required) {
                Alert.alert('Limite atingido', `Selecione exatamente ${required} anúncio(s)`);
                return prev;
            }
            return [...prev, id];
        });
    };

    const handleDelete = async () => {
        if (selected.length !== required) {
            Alert.alert('Seleção incompleta', `Selecione exatamente ${required} anúncio(s)`);
            return;
        }
        Alert.alert('Confirmar', `Excluir ${selected.length} anúncio(s)?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir', style: 'destructive', onPress: async () => {
                    try {
                        setLoading(true);
                        for (const id of selected) {
                            await PropertyService.deleteProperty(id);
                        }
                        Alert.alert('Sucesso', 'Anúncios excluídos. Prosseguindo para pagamento...', [
                            {
                                text: 'OK', onPress: () => {
                                    // voltar para PaymentDetails mantendo o plano selecionado
                                    navigation.goBack(); // sai da select
                                    navigation.goBack(); // sai da options
                                }
                            }
                        ]);
                    } catch (e) {
                        Alert.alert('Erro', 'Falha ao excluir anúncios');
                    } finally {
                        setLoading(false);
                    }
                }
            }
        ]);
    };

    const renderItem = (ad) => {
        const imageUrl = ad.images?.[0] || 'https://via.placeholder.com/80';
        const selectedFlag = selected.includes(ad.id);
        return (
            <TouchableOpacity key={ad.id} style={[styles.item, selectedFlag && styles.itemSelected]} onPress={() => toggle(ad.id)}>
                <Image source={{ uri: imageUrl }} style={styles.img} />
                <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle} numberOfLines={2}>{ad.title}</Text>
                    <Text style={styles.itemPrice}>R$ {ad.price?.toLocaleString('pt-BR')}</Text>
                    <Text style={styles.itemDate}>Criado em {new Date(ad.created_at).toLocaleDateString('pt-BR')}</Text>
                </View>
                <View style={[styles.checkbox, selectedFlag && styles.checkboxOn]}>
                    {selectedFlag && <Ionicons name="checkmark" size={18} color="#fff" />}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StandardHeader title="Excluir anúncios" subtitle={`Selecione ${required} anúncio(s)`} showBackButton={true} onBackPress={() => navigation.goBack()} />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#3498db" />
                    <Text style={styles.hint}>Carregando...</Text>
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    <View style={styles.counterBar}>
                        <Text style={styles.counterText}>{selected.length} / {required} selecionado(s)</Text>
                    </View>
                    <ScrollView style={{ flex: 1, padding: 16 }}>
                        {ads.map(renderItem)}
                    </ScrollView>
                    <View style={styles.footer}>
                        <TouchableOpacity style={[styles.deleteBtn, selected.length !== required && styles.deleteBtnDisabled]} onPress={handleDelete} disabled={selected.length !== required || loading}>
                            <Ionicons name="trash" size={20} color="#fff" />
                            <Text style={styles.deleteBtnText}>Excluir ({selected.length})</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    hint: { marginTop: 8, color: '#7f8c8d' },
    counterBar: { padding: 12, backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderBottomColor: '#eee' },
    counterText: { textAlign: 'center', fontWeight: '700', color: '#2c3e50' },
    item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 2, borderColor: '#e0e0e0', borderRadius: 12, padding: 12, marginBottom: 10 },
    itemSelected: { backgroundColor: '#e8f4fd', borderColor: '#3498db' },
    img: { width: 80, height: 80, borderRadius: 8, marginRight: 12, backgroundColor: '#f0f0f0' },
    itemTitle: { fontSize: 14, fontWeight: '600', color: '#2c3e50', marginBottom: 4 },
    itemPrice: { fontSize: 14, fontWeight: '700', color: '#27ae60' },
    itemDate: { fontSize: 12, color: '#95a5a6' },
    checkbox: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#bdc3c7', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
    checkboxOn: { backgroundColor: '#3498db', borderColor: '#3498db' },
    footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff' },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e74c3c', padding: 16, borderRadius: 12, gap: 8 },
    deleteBtnDisabled: { backgroundColor: '#bdc3c7' },
    deleteBtnText: { color: '#fff', fontWeight: '700' },
});


