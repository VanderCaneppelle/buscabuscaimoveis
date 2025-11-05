import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Step2TitleDescription({ formData, updateFormData }) {
    const titleInputRef = useRef(null);
    const descriptionInputRef = useRef(null);

    useEffect(() => {
        // Auto-focus no título quando entrar na tela
        setTimeout(() => {
            titleInputRef.current?.focus();
        }, 300);
    }, []);

    const titleLength = formData.title?.length || 0;
    const descriptionLength = formData.description?.length || 0;

    return (
        <KeyboardAvoidingView 
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 180 : 20}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView 
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.content}>
                {/* Título */}
                <View style={styles.section}>
                    <View style={styles.labelContainer}>
                        <Text style={styles.label}>Título do anúncio</Text>
                        <Text style={styles.required}>*</Text>
                    </View>
                    <Text style={styles.hint}>
                        Crie um título atrativo que destaque as melhores características
                    </Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            ref={titleInputRef}
                            style={styles.titleInput}
                            value={formData.title}
                            onChangeText={(value) => updateFormData('title', value)}
                            placeholder="Ex: Apartamento 3 quartos com vista para o mar"
                            placeholderTextColor="#9CA3AF"
                            maxLength={100}
                            multiline
                            returnKeyType="next"
                            onSubmitEditing={() => descriptionInputRef.current?.focus()}
                            blurOnSubmit={false}
                            submitBehavior="submit"
                        />
                        <View style={styles.characterCount}>
                            <Text style={[
                                styles.characterCountText,
                                titleLength > 90 && styles.characterCountWarning
                            ]}>
                                {titleLength}/100
                            </Text>
                        </View>
                    </View>

                    {/* Sugestões */}
                    {titleLength === 0 && (
                        <View style={styles.suggestionsContainer}>
                            <Text style={styles.suggestionsTitle}>💡 Dicas para um bom título:</Text>
                            <View style={styles.suggestionItem}>
                                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                <Text style={styles.suggestionText}>Mencione o tipo de imóvel</Text>
                            </View>
                            <View style={styles.suggestionItem}>
                                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                <Text style={styles.suggestionText}>Destaque características únicas</Text>
                            </View>
                            <View style={styles.suggestionItem}>
                                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                <Text style={styles.suggestionText}>Inclua a localização se for atrativa</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Descrição */}
                <View style={styles.section}>
                    <View style={styles.labelContainer}>
                        <Text style={styles.label}>Descrição completa</Text>
                        <Text style={styles.optional}>(opcional)</Text>
                    </View>
                    <Text style={styles.hint}>
                        Descreva detalhes importantes sobre o imóvel
                    </Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            ref={descriptionInputRef}
                            style={styles.descriptionInput}
                            value={formData.description}
                            onChangeText={(value) => updateFormData('description', value)}
                            placeholder="Descreva características, acabamentos, infraestrutura do condomínio, proximidade de comércios, etc."
                            placeholderTextColor="#9CA3AF"
                            maxLength={1000}
                            multiline
                            textAlignVertical="top"
                            returnKeyType="done"
                            blurOnSubmit={true}
                            submitBehavior="blurAndSubmit"
                        />
                        <View style={styles.characterCount}>
                            <Text style={[
                                styles.characterCountText,
                                descriptionLength > 950 && styles.characterCountWarning
                            ]}>
                                {descriptionLength}/1000
                            </Text>
                        </View>
                    </View>

                    {/* Sugestões de descrição */}
                    {descriptionLength === 0 && (
                        <View style={styles.suggestionsContainer}>
                            <Text style={styles.suggestionsTitle}>📝 Inclua na descrição:</Text>
                            <View style={styles.suggestionItem}>
                                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                <Text style={styles.suggestionText}>Características principais</Text>
                            </View>
                            <View style={styles.suggestionItem}>
                                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                <Text style={styles.suggestionText}>Acabamentos e reformas</Text>
                            </View>
                            <View style={styles.suggestionItem}>
                                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                <Text style={styles.suggestionText}>Infraestrutura e comodidades</Text>
                            </View>
                            <View style={styles.suggestionItem}>
                                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                <Text style={styles.suggestionText}>Pontos de interesse próximos</Text>
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
        paddingBottom: 120,
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

