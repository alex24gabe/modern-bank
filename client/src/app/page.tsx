"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getRoleDestination,
  getToken,
  getTokenPayload,
} from "@/lib/auth/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const token = getToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      const payload =
        getTokenPayload(token);

      if (!payload) {
        router.replace("/login");
        return;
      }

      if (
        payload.exp &&
        payload.exp * 1000 < Date.now()
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem(
          "novabank_token"
        );
        localStorage.removeItem(
          "accessToken"
        );

        router.replace("/login");
        return;
      }

      router.replace(
        getRoleDestination(payload.role)
      );
    }, 1200);

    return () =>
      window.clearTimeout(timer);
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#031421] text-white">
      <div className="flex flex-col items-center">

        <div className="relative flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-emerald-300 to-cyan-400 text-3xl font-black text-[#031421] shadow-2xl shadow-emerald-400/10">
          N

          <span className="absolute inset-0 animate-ping rounded-[24px] border border-emerald-300/30" />
        </div>

        <h1 className="mt-6 text-2xl font-bold tracking-tight">
          NovaBank
        </h1>

        <p className="mt-2 text-sm text-white/35">
          Secure digital banking
        </p>

        <div className="mt-7 flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300 [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300 [animation-delay:300ms]" />
        </div>

      </div>
    </main>
  );
}