import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';

const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));

console.log('✅ Carregando variáveis de ambiente:');
console.log('API_BASE_URL =>', process.env.API_BASE_URL);
console.log('RESET_PASSWORD_URL =>', process.env.EXPO_PUBLIC_RESET_PASSWORD_URL);


export default {

  expo: {
    name: "Busca Busca Imóveis",
    slug: "buscabuscaimoveis",
    version: pkg.version,
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
      bundleIdentifier: "com.buscabuscaimoveis.app",
      supportsTablet: true,
      jsEngine: "hermes",
      buildNumber: '8',
      config: {
        usesNonExemptEncryption: false
      },
      infoPlist: {
        NSPhotoLibraryUsageDescription: "Este app precisa acessar sua galeria de fotos para selecionar e editar imagens dos imóveis.",
        NSCameraUsageDescription: "Este app precisa acessar sua câmera para capturar fotos dos imóveis.",
        NSPhotoLibraryAddUsageDescription: "Este app precisa salvar fotos editadas na sua galeria.",
        NSMicrophoneUsageDescription: "Precisamos acessar o microfone para gravar vídeos dos imóveis."
      }
    },
    android: {
      package: "com.buscabuscaimoveis.app",
      adaptiveIcon: {
        foregroundImage: "./assets/logo_bb.jpg",
        backgroundColor: "#ffffff"
      },
      googleServicesFile: "./google-services.json",
      versionCode:  6,
      versionName: pkg.version,
    },
    web: {
      favicon: "./assets/logo_bb.jpg"
    },
    extra: {
      eas: {
        projectId: "3d62b9b3-f6a9-47db-93db-666f037084e3"
      },
      EXPO_PUBLIC_MERCADO_PAGO_ACCESS_TOKEN: process.env.EXPO_PUBLIC_MERCADO_PAGO_ACCESS_TOKEN,
      EXPO_PUBLIC_MERCADO_PAGO_PUBLIC_KEY: process.env.EXPO_PUBLIC_MERCADO_PAGO_PUBLIC_KEY,
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || "YOUR_GOOGLE_MAPS_API_KEY_HERE",
      
      // ✅ SUPABASE - PRODUÇÃO
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      API_BASE_URL: process.env.API_BASE_URL,
      RESET_PASSWORD_URL: process.env.RESET_PASSWORD_URL,
      EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,

        // ✅ AMBIENTE (production ou qa)
      EXPO_PUBLIC_ENVIRONMENT: process.env.EXPO_PUBLIC_ENVIRONMENT,
    },
    plugins: [
      "expo-notifications",
      "expo-font",
      "./plugins/withMaps.js"
    ],
    scheme: "buscabuscaimoveis",
  
  }
};
