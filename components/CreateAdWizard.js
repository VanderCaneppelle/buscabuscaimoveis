import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Animated,
    Dimensions,
    Platform,
    Modal,
    ActivityIndicator,
    KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useUserPlanStore } from '../stores/userPlanStore';
import { validateMediaLimitsByPlan } from '../lib/validation/mediaLimits';
import { PropertyService } from '../lib/propertyService';
import { useFocusEffect } from '@react-navigation/native';
import AppText from './AppText';

// Steps
import ProgressIndicator from './wizard/ProgressIndicator';
import Step1PropertyType from './wizard/steps/Step1PropertyType';
import Step2TransactionType from './wizard/steps/Step2TransactionType';
import Step3TitleDescription from './wizard/steps/Step3TitleDescription';
import Step4Location from './wizard/steps/Step4Location';
import Step5Characteristics from './wizard/steps/Step5Characteristics';
import Step6Pricing from './wizard/steps/Step6Pricing';
import Step7Developer from './wizard/steps/Step7Developer';
import Step8Media from './wizard/steps/Step8Media';
import Step9Review from './wizard/steps/Step9Review';

const { width } = Dimensions.get('window');
const TOTAL_STEPS = 9;

export default function CreateAdWizard({ navigation }) {
    const { user } = useAuth();
    const plan = useUserPlanStore(state => state.plan);
    const canCreateAd = useUserPlanStore(state => state.canCreateAd);
    const createAdReason = useUserPlanStore(state => state.createAdReason);
    const fetchUserPlanData = useUserPlanStore(state => state.fetchUserPlanData);
    const incrementAdCount = useUserPlanStore(state => state.incrementAdCount);

    const [currentStep, setCurrentStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showProgressModal, setShowProgressModal] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        propertyType: '',
        transactionType: '',
        title: '',
        description: '',
        address: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: '',
        latitude: null,
        longitude: null,
        bedrooms: '0',
        bathrooms: '0',
        parkingSpaces: '0',
        area: '',
        price: '',
        salePrice: '',
        developer_id: null,
    });

    const [mediaFiles, setMediaFiles] = useState([]);
    const [videoUrls, setVideoUrls] = useState([]);

    // Animation
    const slideAnim = useRef(new Animated.Value(1)).current;
    const prevStepRef = useRef(currentStep);

    // Load user plan data
    useFocusEffect(
        React.useCallback(() => {
            if (user?.id) {
                fetchUserPlanData(user.id);
            }
        }, [user?.id])
    );

    useEffect(() => {
        if (!canCreateAd) {
            setShowPlanModal(true);
        }
    }, [canCreateAd]);

    // Animation when step changes
    useEffect(() => {
        // Skip animation on first render
        if (prevStepRef.current === currentStep) {
            prevStepRef.current = currentStep;
            return;
        }
        
        prevStepRef.current = currentStep;
        
        // Reset animation value
        slideAnim.setValue(0);
        
        // Animate to visible
        Animated.spring(slideAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
        }).start();
    }, [currentStep]);

    const updateFormData = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Validation per step
    const validateStep = (step) => {
        switch (step) {
            case 1:
                if (!formData.propertyType) {
                    Alert.alert('Atenção', 'Selecione o tipo de imóvel');
                    return false;
                }
                return true;

            case 2:
                if (!formData.transactionType) {
                    Alert.alert('Atenção', 'Selecione o tipo de transação (Venda ou Aluguel)');
                    return false;
                }
                return true;

            case 3:
                if (!formData.title || formData.title.trim().length < 10) {
                    Alert.alert('Atenção', 'O título deve ter pelo menos 10 caracteres');
                    return false;
                }
                return true;

            case 4:
                if (!formData.address || !formData.city || !formData.state) {
                    Alert.alert('Atenção', 'Selecione o endereço completo do imóvel');
                    return false;
                }
                return true;

            case 5:
                // Características são opcionais, mas validamos se área é número válido
                if (formData.area && isNaN(parseFloat(formData.area))) {
                    Alert.alert('Atenção', 'A área deve ser um número válido');
                    return false;
                }
                return true;

            case 6:
                if (!formData.price) {
                    Alert.alert('Atenção', 'Informe o preço do imóvel');
                    return false;
                }
                return true;

            case 7:
                // Construtora é opcional
                return true;

            case 8:
                if (mediaFiles.length === 0) {
                    Alert.alert(
                        'Atenção',
                        'Adicione pelo menos uma foto do imóvel',
                        [
                            { text: 'Adicionar fotos', style: 'default' },
                        ]
                    );
                    return false;
                }
                return true;

            case 9:
                // Review step, sem validação adicional
                return true;

            default:
                return true;
        }
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            if (currentStep < TOTAL_STEPS) {
                setCurrentStep(currentStep + 1);
            } else {
                handleSubmit();
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        } else {
            Alert.alert(
                'Cancelar criação',
                'Deseja cancelar a criação do anúncio? Os dados não serão salvos.',
                [
                    { text: 'Continuar editando', style: 'cancel' },
                    {
                        text: 'Cancelar anúncio',
                        style: 'destructive',
                        onPress: () => navigation.goBack()
                    }
                ]
            );
        }
    };

    const handleEditStep = (step) => {
        setCurrentStep(step);
    };

    const getNumericPrice = (formattedPrice) => {
        // Remove tudo exceto números
        const numbers = formattedPrice.replace(/\D/g, '');
        // Divide por 100 porque o valor está em centavos
        return numbers ? (parseFloat(numbers) / 100).toString() : '0';
    };

    const handleSubmit = async () => {
        // Validate media limits
        const eligibilityData = {
            plan: plan,
            planName: plan?.display_name,
            planDisplayName: plan?.display_name,
            maxAds: plan?.max_ads,
            currentAds: 0,
            canCreate: true,
            reason: '',
            isExpired: false
        };

        const imagesCount = mediaFiles.length;
        const videosCount = videoUrls.length;

        const withinLimits = await validateMediaLimitsByPlan({
            imagesCount,
            videosCount,
            planInfo: eligibilityData,
        });

        if (!withinLimits) return;

        try {
            setSubmitting(true);
            setUploadProgress(0);
            setShowProgressModal(true);

            const propertyData = {
                user_id: user.id,
                ...formData,
                price: getNumericPrice(formData.price),
                salePrice: formData.salePrice ? getNumericPrice(formData.salePrice) : '0',
            };

            console.log('🏠 Dados do imóvel para salvar:', propertyData);
            console.log('📍 Coordenadas finais:', {
                latitude: propertyData.latitude,
                longitude: propertyData.longitude,
                tipo_latitude: typeof propertyData.latitude,
                tipo_longitude: typeof propertyData.longitude
            });

            const onUploadProgress = (progress) => {
                setUploadProgress(progress);
            };

            const newProperty = await PropertyService.createProperty(propertyData, mediaFiles, onUploadProgress, videoUrls);

            incrementAdCount();
            setShowProgressModal(false);

            Alert.alert(
                'Sucesso!',
                'Anúncio criado com sucesso! Aguarde a aprovação do administrador.',
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack()
                    }
                ]
            );
        } catch (error) {
            console.error('Erro ao criar anúncio:', error);
            setShowProgressModal(false);
            Alert.alert(
                'Erro',
                'Não foi possível criar o anúncio. Tente novamente.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    const renderStep = () => {
        const stepProps = {
            formData,
            updateFormData,
            onNext: handleNext,
        };

        const animatedStyle = {
            opacity: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
            }),
            transform: [{
                translateX: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                })
            }]
        };

        return (
            <Animated.View style={[styles.stepContainer, animatedStyle]}>
                {currentStep === 1 && <Step1PropertyType {...stepProps} />}
                {currentStep === 2 && <Step2TransactionType {...stepProps} />}
                {currentStep === 3 && <Step3TitleDescription {...stepProps} />}
                {currentStep === 4 && <Step4Location {...stepProps} />}
                {currentStep === 5 && <Step5Characteristics {...stepProps} />}
                {currentStep === 6 && <Step6Pricing {...stepProps} />}
                {currentStep === 7 && <Step7Developer {...stepProps} />}
                {currentStep === 8 && (
                    <Step8Media 
                        formData={formData}
                        mediaFiles={mediaFiles}
                        setMediaFiles={setMediaFiles}
                        videoUrls={videoUrls}
                        setVideoUrls={setVideoUrls}
                        plan={plan}
                    />
                )}
                {currentStep === 9 && (
                    <Step9Review 
                        formData={formData}
                        mediaFiles={mediaFiles}
                        videoUrls={videoUrls}
                        onEditStep={handleEditStep}
                    />
                )}
            </Animated.View>
        );
    };

    const getButtonText = () => {
        if (currentStep === TOTAL_STEPS) {
            return 'Publicar Anúncio';
        }
        return 'Continuar';
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={handleBack}
                >
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <AppText style={styles.headerTitle}>Novo Anúncio</AppText>
                <View style={styles.backButton} />
            </View>

            {/* Progress Indicator */}
            <ProgressIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS} />

            {/* Step Content */}
            <View style={styles.content}>
                {renderStep()}
            </View>

            {/* Navigation Buttons - Fixed Footer */}
            <View style={styles.footer}>
            {currentStep > 1 && (
                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleBack}
                >
                    <Ionicons name="chevron-back" size={20} color="#6B7280" />
                    <AppText style={styles.secondaryButtonText}>Voltar</AppText>
                </TouchableOpacity>
            )}
            <TouchableOpacity
                style={[
                    styles.primaryButton,
                    currentStep === 1 && styles.primaryButtonFull,
                    submitting && styles.primaryButtonDisabled
                ]}
                onPress={handleNext}
                disabled={submitting}
            >
                <AppText style={styles.primaryButtonText}>{getButtonText()}</AppText>
                {currentStep < TOTAL_STEPS && (
                    <Ionicons name="chevron-forward" size={20} color="#fff" />
                )}
            </TouchableOpacity>
            </View>

            {/* Plan Modal */}
            <Modal visible={showPlanModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Ionicons name="alert-circle" size={48} color="#F59E0B" />
                        <AppText style={styles.modalTitle}>Limite atingido</AppText>
                        <AppText style={styles.modalMessage}>{createAdReason}</AppText>
                        <TouchableOpacity
                            style={styles.modalButton}
                            onPress={() => {
                                setShowPlanModal(false);
                                navigation.goBack();
                            }}
                        >
                            <AppText style={styles.modalButtonText}>Entendi</AppText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Progress Modal */}
            <Modal visible={showProgressModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ActivityIndicator size="large" color="#ffcc1e" />
                        <AppText style={styles.modalTitle}>Criando anúncio...</AppText>
                        <AppText style={styles.modalMessage}>
                            {uploadProgress}% concluído
                        </AppText>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
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
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    stepContainer: {
        flex: 1,
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    secondaryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingVertical: 16,
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
        marginLeft: 6,
    },
    primaryButton: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffcc1e',
        borderRadius: 12,
        paddingVertical: 16,
    },
    primaryButtonFull: {
        flex: 1,
    },
    primaryButtonDisabled: {
        opacity: 0.6,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        marginRight: 6,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        marginTop: 16,
        marginBottom: 8,
    },
    modalMessage: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },
    modalButton: {
        backgroundColor: '#ffcc1e',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 32,
        width: '100%',
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
    },
    progressBar: {
        width: '100%',
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        overflow: 'hidden',
        marginTop: 16,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#ffcc1e',
    },
});

