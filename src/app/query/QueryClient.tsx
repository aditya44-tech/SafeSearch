"use client";
import { useState } from "react";

const EXAMPLES = [
  "Which sites had electrical hazards this month?",
  "How many high-risk reports are still unresolved?",
  "What are the most common hazard categories at Metro Industrial Park?",
  "Show me all fall hazard reports from last week",
  "Which sites have improved their safety record recently?",
];

export default function QueryClient() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);

  const handleSubmit = async (q?: string) => {
    const query = q || question;
    if (!query.trim()) return;
    setLoading(true);
    setAnswer("");
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });
      const data = await res.json();
      const answerText = data.answer || "Unable to generate an answer.";
      setAnswer(answerText);
      setHistory((h) => [{ q: query, a: answerText }, ...h]);
    } catch {
      setAnswer("Error: Could not reach the query service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[28px] font-heading font-bold tracking-tight text-[var(--color-ink)]">
          Ask a question
        </h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-1">
          Query your safety data in plain language. The AI answers based only on your report data.
        </p>
      </div>

      {/* Query Input */}
      <div className="rounded-xl p-6 mb-6" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
        <div className="flex gap-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Ask about your safety data..."
            className="flex-1 px-4 py-3 text-sm rounded-lg outline-none transition-all duration-200 focus:ring-2"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-ink)",
            }}
          />
          <button
            onClick={() => handleSubmit()}
            disabled={loading || !question.trim()}
            className="px-5 py-3 text-sm font-medium text-white rounded-lg transition-all duration-200 hover:opacity-90 active:scale-[0.97] disabled:opacity-50 whitespace-nowrap"
            style={{ background: "var(--color-accent)" }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Thinking...
              </span>
            ) : "Ask"}
          </button>
        </div>

        {/* Example Queries */}
        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => { setQuestion(ex); handleSubmit(ex); }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 hover:opacity-80 active:scale-[0.97]"
              style={{
                background: "var(--color-surface-sunken)",
                color: "var(--color-ink-muted)",
                border: "1px solid var(--color-border)",
              }}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Answer */}
      {answer && (
        <div className="rounded-xl p-6 mb-6" style={{ background: "var(--color-accent-light)", border: "1px solid rgba(15,118,110,0.15)" }}>
          <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--color-accent)" }}>
            AI Answer
          </h3>
          <p className="text-sm leading-relaxed text-[var(--color-ink)]" style={{ maxWidth: "65ch" }}>
            {answer}
          </p>
        </div>
      )}

      {/* History */}
      {history.length > 1 && (
        <div className="rounded-xl p-6" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
          <h3 className="text-sm font-heading font-semibold text-[var(--color-ink)] mb-4">Previous queries</h3>
          <div className="space-y-4">
            {history.slice(1).map((item, i) => (
              <div key={i} className="p-3 rounded-lg" style={{ background: "var(--color-surface-sunken)" }}>
                <p className="text-xs font-medium text-[var(--color-ink-muted)] mb-1">Q: {item.q}</p>
                <p className="text-sm text-[var(--color-ink)]">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
