import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Easing, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useFavoritesStore } from '../stores/favoritesStore';

import HomeScreen from './HomeScreen';
import DiscoverScreen from './DiscoverScreen';
import FavoritesScreen from './FavoritesScreen';
import AdvertiseScreen from './AdvertiseScreen';
import AdBoostingScreen from './AdBoostingScreen';
import AccountScreen from './AccountScreen';
import PlansScreen from './PlansScreen';
import CreateAdWizard from './CreateAdWizard';
import PropertyDetailsScreen from './PropertyDetailsScreen';
import PaymentDetailsScreen from './PaymentDetailsScreen';
import PaymentConfirmationScreen from './PaymentConfirmationScreen';
import InactiveAdsOptionsScreen from './InactiveAdsOptionsScreen';
import InactiveAdsSelectScreen from './InactiveAdsSelectScreen';
import CreateStoryScreen from './CreateStoryScreen';
import StoryViewerScreen from './StoryViewerScreen';
import VideoUploadTestScreen from './VideoUploadTestScreen';
import MyPropertiesScreen from './MyPropertiesScreen';
import MapaImoveis from './MapaImoveis';
import MapaImovelUnico from './MapaImovelUnico';
import TermsAndPrivacyScreen from './TermsAndPrivacyScreen';
import HelpSupportScreen from './HelpSupportScreen';
import EditProfileScreen from './EditProfileScreen';
import BoostOptionsScreen from './BoostOptionsScreen';
import BoostPaymentScreen from './BoostPaymentScreen';
import NotificationsScreen from './NotificationsScreen'; //  NOVO
import DeleteAccountScreen from './DeleteAccountScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack Navigator para cada tab que pode ter telas aninhadas
function HomeStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                // Otimizações para iOS - transições
                detachInactiveScreens: false, // Manter HomeScreen em memória
                unmountOnBlur: false,
                // SEM SLIDE - apenas fade para iOS
                cardStyleInterpolator: Platform.OS === 'ios' ? ({ current, layouts }) => ({
                    cardStyle: {
                        opacity: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 1], // Fade simples sem movimento
                        }),
                    },
                }) : undefined,
                // Configurações SEM SLIDE para iOS
                transitionSpec: Platform.OS === 'ios' ? {
                    open: {
                        animation: 'timing',
                        config: {
                            duration: 0, // SEM ANIMAÇÃO
                            easing: Easing.linear,
                        },
                    },
                    close: {
                        animation: 'timing',
                        config: {
                            duration: 0, // SEM ANIMAÇÃO
                            easing: Easing.linear,
                        },
                    },
                } : undefined,
            }}
        >
            <Stack.Screen name="HomeMain" component={HomeScreen} />

            <Stack.Screen
                name="CreateStory"
                component={CreateStoryScreen}
                options={{
                    headerShown: true,
                    title: 'Criar Story',
                    headerStyle: {
                        backgroundColor: '#00335e',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                }}
            />

            {/* ✨ NOVO: Tela de Notificações In-App */}
            <Stack.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{
                    headerShown: false,
                    // ✨ Animação slide suave para iOS
                    ...(Platform.OS === 'ios' && {
                        cardStyleInterpolator: ({ current, layouts }) => ({
                            cardStyle: {
                                transform: [
                                    {
                                        translateX: current.progress.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [layouts.screen.width, 0], // Slide da direita
                                        }),
                                    },
                                ],
                            },
                        }),
                        transitionSpec: {
                            open: {
                                animation: 'spring',
                                config: {
                                    stiffness: 300,
                                    damping: 30,
                                    mass: 0.8,
                                },
                            },
                            close: {
                                animation: 'spring',
                                config: {
                                    stiffness: 300,
                                    damping: 30,
                                    mass: 0.8,
                                },
                            },
                        },
                    }),
                }}
            />

        </Stack.Navigator>
    );
}

function AdvertiseStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="AdvertiseMain" component={AdvertiseScreen} />
            <Stack.Screen
                name="MyProperties"
                component={MyPropertiesScreen}
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="AdBoosting"
                component={AdBoostingScreen}
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="BoostOptions"
                component={BoostOptionsScreen}
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="BoostPayment"
                component={BoostPaymentScreen}
                options={{
                    headerShown: false,
                }}
            />

        </Stack.Navigator>
    );
}

function DiscoverStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="DiscoverMain" component={DiscoverScreen} />
            {/* PropertyDetails removido - usar a rota do MainNavigator principal */}
        </Stack.Navigator>
    );
}

function FavoritesStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="FavoritesMain" component={FavoritesScreen} />
        </Stack.Navigator>
    );
}

function AccountStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="AccountMain" component={AccountScreen} />
        </Stack.Navigator>
    );
}

function TabNavigator() {
    const insets = useSafeAreaInsets();

    // ✨ Zustand: Observar o Set diretamente para reagir ao Realtime
    const favorites = useFavoritesStore(state => state.favorites);
    const favCount = favorites.size; // Calcular tamanho diretamente
    const favoritesChanged = useFavoritesStore(state => state.favoritesChanged);
    const clearFavoritesChanged = useFavoritesStore(state => state.clearFavoritesChanged);

    const favIconScale = React.useRef(new Animated.Value(1)).current;

    // ✨ Debug: Log quando favCount mudar
    React.useEffect(() => {
        console.log('📊 [TabNavigator] Badge de favoritos atualizado:', favCount);
    }, [favCount]);

    React.useEffect(() => {
        if (favoritesChanged) {
            Animated.sequence([
                Animated.timing(favIconScale, { toValue: 1.5, duration: 200, useNativeDriver: true }),
                Animated.spring(favIconScale, { toValue: 1, useNativeDriver: true, friction: 5 })
            ]).start(() => {
                // limpar flag para evitar animar a cada render
                clearFavoritesChanged();
            });
        }
    }, [favoritesChanged, favIconScale, clearFavoritesChanged]);

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;
                    if (route.name === 'Busca') {
                        iconName = focused ? 'search' : 'search-outline';
                    } else if (route.name === 'Oportunidades') {
                        iconName = 'logo-usd';
                    } else if (route.name === 'Selecionados') {
                        iconName = focused ? 'cart' : 'cart-outline';
                    } else if (route.name === 'Anuncie') {
                        iconName = focused ? 'add-circle' : 'add-circle-outline';
                    } else if (route.name === 'Conta') {
                        iconName = focused ? 'person' : 'person-outline';
                    }

                    // Ícones um pouco menores para dar mais espaço ao texto
                    const iconSize = Math.max(16, size - 6);
                    return <Ionicons name={iconName} size={iconSize} color={color} />;
                },
                tabBarActiveTintColor: '#00335e',
                tabBarInactiveTintColor: '#64748b',
                tabBarStyle: {
                    backgroundColor: '#fff',
                    borderTopWidth: 1,
                    borderTopColor: '#e2e8f0',
                    paddingTop: 0,
                    paddingBottom: insets.bottom + 3,
                    height: 56 + insets.bottom,
                    // Removido: shadowColor, shadowOffset, shadowOpacity, shadowRadius, elevation
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '500',
                    marginTop: 0,
                    letterSpacing: -0.2,
                },
                tabBarItemStyle: {
                    paddingHorizontal: 0,
                },
                headerShown: false,
            })}
        >
            <Tab.Screen
                name="Busca"
                component={HomeStack}
                options={{
                    tabBarLabel: 'Busca'
                }}
            />
            <Tab.Screen
                name="Oportunidades"
                component={DiscoverStack}
                options={{
                    tabBarLabel: 'Oportunidades'
                }}
            />
            <Tab.Screen
                name="Selecionados"
                component={FavoritesStack}
                options={{
                    tabBarLabel: 'Selecionados',
                    tabBarBadge: favCount > 0 ? (favCount > 99 ? '99+' : favCount) : undefined,
                    tabBarBadgeStyle: {
                        backgroundColor: '#00335e',
                        color: '#fff',
                        fontSize: 10,
                        minWidth: 16,
                        height: 16,
                        lineHeight: 16,
                        textAlign: 'center',
                        paddingHorizontal: 2,
                    }
                }}
            />
            <Tab.Screen
                name="Anuncie"
                component={AdvertiseStack}
                options={{
                    tabBarLabel: 'Anuncie'
                }}
            />
            <Tab.Screen
                name="Conta"
                component={AccountStack}
                options={{
                    tabBarLabel: 'Conta'
                }}
            />
        </Tab.Navigator>
    );
}

