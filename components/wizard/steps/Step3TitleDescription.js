import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../../AppText';
import AppTextInput from '../../AppTextInput';

export default function Step2TitleDescription({ formData, updateFormData }) {
    const titleInputRef = useRef(null);
    const descriptionInputRef = useRef(null);
    const scrollViewRef = useRef(null);
    const insets = useSafeAreaInsets();
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        // Auto-focus no título quando entrar na tela
        setTimeout(() => {
            titleInputRef.current?.focus();
        }, 300);

        // Listener para teclado no Android
        if (Platform.OS === 'android') {
            const keyboardWillShow = Keyboard.addListener('keyboardDidShow', (e) => {
                setKeyboardHeight(e.endCoordinates.height);
            });
            const keyboardWillHide = Keyboard.addListener('keyboardDidHide', () => {
                setKeyboardHeight(0);
            });

            return () => {
                keyboardWillShow.remove();
                keyboardWillHide.remove();
            };
        }
    }, []);

    const titleLength = formData.title?.length || 0;
    const descriptionLength = formData.description?.length || 0;
    
    // Altura aproximada do footer (padding + botão + safe area)
    const footerHeight = 80 + insets.bottom;
    
    // No Android, adicionar espaço extra quando o teclado está aberto
    const extraPadding = Platform.OS === 'android' && keyboardHeight > 0 ? 20 : 0;

    return (
        <KeyboardAvoidingView 
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            enabled={Platform.OS === 'ios'}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView 
                    ref={scrollViewRef}
                    style={styles.scrollView}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: footerHeight + extraPadding }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                >
                    <View style={styles.content}>
                {/* Título */}
                <View style={styles.section}>
                    <View style={styles.labelContainer}>
                        <AppText style={styles.label}>Título do anúncio</AppText>
                        <AppText style={styles.required}>*</AppText>
                    </View>
                    <AppText style={styles.hint}>
                        Crie um título atrativo que destaque as melhores características
                    </AppText>
                    <View style={styles.inputContainer}>
                        <AppTextInput
                            ref={titleInputRef}
                            style={styles.titleInput}
                            value={formData.title}
                            onChangeText={(value) => updateFormData('title', value)}
                            placeholder="Ex: Apartamento 3 quartos com vista para o mar"
                            placeholderTextColor="#9CA3AF"
                            maxLength={100}
                            multiline
                            returnKeyType="next"
                            onSubmitEditing={() => {
                                descriptionInputRef.current?.focus();
                                // Scroll para o campo de descrição após um pequeno delay
                                setTimeout(() => {
                                    scrollViewRef.current?.scrollToEnd({ animated: true });
                                }, 100);
                            }}
                            blurOnSubmit={false}
                            submitBehavior="submit"
                        />
                        <View style={styles.characterCount}>
                            <AppText style={[
                                styles.characterCountText,
                                titleLength > 90 && styles.characterCountWarning
                            ]}>
                                {titleLength}/100
                            </AppText>
                        </View>
                    </View>

                    {/* Sugestões */}
                    {titleLength === 0 && (
                        <View style={styles.suggestionsContainer}>
                            <AppText style={styles.suggestionsTitle}>💡 Dicas para um bom título:</AppText>
                            <View style={styles.suggestionItem}>
                                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                <AppText style={styles.suggestionText}>Mencione o tipo de imóvel</AppText>
                            </View>
                            <View style={styles.suggestionItem}>
                                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                <AppText style={styles.suggestionText}>Destaque características únicas</AppText>
                            </View>
                            <View style={styles.suggestionItem}>
                                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                <AppText style={styles.suggestionText}>Inclua a localização se for atrativa</AppText>
                            </View>
                        </View>
                    )}
                </View>

                {/* Descrição */}
                <View style={styles.section}>
                    <View style={styles.labelContainer}>
                        <AppText style={styles.label}>Descrição completa</AppText>
                        <AppText style={styles.optional}>(opcional)</AppText>
                    </View>
                    <AppText style={styles.hint}>
                        Descreva detalhes importantes sobre o imóvel
                    </AppText>
                    <View style={styles.inputContainer}>
                        <AppTextInput
                            ref={descriptionInputRef}
                            style={styles.descriptionInput}
                            value={formData.description}
                            onChangeText={(value) => updateFormData('description', value)}
                            placeholder="Descreva características, acabamentos, infraestrutura do condomínio, proximidade de comércios, etc."
                            placeholderTextColor="#9CA3AF"
                            maxLength={1000}
                            multiline
                            textAlignVertical="top"
                            returnKeyType="default"
                            blurOnSubmit={false}
                            onFocus={() => {
                                // Scroll para o campo quando recebe foco
                                setTimeout(() => {
                                    scrollViewRef.current?.scrollToEnd({ animated: true });
                                }, 100);
                            }}
                        />
                        <View style={styles.characterCount}>
                            <AppText style={[
                                styles.characterCountText,
                                descriptionLength > 950 && styles.characterCountWarning
                            ]}>
                                {descriptionLength}/1000
                            </AppText>
                        </View>
                    </View>

                    {/* Sugestões de descrição */}
                    {descriptionLength === 0 && (
                        <View style={styles.suggestionsContainer}>
                            <AppText style={styles.suggestionsTitle}>📝 Inclua na descrição:</AppText>
                            <View style={styles.suggestionItem}>
                                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                <AppText style={styles.suggestionText}>Características principais</AppText>
                            </View>
                            <View style={styles.suggestionItem}>
                                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                <AppText style={styles.suggestionText}>Acabamentos e reformas</AppText>
                            </View>
                            <View style={styles.suggestionItem}>
                                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                <AppText style={styles.suggestionText}>Infraestrutura e comodidades</AppText>
                            </View>
                            <View style={styles.suggestionItem}>
                                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                <AppText style={styles.suggestionText}>Pontos de interesse próximos</AppText>
                            </View>
                        </View>
                    )}
                </View>
                    </View>
                </ScrollView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        padding: 20,
        paddingBottom: 0,
    },
    section: {
        marginBottom: 32,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    required: {
        fontSize: 18,
        fontWeight: '700',
        color: '#EF4444',
        marginLeft: 4,
    },
    optional: {
        fontSize: 14,
        color: '#9CA3AF',
        marginLeft: 6,
        fontWeight: '500',
    },
    hint: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 12,
        lineHeight: 20,
    },
    inputContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    titleInput: {
        fontSize: 16,
        color: '#1F2937',
        padding: 16,
        minHeight: 80,
        fontWeight: '500',
    },
    descriptionInput: {
        fontSize: 15,
        color: '#1F2937',
        padding: 16,
        minHeight: 160,
        lineHeight: 22,
    },
    characterCount: {
        paddingHorizontal: 16,
        paddingBottom: 12,
        alignItems: 'flex-end',
    },
    characterCountText: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    characterCountWarning: {
        color: '#F59E0B',
    },
    suggestionsContainer: {
        backgroundColor: '#F0FDF4',
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#D1FAE5',
    },
    suggestionsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#065F46',
        marginBottom: 12,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    suggestionText: {
        fontSize: 13,
        color: '#047857',
        marginLeft: 8,
        flex: 1,
    },
});

