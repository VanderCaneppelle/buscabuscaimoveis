import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    SafeAreaView,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

export default function VideoUploadTestScreen({ navigation }) {
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState('');

    const testAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session ? `Usuário logado: ${session.user.email}` : 'Usuário não está logado';
    };

    const testVideoCapture = async () => {
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: true,
            aspect: [9, 16],
            quality: 0.8,
            videoMaxDuration: 10,
        });

        if (!result.canceled && result.assets[0]) {
            return result.assets[0].uri;
        } else {
            throw new Error('Captura cancelada pelo usuário');
        }
    };

    const testUpload = async (uri) => {
        try {
            setUploadResult('⏳ Iniciando upload...');

            const fileName = `test-video-${Date.now()}.mp4`;

            // Pega o blob correto do arquivo local
            const response = await fetch(uri);
            const blob = await response.blob();

            const { data, error } = await supabase.storage
                .from('stories')
                .upload(fileName, blob, {
                    contentType: 'video/mp4',
                    cacheControl: '3600'
                });

            if (error) {
                setUploadResult(`❌ Erro no upload: ${error.message}`);
                return null;
            }

            setUploadResult(`✅ Upload concluído: ${data.path}`);




            return data.path;
        } catch (error) {
            setUploadResult(`❌ Erro inesperado: ${error.message}`);
            return null;
        }
    };

    const runTest = async () => {
        setUploading(true);
        setUploadResult('');

        try {
            const authStatus = await testAuth();
            const videoUri = await testVideoCapture();
            await testUpload(videoUri);
            setUploadResult(prev => `✅ ${authStatus}\n${prev}`);
        } catch (error) {
            setUploadResult(`❌ Erro: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Teste de Upload de Vídeo</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <TouchableOpacity
                    style={[styles.testButton, uploading && styles.disabledButton]}
                    onPress={runTest}
                    disabled={uploading}
                >
                    {uploading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="play" size={20} color="#fff" />
                            <Text style={styles.buttonText}>Executar Teste</Text>
                        </>
                    )}
                </TouchableOpacity>

                {uploadResult ? (
                    <View style={styles.resultContainer}>
                        <Text style={styles.resultText}>{uploadResult}</Text>
                    </View>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e3a8a' },
    content: { flexGrow: 1, padding: 20, justifyContent: 'center', gap: 20 },
    testButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e3a8a', padding: 15, borderRadius: 8, gap: 10 },
    disabledButton: { backgroundColor: '#64748b' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    resultContainer: { marginTop: 20, backgroundColor: '#fff', padding: 15, borderRadius: 8 },
    resultText: { color: '#2c3e50', fontSize: 14 },
});
