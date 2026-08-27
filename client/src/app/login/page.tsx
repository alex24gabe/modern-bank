"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  getRoleDestination,
  getTokenPayload,
} from "@/lib/auth/auth";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import api from "@/lib/api";

const loginSchema = z.object({
  email: z
    .string()
    .email("Enter a valid email address."),

  password: z
    .string()
    .min(1, "Enter your password."),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] =
    useState(false);

  const [serverError, setServerError] =
    useState("");

  const {
    register,
    handleSubmit,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (
    data: LoginForm
  ) => {
    setServerError("");

    try {
      const response = await api.post(
        "/auth/login",
        {
          email: data.email,
          password: data.password,
        }
      );

      const token =
        response.data?.data?.token;

      if (!token) {
        throw new Error(
          "Authentication token was not returned."
        );
      }

      localStorage.setItem(
        "token",
        token
      );

     const payload =
      getTokenPayload(token);

    const destination =
      getRoleDestination(
        payload?.role
      );

    window.location.href =
      destination;
    } catch (error: any) {
      console.error(
        "Login error:",
        error
      );

      setServerError(
        error.response?.data?.message ||
          "Unable to sign in. Please try again."
      );
    }
  };

  return (
    <main className="min-h-screen overflow-hidden">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* ================================================================
            LEFT PANEL
        ================================================================ */}

        <section className="relative hidden overflow-hidden lg:flex">

          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10" />

          <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative z-10 flex w-full flex-col justify-between p-14">

            {/* BRAND */}

            <Link
              href="/"
              className="flex items-center gap-3"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 font-black text-[#031421]">
                N
              </div>

              <span className="text-xl font-bold">
                NovaBank
              </span>
            </Link>

            {/* CONTENT */}

            <div className="max-w-lg">

              <motion.div
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.5,
                }}
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10">
                  <ShieldCheck
                    size={28}
                    className="text-emerald-300"
                  />
                </div>

                <h1 className="text-5xl font-bold leading-tight">
                  Your money.
                  <br />
                  <span className="text-emerald-300">
                    Your control.
                  </span>
                </h1>

                <p className="mt-6 max-w-md text-base leading-7 text-white/50">
                  Access your accounts,
                  monitor your balance and
                  manage your money securely
                  from anywhere.
                </p>
              </motion.div>

            </div>

            <p className="text-xs text-white/25">
              © 2026 NovaBank. All rights reserved.
            </p>

          </div>
        </section>

        {/* ================================================================
            LOGIN
        ================================================================ */}

        <section className="flex items-center justify-center px-5 py-10 md:px-10">

          <div className="w-full max-w-md">

            {/* MOBILE BRAND */}

            <div className="mb-10 lg:hidden">

              <Link
                href="/"
                className="flex items-center gap-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 font-black text-[#031421]">
                  N
                </div>

                <span className="font-bold">
                  NovaBank
                </span>
              </Link>

            </div>

            {/* HEADING */}

            <div className="mb-8">

              <p className="mb-2 text-sm font-medium text-emerald-300">
                Welcome back
              </p>

              <h2 className="text-3xl font-bold">
                Sign in to NovaBank
              </h2>

              <p className="mt-2 text-sm leading-6 text-white/40">
                Access your accounts and
                manage your finances securely.
              </p>

            </div>

            {/* FORM */}

            <form
              onSubmit={handleSubmit(
                onSubmit
              )}
              className="space-y-5"
            >

              {/* EMAIL */}

              <div>

                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium"
                >
                  Email address
                </label>

                <div className="relative">

                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                  />

                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...register("email")}
                    placeholder="alex@example.com"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.035] py-4 pl-11 pr-4 text-sm outline-none transition placeholder:text-white/20 focus:border-emerald-400/50 focus:bg-white/[0.05]"
                  />

                </div>

                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-300">
                    {errors.email.message}
                  </p>
                )}

              </div>

              {/* PASSWORD */}

              <div>

                <div className="mb-2 flex items-center justify-between">

                  <label
                    htmlFor="password"
                    className="block text-sm font-medium"
                  >
                    Password
                  </label>

                  <button
                    type="button"
                    className="text-xs font-medium text-emerald-300 hover:text-emerald-200"
                  >
                    Forgot password?
                  </button>

                </div>

                <div className="relative">

                  <LockKeyhole
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                  />

                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="current-password"
                    {...register("password")}
                    placeholder="Enter your password"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.035] py-4 pl-11 pr-12 text-sm outline-none transition placeholder:text-white/20 focus:border-emerald-400/50 focus:bg-white/[0.05]"
                  />

                  <button
                    type="button"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    onClick={() =>
                      setShowPassword(
                        (current) =>
                          !current
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 transition hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>

                </div>

                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-300">
                    {
                      errors.password
                        .message
                    }
                  </p>
                )}

              </div>

              {/* SERVER ERROR */}

              {serverError && (
                <motion.div
                  initial={{
                    opacity: 0,
                    y: -5,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300"
                >
                  {serverError}
                </motion.div>
              )}

              {/* SUBMIT */}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-bold text-[#031421] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting
                  ? "Signing in..."
                  : "Sign in"}

                {!isSubmitting && (
                  <ArrowRight
                    size={18}
                  />
                )}
              </button>

            </form>

            {/* REGISTER */}

            <div className="mt-8 text-center">

              <p className="text-sm text-white/40">
                Don't have a NovaBank
                account?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-emerald-300 transition hover:text-emerald-200"
                >
                  Create one
                </Link>
              </p>

            </div>

            {/* SECURITY NOTE */}

            <div className="mt-10 flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4">

              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-emerald-300/70"
              />

              <p className="text-xs leading-5 text-white/30">
                Your connection to NovaBank
                is protected. Never share your
                password or authentication
                credentials with anyone.
              </p>

            </div>

          </div>

        </section>

      </div>
    </main>
  );
}
