"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  User,
} from "lucide-react";
import {
  useState,
} from "react";
import {
  useForm,
} from "react-hook-form";
import {
  zodResolver,
} from "@hookform/resolvers/zod";
import {
  z,
} from "zod";
import api from "@/lib/api";

const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(
        2,
        "Please enter your full name."
      ),

    email: z
      .string()
      .email(
        "Enter a valid email address."
      ),

    phone: z
      .string()
      .optional(),

    password: z
      .string()
      .min(
        8,
        "Password must be at least 8 characters."
      ),

    confirmPassword: z
      .string()
      .min(
        8,
        "Please confirm your password."
      ),
  })
  .refine(
    (data) =>
      data.password ===
      data.confirmPassword,
    {
      message:
        "Passwords do not match.",
      path: ["confirmPassword"],
    }
  );

type RegisterForm = z.infer<
  typeof registerSchema
>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [serverError, setServerError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const {
    register,
    handleSubmit,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<RegisterForm>({
    resolver:
      zodResolver(registerSchema),
  });

  const onSubmit = async (
    data: RegisterForm
  ) => {
    setServerError("");

    try {
      const response =
        await api.post(
          "/auth/register",
          {
            fullName:
              data.fullName,

            email:
              data.email,

            password:
              data.password,

            phone:
              data.phone || "",

            address: "",
          }
        );

      const token =
        response.data?.data?.token;

      if (token) {
        localStorage.setItem(
          "token",
          token
        );
      }

      setSuccess(true);

      setTimeout(() => {
        window.location.href =
          "/dashboard";
      }, 1200);
    } catch (error: any) {
      setServerError(
        error.response?.data
          ?.message ||
          "Unable to create your account."
      );
    }
  };

  return (
    <main className="min-h-screen overflow-hidden">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* LEFT BRAND PANEL */}

        <section className="relative hidden overflow-hidden lg:flex">

          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10" />

          <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative z-10 flex w-full flex-col justify-between p-14">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 font-black text-[#031421]">
                N
              </div>

              <span className="text-xl font-bold">
                NovaBank
              </span>

            </div>

            <div className="max-w-lg">

              <motion.h1
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="text-5xl font-bold leading-tight"
              >
                Banking built
                <span className="text-emerald-300">
                  {" "}
                  around you.
                </span>
              </motion.h1>

              <p className="mt-6 max-w-md text-base leading-7 text-white/50">
                Manage your money,
                accounts and payments
                from one secure digital
                banking experience.
              </p>

              <div className="mt-10 space-y-4">

                {[
                  "Instant account access",
                  "Secure digital banking",
                  "Multiple accounts",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 text-sm text-white/70"
                  >
                    <CheckCircle2
                      className="text-emerald-300"
                      size={19}
                    />

                    {item}
                  </div>
                ))}

              </div>

            </div>

            <p className="text-xs text-white/25">
              © 2026 NovaBank. All rights reserved.
            </p>

          </div>
        </section>

        {/* REGISTER */}

        <section className="flex items-center justify-center px-5 py-10 md:px-10">

          <div className="w-full max-w-md">

            <div className="mb-8 lg:hidden">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 font-black text-[#031421]">
                  N
                </div>

                <span className="font-bold">
                  NovaBank
                </span>

              </div>

            </div>

            <div className="mb-8">

              <p className="mb-2 text-sm font-medium text-emerald-300">
                Get started
              </p>

              <h2 className="text-3xl font-bold">
                Create your account
              </h2>

              <p className="mt-2 text-sm text-white/40">
                Your default Savings account
                will be created automatically.
              </p>

            </div>

            {success ? (
              <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-8 text-center">

                <CheckCircle2
                  size={48}
                  className="mx-auto text-emerald-300"
                />

                <h3 className="mt-5 text-xl font-bold">
                  Account created
                </h3>

                <p className="mt-2 text-sm text-white/50">
                  Taking you to your dashboard...
                </p>

              </div>
            ) : (
              <form
                onSubmit={handleSubmit(
                  onSubmit
                )}
                className="space-y-5"
              >

                {/* NAME */}

                <div>

                  <label className="mb-2 block text-sm font-medium">
                    Full name
                  </label>

                  <div className="relative">

                    <User
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                    />

                    <input
                      {...register(
                        "fullName"
                      )}
                      placeholder="Alex Johnson"
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.035] py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-emerald-400/50"
                    />

                  </div>

                  {errors.fullName && (
                    <p className="mt-1.5 text-xs text-red-300">
                      {
                        errors.fullName
                          .message
                      }
                    </p>
                  )}

                </div>

                {/* EMAIL */}

                <div>

                  <label className="mb-2 block text-sm font-medium">
                    Email address
                  </label>

                  <div className="relative">

                    <Mail
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                    />

                    <input
                      {...register(
                        "email"
                      )}
                      type="email"
                      placeholder="alex@example.com"
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.035] py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-emerald-400/50"
                    />

                  </div>

                  {errors.email && (
                    <p className="mt-1.5 text-xs text-red-300">
                      {
                        errors.email
                          .message
                      }
                    </p>
                  )}

                </div>

                {/* PHONE */}

                <div>

                  <label className="mb-2 block text-sm font-medium">
                    Phone number
                    <span className="ml-2 text-white/25">
                      Optional
                    </span>
                  </label>

                  <div className="relative">

                    <Phone
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                    />

                    <input
                      {...register(
                        "phone"
                      )}
                      type="tel"
                      placeholder="+234..."
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.035] py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-emerald-400/50"
                    />

                  </div>

                </div>

                {/* PASSWORD */}

                <div>

                  <label className="mb-2 block text-sm font-medium">
                    Password
                  </label>

                  <div className="relative">

                    <LockKeyhole
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                    />

                    <input
                      {...register(
                        "password"
                      )}
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      placeholder="Minimum 8 characters"
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.035] py-3.5 pl-11 pr-12 text-sm outline-none transition focus:border-emerald-400/50"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          !showPassword
                        )
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
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

                {/* CONFIRM */}

                <div>

                  <label className="mb-2 block text-sm font-medium">
                    Confirm password
                  </label>

                  <div className="relative">

                    <LockKeyhole
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                    />

                    <input
                      {...register(
                        "confirmPassword"
                      )}
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      placeholder="Repeat your password"
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.035] py-3.5 pl-11 pr-12 text-sm outline-none transition focus:border-emerald-400/50"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          !showConfirmPassword
                        )
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>

                  </div>

                  {errors.confirmPassword && (
                    <p className="mt-1.5 text-xs text-red-300">
                      {
                        errors
                          .confirmPassword
                          .message
                      }
                    </p>
                  )}

                </div>

                {/* SERVER ERROR */}

                {serverError && (
                  <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                    {serverError}
                  </div>
                )}

                {/* SUBMIT */}

                <button
                  type="submit"
                  disabled={
                    isSubmitting
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-bold text-[#031421] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Creating account..."
                    : "Create account"}

                  {!isSubmitting && (
                    <ArrowRight
                      size={18}
                    />
                  )}
                </button>

              </form>
            )}

            <p className="mt-8 text-center text-sm text-white/40">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-emerald-300 hover:text-emerald-200"
              >
                Sign in
              </Link>
            </p>

          </div>
        </section>

      </div>
    </main>
  );
}
