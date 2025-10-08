import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    Switch,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import StandardHeader from './StandardHeader';

export default function EditProfileScreen({ navigation }) {
    console.log('Rendered EditProfileScreen');

    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState({
        phone: '',
        isRealtor: false,
        creci: '',
        companyName: '',
    });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('phone, is_realtor, creci, company_name')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            if (data) {
                setProfile({
                    phone: data.phone || '',
                    isRealtor: data.is_realtor || false,
                    creci: data.creci || '',
                    companyName: data.company_name || '',
                });
            }
        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
            Alert.alert('Erro', 'Não foi possível carregar seu perfil');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        // Validações
        if (!profile.phone) {
            Alert.alert('Erro', 'O telefone é obrigatório');
            return;
        }

        if (profile.isRealtor && !profile.creci) {
            Alert.alert('Erro', 'Para corretores, o CRECI é obrigatório');
            return;
        }

        setSaving(true);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    phone: profile.phone,
                    is_realtor: profile.isRealtor,
                    creci: profile.isRealtor ? profile.creci : null,
                    company_name: profile.isRealtor ? profile.companyName : null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (error) throw error;

            Alert.alert(
                'Sucesso!',
                'Seu perfil foi atualizado com sucesso',
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack()
                    }
                ]
            );
        } catch (error) {
            console.error('Erro ao salvar perfil:', error);
            Alert.alert('Erro', 'Não foi possível salvar as alterações');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3498db" />
                    <Text style={styles.loadingText}>Carregando perfil...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <StandardHeader
                title="Editar Perfil"
                subtitle="Mantenha seus dados atualizados"
                showBackButton={true}
                onBackPress={() => navigation.goBack()}
            />

            {/* Conteúdo Principal */}
            <View style={styles.contentContainer}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <ScrollView
                        style={styles.content}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Info Card */}
                        <View style={styles.infoCard}>
                            <Ionicons name="person-circle" size={48} color="#3498db" />
                            <Text style={styles.infoTitle}>Suas Informações</Text>
                            <Text style={styles.infoText}>
                                Atualize seus dados para melhorar sua experiência no app
                            </Text>
                        </View>

                        {/* Telefone */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Contato</Text>
                            <View style={styles.inputCard}>
                                <Text style={styles.label}>
                                    Telefone <Text style={styles.required}>*</Text>
                                </Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="call" size={20} color="#7f8c8d" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="(00) 00000-0000"
                                        placeholderTextColor="#bdc3c7"
                                        value={profile.phone}
                                        onChangeText={(text) => setProfile({ ...profile, phone: text })}
                                        keyboardType="phone-pad"
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Tipo de Usuário */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Tipo de Usuário</Text>
                            <View style={styles.switchCard}>
                                <View style={styles.switchContent}>
                                    <Ionicons name="briefcase" size={24} color="#3498db" />
                                    <View style={styles.switchTextContainer}>
                                        <Text style={styles.switchLabel}>Sou Corretor</Text>
                                        <Text style={styles.switchDescription}>
                                            {profile.isRealtor
                                                ? 'Você tem acesso a recursos profissionais'
                                                : 'Ative para acessar recursos profissionais'}
                                        </Text>
                                    </View>
                                </View>
                                <Switch
                                    value={profile.isRealtor}
                                    onValueChange={(value) => setProfile({ ...profile, isRealtor: value })}
                                    trackColor={{ false: '#bdc3c7', true: '#3498db' }}
                                    thumbColor={profile.isRealtor ? '#fff' : '#f4f3f4'}
                                />
                            </View>
                        </View>

                        {/* Campos de Corretor (condicional) */}
                        {profile.isRealtor && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Informações Profissionais</Text>

                                {/* CRECI */}
                                <View style={styles.inputCard}>
                                    <Text style={styles.label}>
                                        CRECI <Text style={styles.required}>*</Text>
                                    </Text>
                                    <View style={styles.inputContainer}>
                                        <Ionicons name="card" size={20} color="#7f8c8d" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Ex: 12345-F"
                                            placeholderTextColor="#bdc3c7"
                                            value={profile.creci}
                                            onChangeText={(text) => setProfile({ ...profile, creci: text })}
                                        />
                                    </View>
                                    <Text style={styles.hint}>
                                        Seu número de registro no CRECI
                                    </Text>
                                </View>

                                {/* Nome da Empresa */}
                                <View style={styles.inputCard}>
                                    <Text style={styles.label}>Nome da Empresa (Opcional)</Text>
                                    <View style={styles.inputContainer}>
                                        <Ionicons name="business" size={20} color="#7f8c8d" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Ex: Imobiliária XYZ"
                                            placeholderTextColor="#bdc3c7"
                                            value={profile.companyName}
                                            onChangeText={(text) => setProfile({ ...profile, companyName: text })}
                                        />
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Botão Salvar */}
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                                onPress={handleSave}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                        <Text style={styles.saveButtonText}>Salvar Alterações</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => navigation.goBack()}
                                disabled={saving}
                            >
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>

                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffcc1e',
    },

    placeholder: {
        width: 40,
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
    infoCard: {
        backgroundColor: '#e8f4fd',
        margin: 20,
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#00335e',
        marginTop: 10,
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#7f8c8d',
        textAlign: 'center',
        lineHeight: 20,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    inputCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 8,
    },
    required: {
        color: '#e74c3c',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e9ecef',
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: '#2c3e50',
    },
    hint: {
        fontSize: 12,
        color: '#7f8c8d',
        marginTop: 6,
        fontStyle: 'italic',
    },
    switchCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    switchContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 15,
    },
    switchTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    switchLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 4,
    },
    switchDescription: {
        fontSize: 12,
        color: '#7f8c8d',
        lineHeight: 16,
    },
    buttonContainer: {
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    saveButton: {
        backgroundColor: '#3498db',
        borderRadius: 12,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    saveButtonDisabled: {
        backgroundColor: '#bdc3c7',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#7f8c8d',
        fontSize: 16,
        fontWeight: '600',
    },
});

