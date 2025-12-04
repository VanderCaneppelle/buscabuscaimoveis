import React from 'react';
import {
    View,
    StyleSheet,
    Modal,
    TouchableOpacity,
} from 'react-native';
import AppText from "../AppText";
import { Ionicons } from '@expo/vector-icons';

export default function SignupSuccessModal({ visible, onClose, onGoToLogin }) {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>

                    {/* Header */}
                    <View style={styles.header}>
                        <AppText style={styles.title}>Conta criada!</AppText>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={28} color="#666" />
                        </TouchableOpacity>
                    </View>

                    {/* Mensagem */}
                    <View style={styles.content}>
                        <Ionicons name="checkmark-circle" size={70} color="#28a745" />
                        <AppText style={styles.message}>
                            Seu cadastro foi concluído com sucesso.  
                            Agora você já pode fazer login normalmente.
                        </AppText>
                    </View>

                    {/* Botão */}
                    <TouchableOpacity
                        style={styles.button}
                        onPress={onGoToLogin}
                    >
                        <AppText style={styles.buttonText}>Voltar para Login</AppText>
                    </TouchableOpacity>

                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: '#fff',
        width: '100%',
        maxWidth: 400,
        borderRadius: 20,
        paddingBottom: 25,
        overflow: 'hidden'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#00335e',
    },
    closeButton: {
        padding: 5,
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 30,
    },
    message: {
        marginTop: 15,
        fontSize: 16,
        textAlign: 'center',
        color: '#333',
    },
    button: {
        backgroundColor: '#00335e',
        marginHorizontal: 20,
        marginTop: 15,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
