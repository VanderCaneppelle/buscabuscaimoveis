import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from './HomeScreen';
import DiscoverScreen from './DiscoverScreen';
import FavoritesScreen from './FavoritesScreen';
import AdvertiseScreen from './AdvertiseScreen';
import AccountScreen from './AccountScreen';
import PlansScreen from './PlansScreen';
import CreateAdScreen from './CreateAdScreen';
import PropertyDetailsScreen from './PropertyDetailsScreen';
import PaymentDetailsScreen from './PaymentDetailsScreen';
import PaymentConfirmationScreen from './PaymentConfirmationScreen';
import CreateStoryScreen from './CreateStoryScreen';
import StoryViewerScreen from './StoryViewerScreen';
import VideoUploadTestScreen from './VideoUploadTestScreen';
import MyPropertiesScreen from './MyPropertiesScreen';

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
                name="PropertyDetails"
                component={PropertyDetailsScreen}
                options={{
                    headerShown: true,
                    title: 'Detalhes do Imóvel',
                    headerStyle: {
                        backgroundColor: '#00335e',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                }}
            />
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

        </Stack.Navigator>
    );
}

function AdvertiseStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="AdvertiseMain" component={AdvertiseScreen} />
            <Stack.Screen
                name="CreateAd"
                component={CreateAdScreen}
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="Plans"
                component={PlansScreen}
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="PaymentDetails"
                component={PaymentDetailsScreen}
                options={{
                    headerShown: true,
                    title: 'Pagamento',
                    headerStyle: {
                        backgroundColor: '#00335e',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                }}
            />
            <Stack.Screen
                name="PaymentConfirmation"
                component={PaymentConfirmationScreen}
                options={{
                    headerShown: true,
                    title: 'Confirmação',
                    headerStyle: {
                        backgroundColor: '#00335e',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                }}
            />
            <Stack.Screen
                name="VideoUploadTest"
                component={VideoUploadTestScreen}
                options={{
                    headerShown: true,
                    title: 'Teste de Upload',
                    headerStyle: {
                        backgroundColor: '#00335e',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                }}
            />
        </Stack.Navigator>
    );
}

function DiscoverStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="DiscoverMain" component={DiscoverScreen} />
            <Stack.Screen
                name="PropertyDetails"
                component={PropertyDetailsScreen}
                options={{
                    headerShown: true,
                    title: 'Detalhes do Imóvel',
                    headerStyle: {
                        backgroundColor: '#00335e',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                }}
            />
        </Stack.Navigator>
    );
}

function FavoritesStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="FavoritesMain" component={FavoritesScreen} />
            <Stack.Screen
                name="PropertyDetails"
                component={PropertyDetailsScreen}
                options={{
                    headerShown: true,
                    title: 'Detalhes do Imóvel',
                    headerStyle: {
                        backgroundColor: '#00335e',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                }}
            />
        </Stack.Navigator>
    );
}

function AccountStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="AccountMain" component={AccountScreen} />
            <Stack.Screen
                name="Plans"
                component={PlansScreen}
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="PaymentDetails"
                component={PaymentDetailsScreen}
                options={{
                    headerShown: true,
                    title: 'Pagamento',
                    headerStyle: {
                        backgroundColor: '#00335e',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                }}
            />
            <Stack.Screen
                name="PaymentConfirmation"
                component={PaymentConfirmationScreen}
                options={{
                    headerShown: true,
                    title: 'Confirmação',
                    headerStyle: {
                        backgroundColor: '#00335e',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                }}
            />
            <Stack.Screen
                name="MyProperties"
                component={MyPropertiesScreen}
                options={{
                    headerShown: false,
                }}
            />
        </Stack.Navigator>
    );
}

function TabNavigator() {
    const insets = useSafeAreaInsets();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Busca') {
                        iconName = focused ? 'search' : 'search-outline';
                    } else if (route.name === 'Destaques') {
                        iconName = focused ? 'star' : 'star-outline';
                    } else if (route.name === 'Favoritos') {
                        iconName = focused ? 'heart' : 'heart-outline';
                    } else if (route.name === 'Anuncie') {
                        iconName = focused ? 'add-circle' : 'add-circle-outline';
                    } else if (route.name === 'Conta') {
                        iconName = focused ? 'person' : 'person-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#00335e',
                tabBarInactiveTintColor: '#64748b',
                tabBarStyle: {
                    backgroundColor: '#fff',
                    borderTopWidth: 1,
                    borderTopColor: '#e2e8f0',
                    paddingTop: 8,
                    paddingBottom: insets.bottom + 8,
                    height: 60 + insets.bottom,
                    // Removido: shadowColor, shadowOffset, shadowOpacity, shadowRadius, elevation
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '500',
                    marginTop: 2,
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
                name="Destaques"
                component={DiscoverStack}
                options={{
                    tabBarLabel: 'Destaques'
                }}
            />
            <Tab.Screen
                name="Favoritos"
                component={FavoritesStack}
                options={{
                    tabBarLabel: 'Favoritos'
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
                }}
            />
        </Stack.Navigator>
    );
} 