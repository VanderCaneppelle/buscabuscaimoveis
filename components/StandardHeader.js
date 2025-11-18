import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from './AppText';

/**
 * Header padrão para todas as telas do app (exceto HomeScreen)
 * 
 * @param {string} title - Título principal do header
 * @param {string} subtitle - Subtítulo (opcional)
 * @param {boolean} showLogo - Se deve mostrar o logo (padrão: true)
 * @param {boolean} showBackButton - Se deve mostrar o botão de voltar (padrão: false)
 * @param {function} onBackPress - Função a ser chamada ao pressionar o botão de voltar
 */
export default function StandardHeader({
    title,
    subtitle,
    showLogo = true,
    showBackButton = false,
    onBackPress
}) {
    return (
        <View style={styles.headerContainer}>
            {/* Botão de Voltar (opcional) */}
            {showBackButton && onBackPress && (
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={onBackPress}
                >
                    <Ionicons name="arrow-back" size={24} color="#00335e" />
                </TouchableOpacity>
            )}

            <View style={styles.titleContainer}>
                {showLogo && (
                    <Image
                        source={require('../assets/logo_bb.jpg')}
                        style={styles.titleLogo}
                        resizeMode="contain"
                    />
                )}
                <AppText style={styles.headerTitle}>{title}</AppText>
            </View>
            {subtitle && (
                <AppText style={styles.headerSubtitle}>{subtitle}</AppText>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        paddingTop: 10,
        paddingBottom: 15,
        backgroundColor: '#ffcc1e',
        paddingHorizontal: 20,
        position: 'relative',
    },
    backButton: {
        position: 'absolute',
        left: 20,
        top: 15,
        zIndex: 10,
        padding: 5,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    titleLogo: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#00335e',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#00335e',
        textAlign: 'center',
        opacity: 0.8,
    },
});

