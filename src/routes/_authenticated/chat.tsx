import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownLite } from "@/components/MarkdownLite";
import { aiChat } from "@/lib/ai.functions";
import { friendlyError } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "AI Chat Booth — PaisaPluse" },
      { name: "description", content: "Ask simple money questions and learn the basics of saving." },
      { property: "og:title", content: "AI Chat Booth — PaisaPluse" },
      { property: "og:description", content: "Ask simple money questions and learn the basics of saving." },
    ],
  }),
  component: ChatPage,
});

const SUGGESTIONS = [
  "How can I save money?",
  "What is compound interest?",
  "How should a student budget?",
  "What is an emergency fund?",
  "How can I reduce unnecessary spending?",
];

type Msg = { role: "user" | "assistant"; content: string };

function ChatPage() {
  const ask = useServerFn(aiChat);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your PaisaPluse money coach. Ask me anything about saving, budgeting or interest.\n\n_Educational information only. This is not professional financial advice._",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const result = await ask({
        data: { messages: next.filter((m) => m.role === "user" || m.role === "assistant") },
      });
      setMessages([...next, { role: "assistant", content: result.text }]);
    } catch (error) {
      toast.error(friendlyError(error));
      setMessages([
        ...next,
        {
          role: "assistant",
          content: "Sorry, I couldn't answer that just now. Please try again in a moment.",
        },
      ]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
    }
  }

  return (
    <>
      <PageHeader title="AI Chat Booth 💬" subtitle="Simple, student-friendly money answers." />

      <div className="surface flex h-[65vh] flex-col p-4">
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[85%] rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                  : "max-w-[90%] rounded-2xl bg-muted px-4 py-3"
              }
            >
              {m.role === "user" ? m.content : <MarkdownLite text={m.content} />}
            </div>
          ))}
          {busy ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Thinking…
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={busy}
              className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a money question…"
            aria-label="Your question"
          />
          <Button type="submit" disabled={busy || !input.trim()} aria-label="Send">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </form>
      </div>
      <p className="mt-3 text-xs italic text-muted-foreground">
        Educational information only. This is not professional financial advice.
      </p>
    </>
  );
}
