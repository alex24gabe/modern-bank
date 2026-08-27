"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardLayout from "@/components/layout/DashboardLayout";

import {
  getToken,
  getTokenPayload,
  clearAuth,
} from "@/lib/auth/auth";

export default function BankLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  const [authorized, setAuthorized] =
    useState(false);

  useEffect(() => {
    const token = getToken();

    /*
     * No authentication token.
     */

    if (!token) {
      router.replace("/login");
      return;
    }

    /*
     * Decode the centralized JWT.
     */

    const payload =
      getTokenPayload(token);

    /*
     * Invalid token.
     */

    if (!payload) {
      clearAuth();
      router.replace("/login");
      return;
    }

    /*
     * JWT expiration check.
     */

    if (
      payload.exp &&
      payload.exp * 1000 <
        Date.now()
    ) {
      clearAuth();
      router.replace("/login");
      return;
    }

    /*
     * Customer-side authorization.
     *
     * Admin users should enter the Admin
     * application instead of the customer
     * banking interface.
     */

    if (
      String(payload.role || "").toUpperCase() ===
      "ADMIN"
    ) {
      router.replace("/admin");
      return;
    }

    /*
     * Authenticated non-admin user.
     */

    setAuthorized(true);
    setCheckingAuth(false);
  }, [router]);

  /*
   * Authentication is being checked.
   */

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#031421] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-emerald-300" />

          <p className="text-sm text-white/40">
            Verifying account access...
          </p>
        </div>
      </div>
    );
  }

  /*
   * Prevent protected content from
   * rendering while unauthorized.
   */

  if (!authorized) {
    return null;
  }

  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}
