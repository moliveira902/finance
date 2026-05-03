const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS   = process.env.EMAIL_FROM ?? "FinanceApp <noreply@financeapp.com.br>";

export async function sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://finance-web-orpin.vercel.app";
  const link    = `${baseUrl}/api/auth/verify?token=${token}`;

  if (!RESEND_API_KEY) {
    console.log(`[EMAIL-DEV] Verification link for ${to}: ${link}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from:    FROM_ADDRESS,
      to:      [to],
      subject: "Confirme seu e-mail — FinanceApp",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:40px 24px">
          <h2 style="color:#0f172a;font-size:22px;font-weight:700;margin-bottom:8px">
            Olá, ${name}!
          </h2>
          <p style="color:#475569;font-size:15px;line-height:1.6;margin-bottom:28px">
            Clique no botão abaixo para confirmar seu e-mail e ativar sua conta no FinanceApp.
            O link expira em <strong>24 horas</strong>.
          </p>
          <a href="${link}"
            style="display:inline-block;background:#0ea5e9;color:#fff;font-size:15px;font-weight:600;
                   padding:12px 28px;border-radius:10px;text-decoration:none">
            Confirmar e-mail
          </a>
          <p style="color:#94a3b8;font-size:13px;margin-top:36px">
            Se você não criou uma conta, ignore este e-mail.
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}
