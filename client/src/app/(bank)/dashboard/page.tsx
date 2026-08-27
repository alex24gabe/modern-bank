"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpRight,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Wallet,
  Globe2,
  ShieldCheck,
} from "lucide-react";

import api from "@/lib/api";

/* ================================================================
   TYPES
================================================================ */

type User = {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  address?: string;
  created_at?: string;
};

type Account = {
  id: string;
  account_number: string;
  account_type: string;
  balance: string | number;
  currency: string;
  status: string;
  created_at?: string;
};

type DashboardData = {
  user: User;
  accounts: Account[];
};

type CurrencyBalance = {
  currency: string;
  amount: number;
  accountCount: number;
};

/* ================================================================
   CURRENCY CONFIG
================================================================ */

const currencyConfig: Record<
  string,
  {
    name: string;
    locale: string;
    symbol: string;
  }
> = {
  NGN: {
    name: "Nigerian Naira",
    locale: "en-NG",
    symbol: "₦",
  },

  USD: {
    name: "US Dollar",
    locale: "en-US",
    symbol: "$",
  },

  GBP: {
    name: "British Pound",
    locale: "en-GB",
    symbol: "£",
  },

  EUR: {
    name: "Euro",
    locale: "en-IE",
    symbol: "€",
  },

  CAD: {
    name: "Canadian Dollar",
    locale: "en-CA",
    symbol: "CA$",
  },
};

/* ================================================================
   HELPERS
================================================================ */

function normalizeCurrency(
  currency?: string
) {
  return (
    currency?.trim().toUpperCase() ||
    "NGN"
  );
}

