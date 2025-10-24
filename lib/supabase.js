import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Credenciais do Supabase
// Pegar extra do Expo (build final) ou fallback para process.env (dev)
const extra = Constants.expoConfig?.extra ?? {};

const supabaseUrl =
  extra.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  extra.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// 🔍 DEBUG: Verificar se as variáveis estão sendo carregadas
console.log('🔍 [SUPABASE] Extra config:', extra);
console.log('🔍 [SUPABASE] Environment:', extra.EXPO_PUBLIC_ENVIRONMENT);
console.log('🔍 [SUPABASE] Supabase URL:', supabaseUrl);
console.log('🔍 [SUPABASE] Supabase Key (primeiros 20 chars):', supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'UNDEFINED');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storage: AsyncStorage,
    },
}); 