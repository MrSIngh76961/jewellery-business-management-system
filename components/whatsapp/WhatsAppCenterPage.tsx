"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHead } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { SimpleTable } from "@/components/ui/SimpleTable";
import { useApp } from "@/components/providers/AppProvider";
import { useOperations } from "@/components/providers/OperationsProvider";
import { useShop } from "@/components/providers/ShopProvider";
import { useWhatsApp } from "@/components/providers/WhatsAppProvider";
import { useToast } from "@/components/ui/Toast";
import { invoiceTotals } from "@/lib/billing";
import { invoiceBalance } from "@/lib/selectors";
import { useReady } from "@/lib/hooks";
import { getSession } from "@/lib/services/auth";
import { type WhatsAppProviderName, type WhatsAppTemplate } from "@/lib/whatsapp-automation";

function formatStatus(status: string) {
  return status === "Delivered" || status === "Sent" ? "Paid" : status === "Failed" ? "Unpaid" : "Partial";
}

export function WhatsAppCenterPage() {
  const ready = useReady();
  const toast = useToast();
  const whatsapp = useWhatsApp();
  const { customers, invoices, settings } = useApp();
  const { bookings } = useOperations();
  const { orders } = useShop();
  const canManage = getSession()?.role === "Owner";
  const [customerId, setCustomerId] = useState("");
  const [templateId, setTemplateId] = useState("invoice-generated");
  const [dueDate, setDueDate] = useState("");
  const [editing, setEditing] = useState<WhatsAppTemplate | null>(null);
  const [configDraft, setConfigDraft] = useState<typeof whatsapp.providerConfig | null>(null);
  const config = configDraft ?? whatsapp.providerConfig;
  const [error, setError] = useState("");

  const selectedCustomer = customers.find((customer) => customer.id === customerId);
  const selectedTemplate = whatsapp.templates.find((template) => template.id === templateId);
  const counters = useMemo(() => ({
    sent: whatsapp.messages.filter((message) => message.status === "Sent").length,
    delivered: whatsapp.messages.filter((message) => message.status === "Delivered").length,
    failed: whatsapp.messages.filter((message) => message.status === "Failed").length,
    pending: whatsapp.messages.filter((message) => message.status === "Pending").length,
  }), [whatsapp.messages]);
  if (!ready) return <PageSkeleton />;
  const queued = () => {
    if (!selectedCustomer || !selectedTemplate) return setError("Select a customer and an enabled message template.");
    if (selectedTemplate.eventType === "payment_due" && !dueDate) return setError("Enter the due date from the customer agreement; it is not inferred from the invoice date.");
    const customerInvoices = invoices.filter((invoice) => invoice.customerId === selectedCustomer.id);
    const latestInvoice = customerInvoices[0];
    const latestOrder = orders.find((order) => order.customerId === selectedCustomer.id);
    const latestBooking = bookings.find((booking) => booking.customerId === selectedCustomer.id);
    const total = latestInvoice ? invoiceTotals(latestInvoice).grand : 0;
    const balance = customerInvoices.reduce((sum, invoice) => sum + invoiceBalance(invoice), 0);
    try {
      const message = whatsapp.queueMessage(selectedTemplate.id, {
        type: selectedTemplate.eventType,
        customerName: selectedCustomer.name,
        mobile: selectedCustomer.mobile,
        variables: {
          invoice_number: latestInvoice?.id ?? "—",
          amount: Math.round(total).toLocaleString("en-IN"),
          balance: Math.round(balance).toLocaleString("en-IN"),
          order_number: latestBooking?.reference ?? latestOrder?.id ?? "—",
          due_date: selectedTemplate.eventType === "payment_due" ? dueDate : latestBooking?.deliveryDate ?? latestOrder?.dueDate ?? "Not applicable",
          shop_name: settings.businessName,
        },
      });
      toast(`Message ${message.id} queued locally. It has not been sent.`);
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Message could not be queued."); }
  };
  const saveConfig = () => {
    try {
      whatsapp.saveProviderConfig(config);
      toast("Provider preference saved. No provider is connected and no message was sent.");
      setConfigDraft(null);
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Provider settings could not be saved."); }
  };
  return <>
    <PageHeader title="WhatsApp Automation Center" subtitle="Manage templates and event rules; official delivery stays disabled until a server-side provider is connected." />
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Messages Sent" value={counters.sent} sub="Provider-confirmed only" />
      <StatCard label="Delivered" value={counters.delivered} delay={0.05} />
      <StatCard label="Failed" value={counters.failed} delay={0.1} />
      <StatCard label="Pending" value={counters.pending} delay={0.15} sub="Queued locally; not sent" />
    </div>
    <Card className="mb-4 border-gold/30">
      <CardHead title="Provider connection" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Preferred provider" value={config.provider} disabled={!canManage} onChange={(event) => setConfigDraft({ ...config, provider: event.target.value as WhatsAppProviderName })}>
          <option>Not configured</option><option>WhatsApp Business Cloud API</option><option>Twilio</option>
        </Select>
        <Input label="Sender number / account reference" value={config.senderId} disabled={!canManage} onChange={(event) => setConfigDraft({ ...config, senderId: event.target.value })} hint="Non-secret identifier only; no API key or token is accepted in this page." />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-xs text-muted">Not connected · outgoing messages remain queued locally. Configure credentials and a delivery adapter on the server before enabling delivery.</p>
        {canManage && <Button size="sm" variant="primary" onClick={saveConfig}>Save provider preference</Button>}
      </div>
      {!canManage && <p className="mt-2 text-xs text-muted">Only the Owner can change provider settings.</p>}
    </Card>

    <Card className="mb-4">
      <CardHead title="Event automations"><span className="text-xs text-muted">Disabled by default until the official provider is connected</span></CardHead>
      <SimpleTable rows={whatsapp.automations} rowKey={(rule) => rule.id} minWidth={720} empty="No automation rules." columns={[
        { head: "Event", cell: (rule) => <><b>{rule.label}</b><span className="block text-xs text-muted">{rule.eventType.replaceAll("_", " ")}</span></> },
        { head: "Template", cell: (rule) => whatsapp.templates.find((template) => template.id === rule.templateId)?.title ?? "Template missing" },
        { head: "Automation", cell: (rule) => <button type="button" role="switch" aria-checked={rule.enabled} aria-label={`${rule.label} automation`} disabled={!canManage} onClick={() => { try { whatsapp.setAutomation(rule.id, !rule.enabled); } catch (cause) { toast(cause instanceof Error ? cause.message : "Automation could not be updated.", "error"); } }} className={`rounded-full px-3 py-1 text-xs font-semibold ${rule.enabled ? "bg-brand text-white" : "bg-cream text-muted"} disabled:cursor-not-allowed disabled:opacity-50`}>{rule.enabled ? "Enabled" : "Disabled"}</button> },
      ]} />
    </Card>

    <Card className="mb-4">
      <CardHead title="Queue a message for review"><span className="text-xs text-muted">Local queue only; nothing is transmitted</span></CardHead>
      <div className="grid gap-3 sm:grid-cols-3">
        <Select label="Customer" value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.mobile}</option>)}</Select>
        <Select label="Message template" value={templateId} onChange={(event) => setTemplateId(event.target.value)}>{whatsapp.templates.filter((template) => template.enabled).map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}</Select>
        {selectedTemplate?.eventType === "payment_due" && <Input label="Agreed due date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />}
        <div className="flex items-end"><Button variant="primary" onClick={queued}>Queue for review</Button></div>
      </div>
      {selectedTemplate && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-cream/60 p-3 text-xs text-muted">{selectedTemplate.body}</p>}
      {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
    </Card>

    <Card className="mb-4">
      <CardHead title="Message templates"><span className="text-xs text-muted">{whatsapp.templates.length} templates</span></CardHead>
      <SimpleTable rows={whatsapp.templates} rowKey={(template) => template.id} minWidth={760} empty="No message templates configured." columns={[
        { head: "Template", cell: (template) => <><b>{template.title}</b><span className="block text-xs text-muted">{template.eventType.replaceAll("_", " ")}</span></> },
        { head: "Message preview", cell: (template) => <span className="block max-w-[34rem] truncate">{template.body}</span> },
        { head: "State", cell: (template) => <Badge tone={template.enabled ? "Paid" : "neutral"}>{template.enabled ? "Enabled" : "Disabled"}</Badge> },
        { head: "Action", cell: (template) => canManage ? <Button size="sm" onClick={() => setEditing(template)}>Edit template</Button> : "Owner only" },
      ]} />
      <p className="mt-3 text-xs text-muted">Variables: {"{{customer_name}} {{invoice_number}} {{amount}} {{balance}} {{order_number}} {{due_date}} {{shop_name}}"}</p>
    </Card>

    <Card>
      <CardHead title="Message history"><span className="text-xs text-muted">{whatsapp.messages.length} locally queued messages</span></CardHead>
      <SimpleTable rows={whatsapp.messages} rowKey={(message) => message.id} minWidth={860} empty="No messages have been queued." columns={[
        { head: "Queued", cell: (message) => new Date(message.queuedAt).toLocaleString("en-IN") },
        { head: "Customer", cell: (message) => <>{message.customerName}<span className="block text-xs text-muted">{message.mobile || "No mobile on file"}</span></> },
        { head: "Template / status", cell: (message) => <>{whatsapp.templates.find((template) => template.id === message.templateId)?.title ?? message.templateId}<span className="block"><Badge tone={formatStatus(message.status)}>{message.status}</Badge></span></> },
        { head: "Message / delivery", cell: (message) => <><span className="block max-w-[34rem] whitespace-pre-wrap text-xs">{message.body}</span><span className="mt-1 block text-xs text-muted">{message.deliveryNote}</span></> },
        { head: "Attempts", cell: (message) => message.attempts },
        { head: "Action", cell: (message) => message.status === "Pending" || message.status === "Failed" ? <Button size="sm" onClick={() => { try { whatsapp.retryMessage(message.id); toast("Message requeued locally. It has not been sent."); } catch (cause) { toast(cause instanceof Error ? cause.message : "Message could not be requeued.", "error"); } }}>Retry</Button> : "—" },
      ]} />
    </Card>

    <TemplateEditModal key={editing?.id ?? "closed"} template={editing} onClose={() => setEditing(null)} onSave={(template) => {
      try { whatsapp.saveTemplate(template); toast("Message template updated."); setEditing(null); }
      catch (cause) { toast(cause instanceof Error ? cause.message : "Template could not be updated.", "error"); }
    }} />
  </>;
}

function TemplateEditModal({ template, onClose, onSave }: { template: WhatsAppTemplate | null; onClose: () => void; onSave: (template: WhatsAppTemplate) => void }) {
  const [draft, setDraft] = useState<WhatsAppTemplate | null>(template);
  const [error, setError] = useState("");
  return <Modal open={!!template && !!draft} onClose={onClose} title={template ? `Edit template · ${template.title}` : "Edit template"} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!draft} onClick={() => { if (draft) { if (draft.title.trim().length < 3 || draft.body.trim().length < 5) return setError("Enter a title and message body."); onSave(draft); } }}>Save template</Button></>}>
    {draft && <div className="space-y-3">
      <Input label="Template title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
      <Textarea label="Message body" rows={6} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} />Template enabled</label>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>}
  </Modal>;
}
