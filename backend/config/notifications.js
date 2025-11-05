// Configurações centralizadas das notificações diárias
export const DAILY_NOTIFICATIONS = {
    morning: {
        time: '09:40',
        title: 'BOM DIA!! Que Deus Abençoe seu dia!!!',
        body: 'Não esqueça de dar uma olhadinha no Busca Busca!!!!!'
        ,
        data: { type: 'daily_reminder', time: 'morning' }
    },
    lunch: {
        time: '12:40',
        title: 'BOA TARDE!!',
        body: 'Não permita que o medo de errar seja maior do que acertar!!! Busca Busca!!!!',
        data: { type: 'daily_reminder', time: 'lunch' }
    },
    afternoon: {
        time: '16:40',
        title: 'OIEEE!!!',
        body: 'SÓ PARA LEMBRAR QUE OS METROS QUADRADOS MAIS BARATOS É NO BUSCA BUSCA!!!!',
        data: { type: 'daily_reminder', time: 'afternoon' }
    },
    evening: {
        time: '20:15',
        title: 'BOA NOITE!!',
        body: 'Durma com idéias e acorde com atitudes!!! Não esqueça de conferir as novidades Busca Busca!!!!',
        data: { type: 'daily_reminder', time: 'evening' }
    }
};

// Configurações para notificações de vencimento de plano
export const EXPIRATION_NOTIFICATIONS = {
    expired: {
        title: '⚠️ Plano Vencido',
        body: 'Seu plano {planName} venceu. Renove agora para continuar usando todos os recursos.',
        data: { type: 'plan_expiration', urgency: 'expired' }
    },
    expires_tomorrow: {
        title: '🚨 Plano Vence Amanhã!',
        body: 'Seu plano {planName} vence amanhã. Renove agora para não perder acesso.',
        data: { type: 'plan_expiration', urgency: 'tomorrow' }
    },
    expires_soon: {
        title: '⏰ Plano Vencendo em Breve',
        body: 'Seu plano {planName} vence em {daysLeft} dias. Renove para continuar usando todos os recursos.',
        data: { type: 'plan_expiration', urgency: 'soon' }
    },
    expires_later: {
        title: '📅 Lembrete de Vencimento',
        body: 'Seu plano {planName} vence em {daysLeft} dias. Que tal renovar agora?',
        data: { type: 'plan_expiration', urgency: 'later' }
    }
};

// Converter para array para uso no handleSchedule
export const SCHEDULED_NOTIFICATIONS = Object.values(DAILY_NOTIFICATIONS);
