import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function ImportingMediaModal({ visible, mediaCount = 0 }) {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="images" size={48} color="#3498db" />
                        <View style={styles.loadingBadge}>
                            <ActivityIndicator size="small" color="#fff" />
                        </View>
                    </View>

                    <Text style={styles.title}>Importando Mídias</Text>
                    
                    {mediaCount > 0 && (
                        <Text style={styles.subtitle}>
                            Processando {mediaCount} {mediaCount === 1 ? 'arquivo' : 'arquivos'}...
                        </Text>
                    )}

                    <Text style={styles.message}>
                        Por favor, aguarde um momento
                    </Text>

                    <View style={styles.loadingBar}>
                        <View style={styles.loadingBarFill} />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 30,
        width: width * 0.85,
        maxWidth: 400,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    iconContainer: {
        position: 'relative',
        marginBottom: 20,
    },
    loadingBadge: {
        position: 'absolute',
        bottom: -5,
        right: -5,
        backgroundColor: '#3498db',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#2c3e50',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#3498db',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        color: '#7f8c8d',
        textAlign: 'center',
        marginBottom: 20,
    },
    loadingBar: {
        width: '100%',
        height: 4,
        backgroundColor: '#ecf0f1',
        borderRadius: 2,
        overflow: 'hidden',
    },
    loadingBarFill: {
        height: '100%',
        backgroundColor: '#3498db',
        borderRadius: 2,
        width: '70%',
        // Animação de progresso indeterminado seria ideal, mas por simplicidade deixei fixo
    },
});

