import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginScreen from './components/LoginScreen';
import MainNavigator from './components/MainNavigator';
import PlansScreen from './components/PlansScreen';
import CreateAdScreen from './components/CreateAdScreen';
import PropertyDetailsScreen from './components/PropertyDetailsScreen';
import PaymentScreen from './components/PaymentScreen';
import PaymentDetailsScreen from './components/PaymentDetailsScreen';
import PaymentConfirmationScreen from './components/PaymentConfirmationScreen';

import ResetPasswordScreen from './components/ResetPasswordScreen';
import TermsAcceptanceCheck from './components/TermsAcceptanceCheck';
import * as Linking from 'expo-linking';

const Stack = createStackNavigator();

function AppContent() {
  const { user, loading } = useAuth();
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

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
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainNavigator} />
        <Stack.Screen name="Plans" component={PlansScreen} />
        <Stack.Screen name="CreateAd" component={CreateAdScreen} />
        <Stack.Screen
          name="PropertyDetails"
          component={PropertyDetailsScreen}
          options={{
            headerShown: true,
            title: 'Detalhes do Imóvel',
            headerStyle: {
              backgroundColor: '#1e3a8a',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen
          name="Payment"
          component={PaymentScreen}
          options={{
            headerShown: false
          }}
        />
        <Stack.Screen
          name="PaymentDetails"
          component={PaymentDetailsScreen}
          options={{
            headerShown: false
          }}
        />
        <Stack.Screen
          name="PaymentConfirmation"
          component={PaymentConfirmationScreen}
          options={{
            headerShown: false
          }}
        />

      </Stack.Navigator>
    </NavigationContainer>
  ) : <LoginScreen />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
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