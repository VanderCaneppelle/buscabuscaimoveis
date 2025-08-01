import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTermsInfo } from '../lib/termsConfig';

export default function TermsAndPrivacyScreen({ visible, onClose, type = 'terms' }) {
    const [activeTab, setActiveTab] = useState(type); // 'terms' ou 'privacy'
    const termsInfo = getTermsInfo();

    const termsContent = `
# Termos de Uso

**Versão: ${termsInfo.termsVersion} | Última atualização: ${termsInfo.termsLastUpdate}**

Bem-vindo ao aplicativo **Busca Busca Imóveis**. Ao utilizar nossos serviços, você concorda com os presentes Termos de Uso. Leia com atenção antes de utilizar a plataforma.

## 1. Objeto
O aplicativo tem como objetivo conectar anunciantes de imóveis na praia com potenciais compradores. Anúncios são realizados mediante pagamento de planos, conforme descrito dentro do aplicativo.

## 2. Cadastro e Acesso
Para utilizar os serviços como anunciante, o usuário deverá fornecer informações verdadeiras e completas, incluindo nome, telefone e foto (selfie) para validação da identidade.

## 3. Planos e Pagamentos
O usuário poderá contratar planos mensais com limites de anúncios ativos. A contratação é feita via plataforma de pagamento integrada e os valores estão sujeitos a alteração sem aviso prévio.

## 4. Publicação de Anúncios
Todos os anúncios passam por aprovação manual, para garantir a autenticidade das informações e regularidade da documentação dos imóveis. Anúncios incompletos ou com dados incorretos poderão ser recusados.

## 5. Responsabilidade do Usuário
O usuário se compromete a:
- Inserir apenas imóveis com documentação completa.
- Utilizar o app de forma ética, sem tentativa de fraudes ou golpes.
- Responder pelas informações publicadas.

## 6. Suspensão ou Exclusão de Conta
Reservamo-nos o direito de suspender ou excluir usuários que descumprirem estes termos, sem necessidade de aviso prévio.

## 7. Limitação de Responsabilidade
O Busca Busca Imóveis atua como uma vitrine de anúncios. Não nos responsabilizamos por negociações entre partes, contratos de compra e venda ou visitas agendadas.

## 8. Alterações nos Termos
Estes termos podem ser atualizados a qualquer momento. Recomendamos que o usuário consulte periodicamente.
    `;

    const privacyContent = `
# Política de Privacidade

**Versão: ${termsInfo.privacyVersion} | Última atualização: ${termsInfo.privacyLastUpdate}**

A sua privacidade é importante para nós. Esta Política explica como coletamos, usamos e protegemos suas informações.

## 1. Dados Coletados
Coletamos:
- Nome, telefone e foto (selfie)
- Informações dos imóveis anunciados
- Localização aproximada para exibir imóveis no mapa
- Dados de pagamento (processados por plataformas parceiras)

## 2. Uso das Informações
Utilizamos os dados para:
- Criar e validar seu cadastro
- Aprovar e gerenciar anúncios
- Melhorar a experiência do usuário
- Garantir segurança e autenticidade das informações

## 3. Compartilhamento
Seus dados não serão vendidos ou compartilhados com terceiros, exceto:
- Plataformas de pagamento
- Obrigações legais mediante ordem judicial

## 4. Armazenamento e Segurança
Adotamos medidas técnicas e organizacionais para proteger suas informações, incluindo criptografia, acesso restrito e backups seguros.

## 5. Seus Direitos
Você pode:
- Solicitar correção ou exclusão de seus dados
- Cancelar sua conta a qualquer momento

## 6. Cookies e Localização
Podemos coletar dados de navegação e localização para melhorar a experiência no app, mediante sua permissão.

## 7. Contato
Para dúvidas ou solicitações, entre em contato pelo WhatsApp disponível no aplicativo.
    `;

    const formatContent = (content) => {
        const elements = content
            .split('\n')
            .map((line, index) => {
                if (line.startsWith('# ')) {
                    return (
                        <Text key={index} style={styles.title}>
                            {line.replace('# ', '')}
                        </Text>
                    );
                } else if (line.startsWith('## ')) {
                    return (
                        <Text key={index} style={styles.subtitle}>
                            {line.replace('## ', '')}
                        </Text>
                    );
                } else if (line.startsWith('- ')) {
                    return (
                        <Text key={index} style={styles.listItem}>
                            • {line.replace('- ', '')}
                        </Text>
                    );
                } else if (line.trim() === '') {
                    return <View key={index} style={styles.spacing} />;
                } else {
                    return (
                        <Text key={index} style={styles.paragraph}>
                            {line}
                        </Text>
                    );
                }
            });
        
        return <>{elements}</>;
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
        >
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color="#3498db" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {activeTab === 'terms' ? 'Termos de Uso' : 'Política de Privacidade'}
                    </Text>
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'terms' && styles.activeTab]}
                            onPress={() => setActiveTab('terms')}
                        >
                            <Text style={[styles.tabText, activeTab === 'terms' && styles.activeTabText]}>
                                Termos
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'privacy' && styles.activeTab]}
                            onPress={() => setActiveTab('privacy')}
                        >
                            <Text style={[styles.tabText, activeTab === 'privacy' && styles.activeTabText]}>
                                Privacidade
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.textContainer}>
                        {formatContent(activeTab === 'terms' ? termsContent : privacyContent)}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    closeButton: {
        position: 'absolute',
        top: 15,
        right: 20,
        zIndex: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        textAlign: 'center',
        marginBottom: 15,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignItems: 'center',
    },
    activeTab: {
        backgroundColor: '#3498db',
    },
    tabText: {
        fontSize: 14,
        color: '#7f8c8d',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#fff',
    },
    content: {
        flex: 1,
    },
    textContainer: {
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 15,
        marginTop: 10,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#34495e',
        marginTop: 20,
        marginBottom: 10,
    },
    paragraph: {
        fontSize: 16,
        color: '#2c3e50',
        lineHeight: 24,
        marginBottom: 10,
    },
    listItem: {
        fontSize: 16,
        color: '#2c3e50',
        lineHeight: 24,
        marginLeft: 20,
        marginBottom: 5,
    },
    spacing: {
        height: 10,
    },
}); 