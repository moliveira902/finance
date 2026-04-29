import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient } from "@prisma/client";
import pino from "pino";

const log = pino({ name: "categorize-job" });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const prisma = new PrismaClient();

export interface CategorizeJobData {
  transactionId: string;
  description: string;
  amountCents: number;
  type: string;
}

interface CategoryResult {
  slug: string;
  confidence: number;
}

const SYSTEM_PROMPT = `You are a financial transaction categorizer for Brazilian personal finance.
Given a transaction description and amount, return a JSON object with:
- "slug": the best matching category slug from the allowed list
- "confidence": a number from 0.0 to 1.0

Allowed slugs: alimentacao, transporte, moradia, saude, lazer, educacao, vestuario, financas, salario, freelance, outros

Respond ONLY with valid JSON. No explanation.`;

async function callClaude(description: string, amountCents: number, type: string): Promise<CategoryResult> {
  const prompt = `Transaction: "${description}" | Amount: R$ ${(Math.abs(amountCents) / 100).toFixed(2)} | Type: ${type}`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 128,
    messages: [{ role: "user", content: prompt }],
    system: SYSTEM_PROMPT,
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const parsed = JSON.parse(text) as { slug?: string; confidence?: number };

  if (!parsed.slug || typeof parsed.confidence !== "number") {
    throw new Error(`Unexpected Claude response: ${text}`);
  }

  return { slug: parsed.slug, confidence: Math.min(1, Math.max(0, parsed.confidence)) };
}

export async function processCategorize(data: CategorizeJobData): Promise<void> {
  const { transactionId, description, amountCents, type } = data;

  log.info({ transactionId, description }, "Processing categorisation");

  let result: CategoryResult;
  try {
    result = await callClaude(description, amountCents, type);
  } catch (err) {
    log.warn({ transactionId, err }, "Claude API failed — skipping categorisation");
    return;
  }

  // Find the matching system category
  const category = await prisma.category.findFirst({
    where: { slug: result.slug, isSystem: true },
  });

  if (!category) {
    log.warn({ transactionId, slug: result.slug }, "Category slug not found in DB");
    return;
  }

  await prisma.transaction.update({
    where: { id: transactionId },
    data: { aiCategoryId: category.id, aiConfidence: result.confidence },
  });

  log.info({ transactionId, slug: result.slug, confidence: result.confidence }, "Categorisation complete");
}
