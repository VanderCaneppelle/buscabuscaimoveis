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
    Platform,
    Image,
    FlatList,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlanService } from '../lib/planService';
import { PropertyService } from '../lib/propertyService';
import { MediaService } from '../lib/mediaService';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function CreateAdScreen({ navigation, route }) {
    const { user } = useAuth();
    const [userPlanInfo, setUserPlanInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [showMediaModal, setShowMediaModal] = useState(false);
    const [mediaFiles, setMediaFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showProgressModal, setShowProgressModal] = useState(false);
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
                const fieldNames = {
                    title: 'Título',
                    price: 'Preço',
                    propertyType: 'Tipo de Imóvel',
                    transactionType: 'Tipo de Transação',
                    address: 'Endereço',
                    city: 'Cidade',
                    state: 'Estado'
                };
                Alert.alert('Campo Obrigatório', `O campo "${fieldNames[field]}" é obrigatório`);
                return false;
            }
        }

        if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
            Alert.alert('Preço Inválido', 'Digite um preço válido');
            return false;
        }

        // Verificar se há arquivos muito grandes
        const maxSizeMB = 50;
        const largeFiles = mediaFiles.filter(file => file.fileSize > maxSizeMB * 1024 * 1024);

        if (largeFiles.length > 0) {
            const fileNames = largeFiles.map(file => file.fileName || 'Arquivo').join(', ');
            Alert.alert(
                'Arquivos Muito Grandes',
                `Os seguintes arquivos excedem o limite de ${maxSizeMB}MB: ${fileNames}. Por favor, remova-os antes de criar o anúncio.`
            );
            return false;
        }

        return true;
    };

    const handleAddMedia = async (type) => {
        try {
            let result = null;

            if (type === 'camera') {
                result = await MediaService.takePhoto();
            } else if (type === 'gallery') {
                result = await MediaService.pickImage();
            } else if (type === 'video') {
                result = await MediaService.pickVideo();
            }

            if (result) {
                // Verificar tamanho do arquivo
                const fileSizeMB = (result.fileSize / 1024 / 1024).toFixed(2);
                const maxSizeMB = 50;

                // Bloquear arquivos maiores que 50MB
                if (result.fileSize > maxSizeMB * 1024 * 1024) {
                    Alert.alert(
                        'Arquivo Muito Grande',
                        `Este arquivo tem ${fileSizeMB}MB e excede o limite de ${maxSizeMB}MB. Por favor, escolha um arquivo menor ou reduza a qualidade.`,
                        [{ text: 'OK' }]
                    );
                    return; // Não adicionar o arquivo
                }

                // Se arquivo for maior que 25MB, mostrar aviso mas permitir
                if (result.fileSize > 25 * 1024 * 1024) {
                    Alert.alert(
                        'Arquivo Grande',
                        `Este arquivo tem ${fileSizeMB}MB. Arquivos grandes podem demorar mais para fazer upload. Deseja continuar?`,
                        [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                                text: 'Continuar',
                                onPress: () => {
                                    setMediaFiles(prev => [...prev, {
                                        uri: result.uri,
                                        type: result.type || 'image',
                                        fileName: result.fileName || `media_${Date.now()}`,
                                        fileSize: result.fileSize || 0
                                    }]);
                                }
                            }
                        ]
                    );
                } else {
                    setMediaFiles(prev => [...prev, {
                        uri: result.uri,
                        type: result.type || 'image',
                        fileName: result.fileName || `media_${Date.now()}`,
                        fileSize: result.fileSize || 0
                    }]);
                }
            }
        } catch (error) {
            console.error('Erro ao adicionar mídia:', error);

            // Verificar se é erro de arquivo muito grande
            if (error.message && error.message.includes('muito grande')) {
                Alert.alert(
                    'Arquivo Muito Grande',
                    'Este arquivo excede o limite de 50MB. Por favor, escolha um arquivo menor ou reduza a qualidade.',
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert('Erro', 'Não foi possível adicionar a mídia. Tente novamente.');
            }
        }
        setShowMediaModal(false);
    };

    const handleRemoveMedia = (index) => {
        Alert.alert(
            'Remover Mídia',
            'Deseja remover esta mídia?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Remover',
                    style: 'destructive',
                    onPress: () => {
                        setMediaFiles(prev => prev.filter((_, i) => i !== index));
                    }
                }
            ]
        );
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            setSubmitting(true);
            setUploadProgress(0);
            setShowProgressModal(true);

            const propertyData = {
                user_id: user.id,
                ...formData
            };

            // Callback para atualizar progresso
            const onUploadProgress = (progress) => {
                setUploadProgress(progress);
            };

            const newProperty = await PropertyService.createProperty(propertyData, mediaFiles, onUploadProgress);

            setShowProgressModal(false);
            Alert.alert(
                'Sucesso!',
                'Anúncio criado com sucesso! Aguarde a aprovação do administrador.',
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
            setShowProgressModal(false);

            // Verificar tipo de erro para mostrar mensagem específica
            if (error.message && error.message.includes('muito grande')) {
                Alert.alert(
                    'Arquivo Muito Grande',
                    'Um dos arquivos excede o limite de 50MB. Por favor, remova arquivos grandes e tente novamente.',
                    [{ text: 'OK' }]
                );
            } else if (error.message && error.message.includes('plano ativo')) {
                Alert.alert(
                    'Plano Necessário',
                    'Você precisa de um plano ativo para criar anúncios. Verifique suas permissões.',
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert('Erro', 'Não foi possível criar o anúncio. Verifique sua conexão e tente novamente.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpgradePlan = () => {
        setShowPlanModal(false);
        navigation.navigate('Plans', { fromAdvertise: true });
    };

    const renderMediaItem = ({ item, index }) => {
        const fileSizeMB = (item.fileSize / 1024 / 1024).toFixed(1);
        const isLargeFile = item.fileSize > 25 * 1024 * 1024; // > 25MB

        return (
            <View style={styles.mediaItem}>
                <Image source={{ uri: item.uri }} style={styles.mediaThumbnail} />
                <TouchableOpacity
                    style={styles.removeMediaButton}
                    onPress={() => handleRemoveMedia(index)}
                >
                    <Ionicons name="close-circle" size={24} color="#e74c3c" />
                </TouchableOpacity>

                {/* Indicador de tipo de mídia */}
                {item.type === 'video' && (
                    <View style={styles.videoIndicator}>
                        <Ionicons name="play" size={16} color="#fff" />
                    </View>
                )}

                {/* Indicador de tamanho do arquivo */}
                <View style={[styles.fileSizeIndicator, isLargeFile && styles.largeFileIndicator]}>
                    <Text style={[styles.fileSizeText, isLargeFile && styles.largeFileText]}>
                        {fileSizeMB}MB
                    </Text>
                </View>
            </View>
        );
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

                    {/* Media Section */}
                    <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>Fotos e Vídeos</Text>
                        <Text style={styles.sectionSubtitle}>
                            Adicione fotos e vídeos do seu imóvel (máximo 10 arquivos, 50MB cada)
                        </Text>

                        {mediaFiles.length > 0 && (
                            <FlatList
                                data={mediaFiles}
                                renderItem={renderMediaItem}
                                keyExtractor={(item, index) => index.toString()}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.mediaList}
                            />
                        )}

                        {mediaFiles.length < 10 && (
                            <TouchableOpacity
                                style={styles.addMediaButton}
                                onPress={() => setShowMediaModal(true)}
                            >
                                <Ionicons name="add" size={24} color="#3498db" />
                                <Text style={styles.addMediaText}>Adicionar Mídia</Text>
                            </TouchableOpacity>
                        )}

                        {mediaFiles.length >= 10 && (
                            <Text style={styles.mediaLimitText}>
                                Limite máximo de 10 arquivos atingido
                            </Text>
                        )}
                    </View>

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
                                (!userPlanInfo?.canCreate.can_create || submitting) && styles.disabledButton
                            ]}
                            onPress={handleSubmit}
                            disabled={!userPlanInfo?.canCreate.can_create || submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.submitButtonText}>Criar Anúncio</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Media Selection Modal */}
            <Modal
                visible={showMediaModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowMediaModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.mediaModalContent}>
                        <View style={styles.mediaModalHeader}>
                            <Text style={styles.mediaModalTitle}>Adicionar Mídia</Text>
                            <TouchableOpacity onPress={() => setShowMediaModal(false)}>
                                <Ionicons name="close" size={24} color="#2c3e50" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.mediaOptions}>
                            <TouchableOpacity
                                style={styles.mediaOption}
                                onPress={() => handleAddMedia('camera')}
                            >
                                <View style={[styles.mediaOptionIcon, { backgroundColor: '#3498db' }]}>
                                    <Ionicons name="camera" size={32} color="#fff" />
                                </View>
                                <Text style={styles.mediaOptionText}>Tirar Foto</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.mediaOption}
                                onPress={() => handleAddMedia('gallery')}
                            >
                                <View style={[styles.mediaOptionIcon, { backgroundColor: '#2ecc71' }]}>
                                    <Ionicons name="images" size={32} color="#fff" />
                                </View>
                                <Text style={styles.mediaOptionText}>Galeria</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.mediaOption}
                                onPress={() => handleAddMedia('video')}
                            >
                                <View style={[styles.mediaOptionIcon, { backgroundColor: '#e74c3c' }]}>
                                    <Ionicons name="videocam" size={32} color="#fff" />
                                </View>
                                <Text style={styles.mediaOptionText}>Vídeo</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

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

            {/* Progress Modal */}
            <Modal
                visible={showProgressModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => { }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalIcon}>
                            <Ionicons name="cloud-upload" size={48} color="#3498db" />
                        </View>

                        <Text style={styles.modalTitle}>Enviando Mídias</Text>
                        <Text style={styles.modalText}>
                            Aguarde enquanto suas mídias são enviadas...
                        </Text>

                        {/* Progress Bar */}
                        <View style={styles.progressContainer}>
                            <View style={styles.progressBar}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        { width: `${uploadProgress}%` }
                                    ]}
                                />
                            </View>
                            <Text style={styles.progressText}>{uploadProgress}%</Text>
                        </View>

                        <ActivityIndicator size="large" color="#3498db" style={{ marginTop: 20 }} />
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
        marginBottom: 10,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 15,
    },
    mediaList: {
        marginBottom: 15,
    },
    mediaItem: {
        marginRight: 10,
        position: 'relative',
    },
    mediaThumbnail: {
        width: 80,
        height: 80,
        borderRadius: 8,
    },
    removeMediaButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#fff',
        borderRadius: 12,
    },
    videoIndicator: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addMediaButton: {
        borderWidth: 2,
        borderColor: '#3498db',
        borderStyle: 'dashed',
        borderRadius: 8,
        padding: 20,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    addMediaText: {
        color: '#3498db',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    mediaLimitText: {
        color: '#e74c3c',
        fontSize: 14,
        textAlign: 'center',
        fontStyle: 'italic',
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
    mediaModalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        width: '100%',
        maxWidth: 400,
    },
    mediaModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    mediaModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    mediaOptions: {
        padding: 20,
    },
    mediaOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    mediaOptionIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    mediaOptionText: {
        fontSize: 16,
        color: '#2c3e50',
        fontWeight: '500',
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
    fileSizeIndicator: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    largeFileIndicator: {
        backgroundColor: 'rgba(231, 76, 60, 0.9)',
    },
    fileSizeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
    },
    largeFileText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
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
    progressContainer: {
        width: '100%',
        marginBottom: 20,
    },
    progressBar: {
        width: '100%',
        height: 8,
        backgroundColor: '#ecf0f1',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 10,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#3498db',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
        color: '#2c3e50',
        textAlign: 'center',
        fontWeight: '600',
    },
}); 