export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  items: string[];
}

export const CURRENT_VERSION = "1.9.0";

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.9.0",
    date: "2026-05-05",
    title: "Saúde Financeira & Notificações",
    items: [
      "Índice de saúde financeira 0–100 em 5 dimensões: taxa de poupança, controle de gastos, reserva de emergência, proporção despesas/renda e consistência semanal",
      "5 níveis de saúde: Iniciante → Básico → Bom → Ótimo → Excelente",
      "14 conquistas desbloqueáveis por marcos financeiros (primeira transação, poupança, reserva, sequências, pontuação, Casa, Telegram)",
      "Histórico mensal de pontuação com gráfico de linha (Recharts)",
      "Proteção de sequência: use uma vez por mês para preservar sua streak",
      "Widget de saúde financeira no Dashboard com atalho para a página completa",
      "Página /score: anel SVG animado, barras por dimensão, badge grid e histórico",
      "Sino de notificações no topo com contagem de não lidas e dropdown",
      "Sistema de notificações in-app + Telegram via n8n (anti-spam: horário silencioso, limite diário, por tipo)",
      "Configurações → Notificações: conectar Telegram via deep link e controle por tipo",
      "Notificação automática ao compartilhar gasto na Casa (HOUSEHOLD_EXPENSE_SHARED)",
      "Notificação automática ao fechar mês da Casa (HOUSEHOLD_SETTLEMENT_CLOSED)",
      "Cron semanal (Vercel) para recomputar pontuação de todos os usuários",
    ],
  },
  {
    version: "1.8.0",
    date: "2026-05-04",
    title: "Origem de Transações & Melhorias Mobile",
    items: [
      "Novo campo 'origem' nas transações: Telegram (via n8n) ou Manual (inserido no app)",
      "Badge 'Telegram' exibido na lista de transações para entradas enviadas pelo bot",
      "Botão 'Sair' adicionado à barra de navegação mobile (real e simulador)",
      "Integração n8n: campo 'user_email' ou 'username' no payload define o usuário destino — suporte a múltiplos usuários numa única instância",
    ],
  },
  {
    version: "1.7.0",
    date: "2026-05-04",
    title: "Casa Compartilhada",
    items: [
      "Modo Merge: una sua conta com a de um parceiro(a) e veja um painel consolidado do casal",
      "Dashboard 'Casa' com KPIs, gráfico de barras empilhadas por categoria e lista de transações compartilhadas",
      "Cálculo automático de acerto de contas — quem deve quanto a quem",
      "Botão 'Fechar mês' registra o settlement e bloqueia recálculo",
      "Seletor de mês no painel do casal para navegação histórica",
      "Toggle 'Compartilhar com a Casa' na modal de transação",
      "Fluxo de convite: gere um link em Configurações → Membros e envie ao parceiro(a)",
      "Página de aceite de convite com escolha de modo (Join ou Merge)",
      "Admin pode unir contas diretamente pelo painel de administração",
      "Aba 'Casa' aparece automaticamente na sidebar quando uma casa está ativa",
    ],
  },
  {
    version: "1.6.0",
    date: "2026-05-04",
    title: "Meu Consultor — IA Financeira",
    items: [
      "Consultor financeiro IA (GPT-4.1) com análise personalizada dos seus dados reais",
      "Chat com streaming em tempo real — respostas chegam palavra por palavra",
      "Chips de sugestão rápida para perguntas frequentes",
      "Canal Telegram via n8n: mesmo consultor acessível pelo bot",
      "Cache inteligente do contexto financeiro (5 min, invalidado ao salvar dados)",
    ],
  },
  {
    version: "1.5.0",
    date: "2026-05-04",
    title: "Admin & Recorrentes",
    items: [
      "Recorrentes: campo de número de períodos (meses/anos) com prévia do total de compromisso",
      "Painel admin: edição inline de usuários — nome, usuário, e-mail e senha",
      "Painel admin renderizado dentro do layout principal da aplicação",
      "Seletor visual de perfil (Usuário / Administrador) no cadastro de usuários",
    ],
  },
  {
    version: "1.4.0",
    date: "2026-05-04",
    title: "Correções & Melhorias",
    items: [
      "Saldo das contas atualizado automaticamente ao adicionar, editar ou excluir transações",
      "Nome e e-mail do perfil preenchidos automaticamente a partir do login",
      "Patrimônio Líquido exibe o impacto mensal das recorrentes fixas",
      "Página Recorrentes: KPIs de total mensal, receitas, despesas e impacto anual",
      "Remoção completa do módulo Orçamentos",
    ],
  },
  {
    version: "1.3.0",
    date: "2026-05-03",
    title: "Gestão de Usuários & Recorrentes",
    items: [
      "Cadastro de conta no login com verificação de e-mail",
      "Dois perfis: Administrador (acesso total) e Usuário (acesso padrão)",
      "Painel admin para criar, visualizar e excluir usuários",
      "Login aceita nome de usuário ou e-mail",
      "Migração para Upstash Redis — dados persistem entre instâncias serverless",
      "Transações recorrentes mensais e anuais com página dedicada",
      "Remoção do módulo Orçamentos — substituído por Recorrentes",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-04-30",
    title: "API de Ingestão & Persistência",
    items: [
      "Endpoint REST POST /api/ingest/transactions protegido por x-api-key",
      "Suporte a corpo em array [ {…} ] — compatível com n8n por padrão",
      "Alias em português: 'despesa' e 'receita' aceitos como tipo",
      "Rate limiting (10 req / 60 s) e logs estruturados no ingest",
      "KV compartilhado substitui /tmp — dados não se perdem entre instâncias",
      "Página /test-ingest para validação manual da API",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-04-29",
    title: "Aplicação Core",
    items: [
      "Dashboard com KPIs, gráfico de fluxo de caixa e pizza por categoria",
      "Página de transações com filtros, add/edit/delete e badge de IA",
      "Gestão de contas com atualização de saldo em tempo real",
      "Sincronização entre dispositivos via store no servidor",
      "Layout mobile real + simulador de celular no desktop",
      "Autenticação JWT com cookie e opção 'Manter conectado'",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-04-28",
    title: "Lançamento Inicial",
    items: [
      "Scaffold Next.js 14 App Router em monorepo pnpm",
      "Tailwind CSS + dark mode + container queries",
      "Store Zustand com persistência em localStorage",
      "Gráficos com Recharts",
      "Login com painel de identidade visual",
      "Sidebar + Topbar com alternância de viewport e tema",
    ],
  },
];
