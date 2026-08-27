"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  Printer,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";

import { useParams, useRouter } from "next/navigation";

import api from "@/lib/api";

type ReceiptTransaction = {
  id: string;
  amount: string | number;
  currency: string;
  transaction_type: string;
  description: string;
  reference: string;
  status: string;
  created_at: string;
  direction: "DEBIT" | "CREDIT";
};

type ReceiptParty = {
  id?: string;
  name: string;
  email?: string | null;
  account_number?: string | null;
  account_type?: string | null;
  currency?: string | null;
};

type ReceiptData = {
  id: string;
  receipt_number: string;
  created_at: string;
  transaction: ReceiptTransaction;
  sender: ReceiptParty;
  receiver: ReceiptParty;
  bank: {
    name: string;
    code: string;
    type: string;
  };
};

function formatAmount(
  amount: string | number,
  currency: string
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

function maskAccountNumber(
  accountNumber?: string | null
) {
  if (!accountNumber) {
    return "—";
  }

  if (accountNumber.length <= 4) {
    return accountNumber;
  }

  return `${"•".repeat(
    Math.max(0, accountNumber.length - 4)
  )}${accountNumber.slice(-4)}`;
}

export default function ReceiptPage() {
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

    const loadReceipt = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          `/receipts/${encodeURIComponent(
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
          "Receipt loading error:",
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
          router.push("/login");
          return;
        }

        setError(
          requestError.response?.data?.message ||
            "Unable to load this receipt."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadReceipt();

    return () => {
      mounted = false;
    };
  }, [receiptNumber, router]);

  const copyReceiptNumber = async () => {
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
    } catch (copyError) {
      console.error(
        "Receipt copy error:",
        copyError
      );
    }
  };

  const printReceipt = () => {
    window.print();
  };

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-5 py-10">
        <div className="flex items-center gap-3 text-sm text-white/50">
          <Loader2
            size={20}
            className="animate-spin text-emerald-300"
          />
          Loading receipt...
        </div>
      </main>
    );
  }

  if (error || !receipt) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-5 py-10">
        <section className="w-full rounded-[28px] border border-white/10 bg-white/[0.025] p-8 text-center shadow-2xl sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-400/10 text-red-300">
            <ReceiptText size={28} />
          </div>

          <h1 className="mt-6 text-2xl font-bold text-white">
            Receipt unavailable
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/45">
            {error ||
              "The requested receipt could not be found."}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push("/transactions")
            }
            className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-bold text-[#031421] transition hover:bg-emerald-200"
          >
            <ArrowLeft size={17} />
            Back to transactions
          </button>
        </section>
      </main>
    );
  }

  const transaction =
    receipt.transaction;

  const currency =
    transaction.currency ||
    receipt.sender.currency ||
    receipt.receiver.currency ||
    "NGN";

  const isSuccess =
    String(transaction.status).toUpperCase() ===
    "SUCCESS";

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

          .receipt-print-area,
          .receipt-print-area * {
            visibility: visible !important;
          }

          .receipt-print-area {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 32px !important;
            background: white !important;
            color: #111827 !important;
          }

          .receipt-no-print {
            display: none !important;
          }

          .receipt-card {
            border: 1px solid #e5e7eb !important;
            background: white !important;
            box-shadow: none !important;
          }

          .receipt-muted {
            color: #6b7280 !important;
          }

          .receipt-heading {
            color: #111827 !important;
          }

          .receipt-divider {
            border-color: #e5e7eb !important;
          }
        }
      `}</style>

      <main className="mx-auto max-w-5xl px-5 py-8 sm:py-10">
        <div className="receipt-no-print mb-6 flex items-center justify-between gap-4">
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

        <section className="receipt-print-area">
          <div className="receipt-card overflow-hidden rounded-[32px] border border-white/10 bg-[#071d2a] shadow-2xl shadow-black/20">
            <header className="border-b border-white/10 px-6 py-7 sm:px-10 sm:py-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-300 font-black text-[#031421]">
                    N
                  </div>

                  <div>
                    <p className="receipt-heading text-lg font-bold tracking-tight text-white">
                      NovaBank
                    </p>

                    <p className="receipt-muted text-[10px] uppercase tracking-[0.18em] text-white/35">
                      Digital Banking
                    </p>
                  </div>
                </div>

                <div className="sm:text-right">
                  <p className="receipt-muted text-xs uppercase tracking-[0.16em] text-white/35">
                    Transaction receipt
                  </p>

                  <p className="receipt-heading mt-1 break-all text-sm font-semibold text-white">
                    {receipt.receipt_number}
                  </p>
                </div>
              </div>
            </header>

            <div className="px-6 py-8 sm:px-10 sm:py-10">
              <div className="flex flex-col items-center text-center">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
                    isSuccess
                      ? "bg-emerald-300/10 text-emerald-300"
                      : "bg-amber-300/10 text-amber-300"
                  }`}
                >
                  {isSuccess ? (
                    <CheckCircle2 size={32} />
                  ) : (
                    <ShieldCheck size={32} />
                  )}
                </div>

                <p className="receipt-muted mt-5 text-xs uppercase tracking-[0.18em] text-white/35">
                  {transaction.direction ===
                  "CREDIT"
                    ? "Money received"
                    : "Money sent"}
                </p>

                <h1 className="receipt-heading mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">
                  {formatAmount(
                    transaction.amount,
                    currency
                  )}
                </h1>

                <div
                  className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                    isSuccess
                      ? "bg-emerald-300/10 text-emerald-300"
                      : "bg-amber-300/10 text-amber-300"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {transaction.status}
                </div>
              </div>

              <div className="receipt-divider my-8 border-t border-white/10" />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="receipt-muted text-xs text-white/35">
                    Transaction reference
                  </p>
                  <p className="receipt-heading mt-1 break-all text-sm font-semibold text-white">
                    {transaction.reference}
                  </p>
                </div>

                <div className="sm:text-right">
                  <p className="receipt-muted text-xs text-white/35">
                    Transaction date
                  </p>
                  <p className="receipt-heading mt-1 text-sm font-semibold text-white">
                    {formatDate(
                      transaction.created_at
                    )}
                  </p>
                </div>
              </div>

              <div className="receipt-divider my-8 border-t border-white/10" />

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                  <p className="receipt-muted text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
                    Sender
                  </p>

                  <p className="receipt-heading mt-3 text-base font-bold text-white">
                    {receipt.sender.name}
                  </p>

                  {receipt.sender.email && (
                    <p className="receipt-muted mt-1 break-all text-xs text-white/40">
                      {receipt.sender.email}
                    </p>
                  )}

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="receipt-muted text-white/35">
                        Account
                      </span>
                      <span className="receipt-heading font-medium text-white/75">
                        {maskAccountNumber(
                          receipt.sender
                            .account_number
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="receipt-muted text-white/35">
                        Type
                      </span>
                      <span className="receipt-heading text-white/75">
                        {receipt.sender
                          .account_type ||
                          "Account"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                  <p className="receipt-muted text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
                    Recipient
                  </p>

                  <p className="receipt-heading mt-3 text-base font-bold text-white">
                    {receipt.receiver.name}
                  </p>

                  {receipt.receiver.email && (
                    <p className="receipt-muted mt-1 break-all text-xs text-white/40">
                      {receipt.receiver.email}
                    </p>
                  )}

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="receipt-muted text-white/35">
                        Account
                      </span>
                      <span className="receipt-heading font-medium text-white/75">
                        {maskAccountNumber(
                          receipt.receiver
                            .account_number
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="receipt-muted text-white/35">
                        Type
                      </span>
                      <span className="receipt-heading text-white/75">
                        {receipt.receiver
                          .account_type ||
                          "Account"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="receipt-divider my-8 border-t border-white/10" />

              <div className="space-y-4">
                <div className="flex items-start justify-between gap-6">
                  <span className="receipt-muted text-sm text-white/40">
                    Transaction type
                  </span>

                  <span className="receipt-heading text-right text-sm font-semibold text-white/80">
                    {transaction.transaction_type}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-6">
                  <span className="receipt-muted text-sm text-white/40">
                    Currency
                  </span>

                  <span className="receipt-heading text-right text-sm font-semibold text-white/80">
                    {currency}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-6">
                  <span className="receipt-muted text-sm text-white/40">
                    Description
                  </span>

                  <span className="receipt-heading max-w-[65%] text-right text-sm font-semibold text-white/80">
                    {transaction.description ||
                      "No description"}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-6">
                  <span className="receipt-muted text-sm text-white/40">
                    Processing bank
                  </span>

                  <span className="receipt-heading text-right text-sm font-semibold text-white/80">
                    {receipt.bank.name}
                  </span>
                </div>
              </div>

              <div className="receipt-divider my-8 border-t border-white/10" />

              <div className="flex flex-col gap-3 rounded-2xl bg-emerald-300/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="receipt-heading text-sm font-bold text-white">
                    Receipt verified
                  </p>

                  <p className="receipt-muted mt-1 text-xs leading-5 text-white/40">
                    This receipt is associated with a
                    completed NovaBank transaction.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                  <ShieldCheck size={17} />
                  Secure record
                </div>
              </div>
            </div>

            <footer className="receipt-divider border-t border-white/10 px-6 py-5 text-center sm:px-10">
              <p className="receipt-muted text-[11px] leading-5 text-white/30">
                NovaBank • Digital Banking
                <br />
                Receipt generated{" "}
                {formatDate(
                  receipt.created_at
                )}
              </p>
            </footer>
          </div>
        </section>

        <div className="receipt-no-print mt-5 flex items-center justify-center gap-2 text-xs text-white/25">
          <ShieldCheck size={14} />
          Only authenticated parties to this transaction
          can access this receipt.
        </div>
      </main>
    </>
  );
}