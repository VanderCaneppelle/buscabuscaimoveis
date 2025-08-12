import React from 'react';
import { View, Button } from 'react-native';
import { useLoading } from '../contexts/LoadingContext';

const ExampleUsage = () => {
    const { showLoading, hideLoading, withLoading } = useLoading();

    // Exemplo 1: Controle manual
    const handleManualLoading = async () => {
        showLoading();
        try {
            // Simular uma operação
            await new Promise(resolve => setTimeout(resolve, 3000));
            console.log('Operação concluída!');
        } finally {
            hideLoading();
        }
    };

    // Exemplo 2: Usando withLoading (recomendado)
    const handleWithLoading = () => {
        withLoading(async () => {
            // Simular uma operação
            await new Promise(resolve => setTimeout(resolve, 3000));
            console.log('Operação concluída!');
        });
    };

    return (
        <View>
            <Button title="Loading Manual" onPress={handleManualLoading} />
            <Button title="Loading Automático" onPress={handleWithLoading} />
        </View>
    );
};

export default ExampleUsage; 