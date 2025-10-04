import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';

// Habilitar react-native-screens para melhor performance
enableScreens();
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { AdminProvider } from './contexts/AdminContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import LoginScreen from './components/LoginScreen';
import MainNavigator from './components/MainNavigator';

import ResetPasswordScreen from './components/ResetPasswordScreen';
import TermsAcceptanceCheck from './components/TermsAcceptanceCheck';
import * as Linking from 'expo-linking';
import { PushNotificationService } from './lib/pushNotificationService';

const Stack = createStackNavigator();

function AppContent() {
  const { user, loading } = useAuth();
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const navigationRef = useRef(null);

  // Debug: Log do estado de autenticação
  useEffect(() => {
    console.log('AppContent - Estado atual:', { user: user?.email, loading });
  }, [user, loading]);

  useEffect(() => {
    // Verificar se o app foi aberto através de um deep link
    const checkInitialURL = async () => {
      try {
        const initialURL = await Linking.getInitialURL();
        console.log('Initial URL:', initialURL);
        if (initialURL && (initialURL.includes('reset-password') || initialURL.includes('type=recovery'))) {
          setIsResetPassword(true);
        }
      } catch (error) {
        console.log('Error checking initial URL:', error);
      }
    };

    checkInitialURL();

    // Escutar mudanças de URL
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('URL changed:', event.url);
      if (event.url && (event.url.includes('reset-password') || event.url.includes('type=recovery'))) {
        setIsResetPassword(true);
      } else if (event.url && event.url.includes('payment-confirmation')) {
        console.log('🎉 Deep link de confirmação de pagamento recebido');
        // O usuário será redirecionado para a PaymentConfirmationScreen
        // onde poderá ver a contagem regressiva e status do pagamento
      }
    });

    return () => subscription?.remove();
  }, []);

  // Configurar navegação por notificação push
  useEffect(() => {
    if (!user) return; // Só configurar se usuário estiver logado

    const handleNotificationResponse = (response) => {
      console.log('📱 Notificação clicada:', response);

      const data = response.notification.request.content.data;
      const type = data?.type;

      if (!navigationRef.current) {
        console.log('⚠️ Navigation ref não disponível ainda');
        return;
      }

      try {
        const screen = data?.screen;
        const params = data?.params;

        if (screen) {
          console.log(`🔄 Navegando para ${screen} com parâmetros:`, params);
          navigationRef.current.navigate(screen, params);
        } else {
          // Fallback baseado no tipo
          switch (type) {
            case 'plan_expiration':
              console.log('🔄 Navegando para tela de planos...');
              navigationRef.current.navigate('Plans', params);
              break;

            case 'property_approved':
              console.log('🔄 Navegando para anúncios...');
              navigationRef.current.navigate('MyProperties', params);
              break;

            case 'daily_reminder':
              console.log('🔄 Navegando para home...');
              navigationRef.current.navigate('Home', params);
              break;

            default:
              console.log('🔄 Navegando para home (padrão)...');
              navigationRef.current.navigate('Home', params);
              break;
          }
        }
      } catch (error) {
        console.error('❌ Erro ao navegar:', error);
      }
    };

    // Configurar listener para notificações
    const subscription = PushNotificationService.setupNotificationResponseListener(handleNotificationResponse);

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  // Se está na tela de reset de senha, mostrar ela independente do estado de autenticação
  if (isResetPassword) {
    return <ResetPasswordScreen />;
  }

  // Se usuário está logado, verificar se aceitou os termos
  if (user && !termsAccepted) {
    return (
      <TermsAcceptanceCheck
        user={user}
        onTermsAccepted={() => setTermsAccepted(true)}
      />
    );
  }

  return user ? (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  ) : <LoginScreen />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LoadingProvider>
          <AdminProvider>
            <FavoritesProvider>
              <AppContent />
            </FavoritesProvider>
          </AdminProvider>
        </LoadingProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
}); 