function formatMoney(
  amount: string | number,
  currency = "NGN"
) {
  const normalized =
    normalizeCurrency(currency);

  const config =
    currencyConfig[normalized];

  try {
    return new Intl.NumberFormat(
      config?.locale || "en-US",
      {
        style: "currency",
        currency: normalized,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    ).format(Number(amount));
  } catch {
    return `${normalized} ${Number(
      amount
    ).toFixed(2)}`;
  }
}

function getAccountName(
  account: Account
) {
  if (!account.account_type) {
    return "Account";
  }

  return account.account_type
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function maskAccountNumber(
  accountNumber: string
) {
  if (!accountNumber) {
    return "••••";
  }

  return `•••• ${accountNumber.slice(
    -4
  )}`;
}

/* ================================================================
   PAGE
================================================================ */

export default function DashboardPage() {
  const [user, setUser] =
    useState<User | null>(null);

  const [accounts, setAccounts] =
    useState<Account[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [hideBalance, setHideBalance] =
    useState(false);

  /* ==============================================================
     LOAD DASHBOARD
  ============================================================== */

  const loadDashboard = async (
    showRefresh = false
  ) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response =
        await api.get<{
          success: boolean;
          message: string;
          data: DashboardData;
        }>("/auth/me");

      if (!response.data.success) {
        throw new Error(
          response.data.message
        );
      }

      setUser(
        response.data.data.user
      );

      setAccounts(
        response.data.data.accounts ||
          []
      );
    } catch (error: any) {
      console.error(
        "Dashboard error:",
        error
      );

      if (
        error.response?.status === 401
      ) {
        localStorage.removeItem(
          "token"
        );

        window.location.href =
          "/login";

        return;
      }

      setError(
        error.response?.data?.message ||
          "Unable to load your dashboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  /* ==============================================================
     ACTIVE ACCOUNTS
  ============================================================== */

  const activeAccounts =
    useMemo(() => {
      return accounts.filter(
        (account) =>
          account.status?.toLowerCase() ===
          "active"
      );
    }, [accounts]);

  /* ==============================================================
     GROUP BALANCES BY CURRENCY
  ============================================================== */

  const currencyBalances =
    useMemo(() => {
      const map = new Map<
        string,
        CurrencyBalance
      >();

      activeAccounts.forEach(
        (account) => {
          const currency =
            normalizeCurrency(
              account.currency
            );

          const numericBalance =
            Number(account.balance);

          const balance =
            Number.isFinite(
              numericBalance
            )
              ? numericBalance
              : 0;

          const existing =
            map.get(currency);

          if (existing) {
            existing.amount += balance;

            existing.accountCount +=
              1;
          } else {
            map.set(currency, {
              currency,
              amount: balance,
              accountCount: 1,
            });
          }
        }
      );

      return Array.from(
        map.values()
      ).sort((a, b) => {
        /*
         * NGN is the default primary
         * currency for NovaBank.
         */

        if (
          a.currency === "NGN" &&
          b.currency !== "NGN"
        ) {
          return -1;
        }

        if (
          a.currency !== "NGN" &&
          b.currency === "NGN"
        ) {
          return 1;
        }

        return a.currency.localeCompare(
          b.currency
        );
      });
    }, [activeAccounts]);

  /* ==============================================================
     PRIMARY CURRENCY
  ============================================================== */

  const primaryCurrency =
    useMemo(() => {
      return (
        currencyBalances.find(
          (item) =>
            item.currency === "NGN"
        ) ||
        currencyBalances[0] ||
        null
      );
    }, [currencyBalances]);

  /* ==============================================================
     OTHER CURRENCIES
  ============================================================== */

  const secondaryCurrencies =
    useMemo(() => {
      if (!primaryCurrency) {
        return [];
      }

      return currencyBalances.filter(
        (item) =>
          item.currency !==
          primaryCurrency.currency
      );
    }, [
      currencyBalances,
      primaryCurrency,
    ]);

  /* ==============================================================
     PRIMARY ACCOUNT
  ============================================================== */

  const primaryAccount =
    useMemo(() => {
      return (
        activeAccounts.find(
          (account) =>
            account.account_type
              ?.toLowerCase() ===
            "savings"
        ) ||
        activeAccounts[0] ||
        null
      );
    }, [activeAccounts]);

  /* ==============================================================
     HIDDEN BALANCE
  ============================================================== */

  const hiddenAmount =
    "••••••••";

  /* ==============================================================
     LOADING
  ============================================================== */

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-76px)]">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">

          <div className="animate-pulse space-y-6">

            <div className="space-y-3">
              <div className="h-4 w-24 rounded bg-white/5" />
              <div className="h-9 w-64 rounded-lg bg-white/5" />
              <div className="h-4 w-80 rounded bg-white/5" />
            </div>

            <div className="h-[290px] rounded-[30px] bg-white/5" />

            <div className="grid gap-4 md:grid-cols-3">
              <div className="h-32 rounded-2xl bg-white/5" />
              <div className="h-32 rounded-2xl bg-white/5" />
              <div className="h-32 rounded-2xl bg-white/5" />
            </div>

            <div className="h-64 rounded-[28px] bg-white/5" />

          </div>

        </div>
      </div>
    );
  }

  /* ================================================================
     MAIN
  ================================================================ */

  return (
    <div className="min-h-[calc(100vh-76px)]">

      <div className="mx-auto max-w-7xl px-5 py-7 sm:px-6 lg:px-8 lg:py-9">

        {/* ==========================================================
           HEADER
        ========================================================== */}

        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">

          <div>

            <div className="flex items-center gap-2">

              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.7)]" />

              <p className="text-sm font-medium text-emerald-300">
                Overview
              </p>

            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">

              Good to see you,{" "}
              {user?.full_name
                ?.split(" ")[0] ||
                "there"}
              .

            </h1>

            <p className="mt-2 text-sm text-white/40">
              Here's what's happening
              with your money.
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              loadDashboard(true)
            }
            disabled={refreshing}
            className="flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/60 transition hover:border-white/15 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >

            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}

          </button>

        </header>

        {/* ==========================================================
           ERROR
        ========================================================== */}

        {error && (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-sm text-red-300">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                loadDashboard()
              }
              className="w-fit text-sm font-semibold text-red-200 underline underline-offset-4"
            >
              Retry
            </button>

          </div>
        )}

        {/* ==========================================================
           MONEY OVERVIEW
        ========================================================== */}

        <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#071d28] shadow-2xl shadow-black/20">

          {/* Decorative glow */}

          <div className="pointer-events-none absolute -right-28 -top-40 h-[420px] w-[420px] rounded-full bg-emerald-400/[0.08] blur-3xl" />

          <div className="pointer-events-none absolute -bottom-40 left-1/3 h-[320px] w-[320px] rounded-full bg-cyan-400/[0.06] blur-3xl" />

          <div className="relative p-6 sm:p-8 lg:p-9">

            {/* Top row */}

            <div className="flex items-start justify-between gap-6">

              <div>

                <div className="flex items-center gap-2">

                  <p className="text-sm font-medium text-white/40">
                    Your money
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setHideBalance(
                        (value) =>
                          !value
                      )
                    }
                    className="rounded-lg p-1 text-white/30 transition hover:bg-white/5 hover:text-white"
                    aria-label={
                      hideBalance
                        ? "Show balances"
                        : "Hide balances"
                    }
                  >

                    {hideBalance ? (
                      <Eye size={16} />
                    ) : (
                      <EyeOff
                        size={16}
                      />
                    )}

                  </button>

                </div>

                {primaryCurrency ? (
                  <div className="mt-3">

                    <div className="flex flex-wrap items-baseline gap-3">

                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/70">
                        {
                          primaryCurrency.currency
                        }
                      </span>

                      <p className="text-4xl font-bold tracking-tight text-white sm:text-5xl">

                        {hideBalance
                          ? hiddenAmount
                          : formatMoney(
                              primaryCurrency.amount,
                              primaryCurrency.currency
                            )}

                      </p>

                    </div>

                    <p className="mt-2 text-xs text-white/30">
                      Primary balance
                    </p>

                  </div>
                ) : (
                  <div className="mt-4">

                    <p className="text-4xl font-bold">
                      {hiddenAmount}
                    </p>

                    <p className="mt-2 text-xs text-white/30">
                      No active balance
                    </p>

                  </div>
                )}

              </div>

              <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.06] sm:flex">

                <Wallet
                  size={24}
                  className="text-emerald-300"
                />

              </div>

            </div>

            {/* ======================================================
               SECONDARY CURRENCIES
            ====================================================== */}

            {secondaryCurrencies.length >
              0 && (
              <div className="mt-8 border-t border-white/10 pt-6">

                <div className="mb-3 flex items-center justify-between">

                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/30">
                    Other currencies
                  </p>

                  <span className="text-[11px] text-white/20">
                    Separate balances
                  </span>

                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                  {secondaryCurrencies.map(
                    (item) => (
                      <div
                        key={
                          item.currency
                        }
                        className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 transition hover:border-white/15 hover:bg-white/[0.04]"
                      >

                        <div className="flex items-center justify-between">

                          <div className="flex items-center gap-2">

                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">

                              <Globe2
                                size={14}
                                className="text-white/40"
                              />

                            </div>

                            <div>

                              <p className="text-sm font-semibold text-white">
                                {
                                  item.currency
                                }
                              </p>

                              <p className="text-[10px] text-white/25">
                                {
                                  currencyConfig[
                                    item.currency
                                  ]?.name ||
                                  "Currency"
                                }
                              </p>

                            </div>

                          </div>

                          <span className="text-[10px] text-white/20">
                            {
                              item.accountCount
                            }{" "}
                            account
                            {item.accountCount !==
                            1
                              ? "s"
                              : ""}
                          </span>

                        </div>

                        <p className="mt-4 text-xl font-bold text-white">

                          {hideBalance
                            ? hiddenAmount
                            : formatMoney(
                                item.amount,
                                item.currency
                              )}

                        </p>

                      </div>
                    )
                  )}

                </div>

              </div>
            )}

            {/* ======================================================
               ACCOUNT COUNT
            ====================================================== */}

            <div className="mt-7 flex items-center gap-2">

              <div className="flex -space-x-2">

                {activeAccounts
                  .slice(0, 3)
                  .map((account) => (
                    <div
                      key={account.id}
                      className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#071d28] bg-white/10"
                    >
                      <CreditCard
                        size={11}
                        className="text-white/50"
                      />
                    </div>
                  ))}

              </div>

              <p className="text-xs text-white/30">

                {activeAccounts.length}{" "}
                active account
                {activeAccounts.length !==
                1
                  ? "s"
                  : ""}

              </p>

            </div>

            {/* ======================================================
               ACTIONS
            ====================================================== */}

            <div className="mt-8 flex flex-wrap gap-3">

              <Link
                href="/deposit"
                className="flex items-center gap-2 rounded-xl bg-emerald-300 px-5 py-3 text-sm font-bold text-[#031421] transition hover:bg-emerald-200"
              >

                <ArrowDownToLine
                  size={17}
                />

                Deposit

              </Link>

              <Link
                href="/transfer"
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/75 transition hover:bg-white/[0.08] hover:text-white"
              >

                <ArrowLeftRight
                  size={17}
                />

                Transfer

              </Link>

              <Link
                href="/accounts"
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/75 transition hover:bg-white/[0.08] hover:text-white"
              >

                <CreditCard
                  size={17}
                />

                Accounts

              </Link>

            </div>

          </div>

        </section>

        {/* ==========================================================
           QUICK STATS
        ========================================================== */}

        <section className="mt-6 grid gap-4 md:grid-cols-3">

          {/* Active accounts */}

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs font-medium uppercase tracking-wider text-white/30">
                  Accounts
                </p>

                <p className="mt-3 text-2xl font-bold text-white">
                  {
                    activeAccounts.length
                  }
                </p>

              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-300/10">

                <Wallet
                  size={18}
                  className="text-emerald-300"
                />

              </div>

            </div>

            <p className="mt-2 text-xs text-white/25">
              Active accounts
            </p>

          </div>

          {/* Primary account */}

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs font-medium uppercase tracking-wider text-white/30">
                  Primary
                </p>

                <p className="mt-3 text-xl font-bold text-white">
                  {primaryAccount
                    ? getAccountName(
                        primaryAccount
                      )
                    : "—"}
                </p>

              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/10">

                <CreditCard
                  size={18}
                  className="text-cyan-300"
                />

              </div>

            </div>

            <p className="mt-2 font-mono text-xs text-white/25">

              {primaryAccount
                ? maskAccountNumber(
                    primaryAccount.account_number
                  )
                : "No account"}

            </p>

          </div>

          {/* Security */}

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs font-medium uppercase tracking-wider text-white/30">
                  Status
                </p>

                <p className="mt-3 text-xl font-bold text-emerald-300">
                  Active
                </p>

              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-300/10">

                <ShieldCheck
                  size={18}
                  className="text-emerald-300"
                />

              </div>

            </div>

            <p className="mt-2 text-xs text-white/25">
              Banking access available
            </p>

          </div>

        </section>

        {/* ==========================================================
           ACCOUNTS
        ========================================================== */}

        <section className="mt-9">

          <div className="mb-4 flex items-end justify-between">

            <div>

              <p className="text-xs font-medium uppercase tracking-wider text-white/25">
                Banking
              </p>

              <h2 className="mt-1 text-xl font-bold text-white">
                Your accounts
              </h2>

              <p className="mt-1 text-xs text-white/30">
                Manage your NovaBank
                accounts and balances.
              </p>

            </div>

            <Link
              href="/accounts"
              className="flex items-center gap-1 text-sm font-medium text-emerald-300 transition hover:text-emerald-200"
            >

              View all

              <ChevronRight
                size={16}
              />

            </Link>

          </div>

          {accounts.length === 0 ? (
            <div className="rounded-[26px] border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">

                <Wallet
                  size={21}
                  className="text-white/30"
                />

              </div>

              <h3 className="mt-4 font-semibold">
                No accounts found
              </h3>

              <p className="mt-2 text-sm text-white/35">
                Your accounts will
                appear here once they
                are available.
              </p>

            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">

              {accounts.map(
                (account) => {

                  const currency =
                    normalizeCurrency(
                      account.currency
                    );

                  const isActive =
                    account.status?.toLowerCase() ===
                    "active";

                  return (
                    <div
                      key={account.id}
                      className="group rounded-[26px] border border-white/10 bg-[#071b27] p-6 transition duration-200 hover:border-white/15 hover:bg-[#09212d]"
                    >

                      {/* Account header */}

                      <div className="flex items-start justify-between gap-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-300/10">

                            <CreditCard
                              size={20}
                              className="text-emerald-300"
                            />

                          </div>

                          <div>

                            <div className="flex items-center gap-2">

                              <p className="font-semibold text-white">
                                {getAccountName(
                                  account
                                )}
                              </p>

                              <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/30">
                                {currency}
                              </span>

                            </div>

                            <p className="mt-1 font-mono text-xs text-white/30">
                              {maskAccountNumber(
                                account.account_number
                              )}
                            </p>

                          </div>

                        </div>

                        <span
                          className={
                            isActive
                              ? "rounded-full bg-emerald-300/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300"
                              : "rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/30"
                          }
                        >
                          {
                            account.status
                          }
                        </span>

                      </div>

                      {/* Account balance */}

                      <div className="mt-8 flex items-end justify-between gap-5">

                        <div>

                          <p className="text-xs text-white/30">
                            Available balance
                          </p>

                          <p className="mt-2 text-2xl font-bold tracking-tight text-white">

                            {hideBalance
                              ? hiddenAmount
                              : formatMoney(
                                  account.balance,
                                  currency
                                )}

                          </p>

                          <p className="mt-1 text-[11px] text-white/20">
                            {currencyConfig[
                              currency
                            ]?.name ||
                              currency}
                          </p>

                        </div>

                        <Link
                          href={`/accounts/${account.id}`}
                          aria-label={`View ${getAccountName(
                            account
                          )} account`}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/30 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
                        >

                          <ChevronRight
                            size={17}
                          />

                        </Link>

                      </div>

                    </div>
                  );
                }
              )}

              {/* Manage accounts */}

              <Link
                href="/accounts"
                className="flex min-h-[180px] items-center justify-center rounded-[26px] border border-dashed border-white/10 bg-white/[0.015] transition hover:border-emerald-300/20 hover:bg-emerald-300/[0.02]"
              >

                <div className="text-center">

                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">

                    <Plus
                      size={20}
                      className="text-white/40"
                    />

                  </div>

                  <p className="mt-3 text-sm font-semibold text-white/60">
                    Manage accounts
                  </p>

                  <p className="mt-1 text-xs text-white/25">
                    View and manage your
                    banking accounts
                  </p>

                </div>

              </Link>

            </div>
          )}

        </section>

        {/* ==========================================================
           SECURITY FOOTER
        ========================================================== */}

        <section className="mt-8 rounded-[24px] border border-white/10 bg-white/[0.02] p-5 sm:p-6">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-start gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-300/10">

                <ShieldCheck
                  size={18}
                  className="text-emerald-300"
                />

              </div>

              <div>

                <p className="text-sm font-semibold text-white">
                  Your account is secure
                </p>

                <p className="mt-1 max-w-xl text-xs leading-5 text-white/30">
                  Never share your password,
                  verification codes or
                  authentication credentials
                  with anyone.
                </p>

              </div>

            </div>

            <Link
              href="/settings"
              className="flex w-fit items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
            >

              Security settings

              <ChevronRight
                size={15}
              />

            </Link>

          </div>

        </section>

      </div>

    </div>
  );
}