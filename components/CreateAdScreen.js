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
    FlatList,
    Dimensions,
    TouchableWithoutFeedback,
    Pressable,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlanService } from '../lib/planService';
import { PropertyService } from '../lib/propertyService';
import { MediaServiceOptimized } from '../lib/mediaServiceOptimized';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

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
    const [showPropertyTypeDropdown, setShowPropertyTypeDropdown] = useState(false);
    const [showTransactionTypeDropdown, setShowTransactionTypeDropdown] = useState(false);
    const [showBedroomsDropdown, setShowBedroomsDropdown] = useState(false);
    const [showBathroomsDropdown, setShowBathroomsDropdown] = useState(false);
    const [showParkingDropdown, setShowParkingDropdown] = useState(false);
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

    // Atualizar dados sempre que a tela ganhar foco
    useFocusEffect(
        React.useCallback(() => {
            console.log('🔄 CreateAdScreen: Atualizando dados...');
            checkUserPermissions();
        }, [])
    );

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

    // Formatar preço para moeda brasileira
    const formatCurrency = (value) => {
        // Remover tudo que não é número
        const numericValue = value.replace(/\D/g, '');

        if (numericValue === '') return '';

        // Converter para número e dividir por 100 para ter centavos
        const number = parseFloat(numericValue) / 100;

        // Formatar para moeda brasileira
        return number.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2
        });
    };

    const handlePriceChange = (value) => {
        const formattedValue = formatCurrency(value);
        setFormData(prev => ({
            ...prev,
            price: formattedValue
        }));
    };

    // Extrair valor numérico do preço formatado
    const getNumericPrice = (formattedPrice) => {
        return parseFloat(formattedPrice.replace(/\D/g, '')) / 100;
    };

    // Opções para dropdowns
    const propertyTypes = [
        'Casa',
        'Apartamento',
        'Cobertura',
        'Studio',
        'Loft',
        'Sobrado',
        'Casa de Condomínio',
        'Kitnet',
        'Flat',
        'Terreno',
        'Comercial',
        'Rural'
    ];

    const transactionTypes = [
        'Venda',
        'Aluguel',
        'Temporada',
        'Permuta'
    ];

    // Opções numéricas para dropdowns (0 a 8)
    const numericOptions = Array.from({ length: 9 }, (_, i) => i.toString()); // 0 a 8

    // Função para fechar todos os dropdowns
    const closeAllDropdowns = () => {
        setShowPropertyTypeDropdown(false);
        setShowTransactionTypeDropdown(false);
        setShowBedroomsDropdown(false);
        setShowBathroomsDropdown(false);
        setShowParkingDropdown(false);
    };

    // Função para selecionar valor numérico
    const selectNumericValue = (field, value) => {
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

        const numericPrice = getNumericPrice(formData.price);
        if (isNaN(numericPrice) || numericPrice <= 0) {
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
                result = await MediaServiceOptimized.takePhoto();
            } else if (type === 'gallery') {
                result = await MediaServiceOptimized.pickImage();
            } else if (type === 'video') {
                result = await MediaServiceOptimized.pickVideo();
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
                ...formData,
                price: getNumericPrice(formData.price).toString()
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
        <View style={styles.container}>
            {/* Header Amarelo com Título */}
            <View style={styles.headerContainer}>
                <View style={styles.titleContainer}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#00335e" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Criar Anúncio</Text>
                    <View style={styles.placeholder} />
                </View>
            </View>

            {/* Conteúdo Principal */}
            <View style={styles.contentContainer}>

                <KeyboardAvoidingView
                    style={styles.keyboardView}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <TouchableWithoutFeedback onPress={closeAllDropdowns}>
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

                            {/* Form Fields - Unificado */}
                            <View style={styles.formSection}>
                                {/* Informações Básicas */}
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
                                            onChangeText={handlePriceChange}
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

                                {/* Tipo de Imóvel */}
                                <Text style={[styles.sectionTitle, styles.sectionTitleWithMargin]}>Tipo de Imóvel</Text>

                                <View style={styles.row}>
                                    <View style={[styles.inputGroup, styles.halfWidth]}>
                                        <Text style={styles.inputLabel}>Tipo *</Text>
                                        <TouchableOpacity
                                            style={styles.dropdownButton}
                                            onPress={() => {
                                                closeAllDropdowns();
                                                setShowPropertyTypeDropdown(!showPropertyTypeDropdown);
                                            }}
                                        >
                                            <Text style={[
                                                styles.dropdownButtonText,
                                                !formData.propertyType && styles.placeholderText
                                            ]}>
                                                {formData.propertyType || 'Selecione o tipo'}
                                            </Text>
                                            <Ionicons
                                                name={showPropertyTypeDropdown ? 'chevron-up' : 'chevron-down'}
                                                size={20}
                                                color="#7f8c8d"
                                            />
                                        </TouchableOpacity>

                                        {showPropertyTypeDropdown && (
                                            <View style={styles.dropdownList}>
                                                <ScrollView
                                                    style={styles.dropdownScroll}
                                                    showsVerticalScrollIndicator={true}
                                                    indicatorStyle="black"
                                                    nestedScrollEnabled={true}
                                                >
                                                    {propertyTypes.map((type, index) => (
                                                        <TouchableOpacity
                                                            key={index}
                                                            style={styles.dropdownItem}
                                                            onPress={() => {
                                                                handleInputChange('propertyType', type);
                                                                setShowPropertyTypeDropdown(false);
                                                            }}
                                                        >
                                                            <Text style={styles.dropdownItemText}>{type}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        )}
                                    </View>
                                    <View style={[styles.inputGroup, styles.halfWidth]}>
                                        <Text style={styles.inputLabel}>Transação *</Text>
                                        <TouchableOpacity
                                            style={styles.dropdownButton}
                                            onPress={() => {
                                                closeAllDropdowns();
                                                setShowTransactionTypeDropdown(!showTransactionTypeDropdown);
                                            }}
                                        >
                                            <Text style={[
                                                styles.dropdownButtonText,
                                                !formData.transactionType && styles.placeholderText
                                            ]}>
                                                {formData.transactionType || 'Selecione a transação'}
                                            </Text>
                                            <Ionicons
                                                name={showTransactionTypeDropdown ? 'chevron-up' : 'chevron-down'}
                                                size={20}
                                                color="#7f8c8d"
                                            />
                                        </TouchableOpacity>

                                        {showTransactionTypeDropdown && (
                                            <View style={styles.dropdownList}>
                                                <ScrollView
                                                    style={styles.dropdownScroll}
                                                    showsVerticalScrollIndicator={true}
                                                    indicatorStyle="black"
                                                    nestedScrollEnabled={true}
                                                >
                                                    {transactionTypes.map((type, index) => (
                                                        <TouchableOpacity
                                                            key={index}
                                                            style={styles.dropdownItem}
                                                            onPress={() => {
                                                                handleInputChange('transactionType', type);
                                                                setShowTransactionTypeDropdown(false);
                                                            }}
                                                        >
                                                            <Text style={styles.dropdownItemText}>{type}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                <View style={styles.row}>
                                    <View style={[styles.inputGroup, styles.thirdWidth]}>
                                        <Text style={styles.inputLabel}>Quartos</Text>
                                        <TouchableOpacity
                                            style={styles.dropdownButton}
                                            onPress={() => {
                                                closeAllDropdowns();
                                                setShowBedroomsDropdown(!showBedroomsDropdown);
                                            }}
                                        >
                                            <Text style={[
                                                styles.dropdownButtonText,
                                                !formData.bedrooms && styles.placeholderText
                                            ]}>
                                                {formData.bedrooms || '0'}
                                            </Text>
                                            <Ionicons
                                                name={showBedroomsDropdown ? 'chevron-up' : 'chevron-down'}
                                                size={20}
                                                color="#7f8c8d"
                                            />
                                        </TouchableOpacity>

                                        {showBedroomsDropdown && (
                                            <View style={styles.dropdownList}>
                                                <ScrollView
                                                    style={styles.dropdownScroll}
                                                    showsVerticalScrollIndicator={true}
                                                    indicatorStyle="black"
                                                    nestedScrollEnabled={true}
                                                >
                                                    {numericOptions.map((value, index) => (
                                                        <TouchableOpacity
                                                            key={index}
                                                            style={styles.dropdownItem}
                                                            onPress={() => {
                                                                selectNumericValue('bedrooms', value);
                                                                setShowBedroomsDropdown(false);
                                                            }}
                                                        >
                                                            <Text style={styles.dropdownItemText}>{value}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        )}
                                    </View>
                                    <View style={[styles.inputGroup, styles.thirdWidth]}>
                                        <Text style={styles.inputLabel}>Banheiros</Text>
                                        <TouchableOpacity
                                            style={styles.dropdownButton}
                                            onPress={() => {
                                                closeAllDropdowns();
                                                setShowBathroomsDropdown(!showBathroomsDropdown);
                                            }}
                                        >
                                            <Text style={[
                                                styles.dropdownButtonText,
                                                !formData.bathrooms && styles.placeholderText
                                            ]}>
                                                {formData.bathrooms || '0'}
                                            </Text>
                                            <Ionicons
                                                name={showBathroomsDropdown ? 'chevron-up' : 'chevron-down'}
                                                size={20}
                                                color="#7f8c8d"
                                            />
                                        </TouchableOpacity>

                                        {showBathroomsDropdown && (
                                            <View style={styles.dropdownList}>
                                                <ScrollView
                                                    style={styles.dropdownScroll}
                                                    showsVerticalScrollIndicator={true}
                                                    indicatorStyle="black"
                                                    nestedScrollEnabled={true}
                                                >
                                                    {numericOptions.map((value, index) => (
                                                        <TouchableOpacity
                                                            key={index}
                                                            style={styles.dropdownItem}
                                                            onPress={() => {
                                                                selectNumericValue('bathrooms', value);
                                                                setShowBathroomsDropdown(false);
                                                            }}
                                                        >
                                                            <Text style={styles.dropdownItemText}>{value}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        )}
                                    </View>
                                    <View style={[styles.inputGroup, styles.thirdWidth]}>
                                        <Text style={styles.inputLabel}>Vagas</Text>
                                        <TouchableOpacity
                                            style={styles.dropdownButton}
                                            onPress={() => {
                                                closeAllDropdowns();
                                                setShowParkingDropdown(!showParkingDropdown);
                                            }}
                                        >
                                            <Text style={[
                                                styles.dropdownButtonText,
                                                !formData.parkingSpaces && styles.placeholderText
                                            ]}>
                                                {formData.parkingSpaces || '0'}
                                            </Text>
                                            <Ionicons
                                                name={showParkingDropdown ? 'chevron-up' : 'chevron-down'}
                                                size={20}
                                                color="#7f8c8d"
                                            />
                                        </TouchableOpacity>

                                        {showParkingDropdown && (
                                            <View style={styles.dropdownList}>
                                                <ScrollView
                                                    style={styles.dropdownScroll}
                                                    showsVerticalScrollIndicator={true}
                                                    indicatorStyle="black"
                                                    nestedScrollEnabled={true}
                                                >
                                                    {numericOptions.map((value, index) => (
                                                        <TouchableOpacity
                                                            key={index}
                                                            style={styles.dropdownItem}
                                                            onPress={() => {
                                                                selectNumericValue('parkingSpaces', value);
                                                                setShowParkingDropdown(false);
                                                            }}
                                                        >
                                                            <Text style={styles.dropdownItemText}>{value}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* Localização */}
                                <Text style={[styles.sectionTitle, styles.sectionTitleWithMargin]}>Localização</Text>

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
                    </TouchableWithoutFeedback>
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
                                    <View style={[styles.mediaOptionIcon, { backgroundColor: '#1e3a8a' }]}>
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
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffcc1e',
    },

    headerContainer: {
        paddingTop: 60,
        paddingBottom: 15,
        backgroundColor: '#ffcc1e',
        paddingHorizontal: 20,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#00335e',
    },
    backButton: {
        position: 'absolute',
        left: 10,
        top: 10,
        zIndex: 1,
    },
    placeholder: {
        width: 40, // Adjust as needed for spacing
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
        paddingTop: 10,
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
        color: '#00335e',
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
        padding: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#00335e',
        marginBottom: 10,
    },
    sectionTitleWithMargin: {
        marginTop: 20,
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
        backgroundColor: '#1e3a8a',
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
    // Dropdown styles
    dropdownButton: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        backgroundColor: '#fff',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dropdownButtonText: {
        fontSize: 16,
        color: '#2c3e50',
        flex: 1,
    },
    placeholderText: {
        color: '#7f8c8d',
    },
    dropdownList: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        maxHeight: 200,
        zIndex: 9999,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        marginTop: 2,
        overflow: 'hidden',
    },

    dropdownScroll: {
        maxHeight: 200,
        flexGrow: 0,
    },
    dropdownItem: {
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    dropdownItemText: {
        fontSize: 16,
        color: '#2c3e50',
    },

}); 