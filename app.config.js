export default {
  expo: {
    name: "BuscaBusca Imóveis",
    slug: "buscabuscaimoveis",
    version: "1.0.0",
    host: "lan",
    orientation: "portrait",
    icon: "./assets/logo_bb.jpg",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      jsEngine: "hermes"
    },
    android: {
      package: "com.buscabuscaimoveis.app",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      }
    },
    web: {
      favicon: "./assets/logo_bb.jpg"
    },
    extra: {
      eas: {
        projectId: "3d62b9b3-f6a9-47db-93db-666f037084e3"
      }
    },
    plugins: [
      "expo-notifications",
      "expo-font",
      "react-native-compressor"
    ],
    scheme: "buscabuscaimoveis",
    // Configurações do Mercado Pago
    env: {
      EXPO_PUBLIC_MERCADO_PAGO_ACCESS_TOKEN: process.env.EXPO_PUBLIC_MERCADO_PAGO_ACCESS_TOKEN,
      EXPO_PUBLIC_MERCADO_PAGO_PUBLIC_KEY: process.env.EXPO_PUBLIC_MERCADO_PAGO_PUBLIC_KEY,
    }
  }
}; 