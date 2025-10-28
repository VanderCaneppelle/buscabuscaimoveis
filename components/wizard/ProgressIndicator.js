import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ProgressIndicator({ currentStep, totalSteps }) {
    const progress = (currentStep / totalSteps) * 100;

    return (
        <View style={styles.container}>
            <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.stepText}>Passo {currentStep} de {totalSteps}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#fff',
    },
    progressBarContainer: {
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#ffcc1e',
        borderRadius: 2,
    },
    stepText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
        textAlign: 'center',
    },
});

