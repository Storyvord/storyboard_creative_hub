"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, verify2FA } from "@/services/auth";
import { requestPasswordResetEmail } from "@/services/passwordReset";
import { toast } from "react-toastify";
import { Loader2, Video, ArrowLeft, MailCheck } from "lucide-react";
import type { MfaMethod } from "@/types/auth";
import RedirectIfAuthed from "@/components/RedirectIfAuthed";

type Mode = "login" | "forgot" | "forgotSent";

export default function LoginPage() {
  return (
    <RedirectIfAuthed>
      <LoginPageInner />
    </RedirectIfAuthed>
  );
}

function LoginPageInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 2FA state (in-memory only — never persisted to localStorage)
  const [requires2fa, setRequires2fa] = useState(false);
  const [mfaMethod, setMfaMethod] = useState<MfaMethod | undefined>(undefined);
  const [uidb64, setUidb64] = useState<string | null>(null);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  // Forgot password inline flow state
  const [mode, setMode] = useState<Mode>("login");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const resetToLogin = () => {
    setRequires2fa(false);
    setMfaMethod(undefined);
    setUidb64(null);
    setMfaToken(null);
    setOtpInput("");
    setOtpLoading(false);
  };

  const backToLogin = () => {
    setMode("login");
    setForgotEmail("");
    setForgotLoading(false);
  };

  const storeSessionAndRedirect = (response: Awaited<ReturnType<typeof login>>) => {
    if (response.data.tokens) {
      localStorage.setItem("accessToken", response.data.tokens.access);
      localStorage.setItem("refreshToken", response.data.tokens.refresh);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      toast.success("Login successful!");
      router.push("/dashboard");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await login(email, password);

      if (response.data.requires_2fa) {
        setRequires2fa(true);
        setMfaMethod(response.data.method);
        setUidb64(response.data.uidb64 ?? null);
        setMfaToken(response.data.mfa_token ?? null);
        setOtpInput("");
        if (response.data.method === "email") {
          toast.info("We've sent a verification code to your email.");
        } else {
          toast.info("Enter the code from your authenticator app.");
        }
        return;
      }

      storeSessionAndRedirect(response);
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || "Login failed. Please check your credentials.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedOtp = otpInput.replace(/\s+/g, "");

    if (!trimmedOtp) {
      toast.error("Code required");
      return;
    }
    if (!uidb64 || !mfaToken) {
      toast.error("Session expired. Please log in again.");
      resetToLogin();
      return;
    }

    setOtpLoading(true);
    try {
      const response = await verify2FA({
        uidb64,
        mfa_token: mfaToken,
        otp: trimmedOtp,
      });
      storeSessionAndRedirect(response);
    } catch (error: any) {
      console.error(error);
      const status = error.response?.status;
      const backendMsg = error.response?.data?.message;

      if (status === 401) {
        // Invalid OTP or invalid/expired MFA token.
        if (backendMsg && /expired|invalid.*token|mfa token/i.test(backendMsg)) {
          toast.error("Code expired. Please log in again.");
          resetToLogin();
        } else {
          toast.error("Invalid OTP. Please try again.");
          setOtpInput("");
        }
      } else if (status === 400) {
        toast.error(backendMsg || "Session expired. Please log in again.");
        resetToLogin();
      } else if (status === 403) {
        toast.error(backendMsg || "2FA is not enabled.");
        resetToLogin();
      } else if (status === 404) {
        toast.error(backendMsg || "User not found.");
        resetToLogin();
      } else if (!error.response) {
        toast.error("Network error. Please try again.");
      } else {
        toast.error(backendMsg || "Verification failed. Please try again.");
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = forgotEmail.trim();
    if (!trimmed) {
      toast.error("Please enter your email address.");
      return;
    }
    setForgotLoading(true);
    try {
      await requestPasswordResetEmail(trimmed);
      // Generic success toast (no enumeration)
      toast.success("If an account exists for that email, we've sent a reset link.");
      setMode("forgotSent");
    } catch (error: any) {
      console.error(error);
      // Even on error, do not reveal whether the email exists;
      // only distinguish between network/server errors.
      if (!error.response) {
        toast.error("Network error. Please try again.");
      } else if (error.response?.status >= 500) {
        toast.error("Error sending reset email. Please try again.");
      } else {
        // Treat client errors as generic success (anti-enumeration)
        toast.success("If an account exists for that email, we've sent a reset link.");
        setMode("forgotSent");
      }
    } finally {
      setForgotLoading(false);
    }
  };

  const otpPlaceholder =
    mfaMethod === "email" ? "Check your email for a code" : "Enter 6-digit code";
  const otpHint =
    mfaMethod === "email"
      ? "We sent a verification code to your email."
      : "Enter the code from your authenticator app.";

  const heading = requires2fa
    ? "Two-Factor Verification"
    : mode === "forgot"
    ? "Reset your password"
    : mode === "forgotSent"
    ? "Check your email"
    : "Welcome Back";

  const subheading = requires2fa
    ? otpHint
    : mode === "forgot"
    ? "Enter your email and we'll send you a reset link."
    : mode === "forgotSent"
    ? "If an account exists for that email, we've sent a reset link. Check your email."
    : "Sign in to access your Creative Hub";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-sm space-y-6 rounded-md bg-[var(--surface)] p-8 border border-[var(--border)]">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Video className="h-6 w-6 text-emerald-500" />
            <span className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Storyvord</span>
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">{heading}</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{subheading}</p>
        </div>

        {mode === "forgotSent" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30">
                <MailCheck className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
            <button
              type="button"
              onClick={backToLogin}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-transparent hover:bg-[var(--surface-raised)] px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)] border border-[var(--border)] transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to login
            </button>
          </div>
        ) : mode === "forgot" ? (
          <form className="space-y-4" onSubmit={handleForgotSubmit}>
            <div>
              <label
                htmlFor="forgot-email"
                className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5"
              >
                Email
              </label>
              <input
                id="forgot-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                autoFocus
                className="block w-full rounded-md bg-[var(--surface)] p-3 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] border border-[var(--border)] outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                placeholder="you@example.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                disabled={forgotLoading}
              />
            </div>

            <div className="space-y-2">
              <button
                type="submit"
                disabled={forgotLoading}
                className="flex w-full justify-center rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-3 text-sm font-semibold text-white disabled:opacity-30 transition-all"
              >
                {forgotLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Submit"}
              </button>
              <button
                type="button"
                onClick={backToLogin}
                disabled={forgotLoading}
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-transparent hover:bg-[var(--surface-raised)] px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)] border border-[var(--border)] disabled:opacity-30 transition-all"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to login
              </button>
            </div>
          </form>
        ) : (
          <form
            className="space-y-4"
            onSubmit={requires2fa ? handleVerifyOtp : handleLogin}
          >
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
                  disabled={requires2fa}
                  className="block w-full rounded-md bg-[var(--surface)] p-3 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] border border-[var(--border)] outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
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
                  autoComplete="current-password"
                  required
                  disabled={requires2fa}
                  className="block w-full rounded-md bg-[var(--surface)] p-3 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] border border-[var(--border)] outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {requires2fa && (
                <div>
                  <label
                    htmlFor="otp"
                    className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5"
                  >
                    Verification Code
                  </label>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    autoFocus
                    className="block w-full rounded-md bg-[var(--surface)] p-3 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] border border-[var(--border)] outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all tracking-widest"
                    placeholder={otpPlaceholder}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                  />
                </div>
              )}
            </div>

            {requires2fa ? (
              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={otpLoading}
                  className="flex w-full justify-center rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-3 text-sm font-semibold text-white disabled:opacity-30 transition-all"
                >
                  {otpLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Verify"}
                </button>
                <button
                  type="button"
                  onClick={resetToLogin}
                  disabled={otpLoading}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md bg-transparent hover:bg-[var(--surface-raised)] px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)] border border-[var(--border)] disabled:opacity-30 transition-all"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full justify-center rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-3 text-sm font-semibold text-white disabled:opacity-30 transition-all"
                >
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Sign in"}
                </button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setForgotEmail(email);
                    }}
                    className="text-xs text-[var(--text-secondary)] hover:text-emerald-500 hover:underline transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => router.push("/register")}
                    className="text-xs text-[var(--text-secondary)] hover:text-emerald-500 hover:underline transition-colors"
                  >
                    New here? Create an account
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
