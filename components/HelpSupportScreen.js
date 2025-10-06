import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HelpSupportScreen({ navigation }) {
    console.log('Rendered HelpSupportScreen');

    const handleEmailContact = () => {
        Linking.openURL('mailto:contato@buscabusca.com.br');
    };

    const handleWhatsAppSupport = () => {
        const phone = '5547992414450'; // Formato internacional sem caracteres especiais
        const message = 'Olá! Preciso de suporte técnico no Busca Busca Imóveis.';
        Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
    };

    const handleWhatsAppSales = () => {
        const phone = '5547997222222'; // Formato internacional sem caracteres especiais
        const message = 'Olá! Gostaria de informações sobre vendas e parcerias no Busca Busca Imóveis.';
        Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.headerContainer}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#00335e" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Ajuda e Suporte</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Conteúdo Principal */}
            <View style={styles.contentContainer}>
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                    {/* Info Card */}
                    <View style={styles.infoCard}>
                        <Ionicons name="information-circle" size={48} color="#3498db" />
                        <Text style={styles.infoTitle}>Como podemos ajudar?</Text>
                        <Text style={styles.infoText}>
                            Entre em contato conosco através dos canais abaixo. Estamos prontos para ajudá-lo!
                        </Text>
                    </View>

                    {/* Email Contact */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Contato por E-mail</Text>
                        <TouchableOpacity style={styles.contactCard} onPress={handleEmailContact}>
                            <View style={styles.contactIcon}>
                                <Ionicons name="mail" size={24} color="#fff" />
                            </View>
                            <View style={styles.contactContent}>
                                <Text style={styles.contactLabel}>E-mail</Text>
                                <Text style={styles.contactValue}>contato@buscabusca.com.br</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#7f8c8d" />
                        </TouchableOpacity>
                    </View>

                    {/* WhatsApp Contacts */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Contato via WhatsApp</Text>
                        {/* Vendas/Parcerias */}
                        <TouchableOpacity
                            style={styles.whatsappCard}
                            onPress={handleWhatsAppSales}
                        >
                            <View style={[styles.whatsappIcon, { backgroundColor: '#25D366' }]}>
                                <Ionicons name="logo-whatsapp" size={24} color="#fff" />
                            </View>
                            <View style={styles.whatsappContent}>
                                <Text style={styles.whatsappLabel}>Vendas/Parcerias</Text>
                                <Text style={styles.whatsappNumber}>(47) 99722-2222</Text>
                                <Text style={styles.whatsappDescription}>
                                    Informações sobre planos e parcerias comerciais
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#7f8c8d" />
                        </TouchableOpacity>

                        {/* Suporte Técnico */}
                        <TouchableOpacity
                            style={styles.whatsappCard}
                            onPress={handleWhatsAppSupport}
                        >
                            <View style={[styles.whatsappIcon, { backgroundColor: '#25D366' }]}>
                                <Ionicons name="logo-whatsapp" size={24} color="#fff" />
                            </View>
                            <View style={styles.whatsappContent}>
                                <Text style={styles.whatsappLabel}>Suporte Técnico</Text>
                                <Text style={styles.whatsappNumber}>(47) 99241-4450</Text>
                                <Text style={styles.whatsappDescription}>
                                    Ajuda com problemas técnicos e dúvidas
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#7f8c8d" />
                        </TouchableOpacity>

                    </View>

                    {/* FAQ Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Perguntas Frequentes</Text>

                        <View style={styles.faqCard}>
                            <Text style={styles.faqQuestion}>Como criar um anúncio?</Text>
                            <Text style={styles.faqAnswer}>
                                Acesse a aba "Anunciar" no menu inferior e siga as instruções.
                                Você precisará de um plano ativo para publicar.
                            </Text>
                        </View>

                        <View style={styles.faqCard}>
                            <Text style={styles.faqQuestion}>Como alterar meu plano?</Text>
                            <Text style={styles.faqAnswer}>
                                Vá em "Conta" → "Alterar Plano" e escolha o plano desejado.
                                Você pode alternar entre planos mensais e anuais.
                            </Text>
                        </View>

                        <View style={styles.faqCard}>
                            <Text style={styles.faqQuestion}>Meu anúncio foi recusado, por quê?</Text>
                            <Text style={styles.faqAnswer}>
                                Anúncios podem ser recusados por falta de informações, fotos inadequadas
                                ou não conformidade com nossas políticas. Entre em contato para mais detalhes.
                            </Text>
                        </View>
                    </View>

                </ScrollView>
            </View>
        </SafeAreaView>
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButton: {
        position: 'absolute',
        left: 20,
        padding: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#00335e',
    },
    placeholder: {
        width: 40,
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
    content: {
        flex: 1,
    },
    infoCard: {
        backgroundColor: '#e8f4fd',
        margin: 20,
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#00335e',
        marginTop: 10,
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#7f8c8d',
        textAlign: 'center',
        lineHeight: 20,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    contactCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 3,
    },
    contactIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#3498db',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    contactContent: {
        flex: 1,
    },
    contactLabel: {
        fontSize: 12,
        color: '#7f8c8d',
        marginBottom: 4,
    },
    contactValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
    },
    whatsappCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 3,
    },
    whatsappIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    whatsappContent: {
        flex: 1,
    },
    whatsappLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 4,
    },
    whatsappNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#25D366',
        marginBottom: 4,
    },
    whatsappDescription: {
        fontSize: 12,
        color: '#7f8c8d',
        lineHeight: 16,
    },
    faqCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 3,
    },
    faqQuestion: {
        fontSize: 15,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 8,
    },
    faqAnswer: {
        fontSize: 14,
        color: '#7f8c8d',
        lineHeight: 20,
    },
});

