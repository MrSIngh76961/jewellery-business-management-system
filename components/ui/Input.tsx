import { useId } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-lg border border-[#ddd6c8] bg-[#fffdf9] px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-gold focus:ring-2 focus:ring-gold/25 disabled:bg-cream disabled:text-muted read-only:bg-cream read-only:text-muted aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/15";

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  srOnlyLabel?: boolean;
  children: (id: string, describedBy: string | undefined) => React.ReactNode;
}

export function Field({ label, error, hint, className, srOnlyLabel, children }: FieldProps) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className={className}>
      <label htmlFor={id} className={cn("mb-1.5 block text-[11px] font-semibold text-[#69716b]", srOnlyLabel && "lg:sr-only")}>
        {label}
      </label>
      {children(id, error || hint ? msgId : undefined)}
      {(error || hint) && (
        <p id={msgId} role={error ? "alert" : undefined} className={cn("mt-1 text-[11px]", error ? "text-danger" : "text-muted")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

type InputProps = React.ComponentProps<"input"> & { label: string; error?: string; hint?: string; srOnlyLabel?: boolean };

export function Input({ label, error, hint, className, wrapperClassName, srOnlyLabel, ...rest }: InputProps & { wrapperClassName?: string }) {
  return (
    <Field label={label} error={error} hint={hint} className={wrapperClassName} srOnlyLabel={srOnlyLabel}>
      {(id, desc) => (
        <input id={id} aria-invalid={!!error} aria-describedby={desc} className={cn(control, className)} {...rest} />
      )}
    </Field>
  );
}

type SelectProps = React.ComponentProps<"select"> & { label: string; error?: string; srOnlyLabel?: boolean; wrapperClassName?: string };

export function Select({ label, error, className, wrapperClassName, srOnlyLabel, children, ...rest }: SelectProps) {
  return (
    <Field label={label} error={error} className={wrapperClassName} srOnlyLabel={srOnlyLabel}>
      {(id, desc) => (
        <select id={id} aria-invalid={!!error} aria-describedby={desc} className={cn(control, "cursor-pointer", className)} {...rest}>
          {children}
        </select>
      )}
    </Field>
  );
}

export function Textarea({ label, error, className, wrapperClassName, ...rest }: React.ComponentProps<"textarea"> & { label: string; error?: string; wrapperClassName?: string }) {
  return (
    <Field label={label} error={error} className={wrapperClassName}>
      {(id, desc) => (
        <textarea id={id} aria-invalid={!!error} aria-describedby={desc} rows={3} className={cn(control, "resize-y", className)} {...rest} />
      )}
    </Field>
  );
}

export const controlClass = control;
