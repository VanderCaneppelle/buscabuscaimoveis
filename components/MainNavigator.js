import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from './HomeScreen';
import DiscoverScreen from './DiscoverScreen';
import FavoritesScreen from './FavoritesScreen';
import AdvertiseScreen from './AdvertiseScreen';
import AccountScreen from './AccountScreen';

const Tab = createBottomTabNavigator();

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
                tabBarActiveTintColor: '#3498db',
                tabBarInactiveTintColor: '#7f8c8d',
                tabBarStyle: {
                    backgroundColor: '#fff',
                    borderTopWidth: 1,
                    borderTopColor: '#e0e0e0',
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
                component={HomeScreen}
                options={{
                    tabBarLabel: 'Busca'
                }}
            />
            <Tab.Screen
                name="Destaques"
                component={DiscoverScreen}
                options={{
                    tabBarLabel: 'Destaques'
                }}
            />
            <Tab.Screen
                name="Favoritos"
                component={FavoritesScreen}
                options={{
                    tabBarLabel: 'Favoritos'
                }}
            />
            <Tab.Screen
                name="Anuncie"
                component={AdvertiseScreen}
                options={{
                    tabBarLabel: 'Anuncie'
                }}
            />
            <Tab.Screen
                name="Conta"
                component={AccountScreen}
                options={{
                    tabBarLabel: 'Conta'
                }}
            />
        </Tab.Navigator>
    );
} 