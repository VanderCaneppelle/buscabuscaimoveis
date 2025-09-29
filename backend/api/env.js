export default function handler(req, res) {
    // Expor apenas variáveis públicas necessárias no frontend web
    res.setHeader('Content-Type', 'application/javascript');
    res.status(200).send(`
    window.ENV_SUPABASE_URL = '${process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''}';
    window.ENV_SUPABASE_ANON_KEY = '${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''}';
  `);
}


