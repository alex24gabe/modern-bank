"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  WalletCards,
  ArrowLeftRight,
  ShieldCheck,
  Bell,
  Loader2,
  LogOut,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

import {
  getToken,
  getTokenPayload,
  clearAuth,
} from "@/lib/auth/auth";

const navigation = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Customers",
    href: "/admin/customers",
    icon: Users,
  },
  {
    label: "Accounts",
    href: "/admin/accounts",
    icon: WalletCards,
  },
  {
    label: "Transactions",
    href: "/admin/transactions",
    icon: ArrowLeftRight,
  },
  {
    label: "Notifications",
    href: "/admin/notifications",
    icon: Bell,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
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
     * Decode the existing JWT using
     * the centralized authentication utility.
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
     * Frontend authorization check.
     *
     * This is only a UX/access-routing check.
     *
     * The actual security boundary remains:
     *
     * /admin/*
     *      ↓
     * authMiddleware
     *      ↓
     * adminMiddleware
     */

    if (
      String(payload.role || "").toUpperCase() !==
      "ADMIN"
    ) {
      router.replace("/dashboard");
      return;
    }

    setAuthorized(true);
    setCheckingAuth(false);
  }, [router]);

  function handleLogout() {
    clearAuth();
    router.replace("/login");
  }

  /*
   * Authentication is being checked.
   */

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#031421] text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            size={24}
            className="animate-spin text-emerald-300"
          />

          <p className="text-sm text-white/40">
            Verifying administrator access...
          </p>
        </div>
      </div>
    );
  }

  /*
   * Prevent the protected Admin UI
   * from rendering while unauthorized.
   */

  if (!authorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#031421] text-white">

      {/* =========================================================
          ADMIN TOP BAR
          ========================================================= */}

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#031421]/90 backdrop-blur-xl">
        <div className="flex h-[70px] items-center justify-between px-4 sm:px-6 lg:px-8">

          <Link
            href="/admin"
            className="flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-300 to-cyan-400 font-bold text-[#031421]">
              N
            </div>

            <div>
              <p className="text-sm font-bold">
                NovaBank
              </p>

              <p className="text-[9px] uppercase tracking-[0.16em] text-emerald-300/60">
                Administration
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">

            <div className="hidden items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-1.5 text-xs text-emerald-300 sm:flex">
              <ShieldCheck size={13} />

              Administrator
            </div>

            <Link
              href="/dashboard"
              className="hidden rounded-xl border border-white/10 px-3 py-2 text-xs text-white/50 transition hover:bg-white/5 hover:text-white sm:block"
            >
              Customer view
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/40 transition hover:bg-red-400/10 hover:text-red-300"
            >
              <LogOut size={15} />
            </button>

          </div>
        </div>
      </header>

      {/* =========================================================
          ADMIN NAVIGATION
          ========================================================= */}

      <div className="border-b border-white/10 bg-[#041824]">
        <nav className="mx-auto flex max-w-[1500px] gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">

          {navigation.map(
            (item) => {
              const Icon =
                item.icon;

              const active =
                pathname ===
                  item.href ||
                pathname.startsWith(
                  `${item.href}/`
                );

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-medium transition",
                    active
                      ? "bg-emerald-300/10 text-emerald-300"
                      : "text-white/40 hover:bg-white/5 hover:text-white",
                  ].join(" ")}
                >
                  <Icon size={15} />

                  {item.label}
                </Link>
              );
            }
          )}

        </nav>
      </div>

      {children}

    </div>
  );
}