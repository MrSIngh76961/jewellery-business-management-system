"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { useToast } from "@/components/ui/Toast";
import { DEMO_TODAY } from "@/lib/config";
import { getSession } from "@/lib/services/auth";
import {
  WHATSAPP_AUTOMATION_EVENT,
  defaultWhatsAppData,
  renderWhatsAppTemplate,
  type WhatsAppAutomation,
  type WhatsAppData,
  type WhatsAppEvent,
  type WhatsAppMessage,
  type WhatsAppProviderConfig,
  type WhatsAppTemplate,
} from "@/lib/whatsapp-automation";
import { uid } from "@/lib/utils";

const STORAGE_KEY = "reinsoft-gold-whatsapp-v1";

interface WhatsAppState extends WhatsAppData {
  saveTemplate: (template: WhatsAppTemplate) => void;
  setAutomation: (id: string, enabled: boolean) => void;
  saveProviderConfig: (config: WhatsAppProviderConfig) => void;
  queueMessage: (templateId: string, event: Omit<WhatsAppEvent, "id">) => WhatsAppMessage;
  retryMessage: (id: string) => void;
}

const Context = createContext<WhatsAppState | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function WhatsAppProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const { logAudit, customers } = useApp();
  const [data, setData] = useState<WhatsAppData>(defaultWhatsAppData);
  const [loaded, setLoaded] = useState(false);
  const dataRef = useRef(data);

  useEffect(() => { dataRef.current = data; }, [data]);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved: unknown = JSON.parse(raw);
          if (!isRecord(saved)) throw new Error("Saved WhatsApp automation data has an invalid format.");
          const config = isRecord(saved.providerConfig) ? saved.providerConfig : {};
          setData({
            templates: Array.isArray(saved.templates) ? saved.templates as WhatsAppTemplate[] : defaultWhatsAppData.templates,
            automations: Array.isArray(saved.automations) ? saved.automations as WhatsAppAutomation[] : defaultWhatsAppData.automations,
            messages: Array.isArray(saved.messages) ? saved.messages as WhatsAppMessage[] : [],
            providerConfig: {
              provider: config.provider === "WhatsApp Business Cloud API" || config.provider === "Twilio" ? config.provider : "Not configured",
              senderId: typeof config.senderId === "string" ? config.senderId : "",
            },
          });
        }
      } catch (error) {
        toast(error instanceof Error ? `Could not load WhatsApp center: ${error.message}` : "Could not load WhatsApp center.", "error");
      } finally {
        setLoaded(true);
      }
    });
  }, [toast]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      toast(error instanceof Error ? `Could not save WhatsApp center: ${error.message}` : "Could not save WhatsApp center.", "error");
    }
  }, [data, loaded, toast]);

  const makeMessage = useCallback((template: WhatsAppTemplate, event: WhatsAppEvent): WhatsAppMessage => ({
    id: uid("WAMSG"),
    eventId: event.id,
    templateId: template.id,
    customerName: event.customerName,
    mobile: event.mobile,
    body: renderWhatsAppTemplate(template.body, { shop_name: "ReinSoft Gold", ...event.variables, customer_name: event.customerName }),
    status: "Pending",
    queuedAt: new Date().toISOString(),
    attempts: 0,
    providerReference: "",
    deliveryNote: "Queued locally only. No WhatsApp provider is connected; this message has not been sent.",
  }), []);

  useEffect(() => {
    if (!loaded) return;
    const onEvent = (rawEvent: Event) => {
      const event = (rawEvent as CustomEvent<WhatsAppEvent>).detail;
      if (!event || !event.id) return;
      if (event.mobile.replace(/\D/g, "").length < 10) {
        toast(`WhatsApp automation for ${event.customerName} was skipped because no valid mobile number is available.`, "error");
        return;
      }
      const current = dataRef.current;
      const automation = current.automations.find((rule) => rule.eventType === event.type && rule.enabled);
      if (!automation || current.messages.some((message) => message.eventId === event.id)) return;
      const template = current.templates.find((item) => item.id === automation.templateId && item.enabled);
      if (!template) {
        toast(`WhatsApp automation "${automation.label}" has no enabled template.`, "error");
        return;
      }
      const message = makeMessage(template, event);
      dataRef.current = { ...current, messages: [message, ...current.messages] };
      setData(dataRef.current);
      logAudit(`Queued WhatsApp automation "${automation.label}"`, { module: "WhatsApp", referenceId: message.id, newValue: `${message.customerName} · provider not connected` });
    };
    window.addEventListener(WHATSAPP_AUTOMATION_EVENT, onEvent);
    return () => window.removeEventListener(WHATSAPP_AUTOMATION_EVENT, onEvent);
  }, [loaded, logAudit, makeMessage, toast]);

  useEffect(() => {
    if (!loaded) return;
    const today = new Date(`${DEMO_TODAY}T00:00:00`);
    const monthDay = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    for (const customer of customers) {
      if (customer.birthday?.slice(5) === monthDay) {
        window.dispatchEvent(new CustomEvent<WhatsAppEvent>(WHATSAPP_AUTOMATION_EVENT, { detail: { id: `birthday-${customer.id}-${monthDay}`, type: "birthday", customerName: customer.name, mobile: customer.mobile, variables: {} } }));
      }
      if (customer.anniversary?.slice(5) === monthDay) {
        window.dispatchEvent(new CustomEvent<WhatsAppEvent>(WHATSAPP_AUTOMATION_EVENT, { detail: { id: `anniversary-${customer.id}-${monthDay}`, type: "anniversary", customerName: customer.name, mobile: customer.mobile, variables: {} } }));
      }
    }
  }, [customers, loaded]);

  const saveTemplate = useCallback((template: WhatsAppTemplate) => {
    if (getSession()?.role !== "Owner") throw new Error("Only an Owner can edit message templates.");
    if (!template.title.trim() || template.body.trim().length < 5) throw new Error("Enter a template title and a message body.");
    setData((current) => ({ ...current, templates: current.templates.map((item) => item.id === template.id ? { ...template, title: template.title.trim(), body: template.body.trim() } : item) }));
    logAudit(`Updated WhatsApp template ${template.title}`, { module: "WhatsApp", referenceId: template.id, newValue: template.body });
  }, [logAudit]);

  const setAutomation = useCallback((id: string, enabled: boolean) => {
    if (getSession()?.role !== "Owner") throw new Error("Only an Owner can configure WhatsApp automations.");
    setData((current) => ({ ...current, automations: current.automations.map((item) => item.id === id ? { ...item, enabled } : item) }));
    const automation = dataRef.current.automations.find((item) => item.id === id);
    logAudit(`${enabled ? "Enabled" : "Disabled"} WhatsApp automation ${automation?.label ?? id}`, { module: "WhatsApp", referenceId: id, newValue: String(enabled) });
  }, [logAudit]);

  const saveProviderConfig = useCallback((config: WhatsAppProviderConfig) => {
    if (getSession()?.role !== "Owner") throw new Error("Only an Owner can configure the WhatsApp provider.");
    if (config.senderId && !/^[+0-9 ()-]{6,24}$/.test(config.senderId)) throw new Error("Enter a valid sender number or clear the field.");
    setData((current) => ({ ...current, providerConfig: { provider: config.provider, senderId: config.senderId.trim() } }));
    logAudit(`Updated WhatsApp provider selection (${config.provider})`, { module: "WhatsApp", newValue: `Sender ${config.senderId.trim() || "not set"}; secrets remain server-side` });
  }, [logAudit]);

  const queueMessage = useCallback((templateId: string, eventDraft: Omit<WhatsAppEvent, "id">) => {
    const current = dataRef.current;
    const template = current.templates.find((item) => item.id === templateId && item.enabled);
    if (!template) throw new Error("Select an enabled message template.");
    if (eventDraft.customerName.trim().length < 2 || eventDraft.mobile.replace(/\D/g, "").length < 10) throw new Error("Select a customer with a valid mobile number.");
    const event: WhatsAppEvent = { ...eventDraft, id: uid("WAEVT") };
    const message = makeMessage(template, event);
    const next = { ...current, messages: [message, ...current.messages] };
    dataRef.current = next;
    setData(next);
    logAudit(`Queued WhatsApp message "${template.title}"`, { module: "WhatsApp", referenceId: message.id, newValue: `${message.customerName}; not sent because no provider is connected` });
    return message;
  }, [logAudit, makeMessage]);

  const retryMessage = useCallback((id: string) => {
    const message = dataRef.current.messages.find((item) => item.id === id);
    if (!message || (message.status !== "Failed" && message.status !== "Pending")) throw new Error("Only pending or failed messages can be retried.");
    const updated = { ...message, status: "Pending" as const, attempts: message.attempts + 1, deliveryNote: "Retry queued locally only. No WhatsApp provider is connected; this message has not been sent." };
    const next = { ...dataRef.current, messages: dataRef.current.messages.map((item) => item.id === id ? updated : item) };
    dataRef.current = next;
    setData(next);
    logAudit(`Requeued WhatsApp message ${id}`, { module: "WhatsApp", referenceId: id, newValue: updated.deliveryNote });
  }, [logAudit]);

  const value = useMemo<WhatsAppState>(() => ({ ...data, saveTemplate, setAutomation, saveProviderConfig, queueMessage, retryMessage }), [data, saveTemplate, setAutomation, saveProviderConfig, queueMessage, retryMessage]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useWhatsApp() {
  const context = useContext(Context);
  if (!context) throw new Error("useWhatsApp must be used inside WhatsAppProvider");
  return context;
}
