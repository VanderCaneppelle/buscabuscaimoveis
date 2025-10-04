// Configurações centralizadas das notificações diárias
export const DAILY_NOTIFICATIONS = {
    morning: {
        time: '09:00',
        title: '🌅 Bom dia!',
        body: 'Que tal conferir as novidades no Busca Busca Imóveis?',
        data: { type: 'daily_reminder', time: 'morning' }
    },
    afternoon: {
        time: '15:00',
        title: '☀️ Boa tarde!',
        body: 'Novos imóveis podem ter chegado! Dê uma olhada no app.',
        data: { type: 'daily_reminder', time: 'afternoon' }
    },
    evening: {
        time: '21:00',
        title: '🌙 Boa noite!',
        body: 'Não esqueça de conferir o Busca Busca Imóveis antes de dormir!',
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
