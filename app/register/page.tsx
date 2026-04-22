"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "@/services/auth";
import { toast } from "react-toastify";
import { Loader2, Video, ArrowLeft, MailCheck } from "lucide-react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = {
  email?: string;
  password?: string;
  confirm_password?: string;
  terms_accepted?: string;
};

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const emailValid = useMemo(() => EMAIL_REGEX.test(email.trim()), [email]);
  const passwordValid = password.length >= 8;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const formValid =
    emailValid && passwordValid && passwordsMatch && termsAccepted;

  const mapBackendErrors = (data: any): { mapped: FieldErrors; joined: string } => {
    const mapped: FieldErrors = {};
    const messages: string[] = [];

    if (data && typeof data === "object") {
      for (const [key, value] of Object.entries(data)) {
        const msg = Array.isArray(value) ? value.join(" ") : String(value);
        if (key === "email") mapped.email = msg;
        else if (key === "password") mapped.password = msg;
        else if (key === "confirm_password") mapped.confirm_password = msg;
        else if (key === "terms_accepted") mapped.terms_accepted = msg;
        messages.push(msg);
      }
    }

    return { mapped, joined: messages.join(" ") };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (!formValid) return;

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await register(normalizedEmail, password, confirmPassword, termsAccepted);
      setRegisteredEmail(normalizedEmail);
      setSubmitted(true);
      toast.success("Account created. Check your email to verify.");
    } catch (error: any) {
      console.error(error);
      const status = error.response?.status;
      const backendMsg = error.response?.data?.message;
      const backendData = error.response?.data?.data;

      if (!error.response) {
        toast.error(error.userMessage || "Network error. Please try again.");
      } else if (status === 409) {
        setFieldErrors({ email: "An account with this email already exists." });
        toast.error("An account with this email already exists.");
      } else if (status === 400) {
        const { mapped, joined } = mapBackendErrors(backendData);
        if (Object.keys(mapped).length > 0) {
          setFieldErrors(mapped);
          // Still surface a toast so users notice if an error is below the fold.
          toast.error(backendMsg || "Please fix the highlighted fields.");
        } else {
          toast.error(joined || backendMsg || "Registration failed. Please try again.");
        }
      } else if (status === 503) {
        toast.error(backendMsg || "Registration temporarily unavailable.");
      } else {
        toast.error(backendMsg || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const confirmMismatchError =
    confirmPassword.length > 0 && !passwordsMatch
      ? "Passwords don't match."
      : fieldErrors.confirm_password;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-sm space-y-6 rounded-md bg-[var(--surface)] p-8 border border-[var(--border)]">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Video className="h-6 w-6 text-emerald-500" />
            <span className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
              Storyvord
            </span>
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            {submitted ? "Check your email" : "Create your account"}
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {submitted
              ? `We've sent a verification link to ${registeredEmail}. Verify your email, then log in.`
              : "Sign up to start using Creative Hub"}
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30">
                <MailCheck className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-transparent hover:bg-[var(--surface-raised)] px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)] border border-[var(--border)] transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to login
            </button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="email"
                  className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full rounded-md bg-[var(--surface)] p-3 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] border border-[var(--border)] outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email)
                      setFieldErrors((f) => ({ ...f, email: undefined }));
                  }}
                  disabled={loading}
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-400">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="block w-full rounded-md bg-[var(--surface)] p-3 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] border border-[var(--border)] outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password)
                      setFieldErrors((f) => ({ ...f, password: undefined }));
                  }}
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Minimum 8 characters. Avoid common passwords.
                </p>
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-400">{fieldErrors.password}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5"
                >
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  name="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="block w-full rounded-md bg-[var(--surface)] p-3 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] border border-[var(--border)] outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirm_password)
                      setFieldErrors((f) => ({ ...f, confirm_password: undefined }));
                  }}
                  disabled={loading}
                />
                {confirmMismatchError && (
                  <p className="mt-1 text-xs text-red-400">{confirmMismatchError}</p>
                )}
              </div>

              <div>
                <label className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                  <input
                    id="terms"
                    name="terms_accepted"
                    type="checkbox"
                    required
                    checked={termsAccepted}
                    onChange={(e) => {
                      setTermsAccepted(e.target.checked);
                      if (fieldErrors.terms_accepted)
                        setFieldErrors((f) => ({ ...f, terms_accepted: undefined }));
                    }}
                    disabled={loading}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--border)] bg-[var(--surface)] accent-emerald-500"
                  />
                  <span>
                    I agree to the Terms of Service and Privacy Policy.
                  </span>
                </label>
                {fieldErrors.terms_accepted && (
                  <p className="mt-1 text-xs text-red-400">
                    {fieldErrors.terms_accepted}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={!formValid || loading}
                className="flex w-full justify-center rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-3 text-sm font-semibold text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  "Create account"
                )}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="text-xs text-[var(--text-secondary)] hover:text-emerald-500 hover:underline transition-colors"
                >
                  Already have an account? Sign in
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
