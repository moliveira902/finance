function brl(amount: number): string {
  return Math.abs(amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const Templates = {

  SCORE_WEEKLY_SUMMARY: (name: string, score: number, tier: string,
    savedAmount: number, streakWeeks: number) =>
    `📊 Resumo semanal, ${name}!\n\n` +
    `Sua pontuação: *${score}/100* (${tier})\n` +
    `Economia este mês: ${brl(savedAmount)}\n\n` +
    (streakWeeks > 0 ? `🔥 Sequência: *${streakWeeks} semanas seguidas!*` : `Recomeçe esta semana! 💪`),

  SCORE_LEVEL_UP: (name: string, newTier: string, score: number) =>
    `🎉 Parabéns, ${name}!\n\n` +
    `Você subiu para o nível *${newTier}*!\n` +
    `Sua pontuação: *${score}/100*\n\n` +
    `Continue assim!`,

  STREAK_MILESTONE: (name: string, weeks: number) =>
    `🔥 ${name}, você está há *${weeks} semanas* no controle!\n\n` +
    `Incrível consistência!`,

  STREAK_BROKEN: (name: string, prevStreak: number) =>
    `Sua sequência de ${prevStreak} semanas foi interrompida, ${name}.\n\n` +
    `Mas você pode recomeçar hoje! Abra o app e veja o que aconteceu. 💡`,

  BADGE_EARNED: (name: string, badgeName: string, badgeDesc: string) =>
    `🏅 Nova conquista desbloqueada, ${name}!\n\n` +
    `*${badgeName}*\n_${badgeDesc}_\n\n` +
    `Abra o app para ver todas as suas conquistas.`,

  BUDGET_ALERT_80: (name: string, category: string, pct: number,
    spent: number, limit: number) =>
    `⚠️ Atenção, ${name}!\n\n` +
    `Você usou *${pct}%* do orçamento de _${category}_.\n` +
    `Gasto: ${brl(spent)} de ${brl(limit)}\n\n` +
    `Restam ${brl(limit - spent)} para o mês.`,

  BUDGET_ALERT_EXCEEDED: (name: string, category: string,
    limit: number, over: number) =>
    `🚨 Orçamento estourado, ${name}!\n\n` +
    `_${category}_ passou de ${brl(limit)} em ${brl(over)}.\n\n` +
    `O consultor AI pode ajudar a reequilibrar os gastos. 💬`,

  MONTHLY_REPORT_READY: (name: string, month: string, income: number,
    expenses: number, balance: number, score: number) =>
    `📈 Seu relatório de ${month} está pronto, ${name}!\n\n` +
    `Receita: ${brl(income)}\n` +
    `Gastos: ${brl(expenses)}\n` +
    `Saldo: *${brl(balance)}*\n` +
    `Pontuação: *${score}/100*\n\n` +
    `Abra o app para ver o relatório completo.`,

  SAVINGS_POSITIVE: (name: string, saved: number, ratePct: number, daysRemaining: number) =>
    `✅ Boa notícia, ${name}!\n\n` +
    `Você já economizou *${brl(saved)}* este mês (*${ratePct}%* da renda).\n\n` +
    `Faltam ${daysRemaining} dias para fechar o mês no positivo!`,

  LOW_BALANCE_WARNING: (name: string, accountName: string, balance: number) =>
    `⚡ Saldo baixo, ${name}.\n\n` +
    `_${accountName}_ tem ${brl(balance)} disponíveis.\n\n` +
    `Fique atento às suas contas!`,

  HOUSEHOLD_EXPENSE_SHARED: (partnerName: string, description: string,
    amount: number, category: string, sharedTotal: number) =>
    `🏠 ${partnerName} compartilhou um gasto com a Casa:\n\n` +
    `*${description}* — ${brl(amount)}\n` +
    `Categoria: ${category}\n\n` +
    `Total compartilhado este mês: ${brl(sharedTotal)}`,

  HOUSEHOLD_SETTLEMENT_DUE_DEBTOR: (name: string, amount: number,
    creditorName: string, month: string) =>
    `💰 Acerto do mês chegando, ${name}!\n\n` +
    `Você deve *${brl(amount)}* para ${creditorName} referente a ${month}.\n\n` +
    `Abra o app para fechar o mês e acertar as contas.`,

  HOUSEHOLD_SETTLEMENT_DUE_CREDITOR: (name: string, debtorName: string,
    amount: number, month: string) =>
    `💰 ${debtorName} deve *${brl(amount)}* para você referente a ${month}.\n\n` +
    `Abra o app para fechar o mês.`,

  HOUSEHOLD_SETTLEMENT_CLOSED: (name: string, householdName: string, month: string,
    total: number, yourAmount: number, yourPct: number,
    partnerName: string, partnerAmount: number, partnerPct: number) =>
    `✅ ${name}, o mês foi fechado na Casa!\n\n` +
    `*${householdName}* — ${month}\n` +
    `Total compartilhado: ${brl(total)}\n` +
    `Você contribuiu: ${brl(yourAmount)} (${yourPct}%)\n` +
    `${partnerName} contribuiu: ${brl(partnerAmount)} (${partnerPct}%)`,

  HOUSEHOLD_MONTHLY_SUMMARY: (name: string, month: string, total: number,
    userAName: string, amountA: number, pctA: number,
    userBName: string, amountB: number, pctB: number,
    topCategory: string, topAmount: number) =>
    `🏠 Resumo da Casa em ${month}, ${name}!\n\n` +
    `Total compartilhado: ${brl(total)}\n` +
    `${userAName}: ${brl(amountA)} (${pctA}%)\n` +
    `${userBName}: ${brl(amountB)} (${pctB}%)\n\n` +
    `Maior categoria: ${topCategory} — ${brl(topAmount)}`,

  COACH_WEEKLY_INSIGHT: (name: string, insightText: string) =>
    `💡 Insight do seu consultor, ${name}:\n\n_${insightText}_\n\n` +
    `Responda esta mensagem para conversar com o consultor.`,

  INACTIVITY_NUDGE: (name: string, dayOfMonth: number, daysSince: number) => {
    const days = daysSince === 1 ? "1 dia" : `${daysSince} dias`;
    if (dayOfMonth >= 26) {
      return (
        `👀 ${name}, faz ${days} que você não abre o app.\n\n` +
        `O mês está quase fechando! Que tal registrar as últimas transações antes do balanço mensal? 📊`
      );
    }
    if (dayOfMonth <= 5) {
      return (
        `🗓️ ${name}, o mês novo já começou há ${days}!\n\n` +
        `Abra o app para definir suas metas e começar o controle financeiro com o pé direito. 🚀`
      );
    }
    return (
      `🌱 Olá, ${name}! Faz ${days} que não te vemos por aqui.\n\n` +
      `Seus registros financeiros estão esperando. Abra o app e mantenha o controle em dia! 💪`
    );
  },
};
