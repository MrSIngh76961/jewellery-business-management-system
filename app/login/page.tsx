"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Eye, EyeOff, Lock, ShieldCheck, Sparkles, TrendingUp, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
import { BrandMark } from "@/components/layout/BrandMark";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { APP_NAME } from "@/lib/config";
import { loginSchema, type LoginForm } from "@/lib/schemas";
import { getSession, login, subscribeSession } from "@/lib/services/auth";

const FEATURES = [
  { icon: FileText, text: "Multi-item gold invoicing with live calculations" },
  { icon: TrendingUp, text: "Sales analytics, reports and customer ledgers" },
  { icon: ShieldCheck, text: "Daily encrypted backups with one-click restore" },
];

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const session = useSyncExternalStore(subscribeSession, getSession, () => undefined);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const { register, handleSubmit, formState } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "", remember: true },
  });

  useEffect(() => {
    if (session && !success) router.replace("/dashboard");
  }, [session, success, router]);

  const onSubmit = async (v: LoginForm) => {
    setError("");
    try {
      await login(v);
      setSuccess(true);
      setTimeout(() => router.replace("/dashboard"), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in");
    }
  };

  const sendReset = () => {
    if (!/^\S+@\S+\.\S+$/.test(resetEmail)) {
      toast("Enter a valid email address", "error");
      return;
    }
    setForgot(false);
    toast(`Password reset link sent to ${resetEmail}`);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-forest p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-gold/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <BrandMark className="h-11 w-11" />
          <div>
            <strong className="block text-lg">{APP_NAME}</strong>
            <small className="text-[#aebdb5]">Billing Suite</small>
          </div>
        </div>
        <div className="relative max-w-md">
          <Sparkles className="mb-5 h-6 w-6 text-gold-2" />
          <h2 className="text-4xl leading-tight font-semibold">Run your gold business with precision and trust.</h2>
          <ul className="mt-9 space-y-4">
            {FEATURES.map(({ icon: Icon, text }, i) => (
              <motion.li key={text} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.12 }} className="flex items-center gap-3 text-[15px] text-[#d4dfd9]">
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-[#35634e] bg-forest-3">
                  <Icon className="h-4 w-4 text-gold-2" />
                </span>
                {text}
              </motion.li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-[#8fa398]">© 2026 {APP_NAME}. All rights reserved.</p>
      </aside>

      <main className="flex items-center justify-center bg-page px-5 py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandMark className="bg-forest" />
            <strong className="text-lg">{APP_NAME}</strong>
          </div>

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div key="ok" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-16 text-center" role="status">
                <CheckCircle2 className="mx-auto h-14 w-14 text-[#3f7658]" />
                <h1 className="mt-4 text-xl font-semibold">Welcome back</h1>
                <p className="mt-1 text-sm text-muted">Opening your workspace…</p>
              </motion.div>
            ) : (
              <motion.form key="form" exit={{ opacity: 0 }} onSubmit={handleSubmit(onSubmit)} noValidate className="rounded-[18px] border border-line bg-card p-7 shadow-card">
                <div className="mb-1 flex items-center gap-2 text-gold-deep">
                  <Lock className="h-4 w-4" />
                  <span className="text-xs font-semibold tracking-wider uppercase">Secure Admin Login</span>
                </div>
                <h1 className="text-2xl font-semibold">Sign in to {APP_NAME}</h1>
                <p className="mt-1 mb-6 text-[13px] text-muted">Enter your credentials to access the dashboard.</p>

                <AnimatePresence>
                  {error && (
                    <motion.div role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-[13px] text-danger">
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-4">
                  <Input label="Email or username" autoComplete="username" placeholder="admin@reinsoft.gold" error={formState.errors.identifier?.message} {...register("identifier")} />
                  <div className="relative">
                    <Input label="Password" type={show ? "text" : "password"} autoComplete="current-password" placeholder="••••••••" className="pr-10" error={formState.errors.password?.message} {...register("password")} />
                    <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((s) => !s)} className="absolute top-[27px] right-2.5 cursor-pointer text-muted hover:text-ink">
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-[13px]">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 accent-[#244d3a]" {...register("remember")} /> Remember me
                  </label>
                  <button type="button" onClick={() => setForgot(true)} className="cursor-pointer font-medium text-brand hover:underline">
                    Forgot password?
                  </button>
                </div>

                <Button type="submit" variant="primary" className="mt-6 w-full py-3" loading={formState.isSubmitting}>
                  {formState.isSubmitting ? "Signing in…" : "Sign in"}
                </Button>
                <p className="mt-5 rounded-lg bg-cream px-3 py-2 text-center text-xs text-muted">
                  Demo: <b className="text-ink">admin</b> / admin123 (Owner) · <b className="text-ink">staff</b> / staff123 · <b className="text-ink">accounts</b> / acc123
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      <Modal
        open={forgot}
        onClose={() => setForgot(false)}
        size="sm"
        title="Reset password"
        footer={
          <>
            <Button onClick={() => setForgot(false)}>Cancel</Button>
            <Button variant="primary" onClick={sendReset}>
              Send reset link
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-muted">We&apos;ll email you a link to reset your password.</p>
        <Input label="Email address" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="admin@reinsoft.gold" />
      </Modal>
    </div>
  );
}
