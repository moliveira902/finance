import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_USER_AUTH0_ID = "demo|user";
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000002";

async function main() {
  console.log("🌱 Seeding database…");

  // Demo user
  const user = await prisma.user.upsert({
    where: { auth0Id: DEMO_USER_AUTH0_ID },
    update: {},
    create: {
      id: DEMO_USER_ID,
      tenantId: DEMO_TENANT_ID,
      auth0Id: DEMO_USER_AUTH0_ID,
      email: "user@demo.financeapp.com.br",
      name: "Demo User",
      timezone: "America/Sao_Paulo",
    },
  });

  console.log("  ✓ User:", user.email);

  // System categories
  const categoryData = [
    { slug: "alimentacao",  name: "Alimentação", color: "#F59E0B", icon: "utensils",        isSystem: true },
    { slug: "transporte",   name: "Transporte",  color: "#3B82F6", icon: "car",             isSystem: true },
    { slug: "moradia",      name: "Moradia",      color: "#10B981", icon: "home",            isSystem: true },
    { slug: "saude",        name: "Saúde",        color: "#EF4444", icon: "heart",           isSystem: true },
    { slug: "lazer",        name: "Lazer",        color: "#8B5CF6", icon: "gamepad",         isSystem: true },
    { slug: "educacao",     name: "Educação",     color: "#06B6D4", icon: "book",            isSystem: true },
    { slug: "vestuario",    name: "Vestuário",    color: "#EC4899", icon: "shirt",           isSystem: true },
    { slug: "financas",     name: "Finanças",     color: "#F97316", icon: "dollar-sign",     isSystem: true },
    { slug: "outros",       name: "Outros",       color: "#6B7280", icon: "more-horizontal", isSystem: true },
    { slug: "salario",      name: "Salário",      color: "#10B981", icon: "briefcase",       isSystem: true },
    { slug: "freelance",    name: "Freelance",    color: "#0EA5E9", icon: "laptop",          isSystem: true },
  ];

  const categories: Record<string, { id: string }> = {};
  for (const cat of categoryData) {
    const created = await prisma.category.upsert({
      where: { userId_slug: { userId: null as unknown as string, slug: cat.slug } },
      update: {},
      create: { ...cat, userId: null },
    });
    categories[cat.slug] = created;
  }
  console.log("  ✓ Categories:", Object.keys(categories).length);

  // Accounts
  const accountsData = [
    { name: "Conta Corrente",    type: "checking",   balanceCents: 845075,  institution: "Bradesco",        currency: "BRL" },
    { name: "Poupança",          type: "savings",     balanceCents: 2310000, institution: "Itaú",            currency: "BRL" },
    { name: "Cartão de Crédito", type: "credit",      balanceCents: -234050, institution: "Nubank",          currency: "BRL" },
    { name: "Investimentos",     type: "investment",  balanceCents: 4890000, institution: "XP Investimentos", currency: "BRL" },
  ];

  const accounts: { id: string }[] = [];
  for (const acc of accountsData) {
    const created = await prisma.account.upsert({
      where: { id: "00000000-0000-0000-0001-" + String(accounts.length + 1).padStart(12, "0") },
      update: {},
      create: {
        id: "00000000-0000-0000-0001-" + String(accounts.length + 1).padStart(12, "0"),
        userId: DEMO_USER_ID,
        ...acc,
      },
    });
    accounts.push(created);
  }
  console.log("  ✓ Accounts:", accounts.length);

  // Transactions
  const txData = [
    { desc: "Supermercado Extra",   amountCents: -38750,  type: "expense", slug: "alimentacao", accountIdx: 0, date: "2026-04-28", aiConf: 0.97 },
    { desc: "Salário Abril",        amountCents: 850000,  type: "income",  slug: "salario",     accountIdx: 0, date: "2026-04-25", aiConf: 0.99 },
    { desc: "Uber",                 amountCents: -4590,   type: "expense", slug: "transporte",  accountIdx: 2, date: "2026-04-24", aiConf: 0.95 },
    { desc: "Netflix",              amountCents: -5590,   type: "expense", slug: "lazer",       accountIdx: 2, date: "2026-04-23", aiConf: 0.98 },
    { desc: "Farmácia Drogasil",    amountCents: -8900,   type: "expense", slug: "saude",       accountIdx: 2, date: "2026-04-22", aiConf: 0.92 },
    { desc: "Aluguel Abril",        amountCents: -220000, type: "expense", slug: "moradia",     accountIdx: 0, date: "2026-04-21", aiConf: 0.99 },
    { desc: "Freelance Design",     amountCents: 180000,  type: "income",  slug: "freelance",   accountIdx: 0, date: "2026-04-20", aiConf: 0.88 },
    { desc: "iFood",                amountCents: -11250,  type: "expense", slug: "alimentacao", accountIdx: 2, date: "2026-04-19", aiConf: 0.96 },
    { desc: "Posto Shell",          amountCents: -18000,  type: "expense", slug: "transporte",  accountIdx: 0, date: "2026-04-18", aiConf: 0.94 },
    { desc: "Curso Udemy",          amountCents: -7990,   type: "expense", slug: "educacao",    accountIdx: 2, date: "2026-04-17", aiConf: 0.91 },
    { desc: "Conta de Luz",         amountCents: -24530,  type: "expense", slug: "moradia",     accountIdx: 0, date: "2026-04-16", aiConf: 0.97 },
    { desc: "Restaurante Madero",   amountCents: -15680,  type: "expense", slug: "alimentacao", accountIdx: 2, date: "2026-04-15", aiConf: 0.95 },
  ];

  for (let i = 0; i < txData.length; i++) {
    const t = txData[i];
    const catId = categories[t.slug].id;
    await prisma.transaction.upsert({
      where: { id: "00000000-0000-0000-0002-" + String(i + 1).padStart(12, "0") },
      update: {},
      create: {
        id: "00000000-0000-0000-0002-" + String(i + 1).padStart(12, "0"),
        userId: DEMO_USER_ID,
        accountId: accounts[t.accountIdx].id,
        categoryId: catId,
        aiCategoryId: catId,
        aiConfidence: t.aiConf,
        amountCents: t.amountCents,
        description: t.desc,
        transactionDate: new Date(t.date),
        type: t.type,
        source: "manual",
      },
    });
  }
  console.log("  ✓ Transactions:", txData.length);

  // Budgets
  const budgetData = [
    { slug: "alimentacao", name: "Alimentação",  amountCents: 120000 },
    { slug: "transporte",  name: "Transporte",   amountCents: 40000  },
    { slug: "moradia",     name: "Moradia",      amountCents: 250000 },
    { slug: "saude",       name: "Saúde",        amountCents: 30000  },
    { slug: "lazer",       name: "Lazer",        amountCents: 20000  },
    { slug: "educacao",    name: "Educação",     amountCents: 15000  },
  ];

  for (let i = 0; i < budgetData.length; i++) {
    const b = budgetData[i];
    const catId = categories[b.slug].id;
    await prisma.budget.upsert({
      where: { userId_categoryId_period: { userId: DEMO_USER_ID, categoryId: catId, period: "monthly" } },
      update: {},
      create: {
        id: "00000000-0000-0000-0003-" + String(i + 1).padStart(12, "0"),
        userId: DEMO_USER_ID,
        categoryId: catId,
        name: b.name,
        amountCents: b.amountCents,
        period: "monthly",
        alertAtPct: 80,
      },
    });
  }
  console.log("  ✓ Budgets:", budgetData.length);

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
