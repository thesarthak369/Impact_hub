"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";

export default function LoginPage() {
  const { loginWithGoogle } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center relative overflow-hidden font-helvetica">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-foreground/[0.015] rounded-full blur-[150px]" />
        <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] bg-foreground/[0.01] rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_20%,transparent_100%)]" />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Back to Home */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-accent-dim hover:text-foreground transition-colors group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
        </motion.div>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3 mb-8 group cursor-pointer"
        >
          <motion.div 
            className="w-6 h-6"
            whileHover={{ rotate: 360, scale: 1.15 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <img src="/logo1.png" alt="Impact Hub Logo" className="w-full h-full object-contain"/>
          </motion.div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Impact Hub</h1>
            <p className="text-[11px] text-accent-dim tracking-wider uppercase">Smart Resource Allocation</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-8 rounded-3xl border border-foreground/[0.08] bg-foreground/[0.02] backdrop-blur-md"
        >
          <h2 className="text-2xl font-bold mb-2 tracking-tight">Welcome back</h2>
          <p className="text-sm text-accent-muted mb-8">Sign in to continue to your dashboard</p>

          <button
            onClick={handleGoogleLogin}
            className="w-full h-12 rounded-xl bg-foreground text-background font-semibold text-sm flex items-center justify-center gap-3 hover:bg-foreground/80 active:scale-[0.98] transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* <div className="mt-8 text-center border-t border-foreground/[0.08] pt-6">
            <p className="text-xs text-accent-dim">
              <Shield size={12} className="inline mr-1.5 -mt-0.5" />
              Secure authentication via Supabase
            </p>
          </div> */}
        </motion.div>
      </div>
    </div>
  );
}
