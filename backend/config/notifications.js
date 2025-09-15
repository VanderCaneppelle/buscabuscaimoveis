// Configurações centralizadas das notificações diárias
export const DAILY_NOTIFICATIONS = {
    morning: {
        time: '09:00',
        title: '🌅 Bom dia!',
        body: 'Que tal conferir as novidades no BuscaBusca Imóveis?',
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
        body: 'Não esqueça de conferir o BuscaBusca Imóveis antes de dormir!',
        data: { type: 'daily_reminder', time: 'evening' }
    }
};

// Converter para array para uso no handleSchedule
export const SCHEDULED_NOTIFICATIONS = Object.values(DAILY_NOTIFICATIONS);
