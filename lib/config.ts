import type { Role } from "./types";

export const APP_NAME = "ReinSoft Gold";
export const APP_TAGLINE = "Gold & Jewellery Billing";

/** Fixed "today" so the seeded demo data always lines up with dashboards. */
export const DEMO_TODAY = "2026-09-17";
export const DEMO_NOW = "2026-09-17T11:30:00";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", crumb: "Dashboard / Overview", roles: ["Owner", "Staff", "Accountant"] },
  { href: "/billing/new", label: "New Bill", crumb: "Billing / New Invoice", roles: ["Owner", "Staff"] },
  { href: "/invoices", label: "Invoices", crumb: "Invoices / All Invoices", roles: ["Owner", "Staff", "Accountant"] },
  { href: "/customers", label: "Customers", crumb: "Customers / Directory", roles: ["Owner", "Staff", "Accountant"] },
  { href: "/stock", label: "Stock", crumb: "Stock / Inventory", roles: ["Owner", "Staff"] },
  { href: "/ledger", label: "Udhaar Ledger", crumb: "Ledger / Udhaar", roles: ["Owner", "Staff", "Accountant"] },
  { href: "/orders", label: "Karigar Orders", crumb: "Orders / Karigar", roles: ["Owner", "Staff"] },
  { href: "/karigars", label: "Karigar Metal Ledger", crumb: "Orders / Karigar Metal Ledger", roles: ["Owner", "Staff", "Accountant"] },
  { href: "/gold-accounting", label: "Gold Accounting", crumb: "Gold / Metal Accounting", roles: ["Owner", "Accountant"] },
  { href: "/gold-accounting/purity", label: "Fine Gold & Purity", crumb: "Gold / Purity Conversion", roles: ["Owner", "Accountant"] },
  { href: "/melting", label: "Melting & Refining", crumb: "Gold / Melting & Refining", roles: ["Owner", "Accountant"] },
  { href: "/assay", label: "Gold Assay & Testing", crumb: "Gold / Assay & Testing", roles: ["Owner", "Accountant"] },
  { href: "/production", label: "Manufacturing", crumb: "Production / Manufacturing", roles: ["Owner", "Staff"] },
  { href: "/quotations", label: "Quotations", crumb: "Sales / Quotations & Estimates", roles: ["Owner", "Staff", "Accountant"] },
  { href: "/gold-rate/simulator", label: "Gold Rate Simulator", crumb: "Gold / Rate Scenario Simulator", roles: ["Owner"] },
  { href: "/risk-center", label: "Risk Center", crumb: "Security / Risk & Anomaly Center", roles: ["Owner"] },
  { href: "/executive-dashboard", label: "Executive Dashboard", crumb: "Dashboard / Owner Executive", roles: ["Owner"] },
  { href: "/loans", label: "Girvi / Loans", crumb: "Loans / Girvi", roles: ["Owner", "Accountant"] },
  { href: "/sales", label: "Sales History", crumb: "Sales / History", roles: ["Owner", "Accountant"] },
  { href: "/reports", label: "Reports", crumb: "Reports / Analytics", roles: ["Owner", "Accountant"] },
  { href: "/reports/profit", label: "Profit & Margin", crumb: "Reports / Profit & Margin", roles: ["Owner", "Accountant"] },
  { href: "/purchases", label: "Purchases", crumb: "Purchases / Suppliers", roles: ["Owner", "Staff", "Accountant"] },
  { href: "/suppliers", label: "Suppliers", crumb: "Purchases / Suppliers", roles: ["Owner", "Staff", "Accountant"] },
  { href: "/stones", label: "Diamond & Stones", crumb: "Inventory / Diamond & Stones", roles: ["Owner", "Staff", "Accountant"] },
  { href: "/returns", label: "Sales Returns", crumb: "Sales / Returns & Exchange", roles: ["Owner", "Staff"] },
  { href: "/expenses", label: "Expenses", crumb: "Expenses / Operating Costs", roles: ["Owner", "Accountant"] },
  { href: "/day-close", label: "Day Closing", crumb: "Cash Counter / Day Closing", roles: ["Owner", "Staff", "Accountant"] },
  { href: "/bookings", label: "Bookings", crumb: "Bookings / Advance Orders", roles: ["Owner", "Staff"] },
  { href: "/approvals", label: "Approvals", crumb: "Approvals / Owner Review", roles: ["Owner", "Staff", "Accountant"] },
  { href: "/audit-log", label: "Audit Log", crumb: "Security / Audit Log", roles: ["Owner", "Accountant"] },
  { href: "/whatsapp", label: "WhatsApp Center", crumb: "Messaging / WhatsApp Automation", roles: ["Owner", "Staff", "Accountant"] },
  { href: "/ai-assistant", label: "AI Business Assistant", crumb: "Insights / AI Business Assistant", roles: ["Owner", "Accountant"] },
  { href: "/backup", label: "Backup & Data", crumb: "Data / Backup & Recovery", roles: ["Owner"] },
  { href: "/settings", label: "Settings", crumb: "Settings / Configuration", roles: ["Owner"] },
] as const satisfies readonly { href: string; label: string; crumb: string; roles: readonly Role[] }[];

export function canAccess(role: Role, pathname: string) {
  const item = [...NAV_ITEMS].reverse().find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`) || (n.href === "/billing/new" && pathname.startsWith("/billing")));
  return !item || (item.roles as readonly Role[]).includes(role);
}