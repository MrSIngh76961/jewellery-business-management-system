"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useApp } from "@/components/providers/AppProvider";
import { useOperations } from "@/components/providers/OperationsProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { customerSchema, type CustomerForm } from "@/lib/schemas";
import type { Customer } from "@/lib/types";
import { getSession } from "@/lib/services/auth";

const EMPTY: CustomerForm = { name: "", mobile: "", address: "", email: "", birthday: "", anniversary: "", pan: "", kycVerified: false };

/** Add (no `customer`) or edit (with `customer`) modal. */
export function CustomerModal({ open, onClose, customer, onSaved }: { open: boolean; onClose: () => void; customer?: Customer; onSaved?: (c: Customer) => void }) {
  const { addCustomer, updateCustomer, settings } = useApp();
  const { requestApproval } = useOperations();
  const toast = useToast();
  const { register, handleSubmit, reset, formState } = useForm<CustomerForm>({ resolver: zodResolver(customerSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (open)
      reset(
        customer
          ? { name: customer.name, mobile: customer.mobile, address: customer.address ?? "", email: customer.email ?? "", birthday: customer.birthday ?? "", anniversary: customer.anniversary ?? "", pan: customer.pan ?? "", kycVerified: !!customer.kycVerified }
          : EMPTY,
      );
  }, [open, customer, reset]);

  const submit = (v: CustomerForm) => {
    if (customer) {
      const sensitiveChanged = v.name !== customer.name || v.mobile !== customer.mobile || v.email !== (customer.email ?? "") || v.pan !== (customer.pan ?? "") || v.kycVerified !== !!customer.kycVerified;
      if (sensitiveChanged && settings.approvalRequireSensitiveDataChange && getSession()?.role !== "Owner") {
        requestApproval({ action: "Sensitive customer data change", module: "Customers", reference: customer.id, details: `Update identity/contact and KYC data for ${customer.name}`, reason: "Customer identity or contact data change requires Owner approval.", payload: { customerId: customer.id, customerDraft: JSON.stringify(v) } });
        toast("Customer changes submitted for Owner approval.", "info");
        onClose();
        return;
      }
      updateCustomer(customer.id, v);
      toast("Customer updated successfully");
      onSaved?.({ ...customer, ...v });
    } else {
      const c = addCustomer(v);
      toast("Customer added successfully");
      onSaved?.(c);
    }
    onClose();
  };

  const e = formState.errors;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? "Edit Customer" : "Add New Customer"}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit(submit)}>
            {customer ? "Save Changes" : "Save Customer"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(submit)} noValidate className="grid gap-3.5 sm:grid-cols-2">
        <Input label="Full Name" placeholder="Customer name" autoFocus error={e.name?.message} {...register("name")} />
        <Input label="Mobile" placeholder="+91 98765 43210" inputMode="tel" error={e.mobile?.message} {...register("mobile")} />
        <Input label="Email (optional)" type="email" placeholder="name@example.com" error={e.email?.message} {...register("email")} />
        <Input label="Address (optional)" placeholder="Address" error={e.address?.message} {...register("address")} />
        <Input label="Birthday (optional)" type="date" error={e.birthday?.message} {...register("birthday")} />
        <Input label="Anniversary (optional)" type="date" error={e.anniversary?.message} {...register("anniversary")} />
        <Input label="PAN (KYC)" placeholder="ABCDE1234F" maxLength={10} className="uppercase" error={e.pan?.message} hint="Required for bills of ₹2,00,000 and above" {...register("pan")} />
        <label className="flex cursor-pointer items-center gap-2 pt-6 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[#244d3a]" {...register("kycVerified")} /> KYC verified
        </label>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
