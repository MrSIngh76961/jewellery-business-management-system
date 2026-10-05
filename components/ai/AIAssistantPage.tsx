"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHead } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useReady } from "@/lib/hooks";

const SUGGESTIONS = ["Today's Sales", "Gold Stock", "Outstanding Payments", "Top Customers", "Dead Stock", "Monthly Profit", "Karigar Gold", "Top Categories"];
type ProviderState = "Checking" | "Not configured" | "Unavailable" | "Configured";

export function AIAssistantPage() {
  const ready = useReady();
  const [provider, setProvider] = useState<ProviderState>("Checking");
  const [providerMessage, setProviderMessage] = useState("Checking the server-side AI provider status.");
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/ai-assistant", { cache: "no-store" })
      .then(async (response) => {
        const result: unknown = await response.json();
        if (!active) return;
        if (result && typeof result === "object" && "configured" in result && result.configured === false) {
          setProvider("Not configured");
          setProviderMessage("AI provider is not configured. No business data has been processed or sent to an external service.");
        } else if (response.ok) {
          setProvider("Configured");
          setProviderMessage("AI provider is available through the server-side integration.");
        } else {
          setProvider("Unavailable");
          setProviderMessage("AI provider status could not be confirmed.");
        }
      })
      .catch(() => {
        if (!active) return;
        setProvider("Unavailable");
        setProviderMessage("AI status could not be reached. No business data was sent.");
      });
    return () => { active = false; };
  }, []);

  if (!ready) return <PageSkeleton />;
  const ask = async () => {
    if (provider !== "Configured" || question.trim().length < 3) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = result && typeof result === "object" && "message" in result && typeof result.message === "string" ? result.message : "The AI service is unavailable.";
        throw new Error(message);
      }
      throw new Error("The server returned no verified answer.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The AI service did not return a verified answer.");
    } finally {
      setBusy(false);
    }
  };

  return <>
    <PageHeader title="AI Business Assistant" subtitle="Business questions will be answered only through an authorized server-side AI integration." />
    <Card className="mb-4 border-gold/30">
      <CardHead title="Provider status"><span className="text-xs font-semibold text-muted">{provider}</span></CardHead>
      <p role="status" className="text-sm text-muted">{providerMessage}</p>
      <p className="mt-2 text-xs text-muted">Provider credentials and data authorization belong on the server. This browser never receives AI API keys, and no answers are fabricated.</p>
    </Card>
    <Card className="mb-4">
      <CardHead title="Ask a business question" />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input label="Question" value={question} disabled={provider !== "Configured" || busy} placeholder="Ask about sales, gold, ledger or stock…" onChange={(event) => setQuestion(event.target.value)} />
        <div className="flex items-end"><Button variant="primary" disabled={provider !== "Configured" || busy || question.trim().length < 3} loading={busy} onClick={ask}>Ask assistant</Button></div>
      </div>
      {provider !== "Configured" && <p className="mt-2 text-xs text-muted">Questions are disabled until a secure AI provider and server-side authorization adapter are configured.</p>}
      {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
      <div className="mt-4">
        <h3 className="mb-2 text-xs font-semibold text-muted">Suggested questions</h3>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((suggestion) => <button key={suggestion} type="button" onClick={() => setQuestion(`What were ${suggestion.toLocaleLowerCase()}?`)} className="rounded-full border border-line bg-card px-3 py-1.5 text-xs text-ink transition hover:border-gold/60">{suggestion}</button>)}
        </div>
      </div>
    </Card>
    <Card>
      <CardHead title="Data access boundary" />
      <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
        <li>The client sends only a question to the application route; it does not attach localStorage records.</li>
        <li>The current server route rejects requests while no provider is configured.</li>
        <li>A production adapter still needs server-authenticated roles, explicit module-level authorization, provider configuration, and audited data minimization before it can query customer or financial records.</li>
      </ul>
    </Card>
  </>;
}
