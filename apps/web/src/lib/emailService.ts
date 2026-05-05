// Sends transactional email via Resend (https://resend.com).
// Requires RESEND_API_KEY env var. Falls back silently if not set.

const RESEND_API = "https://api.resend.com/emails";

// Map notification types to readable email subjects
const SUBJECTS: Record<string, string> = {
  SCORE_WEEKLY_SUMMARY:        "Resumo semanal de saúde financeira",
  SCORE_LEVEL_UP:              "Você subiu de nível no FinanceApp!",
  STREAK_MILESTONE:            "Marco de sequência alcançado!",
  STREAK_BROKEN:               "Sua sequência foi interrompida",
  BADGE_EARNED:                "Nova conquista desbloqueada!",
  BUDGET_ALERT_80:             "Alerta: orçamento 80% consumido",
  BUDGET_ALERT_EXCEEDED:       "Alerta: orçamento estourado",
  BUDGET_MONTHLY_REVIEW:       "Fechamento mensal de orçamentos",
  MONTHLY_REPORT_READY:        "Seu relatório mensal está pronto",
  SAVINGS_POSITIVE:            "Economia positiva este mês!",
  LOW_BALANCE_WARNING:         "Alerta de saldo baixo",
  SUBSCRIPTION_DETECTED:       "Nova assinatura detectada",
  SUBSCRIPTION_UNUSED:         "Assinatura sem uso detectada",
  HOUSEHOLD_EXPENSE_SHARED:    "Novo gasto compartilhado na Casa",
  HOUSEHOLD_BUDGET_ALERT:      "Alerta de orçamento da Casa",
  HOUSEHOLD_SETTLEMENT_DUE:    "Acerto mensal da Casa",
  HOUSEHOLD_SETTLEMENT_CLOSED: "Mês fechado na Casa",
  HOUSEHOLD_MONTHLY_SUMMARY:   "Resumo mensal da Casa",
  COACH_WEEKLY_INSIGHT:        "Insight semanal do seu consultor",
};

// Convert the Telegram-style markdown used in templates to plain HTML
function toHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>")
    .replace(/_([^_\n]+)_/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}

function buildHtml(message: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="padding:20px 28px;background:#0f172a;border-bottom:1px solid #1e293b;">
            <span style="font-size:18px;font-weight:700;color:#38bdf8;letter-spacing:-0.5px;">FinanceApp</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px;color:#334155;font-size:15px;line-height:1.7;">
            ${toHtml(message)}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              Você está recebendo este email pois ativou notificações por email no FinanceApp.<br>
              Para desativar, acesse <strong>Configurações → Notificações</strong>.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendNotificationEmail(
  to:      string,
  type:    string,
  message: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // email not configured — skip silently

  const from    = process.env.RESEND_FROM_EMAIL ?? "FinanceApp <notifications@financeapp.app>";
  const subject = SUBJECTS[type] ?? "Notificação do FinanceApp";

  const res = await fetch(RESEND_API, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({ from, to, subject, html: buildHtml(message) }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}
