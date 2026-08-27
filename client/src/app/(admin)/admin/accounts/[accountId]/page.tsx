"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  UserRound,
  WalletCards,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Ban,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

type Account = {
  id: string;
  user_id: string;
  account_number: string;
  account_type: string;
  balance: string | number;
  currency: string;
  status: string;
  created_at: string;

  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  customer_created_at: string;
};

type Transaction = {
  id: string;
  amount: string | number;
  transaction_type: string;
  description: string | null;
  reference: string;
  status: string;
  created_at: string;
  direction: string;
  sender_account_number: string | null;
  receiver_account_number: string | null;
};

type DetailResponse = {
  success: boolean;
  message?: string;
  data?: {
    account: Account;

    transactionSummary: {
      transaction_count: number;
      successful_transactions: number;
      transaction_volume: string;
    };

    depositSummary: {
      deposit_count: number;
      deposit_volume: string;
    };

    recentTransactions: Transaction[];
  };
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

function getToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    localStorage.getItem("token") ||
    localStorage.getItem(
      "novabank_token"
    ) ||
    localStorage.getItem(
      "accessToken"
    )
  );
}

function money(
  value: string | number,
  currency: string
) {
  return new Intl.NumberFormat(
    "en-NG",
    {
      style: "currency",
      currency:
        currency === "USD"
          ? "USD"
          : "NGN",
      minimumFractionDigits: 2,
    }
  ).format(Number(value || 0));
}

function date(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en-NG",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(new Date(value));
}

