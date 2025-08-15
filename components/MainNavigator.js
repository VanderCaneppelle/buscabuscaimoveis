import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
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

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack Navigator para cada tab que pode ter telas aninhadas
function HomeStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
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
            <Stack.Screen
                name="StoryViewer"
                component={StoryViewerScreen}
                options={{
                    headerShown: true,
                    title: 'Stories',
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
        </Stack.Navigator>
    );
}

export default function MainNavigator() {
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
                    shadowColor: '#000',
                    shadowOffset: {
                        width: 0,
                        height: -2,
                    },
                    shadowOpacity: 0.1,
                    shadowRadius: 3.84,
                    elevation: 10,
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