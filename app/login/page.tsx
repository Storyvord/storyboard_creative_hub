"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/services/auth";
import { toast } from "react-toastify";
import { Loader2, Video } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await login(email, password);
      
      if (response.data.requires_2fa) {
        toast.info("MFA required (Not implemented in this demo)");
        return;
      }

      if (response.data.tokens) {
        localStorage.setItem("accessToken", response.data.tokens.access);
        localStorage.setItem("refreshToken", response.data.tokens.refresh);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        
        toast.success("Login successful!");
        router.push("/dashboard");
      }
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || "Login failed. Please check your credentials.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-4">
      <div className="w-full max-w-sm space-y-6 rounded-md bg-[#0d0d0d] p-8 border border-[#1a1a1a]">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Video className="h-6 w-6 text-emerald-500" />
            <span className="text-xl font-bold text-white tracking-tight">Storyvord</span>
          </div>
          <h2 className="text-lg font-bold text-white">Welcome Back</h2>
          <p className="mt-1 text-xs text-[#666]">Sign in to access your Creative Hub</p>
        </div>
        <form className="space-y-4" onSubmit={handleLogin}>
          <div className="space-y-3">
            <div>
              <label htmlFor="email" className="block text-[10px] font-bold text-[#555] uppercase tracking-widest mb-1.5">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-full rounded-md bg-[#111] p-3 text-white text-sm placeholder:text-[#444] border border-[#222] outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-[10px] font-bold text-[#555] uppercase tracking-widest mb-1.5">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="block w-full rounded-md bg-[#111] p-3 text-white text-sm placeholder:text-[#444] border border-[#222] outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-3 text-sm font-semibold text-white disabled:opacity-30 transition-all"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
