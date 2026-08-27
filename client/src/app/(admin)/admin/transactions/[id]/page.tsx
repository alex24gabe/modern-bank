"use client";

import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Copy,
  FileText,
  RefreshCw,
  ShieldCheck,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useParams } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

type Party = {
  account_id?: string;
  external_account_id?: string;
  account_number?: string;
  account_type?: string;
  currency?: string;
  name?: string;
  email?: string;
  bank_name?: string;
  bank_code?: string;
  destination_currency?: string;
};

type Receipt = {
  id: string;
  receipt_number: string;
  created_at: string;
};

type Transaction = {
  id: string;
  source: "INTERNAL" | "EXTERNAL";
  transaction_type: string;
  amount: string | number;
  currency?: string;
  source_currency?: string;
  destination_currency?: string;
  description?: string | null;
  reference: string;
  status: string;
  created_at: string;
  fee?: string | number;
  sender?: Party | null;
  receiver?: Party | null;
  receipt?: Receipt | null;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  data?: {
    transaction: Transaction;
  };
};

function getToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("novabank_token") ||
    localStorage.getItem("accessToken")
  );
}

function formatMoney(
  value: string | number,
  currency = "NGN"
) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currency || "NGN",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

function getCurrency(transaction: Transaction) {
  return (
    transaction.currency ||
    transaction.source_currency ||
    "NGN"
  );
}

function statusIcon(status: string) {
  const normalized = status.toUpperCase();

  if (normalized === "SUCCESS") {
    return <CheckCircle2 size={18} />;
  }

  if (
    normalized === "PENDING" ||
    normalized === "PROCESSING"
  ) {
    return <Clock3 size={18} />;
  }

  return <XCircle size={18} />;
}

function statusClass(status: string) {
  const normalized = status.toUpperCase();

  if (normalized === "SUCCESS") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (
    normalized === "PENDING" ||
    normalized === "PROCESSING"
  ) {
    return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  }

  return "border-red-400/20 bg-red-400/10 text-red-300";
}

