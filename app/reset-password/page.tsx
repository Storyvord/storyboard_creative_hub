"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { Loader2, Video, AlertTriangle } from "lucide-react";
import { resetPassword } from "@/services/passwordReset";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // uid/token live in URL + React state only — never persisted.
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  const missingParams = !uid || !token;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const passwordsMatch = useMemo(
    () => newPassword === confirmPassword,
    [newPassword, confirmPassword]
  );
  const meetsMinLength = newPassword.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);

    if (!newPassword || !confirmPassword) {
      setFieldError("Both password fields are required.");
      return;
    }
    if (!meetsMinLength) {
      setFieldError("Password must be at least 8 characters.");
      return;
    }
    if (!passwordsMatch) {
      setFieldError("Passwords do not match.");
      return;
    }
    if (missingParams) {
      setFieldError("Reset link is invalid. Request a new one.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(uid!, token!, newPassword);
      toast.success("Password reset successful. Please sign in.");
      setTimeout(() => router.push("/login"), 1200);
    } catch (error: any) {
      console.error(error);
      const status = error.response?.status;
      const backendMsg =
        error.response?.data?.message ||
        error.response?.data?.token?.[0] ||
        error.response?.data?.uidb64?.[0] ||
        error.response?.data?.password?.[0];

      if (!error.response) {
        toast.error("Network error. Please try again.");
      } else if (status === 400 || status === 422) {
        const msg =
          backendMsg && /expired|invalid/i.test(backendMsg)
            ? "Reset link is invalid or has expired. Request a new one."
            : backendMsg || "Unable to reset password. Please try again.";
        setFieldError(msg);
        toast.error(msg);
      } else if (status >= 500) {
        toast.error("Error resetting password. Please try again.");
      } else {
        toast.error(backendMsg || "Unable to reset password. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

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
            Reset your password
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {missingParams
              ? "Your reset link is invalid or incomplete."
              : "Enter a new password for your account."}
          </p>
        </div>

        {missingParams ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3">
              <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-300">
                This reset link is missing required information. Please request a
                new reset link from the login page.
              </p>
            </div>
            <Link
              href="/login"
              className="flex w-full items-center justify-center rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-3 text-sm font-semibold text-white transition-all"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5"
                >
                  New Password
                </label>
                <input
                  id="new-password"
                  name="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  disabled={submitting}
                  className="block w-full rounded-md bg-[var(--surface)] p-3 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] border border-[var(--border)] outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
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
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  disabled={submitting}
                  className="block w-full rounded-md bg-[var(--surface)] p-3 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] border border-[var(--border)] outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {fieldError && (
                <p className="text-xs text-red-400">{fieldError}</p>
              )}
              {!fieldError && newPassword && !meetsMinLength && (
                <p className="text-xs text-[var(--text-muted)]">
                  Password must be at least 8 characters.
                </p>
              )}
              {!fieldError &&
                confirmPassword &&
                meetsMinLength &&
                !passwordsMatch && (
                  <p className="text-xs text-red-400">Passwords do not match.</p>
                )}
            </div>

            <div className="space-y-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full justify-center rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-3 text-sm font-semibold text-white disabled:opacity-30 transition-all"
              >
                {submitting ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  "Reset password"
                )}
              </button>
              <Link
                href="/login"
                className="flex w-full items-center justify-center rounded-md bg-transparent hover:bg-[var(--surface-raised)] px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)] border border-[var(--border)] transition-all"
              >
                Back to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
