import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODEL = "google/gemini-3.8-flash";
const DISCLAIMER = "Educational information only. This is not professional financial advice.";

type ChatMessage = { role: "user" | "assistant"; content: string };

const FAQ: { keys: string[]; answer: string }[] = [
  {
    keys: ["save", "saving", "save money"],
    answer:
      "Start with the 50/30/20 idea: 50% needs, 30% wants, 20% savings. Move your savings out on the day money arrives, keep a small weekly limit for fun spending, and track every expense for a month — most people find 10-15% of easy savings.",
  },
  {
    keys: ["compound", "interest"],
    answer:
      "Compound interest means you earn returns on your returns. ₹1,000 at 10% becomes ₹1,100 after a year, and the next year you earn 10% on ₹1,100 — not ₹1,000. Time matters more than amount, so starting early wins.",
  },
  {
    keys: ["student", "budget", "college"],
    answer:
      "A simple student budget: list your monthly income (pocket money, part-time, scholarship), fix your must-pays (rent, transport, data, food), cap fun spending at a weekly number, and save whatever is left — even ₹200 a week builds the habit.",
  },
  {
    keys: ["emergency", "emergency fund"],
    answer:
      "An emergency fund is money kept aside only for surprises — medical costs, phone repair, sudden travel. Aim for 3 months of basic expenses, kept somewhere you can withdraw quickly, and don't touch it for shopping.",
  },
  {
    keys: ["unnecessary", "reduce", "cut", "overspend"],
    answer:
      "Look at your last 30 days of expenses and mark each one 'needed' or 'nice'. The 'nice' pile is your opportunity. Common wins: food delivery, unused subscriptions, and impulse shopping. Try a 24-hour wait rule before any non-essential purchase.",
  },
  {
    keys: ["invest", "sip", "mutual"],
    answer:
      "Investing means putting money into assets that can grow, and it always carries risk. Learn the basics first, never invest your emergency fund, and prefer regular small amounts over lump-sum guesses. Read official investor education material before you begin.",
  },
];

function fallbackAnswer(question: string): string {
  const q = question.toLowerCase();
  const hit = FAQ.find((f) => f.keys.some((k) => q.includes(k)));
  return (
    (hit?.answer ??
      "I can help with saving habits, budgeting, compound interest, emergency funds and cutting unnecessary spending. Try asking one of those, or add your expenses so I can look at your own numbers.") +
    `\n\n_${DISCLAIMER}_`
  );
}

async function callGateway(
  messages: { role: string; content: string }[],
): Promise<{ ok: true; text: string } | { ok: false; message: string }> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return { ok: false, message: "AI is not configured." };
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({ model: MODEL, messages }),
    });
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) return { ok: false, message: "AI is busy right now. Please retry in a moment." };
      if (res.status === 402)
        return { ok: false, message: "AI credits are exhausted for this workspace." };
      if (res.status === 403) return { ok: false, message: "AI access is blocked for this workspace." };
      console.error("AI gateway error", res.status, body);
      return { ok: false, message: "The AI service could not answer right now." };
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return { ok: false, message: "The AI service returned an empty answer." };
    return { ok: true, text };
  } catch (error) {
    console.error(error);
    return { ok: false, message: "Could not reach the AI service." };
  }
}

export const aiChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { messages: ChatMessage[] }) => {
    const messages = (input?.messages ?? [])
      .filter((m) => m && typeof m.content === "string" && m.content.trim().length > 0)
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
    if (messages.length === 0) throw new Error("Please type a question.");
    return { messages };
  })
  .handler(async ({ data }) => {
    const result = await callGateway([
      {
        role: "system",
        content:
          "You are PaisaPluse's financial literacy coach for Indian students. Answer in 3-6 short sentences, simple English, use ₹ for money. Be practical and educational. Never promise guaranteed returns. Always end with the exact line: " +
          DISCLAIMER,
      },
      ...data.messages,
    ]);
    if (result.ok) return { text: result.text, fallback: false };
    const last = data.messages[data.messages.length - 1]?.content ?? "";
    return { text: fallbackAnswer(last), fallback: true, notice: result.message };
  });

type ExpenseSummary = {
  total: number;
  count: number;
  monthTotal: number;
  byCategory: { category: string; amount: number; count: number }[];
  recent: { category: string; amount: number; date: string; description: string }[];
};

export const aiInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { summary: ExpenseSummary }) => {
    if (!input?.summary) throw new Error("Missing expense summary.");
    return input;
  })
  .handler(async ({ data }) => {
    const s = data.summary;
    if (s.count < 5) {
      return {
        text: "You need more expense records before I can identify reliable spending patterns. Add at least 5 expenses and check back.",
        fallback: true,
      };
    }
    const result = await callGateway([
      {
        role: "system",
        content:
          "You are an expense analyst for a student finance app. You will get a JSON summary of the user's REAL recorded expenses in Indian rupees. Never invent transactions or numbers that are not derivable from the data. Output short markdown with these sections: **Highest spending category**, **Patterns & unusual spending**, **3 suggestions**. Mention percentages of total. Keep it under 180 words. End with the exact line: " +
          DISCLAIMER,
      },
      { role: "user", content: JSON.stringify(s) },
    ]);
    if (result.ok) return { text: result.text, fallback: false };

    const top = [...s.byCategory].sort((a, b) => b.amount - a.amount)[0];
    const pct = top && s.total > 0 ? Math.round((top.amount / s.total) * 100) : 0;
    return {
      text:
        `**Highest spending category:** ${top?.category ?? "-"} — ₹${top?.amount ?? 0} (${pct}% of your recorded expenses).\n\n` +
        `You have logged ${s.count} expenses totalling ₹${s.total}, of which ₹${s.monthTotal} is this month.\n\n` +
        `**Suggestions:** set a weekly cap for ${top?.category ?? "your top category"}, review the smallest repeated expenses first, and move any leftover amount into a goal on the Goals page.\n\n_${DISCLAIMER}_`,
      fallback: true,
      notice: result.message,
    };
  });

export const aiSavingsAdvice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      income: number;
      expense: number;
      target: number;
      months: number;
      recommended: number;
    }) => input,
  )
  .handler(async ({ data }) => {
    const result = await callGateway([
      {
        role: "system",
        content:
          "You are a student savings coach in India. Given monthly income, monthly expenses, savings target, months available and the required monthly saving, write 4 short bullet suggestions (₹ amounts, concrete actions). If the required saving is more than the money left over, say so plainly and suggest realistic adjustments. Under 130 words. End with the exact line: " +
          DISCLAIMER,
      },
      { role: "user", content: JSON.stringify(data) },
    ]);
    if (result.ok) return { text: result.text, fallback: false };
    const surplus = data.income - data.expense;
    const gap = data.recommended - surplus;
    return {
      text:
        `- Money left each month: ₹${Math.round(surplus)}. Required saving: ₹${Math.round(data.recommended)}.\n` +
        (gap > 0
          ? `- You are short by about ₹${Math.round(gap)} per month — extend your target date or trim your top expense category.\n`
          : `- Your plan fits: transfer ₹${Math.round(data.recommended)} on the day your income arrives.\n`) +
        `- Keep a spending limit of about ₹${Math.round(Math.max(0, data.income - data.recommended))} per month.\n` +
        `- Review your expense chart weekly and log every spend.\n\n_${DISCLAIMER}_`,
      fallback: true,
      notice: result.message,
    };
  });
