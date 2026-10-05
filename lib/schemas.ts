import { z } from "zod";
import { calcInvoice } from "./billing";

const numberField = (label: string) =>
  z.number({ error: `${label} is required` }).min(0, `${label} cannot be negative`);

export const itemSchema = z.object({
  name: z.string().trim().min(1, "Item name is required"),
  weight: z.number({ error: "Weight is required" }).positive("Weight must be above 0"),
  purity: z.string().trim().min(1, "Select a configured purity"),
  rate: z.number({ error: "Rate is required" }).positive("Rate must be above 0"),
  making: numberField("Making"),
  wastage: z.number({ error: "Wastage is required" }).min(0, "Min 0").max(100, "Max 100"),
  other: numberField("Other"),
});

export const oldGoldSchema = z.object({
  description: z.string().max(80),
  weight: z.number({ error: "Weight is required" }).min(0, "Cannot be negative"),
  purity: z.string().trim().min(1, "Select a configured purity"),
  rate: z.number({ error: "Rate is required" }).min(0, "Cannot be negative"),
  deduction: z.number({ error: "Required" }).min(0, "Min 0").max(100, "Max 100"),
});

export const billSchema = z
  .object({
    customerId: z.string().min(1, "Select a customer"),
    date: z.string().min(1, "Invoice date is required"),
    status: z.enum(["Paid", "Partial", "Unpaid"]),
    items: z.array(itemSchema).min(1, "Add at least one gold item"),
    discount: numberField("Discount"),
    taxRate: z.number({ error: "GST is required" }).min(0).max(100, "Max 100%"),
    makingTaxRate: z.number({ error: "GST is required" }).min(0).max(100, "Max 100%"),
    oldGold: oldGoldSchema,
    amountPaid: numberField("Amount paid"),
    notes: z.string().max(300),
  })
  .superRefine((v, ctx) => {
    const calc = calcInvoice(v);
    if (v.discount > calc.subtotal) {
      ctx.addIssue({ code: "custom", path: ["discount"], message: "Discount exceeds subtotal" });
    }
    if (v.oldGold.weight > 0 && v.oldGold.rate <= 0) {
      ctx.addIssue({ code: "custom", path: ["oldGold", "rate"], message: "Enter the old gold rate" });
    }
    if (v.status === "Partial" && !(v.amountPaid > 0 && v.amountPaid < calc.grand)) {
      ctx.addIssue({
        code: "custom",
        path: ["amountPaid"],
        message: "Partial payment must be above ₹0 and below the grand total",
      });
    }
  });

export type BillForm = z.infer<typeof billSchema>;

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Enter the customer's full name"),
  mobile: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, "").replace(/^91/, "").length === 10, "Enter a valid 10-digit mobile number"),
  address: z.string().max(200),
  email: z.union([z.literal(""), z.email("Enter a valid email")]),
  birthday: z.string(),
  anniversary: z.string(),
  pan: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v), "PAN format: ABCDE1234F"),
  kycVerified: z.boolean(),
});
export type CustomerForm = z.infer<typeof customerSchema>;

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or username"),
  password: z.string().min(1, "Enter your password"),
  remember: z.boolean(),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: z.string().min(8, "Use at least 8 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { path: ["confirm"], message: "Passwords do not match" });
export type PasswordForm = z.infer<typeof passwordSchema>;
