export const WHATSAPP_AUTOMATION_EVENT = "reinsoft-gold:whatsapp-automation";

export const WHATSAPP_EVENT_TYPES = [
  "invoice_created",
  "payment_received",
  "payment_due",
  "order_created",
  "order_ready",
  "order_delivered",
  "booking_created",
  "birthday",
  "anniversary",
  "loan_reminder",
  "ledger_reminder",
  "customer_statement",
] as const;

export type WhatsAppEventType = (typeof WHATSAPP_EVENT_TYPES)[number];
export type WhatsAppProviderName = "Not configured" | "WhatsApp Business Cloud API" | "Twilio";
export type WhatsAppMessageStatus = "Pending" | "Sent" | "Delivered" | "Failed";

export interface WhatsAppTemplate {
  id: string;
  title: string;
  eventType: WhatsAppEventType;
  body: string;
  enabled: boolean;
}

export interface WhatsAppAutomation {
  id: string;
  eventType: WhatsAppEventType;
  label: string;
  templateId: string;
  enabled: boolean;
}

export interface WhatsAppMessage {
  id: string;
  eventId: string;
  templateId: string;
  customerName: string;
  mobile: string;
  body: string;
  status: WhatsAppMessageStatus;
  queuedAt: string;
  attempts: number;
  providerReference: string;
  deliveryNote: string;
}

export interface WhatsAppProviderConfig {
  provider: WhatsAppProviderName;
  senderId: string;
}

export interface WhatsAppEvent {
  id: string;
  type: WhatsAppEventType;
  customerName: string;
  mobile: string;
  variables: Record<string, string>;
}

export interface WhatsAppData {
  templates: WhatsAppTemplate[];
  automations: WhatsAppAutomation[];
  messages: WhatsAppMessage[];
  providerConfig: WhatsAppProviderConfig;
}

const templateData: Array<Pick<WhatsAppTemplate, "id" | "title" | "eventType" | "body">> = [
  { id: "invoice-generated", title: "Invoice Generated", eventType: "invoice_created", body: "Hello {{customer_name}}, your invoice {{invoice_number}} of ₹{{amount}} has been generated. Balance due: ₹{{balance}}. Thank you for choosing {{shop_name}}." },
  { id: "payment-received", title: "Payment Received", eventType: "payment_received", body: "Hello {{customer_name}}, we received your payment of ₹{{amount}}. Remaining balance: ₹{{balance}}. Thank you, {{shop_name}}." },
  { id: "payment-due", title: "Payment Due", eventType: "payment_due", body: "Hello {{customer_name}}, a payment of ₹{{balance}} is due by {{due_date}}. Please contact {{shop_name}} if you have already paid." },
  { id: "order-confirmation", title: "Order Confirmation", eventType: "order_created", body: "Hello {{customer_name}}, your order {{order_number}} has been confirmed by {{shop_name}}." },
  { id: "order-ready", title: "Order Ready", eventType: "order_ready", body: "Hello {{customer_name}}, your order {{order_number}} is ready. Please contact {{shop_name}} to arrange collection." },
  { id: "order-delivered", title: "Order Delivered", eventType: "order_delivered", body: "Hello {{customer_name}}, order {{order_number}} has been marked delivered. Thank you for choosing {{shop_name}}." },
  { id: "booking-confirmation", title: "Booking Confirmation", eventType: "booking_created", body: "Hello {{customer_name}}, booking {{order_number}} for ₹{{amount}} is confirmed with {{shop_name}}." },
  { id: "birthday-wish", title: "Birthday Wish", eventType: "birthday", body: "Dear {{customer_name}}, warm birthday wishes from all of us at {{shop_name}}!" },
  { id: "anniversary-wish", title: "Anniversary Wish", eventType: "anniversary", body: "Dear {{customer_name}}, wishing you a wonderful anniversary. With warm wishes from {{shop_name}}." },
  { id: "loan-reminder", title: "Loan Reminder", eventType: "loan_reminder", body: "Hello {{customer_name}}, this is a reminder regarding loan {{invoice_number}} and amount ₹{{balance}}. Please contact {{shop_name}} for assistance." },
  { id: "ledger-reminder", title: "Ledger Reminder", eventType: "ledger_reminder", body: "Hello {{customer_name}}, your outstanding ledger balance is ₹{{balance}}. Please contact {{shop_name}} if you need a statement." },
  { id: "customer-statement", title: "Customer Statement", eventType: "customer_statement", body: "Hello {{customer_name}}, your statement from {{shop_name}} shows an outstanding balance of ₹{{balance}}." },
];

export const defaultWhatsAppData: WhatsAppData = {
  templates: templateData.map((template) => ({ ...template, enabled: true })),
  automations: templateData.map((template) => ({
    id: `auto-${template.id}`,
    eventType: template.eventType,
    label: template.title,
    templateId: template.id,
    enabled: false,
  })),
  messages: [],
  providerConfig: { provider: "Not configured", senderId: "" },
};

export function renderWhatsAppTemplate(template: string, variables: Record<string, string>) {
  return template.replace(/\{\{([a-z_]+)\}\}/gi, (token, key: string) => variables[key] ?? token);
}

export function publishWhatsAppEvent(event: WhatsAppEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<WhatsAppEvent>(WHATSAPP_AUTOMATION_EVENT, { detail: event }));
}
