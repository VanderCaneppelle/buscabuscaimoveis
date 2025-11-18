import React from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import AppText from './AppText';
import { Ionicons } from '@expo/vector-icons';
import StandardHeader from './StandardHeader';

export default function InactiveAdsOptionsScreen({ route, navigation }) {
    const { validation, userId, plan } = route.params || {};

    const handleChooseOtherPlan = () => {
        navigation.goBack(); // volta para PaymentDetails
        navigation.navigate('Plans');
    };

    const handleGoToSelect = () => {
        navigation.navigate('InactiveAdsSelect', {
            userId,
            validation,
            plan
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <StandardHeader title="Anúncios Inativos" subtitle="Ação necessária" showBackButton={true} onBackPress={() => navigation.goBack()} />

            <View style={styles.content}>
                <View style={styles.infoCard}>
                    <Ionicons name="warning" size={28} color="#f39c12" />
                    <View style={styles.infoTextWrap}>
                        <AppText style={styles.title}>Seus anúncios não cabem no plano</AppText>
                        <AppText style={styles.subtitle}>
                            Você possui {validation?.inactiveAdsCount || 0} anúncios, mas o plano selecionado permite apenas {validation?.targetPlanMaxAds || 0}.
                        </AppText>
                    </View>
                </View>

                <TouchableOpacity style={styles.primaryBtn} onPress={handleGoToSelect}>
                    <Ionicons name="trash" size={20} color="#fff" />
                    <AppText style={styles.primaryBtnText}>Excluir {validation?.adsToRemove || 0} anúncio(s) e continuar</AppText>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryBtn} onPress={handleChooseOtherPlan}>
                    <Ionicons name="arrow-back-circle" size={20} color="#3498db" />
                    <AppText style={styles.secondaryBtnText}>Voltar e escolher outro plano</AppText>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    content: { flex: 1, padding: 20 },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        backgroundColor: '#fff8e6',
        borderColor: '#ffe2b3',
        borderWidth: 1,
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    infoTextWrap: { flex: 1 },
    title: { fontSize: 16, fontWeight: '700', color: '#2c3e50', marginBottom: 6 },
    subtitle: { fontSize: 14, color: '#7f8c8d', lineHeight: 20 },
    primaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#e74c3c', borderRadius: 12, padding: 16, gap: 8,
        marginBottom: 12,
    },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    secondaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#eef6fd', borderRadius: 12, padding: 14, gap: 8,
        borderWidth: 1, borderColor: '#d6e9ff'
    },
    secondaryBtnText: { color: '#3498db', fontSize: 15, fontWeight: '600' },
});