export default function MainNavigator() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen
                name="MainTabs"
                component={TabNavigator}
            />
            <Stack.Screen
                name="StoryViewer"
                component={StoryViewerScreen}
                options={{
                    presentation: 'fullScreenModal',
                    cardStyle: { backgroundColor: 'black' },
                    // ✅ Transições mínimas para iOS (resolve travada)
                    cardStyleInterpolator: Platform.OS === 'ios' ? ({ current }) => ({
                        cardStyle: {
                            opacity: current.progress,
                        },
                    }) : undefined,
                    transitionSpec: Platform.OS === 'ios' ? {
                        open: { animation: 'timing', config: { duration: 0 } },
                        close: { animation: 'timing', config: { duration: 0 } },
                    } : undefined,
                }}
            />
            {/* PropertyDetails como modal - abre rápido, carrega imagens depois */}
            <Stack.Screen
                name="PropertyDetails"
                component={PropertyDetailsScreen}
                options={{
                    title: 'Detalhes do Imóvel',
                    headerBackTitle: 'Voltar',
                    presentation: 'fullScreenModal', // ✅ Modal abre instantaneamente
                    headerShown: true, // ✅ Header personalizado para iOS e Android
                    cardStyle: { backgroundColor: 'white' },
                    headerStyle: {
                        backgroundColor: '#ffcc1e',
                        height: Platform.OS === 'ios' ? 125 : 60, // ✅ Altura maior para iOS com safe area
                    },
                    headerTintColor: '#00335e',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                    animation: 'none',
                    tabBarStyle: { display: 'none' }, // Esconde a barra de rodapé
                    // ✅ Modal abre rápido, imagens carregam depois
                }}
            />

            {/* CreateAd como modal - mesmo nível das outras telas */}
            <Stack.Screen
                name="CreateAd"
                component={CreateAdWizard}
                options={{
                    title: 'Criar Anúncio',
                    headerBackTitle: 'Voltar',
                    presentation: 'fullScreenModal',
                    headerShown: false,
                    cardStyle: { backgroundColor: 'white' },
                    headerStyle: {
                        backgroundColor: '#00335e',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                    animation: 'none',
                    tabBarStyle: { display: 'none' }, // Esconde a barra de rodapé
                }}
            />

            {/* Plans como modal - mesmo nível das outras telas */}
            <Stack.Screen
                name="Plans"
                component={PlansScreen}
                options={{
                    title: 'Planos',
                    headerBackTitle: 'Voltar',
                    presentation: 'fullScreenModal',
                    headerShown: false,
                    cardStyle: { backgroundColor: 'white' },
                    headerStyle: {
                        backgroundColor: '#00335e',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                    animation: 'none',
                    tabBarStyle: { display: 'none' }, // Esconde a barra de rodapé
                }}
            />

            {/* PaymentDetails como modal - mesmo nível das outras telas */}
            <Stack.Screen
                name="PaymentDetails"
                component={PaymentDetailsScreen}
                options={{
                    title: 'Pagamento',
                    headerBackTitle: 'Voltar',
                    presentation: 'fullScreenModal',
                    headerShown: false, // Header customizado amarelo como na PlansScreen
                    cardStyle: { backgroundColor: '#ffcc1e' }, // Cor amarela igual à PlansScreen
                    headerStyle: {
                        backgroundColor: '#00335e',
                    },
                    headerTintColor: '#00335e',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                    animation: 'none',
                    tabBarStyle: { display: 'none' }, // Esconde a barra de rodapé
                }}
            />
            <Stack.Screen
                name="InactiveAdsOptions"
                component={InactiveAdsOptionsScreen}
                options={{
                    presentation: 'fullScreenModal',
                    headerShown: false,
                    cardStyle: { backgroundColor: 'white' },
                    animation: 'none',
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Stack.Screen
                name="InactiveAdsSelect"
                component={InactiveAdsSelectScreen}
                options={{
                    presentation: 'fullScreenModal',
                    headerShown: false,
                    cardStyle: { backgroundColor: 'white' },
                    animation: 'none',
                    tabBarStyle: { display: 'none' },
                }}
            />
            {/* PaymentConfirmation como modal - mesmo nível das outras telas */}
            <Stack.Screen
                name="PaymentConfirmation"
                component={PaymentConfirmationScreen}
                options={{
                    title: 'Confirmação',
                    headerBackTitle: 'Voltar',
                    presentation: 'fullScreenModal',
                    headerShown: false,
                    cardStyle: { backgroundColor: '#ffcc1e' },
                    animation: 'none',
                    tabBarStyle: { display: 'none' },
                }}
            />

            {/* Terms and Privacy - tela standalone reutilizando o componente existente */}
            <Stack.Screen
                name="TermsPrivacy"
                component={TermsAndPrivacyScreen}
                options={{
                    title: 'Termos e Privacidade',
                    headerBackTitle: 'Voltar',
                    presentation: 'fullScreenModal',
                    headerShown: false,
                    cardStyle: { backgroundColor: 'white' },
                    animation: 'none',
                    tabBarStyle: { display: 'none' },
                }}
            />

            {/* Help and Support - tela de ajuda e suporte */}
            <Stack.Screen
                name="HelpSupport"
                component={HelpSupportScreen}
                options={{
                    title: 'Ajuda e Suporte',
                    headerBackTitle: 'Voltar',
                    presentation: 'fullScreenModal',
                    headerShown: false,
                    cardStyle: { backgroundColor: 'white' },
                    animation: 'none',
                    tabBarStyle: { display: 'none' },
                }}
            />

            {/* Edit Profile - tela de edição de perfil */}
            <Stack.Screen
                name="EditProfile"
                component={EditProfileScreen}
                options={{
                    title: 'Editar Perfil',
                    headerBackTitle: 'Voltar',
                    presentation: 'fullScreenModal',
                    headerShown: false,
                    cardStyle: { backgroundColor: 'white' },
                    animation: 'none',
                    tabBarStyle: { display: 'none' },
                }}
            />

            {/* Delete Account - tela de exclusão de conta */}
            <Stack.Screen
                name="DeleteAccount"
                component={DeleteAccountScreen}
                options={{
                    title: 'Excluir Conta',
                    headerBackTitle: 'Voltar',
                    presentation: 'fullScreenModal',
                    headerShown: false,
                    cardStyle: { backgroundColor: 'white' },
                    animation: 'none',
                    tabBarStyle: { display: 'none' },
                }}
            />




            {/* MapaImoveis como modal - acessível de qualquer tela */}
            <Stack.Screen
                name="MapaImoveis"
                component={MapaImoveis}
                options={{
                    title: 'Mapa de Imóveis',
                    headerBackTitle: 'Voltar',
                    headerShown: false,
                    cardStyle: { backgroundColor: 'white' },
                    animation: 'none',
                }}
            />

            {/* MapaImovelUnico - mapa focado em uma propriedade específica */}
            <Stack.Screen
                name="MapaImovelUnico"
                component={MapaImovelUnico}
                options={{
                    title: 'Localização do Imóvel',
                    headerBackTitle: 'Voltar',
                    presentation: 'fullScreenModal',
                    headerShown: false,
                    cardStyle: { backgroundColor: 'white' },
                    animation: 'none',
                    tabBarStyle: { display: 'none' },
                }}
            />
        </Stack.Navigator>
    );
} 