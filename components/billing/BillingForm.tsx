"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { useApp } from "@/components/providers/AppProvider";
import { useShop } from "@/components/providers/ShopProvider";
import { useOperations } from "@/components/providers/OperationsProvider";
import { useGoldAccounting } from "@/components/providers/GoldAccountingProvider";
import { KycWarning } from "./KycWarning";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { calcInvoice } from "@/lib/billing";
import { DEMO_TODAY } from "@/lib/config";
import { billSchema, type BillForm } from "@/lib/schemas";
import { defaultItem, emptyOldGold } from "@/lib/seed";
import type { Invoice } from "@/lib/types";
import { getSession } from "@/lib/services/auth";
import { BillingSummary } from "./BillingSummary";
import { CustomerSelector } from "./CustomerSelector";
import { GoldItemTable } from "./GoldItemTable";
import { InvoiceHeader } from "./InvoiceHeader";
import { OldGoldSection } from "./OldGoldSection";
import { PaymentSection } from "./PaymentSection";

export function BillingForm({ invoice, customerId, stockId }: { invoice?: Invoice; customerId?: string; stockId?: string }) {
  const { settings, nextInvoiceNumber, addInvoice, updateInvoice, getCustomer } = useApp();
  const gold = useGoldAccounting();
  const { stock, markSoldByTags } = useShop();
  const { requestApproval } = useOperations();
  const stockItem = stockId ? stock.find((s) => s.id === stockId && s.status === "In Stock") : undefined;
  const toast = useToast();
  const router = useRouter();

  const defaults: BillForm = invoice
    ? {
        customerId: invoice.customerId,
        date: invoice.date,
        status: invoice.status,
        items: invoice.items.map(({ name, weight, purity, rate, making, wastage, other }) => ({ name, weight, purity, rate, making, wastage, other })),
        discount: invoice.discount,
        taxRate: invoice.taxRate,
        makingTaxRate: invoice.makingTaxRate ?? invoice.taxRate,
        oldGold: invoice.oldGold ?? emptyOldGold(settings),
        amountPaid: invoice.amountPaid,
        notes: invoice.notes,
      }
    : {
        customerId: customerId && getCustomer(customerId) ? customerId : "",
        date: DEMO_TODAY,
        status: "Paid",
        items: stockItem
          ? [{ ...defaultItem(settings, stockItem.purity, `${stockItem.name} (${stockItem.tag})`, gold.purities), weight: stockItem.weight, making: stockItem.making }]
          : [{ ...defaultItem(settings, "22K", "Gold Ring", gold.purities), weight: 8.25 }],
        discount: 0,
        taxRate: settings.defaultTax,
        makingTaxRate: settings.defaultMakingTax,
        oldGold: emptyOldGold(settings),
        amountPaid: 0,
        notes: "",
      };

  const methods = useForm<BillForm>({ resolver: zodResolver(billSchema), defaultValues: defaults, mode: "onChange" });
  const invoiceNumber = invoice?.id ?? nextInvoiceNumber();

  const save = methods.handleSubmit(
    (v) => {
      const draft = { ...v, oldGold: v.oldGold.weight > 0 ? v.oldGold : undefined, amountPaid: calcInvoice(v).paid };
      try {
        const subtotal = calcInvoice(v).subtotal;
        const approvalLimit = subtotal * settings.approvalDiscountPercent / 100;
        if (!invoice && getSession()?.role !== "Owner" && v.discount > approvalLimit) {
          requestApproval({
            action: "Large discount",
            module: "Billing",
            reference: invoiceNumber,
            details: `${v.discount.toLocaleString("en-IN", { style: "currency", currency: "INR" })} discount · ${((v.discount / Math.max(1, subtotal)) * 100).toFixed(1)}% of subtotal`,
            reason: "Discount exceeds the configured staff approval threshold.",
            payload: { invoiceDraft: JSON.stringify({ ...v, amountPaid: calcInvoice(v).paid }) },
          });
          toast("Invoice held for Owner discount approval.", "info");
          router.push("/approvals");
          return;
        }
        if (invoice) {
          updateInvoice(invoice.id, draft);
          toast(`Invoice ${invoice.id} updated`);
        } else {
          const created = addInvoice(draft);
          markSoldByTags(draft.items.map((i) => i.name));
          toast(`Invoice ${created.id} saved`);
        }
        router.push("/invoices");
      } catch (error) {
        toast(error instanceof Error ? error.message : "Could not save invoice.", "error");
      }
    },
    () => toast("Please fix the highlighted fields", "error"),
  );

  return (
    <FormProvider {...methods}>
      <form onSubmit={save} noValidate>
        <PageHeader title={invoice ? `Edit Invoice ${invoice.id}` : "Create New Gold Bill"} subtitle="Multi-item gold billing with automatic calculations.">
          <Button onClick={() => router.push("/invoices")}>Cancel</Button>
          <Button type="submit" variant="primary" loading={methods.formState.isSubmitting}>
            <Save className="h-4 w-4" /> Save Invoice
          </Button>
        </PageHeader>

        <Card>
          <CustomerSelector />
          <InvoiceHeader invoiceNumber={invoiceNumber} />
        </Card>
        <GoldItemTable>
          <BillingSummary />
        </GoldItemTable>
        <OldGoldSection />
        <KycWarning />
        <PaymentSection />
      </form>
    </FormProvider>
  );
}