export default function AdminAccountDetailPage() {
  const params =
    useParams();

  const accountId =
    String(
      params.accountId || ""
    );

  const [data, setData] =
    useState<
      DetailResponse["data"]
    >();

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [changingStatus, setChangingStatus] =
    useState(false);

  async function loadAccount() {
    try {
      setLoading(true);
      setError("");

      const token =
        getToken();

      if (!token) {
        throw new Error(
          "Admin authentication token not found."
        );
      }

      const response =
        await fetch(
          `${API_URL}/admin/accounts/${accountId}`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

      const result =
        (await response.json()) as DetailResponse;

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Unable to retrieve account."
        );
      }

      if (!result.success) {
        throw new Error(
          result.message ||
            "Unable to retrieve account."
        );
      }

      setData(
        result.data
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to retrieve account."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (accountId) {
      loadAccount();
    }
  }, [accountId]);

  async function changeStatus(
    status: string
  ) {
    if (!data?.account) {
      return;
    }

    const confirmed =
      window.confirm(
        `Change account status to ${status}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setChangingStatus(
        true
      );

      const token =
        getToken();

      if (!token) {
        throw new Error(
          "Admin authentication token not found."
        );
      }

      const response =
        await fetch(
          `${API_URL}/admin/accounts/${accountId}/status`,
          {
            method: "PATCH",
            headers: {
              Authorization:
                `Bearer ${token}`,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              status,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Unable to update account status."
        );
      }

      await loadAccount();
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : "Unable to update account status."
      );
    } finally {
      setChangingStatus(
        false
      );
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#031421] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="animate-pulse space-y-5">
            <div className="h-8 w-48 rounded bg-white/5" />
            <div className="h-32 rounded-2xl bg-white/5" />
            <div className="grid gap-4 md:grid-cols-3">
              <div className="h-32 rounded-2xl bg-white/5" />
              <div className="h-32 rounded-2xl bg-white/5" />
              <div className="h-32 rounded-2xl bg-white/5" />
            </div>
            <div className="h-96 rounded-2xl bg-white/5" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#031421] px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <Link
            href="/admin/accounts"
            className="mb-8 inline-flex items-center gap-2 text-sm text-white/40 hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to accounts
          </Link>

          <div className="rounded-2xl border border-red-300/20 bg-red-300/[0.05] p-8 text-center">
            <AlertTriangle
              size={28}
              className="mx-auto text-red-300"
            />

            <h1 className="mt-4 text-lg font-semibold">
              Account unavailable
            </h1>

            <p className="mt-2 text-sm text-white/35">
              {error ||
                "The requested account could not be found."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const {
    account,
    transactionSummary,
    depositSummary,
    recentTransactions,
  } = data;

  return (
    <main className="min-h-screen bg-[#031421] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px]">

        {/* BACK */}

        <Link
          href="/admin/accounts"
          className="mb-7 inline-flex items-center gap-2 text-sm text-white/40 transition hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to accounts
        </Link>

        {/* HEADER */}

        <section className="mb-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">

          <div className="border-b border-white/10 p-6 sm:p-8">

            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

              <div className="flex items-center gap-4">

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-300">
                  <WalletCards
                    size={25}
                  />
                </div>

                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold">
                      {account.account_number}
                    </h1>

                    <StatusBadge
                      status={
                        account.status
                      }
                    />
                  </div>

                  <p className="text-sm text-white/35">
                    {account.account_type}
                    {" · "}
                    {account.currency}
                  </p>
                </div>

              </div>

              <div className="flex flex-wrap gap-2">

                {account.status !==
                  "Active" && (
                  <button
                    type="button"
                    disabled={
                      changingStatus
                    }
                    onClick={() =>
                      changeStatus(
                        "Active"
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-2.5 text-xs font-medium text-emerald-300 hover:bg-emerald-300/15 disabled:opacity-50"
                  >
                    <CheckCircle2
                      size={14}
                    />
                    Activate
                  </button>
                )}

                {account.status !==
                  "Suspended" && (
                  <button
                    type="button"
                    disabled={
                      changingStatus
                    }
                    onClick={() =>
                      changeStatus(
                        "Suspended"
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-2.5 text-xs font-medium text-amber-300 hover:bg-amber-300/15 disabled:opacity-50"
                  >
                    <Ban
                      size={14}
                    />
                    Suspend
                  </button>
                )}

                {account.status !==
                  "Closed" && (
                  <button
                    type="button"
                    disabled={
                      changingStatus
                    }
                    onClick={() =>
                      changeStatus(
                        "Closed"
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-2.5 text-xs font-medium text-red-300 hover:bg-red-300/15 disabled:opacity-50"
                  >
                    <Ban
                      size={14}
                    />
                    Close
                  </button>
                )}

                <button
                  type="button"
                  disabled={
                    loading
                  }
                  onClick={
                    loadAccount
                  }
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 px-3 py-2.5 text-white/50 hover:bg-white/5 hover:text-white"
                >
                  <RefreshCw
                    size={15}
                  />
                </button>

              </div>

            </div>
          </div>

          <div className="grid divide-y divide-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">

            <Metric
              label="Current balance"
              value={money(
                account.balance,
                account.currency
              )}
            />

            <Metric
              label="Transactions"
              value={
                transactionSummary.transaction_count
              }
            />

            <Metric
              label="Transaction volume"
              value={money(
                transactionSummary.transaction_volume,
                account.currency
              )}
            />

            <Metric
              label="Deposits"
              value={
                depositSummary.deposit_count
              }
            />

          </div>
        </section>

        {/* MAIN GRID */}

        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">

          {/* CUSTOMER */}

          <section className="rounded-2xl border border-white/10 bg-white/[0.025]">

            <div className="border-b border-white/10 p-5">
              <div className="flex items-center gap-2">
                <UserRound
                  size={17}
                  className="text-emerald-300"
                />

                <h2 className="text-sm font-semibold">
                  Account owner
                </h2>
              </div>
            </div>

            <div className="space-y-5 p-5">

              <div>
                <p className="text-lg font-semibold">
                  {account.customer_name}
                </p>

                <p className="mt-1 text-sm text-white/35">
                  {account.customer_email}
                </p>
              </div>

              <Info
                label="Phone"
                value={
                  account.customer_phone ||
                  "Not provided"
                }
              />

              <Info
                label="Address"
                value={
                  account.customer_address ||
                  "Not provided"
                }
              />

              <Info
                label="Customer since"
                value={date(
                  account.customer_created_at
                )}
              />

              <div className="border-t border-white/10 pt-5">
                <p className="mb-2 text-[10px] uppercase tracking-[0.15em] text-white/25">
                  Account ID
                </p>

                <p className="break-all font-mono text-xs text-white/35">
                  {account.id}
                </p>
              </div>

            </div>
          </section>

          {/* TRANSACTIONS */}

          <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">

            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <h2 className="text-sm font-semibold">
                  Recent activity
                </h2>

                <p className="mt-1 text-xs text-white/30">
                  Last 20 transactions
                </p>
              </div>

              <ShieldCheck
                size={17}
                className="text-white/20"
              />
            </div>

            {recentTransactions.length ===
            0 ? (
              <div className="flex min-h-[260px] items-center justify-center px-6 text-center">
                <div>
                  <p className="text-sm text-white/50">
                    No transactions
                  </p>

                  <p className="mt-1 text-xs text-white/25">
                    This account has no
                    transaction activity yet.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">

                {recentTransactions.map(
                  (transaction) => {
                    const debit =
                      transaction.direction ===
                      "DEBIT";

                    return (
                      <div
                        key={
                          transaction.id
                        }
                        className="flex items-center gap-4 px-5 py-4"
                      >
                        <div
                          className={[
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                            debit
                              ? "bg-red-300/10 text-red-300"
                              : "bg-emerald-300/10 text-emerald-300",
                          ].join(" ")}
                        >
                          {debit ? (
                            <ArrowUpRight
                              size={16}
                            />
                          ) : (
                            <ArrowDownLeft
                              size={16}
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-white/75">
                              {
                                transaction.transaction_type
                              }
                            </p>

                            <span className="text-[10px] text-white/25">
                              {
                                transaction.status
                              }
                            </span>
                          </div>

                          <p className="mt-1 truncate text-xs text-white/30">
                            {
                              transaction.reference
                            }
                          </p>

                          <p className="mt-1 text-[11px] text-white/20">
                            {date(
                              transaction.created_at
                            )}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p
                            className={[
                              "text-sm font-semibold",
                              debit
                                ? "text-red-300"
                                : "text-emerald-300",
                            ].join(" ")}
                          >
                            {debit
                              ? "-"
                              : "+"}
                            {money(
                              transaction.amount,
                              account.currency
                            )}
                          </p>

                          <p className="mt-1 text-[10px] uppercase tracking-wider text-white/20">
                            {
                              transaction.direction
                            }
                          </p>
                        </div>

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </section>

        </div>

      </div>
    </main>
  );
}

/*
 * ================================================================
 * COMPONENTS
 * ================================================================
 */

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="p-5">
      <p className="text-[10px] uppercase tracking-[0.15em] text-white/25">
        {label}
      </p>

      <p className="mt-2 text-lg font-bold text-white/85">
        {value}
      </p>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.15em] text-white/25">
        {label}
      </p>

      <p className="mt-1 text-sm text-white/60">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized =
    status.toLowerCase();

  const active =
    normalized === "active";

  const suspended =
    normalized === "suspended";

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium",
        active
          ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-300"
          : suspended
            ? "border-amber-300/20 bg-amber-300/10 text-amber-300"
            : "border-red-300/20 bg-red-300/10 text-red-300",
      ].join(" ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