function PartyCard({
  title,
  party,
  type,
}: {
  title: string;
  party?: Party | null;
  type: "sender" | "receiver";
}) {
  if (!party) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0a1b28] p-6">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/35">
          {title}
        </p>

        <p className="mt-4 text-sm text-white/40">
          No account information available.
        </p>
      </div>
    );
  }

  const isExternal =
    Boolean(party.external_account_id);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0a1b28] p-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/35">
          {title}
        </p>

        {type === "sender" ? (
          <ArrowUpRight
            size={18}
            className="text-white/35"
          />
        ) : (
          <ArrowDownLeft
            size={18}
            className="text-white/35"
          />
        )}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
          {isExternal ? (
            <WalletCards size={20} />
          ) : (
            <UserRound size={20} />
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate font-semibold text-white">
            {party.name || "Unknown"}
          </p>

          {party.email && (
            <p className="truncate text-sm text-white/40">
              {party.email}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4 border-t border-white/8 pt-5">
        {party.account_number && (
          <div>
            <p className="text-xs text-white/30">
              Account number
            </p>
            <p className="mt-1 font-mono text-sm text-white/75">
              {party.account_number}
            </p>
          </div>
        )}

        {party.account_type && (
          <div>
            <p className="text-xs text-white/30">
              Account type
            </p>
            <p className="mt-1 text-sm text-white/75">
              {party.account_type}
            </p>
          </div>
        )}

        {party.bank_name && (
          <div>
            <p className="text-xs text-white/30">
              Bank
            </p>
            <p className="mt-1 text-sm text-white/75">
              {party.bank_name}
            </p>
          </div>
        )}

        {party.bank_code && (
          <div>
            <p className="text-xs text-white/30">
              Bank code
            </p>
            <p className="mt-1 font-mono text-sm text-white/75">
              {party.bank_code}
            </p>
          </div>
        )}

        {party.currency && (
          <div>
            <p className="text-xs text-white/30">
              Currency
            </p>
            <p className="mt-1 text-sm text-white/75">
              {party.currency}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminTransactionDetailPage() {
  const params = useParams();
  const transactionId =
    params?.id as string;

  const [transaction, setTransaction] =
    useState<Transaction | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [copied, setCopied] =
    useState(false);

  const loadTransaction =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const token = getToken();

        if (!token) {
          throw new Error(
            "Admin authentication token not found."
          );
        }

        if (!transactionId) {
          throw new Error(
            "Transaction ID is missing."
          );
        }

        const response =
          await fetch(
            `${API_URL}/admin/transactions/${transactionId}`,
            {
              method: "GET",
              headers: {
                Authorization:
                  `Bearer ${token}`,
                Accept:
                  "application/json",
              },
              cache: "no-store",
            }
          );

        const data =
          (await response.json()) as ApiResponse;

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              "Unable to retrieve transaction."
          );
        }

        setTransaction(
          data.data?.transaction || null
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to retrieve transaction."
        );
      } finally {
        setLoading(false);
      }
    }, [transactionId]);

  useEffect(() => {
    loadTransaction();
  }, [loadTransaction]);

  async function copyReference() {
    if (!transaction?.reference) {
      return;
    }

    await navigator.clipboard.writeText(
      transaction.reference
    );

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1500);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#031421] px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="h-5 w-32 animate-pulse rounded bg-white/10" />

          <div className="mt-8 h-12 w-72 animate-pulse rounded bg-white/10" />

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="h-72 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-72 animate-pulse rounded-2xl bg-white/5" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !transaction) {
    return (
      <main className="min-h-screen bg-[#031421] px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <Link
            href="/admin/transactions"
            className="inline-flex items-center gap-2 text-sm text-white/45 transition hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to transactions
          </Link>

          <div className="mt-8 rounded-2xl border border-red-400/20 bg-[#0a1b28] p-10 text-center">
            <XCircle
              size={40}
              className="mx-auto text-red-300"
            />

            <h1 className="mt-5 text-xl font-semibold">
              Transaction unavailable
            </h1>

            <p className="mt-2 text-sm text-white/40">
              {error ||
                "Unable to retrieve transaction."}
            </p>

            <button
              type="button"
              onClick={loadTransaction}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
            >
              <RefreshCw size={16} />
              Try again
            </button>
          </div>
        </div>
      </main>
    );
  }

  const currency =
    getCurrency(transaction);

  return (
    <main className="min-h-screen bg-[#031421] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px]">

        {/* BACK */}

        <Link
          href="/admin/transactions"
          className="inline-flex items-center gap-2 text-sm text-white/45 transition hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to transactions
        </Link>

        {/* HEADER */}

        <div className="mt-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-300/70">
              <ShieldCheck size={15} />
              Administration
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Transaction details
            </h1>

            <p className="mt-2 text-sm text-white/40">
              Review transaction information,
              parties and processing details.
            </p>
          </div>

          <button
            type="button"
            onClick={loadTransaction}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-sm text-white/65 transition hover:bg-white/5 hover:text-white"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {/* SUMMARY */}

        <section className="mt-8 rounded-2xl border border-white/10 bg-[#0a1b28] p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/35">
                Transaction amount
              </p>

              <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                {formatMoney(
                  transaction.amount,
                  currency
                )}
              </p>

              <p className="mt-2 text-sm text-white/35">
                {transaction.transaction_type}
              </p>
            </div>

            <div
              className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${statusClass(
                transaction.status
              )}`}
            >
              {statusIcon(
                transaction.status
              )}

              {transaction.status}
            </div>
          </div>
        </section>

        {/* TRANSACTION INFORMATION */}

        <section className="mt-6 rounded-2xl border border-white/10 bg-[#0a1b28] p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
              <FileText size={19} />
            </div>

            <div>
              <h2 className="font-semibold">
                Transaction information
              </h2>

              <p className="text-sm text-white/35">
                Core processing details
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-white/30">
                Reference
              </p>

              <div className="mt-2 flex items-center gap-2">
                <p className="break-all font-mono text-sm text-white/75">
                  {transaction.reference}
                </p>

                <button
                  type="button"
                  onClick={copyReference}
                  className="shrink-0 rounded-lg p-1.5 text-white/35 transition hover:bg-white/5 hover:text-white"
                  title="Copy reference"
                >
                  <Copy size={14} />
                </button>
              </div>

              {copied && (
                <p className="mt-1 text-xs text-emerald-300">
                  Copied
                </p>
              )}
            </div>

            <div>
              <p className="text-xs text-white/30">
                Source
              </p>

              <p className="mt-2 text-sm font-medium text-white/75">
                {transaction.source}
              </p>
            </div>

            <div>
              <p className="text-xs text-white/30">
                Transaction type
              </p>

              <p className="mt-2 text-sm font-medium text-white/75">
                {transaction.transaction_type}
              </p>
            </div>

            <div>
              <p className="text-xs text-white/30">
                Created
              </p>

              <p className="mt-2 text-sm text-white/75">
                {formatDate(
                  transaction.created_at
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-white/30">
                Currency
              </p>

              <p className="mt-2 text-sm text-white/75">
                {currency}
              </p>
            </div>

            {transaction.source_currency && (
              <div>
                <p className="text-xs text-white/30">
                  Source currency
                </p>

                <p className="mt-2 text-sm text-white/75">
                  {transaction.source_currency}
                </p>
              </div>
            )}

            {transaction.destination_currency && (
              <div>
                <p className="text-xs text-white/30">
                  Destination currency
                </p>

                <p className="mt-2 text-sm text-white/75">
                  {transaction.destination_currency}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs text-white/30">
                Fee
              </p>

              <p className="mt-2 text-sm text-white/75">
                {formatMoney(
                  transaction.fee || 0,
                  currency
                )}
              </p>
            </div>
          </div>

          {transaction.description && (
            <div className="mt-7 border-t border-white/8 pt-6">
              <p className="text-xs text-white/30">
                Description
              </p>

              <p className="mt-2 text-sm text-white/65">
                {transaction.description}
              </p>
            </div>
          )}
        </section>

        {/* PARTIES */}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <PartyCard
            title="Sender"
            party={transaction.sender}
            type="sender"
          />

          <PartyCard
            title="Receiver"
            party={transaction.receiver}
            type="receiver"
          />
        </div>

        {/* RECEIPT */}

        {transaction.receipt && (
          <section className="mt-6 rounded-2xl border border-white/10 bg-[#0a1b28] p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                  <FileText size={19} />
                </div>

                <div>
                  <h2 className="font-semibold">
                    Receipt
                  </h2>

                  <p className="text-sm text-white/35">
                    Transaction receipt generated
                  </p>
                </div>
              </div>

              <Link
               href={`/admin/receipts/${transaction.receipt.receipt_number}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/65 transition hover:bg-white/5 hover:text-white"
              >
                View receipt
              </Link>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-xs text-white/30">
                  Receipt number
                </p>

                <p className="mt-2 font-mono text-sm text-white/75">
                  {transaction.receipt.receipt_number}
                </p>
              </div>

              <div>
                <p className="text-xs text-white/30">
                  Created
                </p>

                <p className="mt-2 text-sm text-white/75">
                  {formatDate(
                    transaction.receipt.created_at
                  )}
                </p>
              </div>
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
