"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  FileText,
  Loader2,
  Printer,
  ReceiptText,
  ShieldCheck,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import api from "@/lib/api";

type Party = {
  id?: string;
  name?: string;
  email?: string | null;
  account_number?: string | null;
  account_type?: string | null;
  currency?: string | null;
  country?: string | null;
  bank_name?: string | null;
  bank_code?: string | null;
  bank_country?: string | null;
  bank_currency?: string | null;
  bank_type?: string | null;
  status?: string | null;
};

type ReceiptTransaction = {
  id: string;
  amount: string | number;
  currency?: string;
  source_currency?: string;
  destination_currency?: string;
  transaction_type: string;
  description?: string;
  reference: string;
  status: string;
  created_at: string;
  fee?: string | number;
};

type ReceiptData = {
  id: string;
  receipt_number: string;
  created_at: string;
  transaction: ReceiptTransaction;
  sender: Party;
  receiver: Party;
  bank: {
    name: string;
    code: string;
    type: string;
  };
};

type ApiResponse = {
  success: boolean;
  message?: string;
  data?: {
    receipt: ReceiptData;
  };
};

function formatAmount(
  amount: string | number,
  currency = "NGN"
) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return `${currency} ${amount}`;
  }

  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    return `${currency} ${numericAmount.toFixed(2)}`;
  }
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

