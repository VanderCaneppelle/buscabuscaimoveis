import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Modal,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlanService } from '../lib/planService';
import { useAuth } from '../contexts/AuthContext';

export default function CreateAdScreen({ navigation, route }) {
    const { user } = useAuth();
    const [userPlanInfo, setUserPlanInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        propertyType: '',
        transactionType: '',
        bedrooms: '',
        bathrooms: '',
        parkingSpaces: '',
        area: '',
        address: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: ''
    });

    useEffect(() => {
        checkUserPermissions();
    }, []);

    const checkUserPermissions = async () => {
        try {
            setLoading(true);
            const planInfo = await PlanService.getUserPlanInfo(user.id);
            setUserPlanInfo(planInfo);

            // Se não pode criar anúncio, mostrar modal de planos
            if (!planInfo.canCreate.can_create) {
                setShowPlanModal(true);
            }
        } catch (error) {
            console.error('Erro ao verificar permissões:', error);
            Alert.alert('Erro', 'Não foi possível verificar suas permissões');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const validateForm = () => {
        const requiredFields = ['title', 'price', 'propertyType', 'transactionType', 'address', 'city', 'state'];

        for (const field of requiredFields) {
            if (!formData[field].trim()) {
                Alert.alert('Campo Obrigatório', `O campo ${field} é obrigatório`);
                return false;
            }
        }

        if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
            Alert.alert('Preço Inválido', 'Digite um preço válido');
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            setLoading(true);

            // Aqui você implementaria a lógica para salvar o anúncio
            // Por enquanto, vamos simular
            Alert.alert(
                'Sucesso!',
                'Anúncio criado com sucesso! (Simulação)',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            navigation.goBack();
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Erro ao criar anúncio:', error);
            Alert.alert('Erro', 'Não foi possível criar o anúncio');
        } finally {
            setLoading(false);
        }
    };

    const handleUpgradePlan = () => {
        setShowPlanModal(false);
        navigation.navigate('Plans', { fromAdvertise: true });
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3498db" />
                    <Text style={styles.loadingText}>Verificando permissões...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#2c3e50" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Criar Anúncio</Text>
                <View style={styles.placeholder} />
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Plan Info Card */}
                    {userPlanInfo?.plan && (
                        <View style={styles.planInfoCard}>
                            <Ionicons name="information-circle" size={20} color="#3498db" />
                            <View style={styles.planInfoContent}>
                                <Text style={styles.planInfoTitle}>
                                    Plano {userPlanInfo.plan.display_name}
                                </Text>
                                <Text style={styles.planInfoText}>
                                    {userPlanInfo.canCreate.can_create
                                        ? `${userPlanInfo.canCreate.current_ads}/${userPlanInfo.canCreate.max_ads} anúncios ativos`
                                        : userPlanInfo.canCreate.reason
                                    }
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Form Fields */}
                    <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>Informações Básicas</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Título do Anúncio *</Text>
                            <TextInput
                                style={styles.textInput}
                                value={formData.title}
                                onChangeText={(value) => handleInputChange('title', value)}
                                placeholder="Ex: Casa com 3 quartos em condomínio"
                                placeholderTextColor="#7f8c8d"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Descrição</Text>
                            <TextInput
                                style={[styles.textInput, styles.textArea]}
                                value={formData.description}
                                onChangeText={(value) => handleInputChange('description', value)}
                                placeholder="Descreva detalhes do imóvel..."
                                placeholderTextColor="#7f8c8d"
                                multiline
                                numberOfLines={4}
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, styles.halfWidth]}>
                                <Text style={styles.inputLabel}>Preço *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={formData.price}
                                    onChangeText={(value) => handleInputChange('price', value)}
                                    placeholder="R$ 0,00"
                                    placeholderTextColor="#7f8c8d"
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={[styles.inputGroup, styles.halfWidth]}>
                                <Text style={styles.inputLabel}>Área (m²)</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={formData.area}
                                    onChangeText={(value) => handleInputChange('area', value)}
                                    placeholder="0"
                                    placeholderTextColor="#7f8c8d"
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>Tipo de Imóvel</Text>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, styles.halfWidth]}>
                                <Text style={styles.inputLabel}>Tipo *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={formData.propertyType}
                                    onChangeText={(value) => handleInputChange('propertyType', value)}
                                    placeholder="Casa, Apartamento..."
                                    placeholderTextColor="#7f8c8d"
                                />
                            </View>
                            <View style={[styles.inputGroup, styles.halfWidth]}>
                                <Text style={styles.inputLabel}>Transação *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={formData.transactionType}
                                    onChangeText={(value) => handleInputChange('transactionType', value)}
                                    placeholder="Venda, Aluguel..."
                                    placeholderTextColor="#7f8c8d"
                                />
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, styles.thirdWidth]}>
                                <Text style={styles.inputLabel}>Quartos</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={formData.bedrooms}
                                    onChangeText={(value) => handleInputChange('bedrooms', value)}
                                    placeholder="0"
                                    placeholderTextColor="#7f8c8d"
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={[styles.inputGroup, styles.thirdWidth]}>
                                <Text style={styles.inputLabel}>Banheiros</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={formData.bathrooms}
                                    onChangeText={(value) => handleInputChange('bathrooms', value)}
                                    placeholder="0"
                                    placeholderTextColor="#7f8c8d"
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={[styles.inputGroup, styles.thirdWidth]}>
                                <Text style={styles.inputLabel}>Vagas</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={formData.parkingSpaces}
                                    onChangeText={(value) => handleInputChange('parkingSpaces', value)}
                                    placeholder="0"
                                    placeholderTextColor="#7f8c8d"
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>Localização</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Endereço *</Text>
                            <TextInput
                                style={styles.textInput}
                                value={formData.address}
                                onChangeText={(value) => handleInputChange('address', value)}
                                placeholder="Rua, número..."
                                placeholderTextColor="#7f8c8d"
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, styles.halfWidth]}>
                                <Text style={styles.inputLabel}>Bairro</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={formData.neighborhood}
                                    onChangeText={(value) => handleInputChange('neighborhood', value)}
                                    placeholder="Nome do bairro"
                                    placeholderTextColor="#7f8c8d"
                                />
                            </View>
                            <View style={[styles.inputGroup, styles.halfWidth]}>
                                <Text style={styles.inputLabel}>CEP</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={formData.zipCode}
                                    onChangeText={(value) => handleInputChange('zipCode', value)}
                                    placeholder="00000-000"
                                    placeholderTextColor="#7f8c8d"
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, styles.halfWidth]}>
                                <Text style={styles.inputLabel}>Cidade *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={formData.city}
                                    onChangeText={(value) => handleInputChange('city', value)}
                                    placeholder="Nome da cidade"
                                    placeholderTextColor="#7f8c8d"
                                />
                            </View>
                            <View style={[styles.inputGroup, styles.halfWidth]}>
                                <Text style={styles.inputLabel}>Estado *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={formData.state}
                                    onChangeText={(value) => handleInputChange('state', value)}
                                    placeholder="UF"
                                    placeholderTextColor="#7f8c8d"
                                />
                            </View>
                        </View>
                    </View>

                    {/* Submit Button */}
                    <View style={styles.submitSection}>
                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                !userPlanInfo?.canCreate.can_create && styles.disabledButton
                            ]}
                            onPress={handleSubmit}
                            disabled={!userPlanInfo?.canCreate.can_create || loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.submitButtonText}>Criar Anúncio</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Plan Upgrade Modal */}
            <Modal
                visible={showPlanModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowPlanModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalIcon}>
                            <Ionicons name="lock-closed" size={48} color="#e74c3c" />
                        </View>
                        <Text style={styles.modalTitle}>Plano Necessário</Text>
                        <Text style={styles.modalText}>
                            Para criar anúncios, você precisa de um plano pago.
                            {userPlanInfo?.canCreate.reason && `\n\n${userPlanInfo.canCreate.reason}`}
                        </Text>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={() => setShowPlanModal(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalConfirmButton}
                                onPress={handleUpgradePlan}
                            >
                                <Text style={styles.modalConfirmText}>Ver Planos</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    placeholder: {
        width: 34,
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#7f8c8d',
    },
    planInfoCard: {
        backgroundColor: '#e8f4fd',
        margin: 20,
        borderRadius: 12,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
    },
    planInfoContent: {
        marginLeft: 15,
        flex: 1,
    },
    planInfoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 2,
    },
    planInfoText: {
        fontSize: 14,
        color: '#7f8c8d',
    },
    formSection: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 15,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 8,
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        color: '#2c3e50',
        backgroundColor: '#fff',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
        gap: 15,
    },
    halfWidth: {
        flex: 1,
    },
    thirdWidth: {
        flex: 1,
    },
    submitSection: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    submitButton: {
        backgroundColor: '#3498db',
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#bdc3c7',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 30,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },
    modalIcon: {
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 15,
        textAlign: 'center',
    },
    modalText: {
        fontSize: 16,
        color: '#7f8c8d',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 25,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 15,
        width: '100%',
    },
    modalCancelButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#e74c3c',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalCancelText: {
        color: '#e74c3c',
        fontSize: 16,
        fontWeight: '600',
    },
    modalConfirmButton: {
        flex: 1,
        backgroundColor: '#3498db',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalConfirmText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
}); 