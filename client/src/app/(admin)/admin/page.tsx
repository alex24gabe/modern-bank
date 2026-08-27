"use client";

import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Clock3,
  Globe2,
  RefreshCw,
  ShieldCheck,
  Users,
  WalletCards,
  XCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import api from "@/lib/api";

type DashboardData = {
  customers: {
    total_customers: number;
    customer_accounts: number;
    administrators: number;
  };

  accounts: {
    total_accounts: number;
    active_accounts: number;
    total_balance: string;
  };

  transactions: {
    total_transactions: number;
    successful_transactions: number;
    unsuccessful_transactions: number;
    transactions_today: number;
    successful_transaction_volume: string;
  };

  externalTransfers: {
    total_external_transactions: number;
    successful_external_transactions: number;
    domestic_transfers: number;
    international_transfers: number;
    external_transaction_volume: string;
  };

  notifications: {
    total_notifications: number;
    unread_notifications: number;
  };

  recentTransactions: RecentTransaction[];
};

type RecentTransaction = {
  id: string;
  amount: string | number;
  transaction_type: string;
  reference: string;
  status: string;
  created_at: string;
  sender_account_number?: string | null;
  receiver_account_number?: string | null;
};

function formatMoney(
  amount: string | number,
  currency = "NGN"
) {
  const value = Number(amount || 0);

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function maskAccount(
  account?: string | null
) {
  if (!account) {
    return "—";
  }

  if (account.length <= 6) {
    return account;
  }

  return `${account.slice(
    0,
    3
  )}••••${account.slice(-3)}`;
}

function statusIsSuccess(status: string) {
  return (
    String(status).toUpperCase() ===
    "SUCCESS"
  );
}

export default function AdminDashboardPage() {
  const [data, setData] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadDashboard =
    useCallback(async () => {
      try {
        setError("");

        const response =
          await api.get(
            "/admin/dashboard"
          );

        if (!response.data?.success) {
          throw new Error(
            response.data?.message ||
              "Unable to load admin dashboard."
          );
        }

        setData(
          response.data.data
        );
      } catch (error: any) {
        console.error(
          "Admin dashboard error:",
          error
        );

        setError(
          error?.response?.data?.message ||
            error?.message ||
            "Unable to load admin dashboard."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  function handleRefresh() {
    setRefreshing(true);
    loadDashboard();
  }

  if (loading) {
    return (
      <main className="min-h-screen p-6 lg:p-8">
        <div className="mx-auto max-w-[1500px] animate-pulse">
          <div className="h-4 w-32 rounded bg-white/10" />
          <div className="mt-3 h-10 w-64 rounded bg-white/10" />
          <div className="mt-3 h-4 w-96 max-w-full rounded bg-white/5" />

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({
              length: 4,
            }).map((_, index) => (
              <div
                key={index}
                className="h-36 rounded-2xl border border-white/10 bg-white/[0.03]"
              />
            ))}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {Array.from({
              length: 3,
            }).map((_, index) => (
              <div
                key={index}
                className="h-40 rounded-2xl border border-white/10 bg-white/[0.03]"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen p-6 lg:p-8">
        <div className="mx-auto max-w-[1500px]">
          <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-6">
            <div className="flex items-center gap-3 text-red-300">
              <XCircle size={20} />
              <p className="font-semibold">
                Unable to load dashboard
              </p>
            </div>

            <p className="mt-2 text-sm text-white/45">
              {error}
            </p>

            <button
              type="button"
              onClick={handleRefresh}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
            >
              <RefreshCw size={16} />
              Try again
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  const cards = [
    {
      label: "Customers",
      value:
        data.customers.total_customers,
      detail: `${data.customers.customer_accounts} customer accounts`,
      icon: Users,
      href: "/admin/customers",
    },
    {
      label: "Accounts",
      value:
        data.accounts.total_accounts,
      detail: `${data.accounts.active_accounts} active accounts`,
      icon: WalletCards,
      href: "/admin/accounts",
    },
    {
      label: "Transactions",
      value:
        data.transactions.total_transactions,
      detail: `${data.transactions.transactions_today} today`,
      icon: ArrowUpRight,
      href: "/admin/transactions",
    },
    {
      label: "Notifications",
      value:
        data.notifications.total_notifications,
      detail: `${data.notifications.unread_notifications} unread`,
      icon: Bell,
      href: "/admin/notifications",
    },
  ];

  return (
    <main className="min-h-screen p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px]">

        {/* HEADER */}

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-300/70">
              <ShieldCheck size={15} />
              Administration
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Dashboard
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-white/40">
              Monitor NovaBank customers,
              accounts, transactions and
              operational activity.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-2.5 text-sm text-white/60 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />
            Refresh
          </button>
        </div>

        {/* SUMMARY CARDS */}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.label}
                href={card.href}
                className="group rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:-translate-y-0.5 hover:border-emerald-300/20 hover:bg-white/[0.04]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                    <Icon size={20} />
                  </div>

                  <ArrowRight
                    size={16}
                    className="text-white/20 transition group-hover:translate-x-1 group-hover:text-emerald-300"
                  />
                </div>

                <p className="mt-5 text-sm text-white/40">
                  {card.label}
                </p>

                <p className="mt-1 text-3xl font-bold tracking-tight">
                  {card.value.toLocaleString()}
                </p>

                <p className="mt-2 text-xs text-white/30">
                  {card.detail}
                </p>
              </Link>
            );
          })}
        </div>

        {/* OPERATIONAL METRICS */}

        <div className="mt-6 grid gap-4 lg:grid-cols-3">

          {/* Accounts */}

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                <WalletCards size={19} />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  Account position
                </p>

                <p className="text-xs text-white/30">
                  Current banking position
                </p>
              </div>
            </div>

            <div className="mt-7">
              <p className="text-xs text-white/30">
                Total balance
              </p>

              <p className="mt-1 text-2xl font-bold">
                {formatMoney(
                  data.accounts.total_balance
                )}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
              <span className="text-xs text-white/35">
                Active accounts
              </span>

              <span className="text-sm font-semibold text-emerald-300">
                {data.accounts.active_accounts}
              </span>
            </div>
          </div>

          {/* Transactions */}

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                <ArrowUpRight size={19} />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  Transaction activity
                </p>

                <p className="text-xs text-white/30">
                  Internal transfer performance
                </p>
              </div>
            </div>

            <div className="mt-7">
              <p className="text-xs text-white/30">
                Successful volume
              </p>

              <p className="mt-1 text-2xl font-bold">
                {formatMoney(
                  data.transactions
                    .successful_transaction_volume
                )}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
              <div>
                <p className="text-xs text-white/30">
                  Successful
                </p>

                <p className="mt-1 text-sm font-semibold text-emerald-300">
                  {
                    data.transactions
                      .successful_transactions
                  }
                </p>
              </div>

              <div>
                <p className="text-xs text-white/30">
                  Unsuccessful
                </p>

                <p className="mt-1 text-sm font-semibold text-red-300">
                  {
                    data.transactions
                      .unsuccessful_transactions
                  }
                </p>
              </div>
            </div>
          </div>

          {/* External transfers */}

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                <Globe2 size={19} />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  External transfers
                </p>

                <p className="text-xs text-white/30">
                  Domestic and international
                </p>
              </div>
            </div>

            <div className="mt-7">
              <p className="text-xs text-white/30">
                Successful volume
              </p>

              <p className="mt-1 text-2xl font-bold">
                {formatMoney(
                  data.externalTransfers
                    .external_transaction_volume
                )}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
              <div>
                <p className="text-xs text-white/30">
                  Domestic
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {
                    data.externalTransfers
                      .domestic_transfers
                  }
                </p>
              </div>

              <div>
                <p className="text-xs text-white/30">
                  International
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {
                    data.externalTransfers
                      .international_transfers
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SYSTEM OVERVIEW */}

        <div className="mt-6 grid gap-4 lg:grid-cols-3">

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                Customer base
              </p>

              <Users
                size={18}
                className="text-emerald-300"
              />
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/40">
                  Customers
                </span>

                <span className="text-sm font-semibold">
                  {data.customers.total_customers}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-white/40">
                  Administrators
                </span>

                <span className="text-sm font-semibold">
                  {data.customers.administrators}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                Today's activity
              </p>

              <Clock3
                size={18}
                className="text-emerald-300"
              />
            </div>

            <div className="mt-5">
              <p className="text-xs text-white/30">
                Transactions today
              </p>

              <p className="mt-1 text-2xl font-bold">
                {data.transactions.transactions_today}
              </p>

              <p className="mt-2 text-xs text-white/30">
                Across the NovaBank platform
              </p>
            </div>
          </div>

          <Link
            href="/admin/notifications"
            className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:border-emerald-300/20 hover:bg-white/[0.04]"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                Notifications
              </p>

              <Bell
                size={18}
                className="text-emerald-300"
              />
            </div>

            <div className="mt-5">
              <p className="text-xs text-white/30">
                Unread notifications
              </p>

              <p className="mt-1 text-2xl font-bold">
                {data.notifications.unread_notifications}
              </p>

              <p className="mt-2 text-xs text-white/30">
                View customer notification activity
              </p>
            </div>
          </Link>
        </div>

        {/* RECENT TRANSACTIONS */}

        <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
          <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">
                Recent transactions
              </p>

              <p className="mt-1 text-xs text-white/30">
                Latest internal banking activity
              </p>
            </div>

            <Link
              href="/admin/transactions"
              className="inline-flex items-center gap-2 text-sm text-emerald-300 transition hover:text-emerald-200"
            >
              View all
              <ArrowRight size={15} />
            </Link>
          </div>

          {data.recentTransactions.length ===
          0 ? (
            <div className="px-5 py-12 text-center text-sm text-white/35">
              No transactions available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-[0.12em] text-white/25">
                    <th className="px-5 py-4 font-medium">
                      Transaction
                    </th>

                    <th className="px-5 py-4 font-medium">
                      From
                    </th>

                    <th className="px-5 py-4 font-medium">
                      To
                    </th>

                    <th className="px-5 py-4 font-medium">
                      Amount
                    </th>

                    <th className="px-5 py-4 font-medium">
                      Status
                    </th>

                    <th className="px-5 py-4 font-medium">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {data.recentTransactions.map(
                    (transaction) => {
                      const successful =
                        statusIsSuccess(
                          transaction.status
                        );

                      return (
                        <tr
                          key={transaction.id}
                          className="border-b border-white/5 last:border-0 transition hover:bg-white/[0.02]"
                        >
                          <td className="px-5 py-4">
                            <Link
                              href={`/admin/transactions/${transaction.id}`}
                              className="group block"
                            >
                              <p className="text-sm font-medium text-white transition group-hover:text-emerald-300">
                                {
                                  transaction.transaction_type
                                }
                              </p>

                              <p className="mt-1 text-xs text-white/25">
                                {
                                  transaction.reference
                                }
                              </p>
                            </Link>
                          </td>

                          <td className="px-5 py-4 text-sm text-white/50">
                            {maskAccount(
                              transaction.sender_account_number
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm text-white/50">
                            {maskAccount(
                              transaction.receiver_account_number
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold">
                            {formatMoney(
                              transaction.amount
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                                successful
                                  ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-300"
                                  : "border-red-300/20 bg-red-300/10 text-red-300"
                              }`}
                            >
                              {successful ? (
                                <CheckCircle2
                                  size={13}
                                />
                              ) : (
                                <XCircle
                                  size={13}
                                />
                              )}

                              {transaction.status}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-xs text-white/35">
                            {formatDate(
                              transaction.created_at
                            )}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}