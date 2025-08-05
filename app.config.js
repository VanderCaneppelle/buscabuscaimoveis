export default {
  expo: {
    name: "BuscaBusca Imóveis",
    slug: "buscabuscaimoveis",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
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
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      eas: {
        projectId: "your-project-id"
      }
    },
    plugins: [],
    scheme: "buscabuscaimoveis",
    // Configurações do Mercado Pago
    env: {
      EXPO_PUBLIC_MERCADO_PAGO_ACCESS_TOKEN: process.env.EXPO_PUBLIC_MERCADO_PAGO_ACCESS_TOKEN,
      EXPO_PUBLIC_MERCADO_PAGO_PUBLIC_KEY: process.env.EXPO_PUBLIC_MERCADO_PAGO_PUBLIC_KEY,
    }
  }
}; 