"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clipboard,
  FileText,
  Hash,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import api from "@/lib/api";

/*
 * ================================================================
 * TYPES
 * ================================================================
 */

type User = {
  id: string;
  full_name: string;
  email: string;
};

type Account = {
  id: string;
  account_number: string;
  account_type: string;
  balance?: string | number;
  currency: string;
  status?: string;
  user?: User | null;
};

type Transaction = {
  id: string;
  amount: string | number;
  transaction_type: string;
  description: string | null;
  reference: string;
  status: string;
  created_at: string;
  direction: "DEBIT" | "CREDIT";
  sender: Account | null;
  receiver: Account | null;
};

type Receipt = {
  receipt_number: string;
};


/*
 * ================================================================
 * HELPERS
 * ================================================================
 */

function formatCurrency(
  amount: string | number,
  currency: string
) {
  try {
    return new Intl.NumberFormat(
      currency === "USD"
        ? "en-US"
        : "en-NG",
      {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    ).format(Number(amount));
  } catch {
    return `${currency} ${Number(amount).toFixed(2)}`;
  }
}


function formatAccountType(
  value?: string
) {
  if (!value) {
    return "Account";
  }

  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}


function maskAccountNumber(
  accountNumber?: string
) {
  if (!accountNumber) {
    return "••••";
  }

  return `•••• ${accountNumber.slice(-4)}`;
}


function formatDate(
  value: string
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(
    "en-NG",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  ).format(date);
}


function formatShortDate(
  value: string
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(
    "en-NG",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
}


function getTransactionTitle(
  transaction: Transaction
) {
  if (
    transaction.transaction_type ===
    "DEPOSIT"
  ) {
    return "Money received";
  }

  if (
    transaction.transaction_type ===
    "WITHDRAWAL"
  ) {
    return "Money withdrawn";
  }

  if (
    transaction.transaction_type ===
    "TRANSFER"
  ) {
    return transaction.direction ===
      "DEBIT"
      ? "Money sent"
      : "Money received";
  }

  return transaction.direction ===
    "DEBIT"
    ? "Money sent"
    : "Money received";
}


function getTransactionDescription(
  transaction: Transaction
) {
  if (
    transaction.description &&
    transaction.description.trim()
  ) {
    return transaction.description;
  }

  if (
    transaction.direction ===
    "DEBIT"
  ) {
    return "Outgoing bank transfer";
  }

  return "Incoming bank transfer";
}


/*
 * ================================================================
 * PAGE
 * ================================================================
 */

export default function TransactionDetailsPage() {
  const router = useRouter();

  const params = useParams();

  /*
   * The folder is:
   *
   * transactions/[transactionId]
   *
   * Therefore we correctly read:
   *
   * params.transactionId
   */

  const transactionId =
    typeof params?.transactionId ===
    "string"
      ? params.transactionId
      : Array.isArray(
          params?.transactionId
        )
      ? params.transactionId[0]
      : "";


  /*
   * ================================================================
   * STATE
   * ================================================================
   */

  const [
    transaction,
    setTransaction,
  ] = useState<Transaction | null>(
    null
  );

  const [
    receipt,
    setReceipt,
  ] = useState<Receipt | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    copied,
    setCopied,
  ] = useState(false);


  /*
   * ================================================================
   * LOAD TRANSACTION
   * ================================================================
   */

  useEffect(() => {
    if (!transactionId) {
      setLoading(false);

      setError(
        "Invalid transaction ID."
      );

      return;
    }

    let mounted = true;

    const loadTransaction =
      async () => {
        try {
          setLoading(true);
          setError("");

          const response =
            await api.get(
              `/transactions/${transactionId}`
            );

          const loadedTransaction =
            response.data?.data
              ?.transaction;

          if (!mounted) {
            return;
          }

          if (
            !loadedTransaction
          ) {
            setError(
              "The server did not return transaction information."
            );

            return;
          }

          setTransaction(
            loadedTransaction
          );

          setReceipt(
            response.data?.data?.receipt ||
              null
          );
        } catch (error: any) {
          console.error(
            "Transaction detail error:",
            error
          );

          if (!mounted) {
            return;
          }

          if (
            error.response?.status ===
            401
          ) {
            localStorage.removeItem(
              "token"
            );

            router.push("/login");

            return;
          }

          setError(
            error.response?.data
              ?.message ||
              "Unable to load this transaction."
          );
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

    loadTransaction();

    return () => {
      mounted = false;
    };
  }, [
    transactionId,
    router,
  ]);


  /*
   * ================================================================
   * COPY REFERENCE
   * ================================================================
   */

  const copyReference =
    async () => {
      if (
        !transaction?.reference
      ) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          transaction.reference
        );

        setCopied(true);

        window.setTimeout(() => {
          setCopied(false);
        }, 1800);
      } catch (error) {
        console.error(
          "Copy reference error:",
          error
        );
      }
    };


  /*
   * ================================================================
   * LOADING STATE
   * ================================================================
   */

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-5">
        <div className="flex items-center gap-3 text-sm text-white/40">
          <Loader2
            size={20}
            className="animate-spin text-emerald-300"
          />

          Loading transaction...
        </div>
      </main>
    );
  }


  /*
   * ================================================================
   * ERROR STATE
   * ================================================================
   */

  if (
    error ||
    !transaction
  ) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-6 lg:px-8">

        <button
          type="button"
          onClick={() =>
            router.push(
              "/transactions"
            )
          }
          className="mb-6 flex items-center gap-2 text-sm text-white/40 transition hover:text-white"
        >
          <ArrowLeft
            size={16}
          />

          Transactions
        </button>


        <section className="rounded-[30px] border border-red-400/20 bg-red-400/[0.05] p-7 sm:p-9">

          <div className="flex items-start gap-4">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-400/10">

              <AlertCircle
                size={21}
                className="text-red-300"
              />

            </div>

            <div>

              <h1 className="font-semibold text-red-200">
                Unable to load transaction
              </h1>

              <p className="mt-2 text-sm leading-6 text-white/40">
                {error ||
                  "The requested transaction could not be found."}
              </p>

            </div>

          </div>

        </section>

      </main>
    );
  }


  /*
   * ================================================================
   * DERIVED DATA
   * ================================================================
   */

  const isDebit =
    transaction.direction ===
    "DEBIT";


  const currency =
    transaction.sender
      ?.currency ||
    transaction.receiver
      ?.currency ||
    "NGN";


  const amount =
    formatCurrency(
      transaction.amount,
      currency
    );


  const status =
    formatAccountType(
      transaction.status
    );


  const transactionType =
    formatAccountType(
      transaction.transaction_type
    );


  const transactionTitle =
    getTransactionTitle(
      transaction
    );


  const description =
    getTransactionDescription(
      transaction
    );


  /*
   * IMPORTANT:
   *
   * These are now coming from the database.
   *
   * Backend:
   *
   * sender_user.full_name
   * receiver_user.full_name
   */

  const senderName =
    transaction.sender?.user
      ?.full_name ||
    "NovaBank Customer";


  const receiverName =
    transaction.receiver?.user
      ?.full_name ||
    "NovaBank Customer";


  /*
   * ================================================================
   * MAIN PAGE
   * ================================================================
   */

  return (
    <main className="mx-auto max-w-5xl px-5 py-7 sm:px-6 lg:px-8 lg:py-9">

      {/* ==========================================================
          BACK
      ========================================================== */}

      <button
        type="button"
        onClick={() =>
          router.push(
            "/transactions"
          )
        }
        className="mb-6 flex items-center gap-2 text-sm text-white/40 transition hover:text-white"
      >
        <ArrowLeft
          size={16}
        />

        Transactions
      </button>


      {/* ==========================================================
          MAIN TRANSACTION CARD
      ========================================================== */}

      <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.025]">

        {/* ========================================================
            TOP SECTION
        ======================================================== */}

        <div className="px-6 py-8 sm:px-8 sm:py-9">

          <div className="flex flex-col gap-7 sm:flex-row sm:items-start sm:justify-between">

            {/* LEFT */}

            <div>

              <div className="flex items-center gap-3">

                <div
                  className={`
                    flex h-11 w-11
                    items-center justify-center
                    rounded-xl
                    ${
                      isDebit
                        ? "bg-red-400/10"
                        : "bg-emerald-300/10"
                    }
                  `}
                >

                  {isDebit ? (
                    <ArrowUpRight
                      size={21}
                      className="text-red-300"
                    />
                  ) : (
                    <ArrowDownLeft
                      size={21}
                      className="text-emerald-300"
                    />
                  )}

                </div>


                <div>

                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                    {transactionType}
                  </p>

                  <p className="mt-1 text-sm text-white/40">
                    {transactionTitle}
                  </p>

                </div>

              </div>


              {/* AMOUNT */}

              <h1
                className={`
                  mt-6 text-4xl font-bold
                  tracking-tight sm:text-5xl
                  ${
                    isDebit
                      ? "text-red-300"
                      : "text-emerald-300"
                  }
                `}
              >
                {isDebit
                  ? "-"
                  : "+"}
                {amount}
              </h1>


              {/* DATE */}

              <div className="mt-3 flex items-center gap-2 text-xs text-white/30">

                <CalendarDays
                  size={14}
                />

                {formatDate(
                  transaction.created_at
                )}

              </div>

            </div>


            {/* RIGHT */}

            <div className="sm:text-right">

              {/* STATUS */}

              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-300/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">

                <CheckCircle2
                  size={13}
                />

                {status}

              </div>


              {/* TRANSACTION ID */}

              <div className="mt-5">

                <p className="text-[10px] uppercase tracking-wider text-white/25">
                  Transaction ID
                </p>

                <p className="mt-2 max-w-[240px] break-all font-mono text-[10px] leading-4 text-white/30 sm:ml-auto">
                  {transaction.id}
                </p>

              </div>

            </div>

          </div>

        </div>


        {/* ========================================================
            TRANSFER DETAILS
        ======================================================== */}

        <div className="border-t border-white/10 px-6 py-7 sm:px-8">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
                Transfer details
              </p>

              <p className="mt-1 text-xs text-white/35">
                Account movement
              </p>

            </div>


            <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-medium text-white/35">
              {currency}
            </span>

          </div>


          <div className="mt-5 grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]">

            {/* FROM */}

            <AccountParty
              label="From"
              account={
                transaction.sender
              }
              fallbackName={
                senderName
              }
            />


            {/* ARROW */}

            <div className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.025] md:flex">

              <ArrowTransfer />

            </div>


            {/* TO */}

            <AccountParty
              label="To"
              account={
                transaction.receiver
              }
              fallbackName={
                receiverName
              }
            />

          </div>

        </div>

      </section>


      {/* ==========================================================
          LOWER CONTENT
      ========================================================== */}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_216px]">

        {/* ========================================================
            TRANSACTION INFORMATION
        ======================================================== */}

        <section className="rounded-[28px] border border-white/10 bg-white/[0.025] p-6 sm:p-7">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">

              <FileText
                size={18}
                className="text-white/50"
              />

            </div>

            <div>

              <h2 className="text-sm font-semibold">
                Transaction information
              </h2>

              <p className="mt-1 text-[10px] text-white/25">
                Complete transaction record
              </p>

            </div>

          </div>


          {/* INFORMATION GRID */}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">

            <InfoCard
              icon={
                <FileText
                  size={14}
                />
              }
              label="Description"
              value={description}
            />


            <InfoCard
              icon={
                <Hash
                  size={14}
                />
              }
              label="Transaction type"
              value={transactionType}
            />


            <InfoCard
              icon={
                <CheckCircle2
                  size={14}
                />
              }
              label="Status"
              value={status}
              valueClassName="text-emerald-300"
            />


            <InfoCard
              icon={
                <WalletCards
                  size={14}
                />
              }
              label="Currency"
              value={currency}
            />


            <InfoCard
              icon={
                <CalendarDays
                  size={14}
                />
              }
              label="Transaction date"
              value={formatShortDate(
                transaction.created_at
              )}
            />


            <InfoCard
              icon={
                <ShieldCheck
                  size={14}
                />
              }
              label="Security"
              value="Authenticated transaction"
              valueClassName="text-emerald-300"
            />

          </div>

        </section>


        {/* ========================================================
            REFERENCE
        ======================================================== */}

        <section className="rounded-[28px] border border-white/10 bg-white/[0.025] p-6">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">

            <Hash
              size={18}
              className="text-white/50"
            />

          </div>


          <h2 className="mt-4 text-sm font-semibold">
            Reference
          </h2>

          <p className="mt-1 text-[10px] text-white/25">
            Keep this for your records
          </p>


          <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-4">

            <p className="text-[9px] uppercase tracking-wider text-white/25">
              Transaction reference
            </p>


            <p className="mt-2 break-all font-mono text-[10px] leading-5 text-white/60">
              {transaction.reference ||
                "No reference"}
            </p>


            <button
              type="button"
              onClick={
                copyReference
              }
              disabled={
                !transaction.reference
              }
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-xs font-medium text-white/50 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >

              {copied ? (
                <>
                  <Check
                    size={14}
                    className="text-emerald-300"
                  />

                  Copied
                </>
              ) : (
                <>
                  <Clipboard
                    size={14}
                  />

                  Copy reference
                </>
              )}

            </button>

          </div>


          {/* SECURITY MESSAGE */}

          <div className="mt-4 rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.04] p-4">

            <div className="flex items-start gap-3">

              <LockKeyhole
                size={15}
                className="mt-0.5 shrink-0 text-emerald-300"
              />

              <p className="text-[10px] leading-5 text-white/35">
                This transaction was authenticated
                by NovaBank and recorded in the
                transaction ledger.
              </p>

            </div>

          </div>

        </section>

      </div>


      {/* ==========================================================
          FOOTER
      ========================================================== */}

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div className="flex items-center gap-2 text-[10px] text-white/25">

          <ShieldCheck
            size={14}
            className="text-emerald-300/60"
          />

          Secure transaction record

        </div>


        <div className="flex flex-col gap-2 sm:flex-row">

          {receipt?.receipt_number && (
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/receipts/${encodeURIComponent(
                    receipt.receipt_number
                  )}`
                )
              }
              className="rounded-xl bg-emerald-300 px-4 py-2.5 text-xs font-bold text-[#031421] transition hover:bg-emerald-200"
            >
              View receipt
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              router.push(
                "/transactions"
              )
            }
            className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-white/45 transition hover:bg-white/5 hover:text-white"
          >
            Back to transactions
          </button>

        </div>

      </div>

    </main>
  );
}


/*
 * ================================================================
 * ACCOUNT PARTY COMPONENT
 * ================================================================
 */

function AccountParty({
  label,
  account,
  fallbackName,
}: {
  label: string;
  account: Account | null;
  fallbackName: string;
}) {
  const name =
    account?.user?.full_name ||
    fallbackName ||
    "NovaBank Customer";


  const accountType =
    formatAccountType(
      account?.account_type
    );


  const accountNumber =
    maskAccountNumber(
      account?.account_number
    );


  const currency =
    account?.currency ||
    "NGN";


  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">

      <p className="text-[9px] font-medium uppercase tracking-wider text-white/25">
        {label}
      </p>


      <div className="mt-3 flex items-center gap-3">

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5">

          <UserRound
            size={16}
            className="text-white/40"
          />

        </div>


        <div className="min-w-0">

          <p className="truncate text-sm font-semibold">
            {name}
          </p>

          <p className="mt-1 text-[10px] text-white/35">
            {accountType}
            {" · "}
            {accountNumber}
          </p>

        </div>


        <span className="ml-auto shrink-0 rounded-full bg-white/5 px-2 py-1 text-[9px] font-medium text-white/30">
          {currency}
        </span>

      </div>

    </div>
  );
}


/*
 * ================================================================
 * INFORMATION CARD
 * ================================================================
 */

function InfoCard({
  icon,
  label,
  value,
  valueClassName = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">

      <div className="flex items-center gap-2 text-white/25">

        {icon}

        <p className="text-[9px] uppercase tracking-wider">
          {label}
        </p>

      </div>


      <p
        className={`
          mt-2 truncate text-xs font-medium
          text-white/70
          ${valueClassName}
        `}
      >
        {value}

      </p>

    </div>
  );
}


/*
 * ================================================================
 * TRANSFER ARROW
 * ================================================================
 */

function ArrowTransfer() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-white/50"
    >
      <path
        d="M5 12H19"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <path
        d="M13 6L19 12L13 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}