const { withAndroidManifest, withInfoPlist } = require('expo/config-plugins');

const withMaps = (config) => {
    // Configuração Android
    config = withAndroidManifest(config, (config) => {
        const androidManifest = config.modResults;
        const mainApplication = androidManifest.manifest.application[0];

        // Adicionar permissões necessárias
        if (!androidManifest.manifest['uses-permission']) {
            androidManifest.manifest['uses-permission'] = [];
        }

        // Permissões para mapas
        const permissions = [
            'android.permission.ACCESS_FINE_LOCATION',
            'android.permission.ACCESS_COARSE_LOCATION',
            'android.permission.INTERNET',
            'android.permission.ACCESS_NETWORK_STATE',
        ];

        permissions.forEach(permission => {
            const exists = androidManifest.manifest['uses-permission'].some(
                p => p.$['android:name'] === permission
            );
            if (!exists) {
                androidManifest.manifest['uses-permission'].push({
                    $: { 'android:name': permission }
                });
            }
        });

        // Adicionar meta-data para Google Maps
        if (!mainApplication['meta-data']) {
            mainApplication['meta-data'] = [];
        }

        // Google Maps API Key (será configurada via environment variable)
        const hasGoogleMapsKey = mainApplication['meta-data'].some(
            meta => meta.$['android:name'] === 'com.google.android.geo.API_KEY'
        );

        if (!hasGoogleMapsKey) {
            mainApplication['meta-data'].push({
                $: {
                    'android:name': 'com.google.android.geo.API_KEY',
                    'android:value': 'AIzaSyBDJgM6JO1tRJioBp8V8DQBteC4VKyySeQ'
                }
            });
        }

        return config;
    });

    // Configuração iOS
    config = withInfoPlist(config, (config) => {
        // Adicionar permissões de localização
        config.modResults.NSLocationWhenInUseUsageDescription =
            'Este app precisa acessar sua localização para mostrar imóveis próximos no mapa.';
        config.modResults.NSLocationAlwaysAndWhenInUseUsageDescription =
            'Este app precisa acessar sua localização para mostrar imóveis próximos no mapa.';

        // Adicionar Google Maps API Key para iOS
        config.modResults.GMSApiKey = 'AIzaSyCOF3YQjjpE4JrkmpSH6o-aYWBPmaW5Jus';

        return config;
    });

    return config;
};

module.exports = withMaps;