function statusStyles(status: string) {
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

function PartySection({
  title,
  party,
  external = false,
}: {
  title: string;
  party: Party;
  external?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0a1b28] p-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
          {title}
        </p>

        {external ? (
          <WalletCards
            size={18}
            className="text-white/30"
          />
        ) : (
          <UserRound
            size={18}
            className="text-white/30"
          />
        )}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
          {external ? (
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

        {party.country && (
          <div>
            <p className="text-xs text-white/30">
              Country
            </p>

            <p className="mt-1 text-sm text-white/75">
              {party.country}
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
    </section>
  );
}

export default function AdminReceiptPage() {
  const router = useRouter();
  const params = useParams();

  const receiptNumber = useMemo(() => {
    const value =
      params?.receiptNumber;

    if (Array.isArray(value)) {
      return value.join("/");
    }

    return String(value || "").trim();
  }, [params]);

  const [receipt, setReceipt] =
    useState<ReceiptData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [copied, setCopied] =
    useState(false);

  useEffect(() => {
    if (!receiptNumber) {
      setError("Receipt number is missing.");
      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadReceipt() {
      try {
        setLoading(true);
        setError("");

        const response =
          await api.get(
            `/admin/receipts/${encodeURIComponent(
              receiptNumber
            )}`
          );

        const loadedReceipt =
          response.data?.data?.receipt;

        if (!loadedReceipt) {
          throw new Error(
            "Receipt data was not returned."
          );
        }

        if (mounted) {
          setReceipt(loadedReceipt);
        }
      } catch (requestError: any) {
        console.error(
          "Admin receipt loading error:",
          requestError
        );

        if (!mounted) {
          return;
        }

        if (
          requestError.response?.status ===
          401
        ) {
          localStorage.removeItem("token");
          localStorage.removeItem(
            "novabank_token"
          );
          localStorage.removeItem(
            "accessToken"
          );

          router.push("/login");
          return;
        }

        if (
          requestError.response?.status ===
          403
        ) {
          setError(
            "Administrator access is required."
          );
          return;
        }

        setError(
          requestError.response?.data?.message ||
            requestError.message ||
            "Unable to load this receipt."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadReceipt();

    return () => {
      mounted = false;
    };
  }, [receiptNumber, router]);

  async function copyReceiptNumber() {
    if (!receipt?.receipt_number) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        receipt.receipt_number
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (error) {
      console.error(
        "Receipt copy error:",
        error
      );
    }
  }

  function printReceipt() {
    window.print();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#031421] px-5 py-10 text-white">
        <div className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-white/50">
            <Loader2
              size={20}
              className="animate-spin text-emerald-300"
            />
            Loading admin receipt...
          </div>
        </div>
      </main>
    );
  }

  if (error || !receipt) {
    return (
      <main className="min-h-screen bg-[#031421] px-5 py-10 text-white">
        <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center">
          <section className="w-full rounded-[28px] border border-white/10 bg-[#0a1b28] p-8 text-center shadow-2xl sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-400/10 text-red-300">
              <XCircle size={28} />
            </div>

            <h1 className="mt-6 text-2xl font-bold">
              Receipt unavailable
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/45">
              {error ||
                "The requested receipt could not be found."}
            </p>

            <button
              type="button"
              onClick={() =>
                router.back()
              }
              className="mt-7 inline-flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft size={17} />
              Back
            </button>
          </section>
        </div>
      </main>
    );
  }

  const transaction =
    receipt.transaction;

  const currency =
    transaction.currency ||
    transaction.source_currency ||
    "NGN";

  const isExternal =
    receipt.bank.type !== "INTERNAL";

  return (
    <>
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: #111827 !important;
          }

          body * {
            visibility: hidden !important;
          }

          .admin-receipt-print-area,
          .admin-receipt-print-area * {
            visibility: visible !important;
          }

          .admin-receipt-print-area {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 32px !important;
            background: white !important;
            color: #111827 !important;
          }

          .admin-receipt-no-print {
            display: none !important;
          }

          .admin-receipt-card {
            border: 1px solid #e5e7eb !important;
            background: white !important;
            box-shadow: none !important;
          }

          .admin-receipt-text {
            color: #111827 !important;
          }

          .admin-receipt-muted {
            color: #6b7280 !important;
          }

          .admin-receipt-divider {
            border-color: #e5e7eb !important;
          }
        }
      `}</style>

      <main className="admin-receipt-print-area min-h-screen bg-[#031421] px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">

          {/* HEADER ACTIONS */}

          <div className="admin-receipt-no-print mb-7 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() =>
                router.back()
              }
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/50 transition hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft size={18} />
              Back
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyReceiptNumber}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
              >
                <Copy size={16} />
                {copied
                  ? "Copied"
                  : "Copy receipt"}
              </button>

              <button
                type="button"
                onClick={printReceipt}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-4 py-2 text-sm font-bold text-[#031421] transition hover:bg-emerald-200"
              >
                <Printer size={16} />
                Print
              </button>
            </div>
          </div>

          {/* ADMIN LABEL */}

          <div className="admin-receipt-no-print mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-300/70">
            <ShieldCheck size={15} />
            Administration · Receipt
          </div>

          {/* RECEIPT */}

          <section className="admin-receipt-card rounded-[28px] border border-white/10 bg-[#0a1b28] p-6 shadow-2xl sm:p-10">

            {/* BRAND */}

            <div className="flex flex-col gap-6 border-b border-white/8 pb-7 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                    <ReceiptText size={22} />
                  </div>

                  <div>
                    <h1 className="text-xl font-bold admin-receipt-text">
                      NovaBank
                    </h1>

                    <p className="text-sm text-white/35 admin-receipt-muted">
                      Transaction receipt
                    </p>
                  </div>
                </div>
              </div>

              <div className="sm:text-right">
                <p className="text-xs uppercase tracking-[0.15em] text-white/30 admin-receipt-muted">
                  Receipt number
                </p>

                <p className="mt-2 break-all font-mono text-sm text-white/75 admin-receipt-text">
                  {receipt.receipt_number}
                </p>
              </div>
            </div>

            {/* AMOUNT / STATUS */}

            <div className="flex flex-col gap-6 border-b border-white/8 py-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-white/30 admin-receipt-muted">
                  Transaction amount
                </p>

                <p className="mt-2 text-3xl font-bold tracking-tight admin-receipt-text sm:text-4xl">
                  {formatAmount(
                    transaction.amount,
                    currency
                  )}
                </p>
              </div>

              <div
                className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${statusStyles(
                  transaction.status
                )}`}
              >
                {transaction.status.toUpperCase() ===
                "SUCCESS" ? (
                  <CheckCircle2 size={17} />
                ) : (
                  <XCircle size={17} />
                )}

                {transaction.status}
              </div>
            </div>

            {/* TRANSACTION DETAILS */}

            <div className="border-b border-white/8 py-8">
              <div className="flex items-center gap-3">
                <FileText
                  size={18}
                  className="text-emerald-300"
                />

                <h2 className="font-semibold admin-receipt-text">
                  Transaction information
                </h2>
              </div>

              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs text-white/30 admin-receipt-muted">
                    Reference
                  </p>

                  <p className="mt-2 break-all font-mono text-sm text-white/75 admin-receipt-text">
                    {transaction.reference}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-white/30 admin-receipt-muted">
                    Transaction type
                  </p>

                  <p className="mt-2 text-sm text-white/75 admin-receipt-text">
                    {transaction.transaction_type}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-white/30 admin-receipt-muted">
                    Source
                  </p>

                  <p className="mt-2 text-sm text-white/75 admin-receipt-text">
                    {isExternal
                      ? "EXTERNAL"
                      : "INTERNAL"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-white/30 admin-receipt-muted">
                    Created
                  </p>

                  <p className="mt-2 text-sm text-white/75 admin-receipt-text">
                    {formatDate(
                      transaction.created_at
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-white/30 admin-receipt-muted">
                    Currency
                  </p>

                  <p className="mt-2 text-sm text-white/75 admin-receipt-text">
                    {currency}
                  </p>
                </div>

                {transaction.fee !==
                  undefined && (
                  <div>
                    <p className="text-xs text-white/30 admin-receipt-muted">
                      Fee
                    </p>

                    <p className="mt-2 text-sm text-white/75 admin-receipt-text">
                      {formatAmount(
                        transaction.fee,
                        currency
                      )}
                    </p>
                  </div>
                )}
              </div>

              {transaction.description && (
                <div className="mt-6">
                  <p className="text-xs text-white/30 admin-receipt-muted">
                    Description
                  </p>

                  <p className="mt-2 text-sm text-white/65 admin-receipt-text">
                    {transaction.description}
                  </p>
                </div>
              )}
            </div>

            {/* PARTIES */}

            <div className="grid gap-6 py-8 lg:grid-cols-2">
              <PartySection
                title="Sender"
                party={receipt.sender}
              />

              <PartySection
                title="Receiver"
                party={receipt.receiver}
                external={isExternal}
              />
            </div>

            {/* BANK */}

            <div className="border-t border-white/8 pt-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-white/30 admin-receipt-muted">
                    Processing institution
                  </p>

                  <p className="mt-2 font-semibold admin-receipt-text">
                    {receipt.bank.name}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs text-white/30 admin-receipt-muted">
                    Bank code
                  </p>

                  <p className="mt-2 font-mono text-sm text-white/65 admin-receipt-text">
                    {receipt.bank.code ||
                      "—"}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs text-white/30 admin-receipt-muted">
                    Receipt created
                  </p>

                  <p className="mt-2 text-sm text-white/65 admin-receipt-text">
                    {formatDate(
                      receipt.created_at
                    )}
                  </p>
                </div>
              </div>
            </div>

          </section>
        </div>
      </main>
    </>
  );
}
