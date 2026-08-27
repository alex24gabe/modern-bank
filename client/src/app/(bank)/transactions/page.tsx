"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  WalletCards,
  XCircle,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import api from "@/lib/api";


/*
 * ================================================================
 * TYPES
 * ================================================================
 */

type Direction =
  | "DEBIT"
  | "CREDIT"
  | "UNKNOWN";


type Transaction = {
  id: string;

  receipt_number?:
    string
    | null;

  source:
    | "INTERNAL"
    | "EXTERNAL";

  amount:
    | string
    | number;

  currency?: string;

  transaction_type:
    string;

  description:
    string;

  reference:
    string;

  status:
    string;

  created_at:
    string;

  direction:
    Direction;

  title?:
    string;

  subtitle?:
    string;

  fee?:
    string
    | number;

  sender?: {
    id?: string;

    name?: string;

    account_number:
      string;

    account_type:
      string;

    currency?:
      string;
  } | null;

  receiver?: {
    id?: string;

    name?: string;

    account_number:
      string;

    account_type:
      string;

    currency?:
      string;
  } | null;

  bank?: {
    name:
      string;

    code?:
      string
      | null;

    type?:
      string;
  };
};


type Summary = {
  total:
    number;

  sent:
    number;

  received:
    number;

  successful:
    number;

  failed:
    number;
};


/*
 * ================================================================
 * HELPERS
 * ================================================================
 */

function safeCurrency(
  currency?: string
) {
  if (
    typeof currency === "string" &&
    /^[A-Za-z]{3}$/.test(
      currency.trim()
    )
  ) {
    return currency
      .trim()
      .toUpperCase();
  }

  return "NGN";
}


function formatMoney(
  value:
    | string
    | number,
  currency?: string
) {
  const numericValue =
    Number(value);

  const currencyCode =
    safeCurrency(currency);

  if (
    !Number.isFinite(
      numericValue
    )
  ) {
    return new Intl.NumberFormat(
      "en-NG",
      {
        style: "currency",

        currency: "NGN",

        minimumFractionDigits: 2,

        maximumFractionDigits: 2,
      }
    ).format(0);
  }

  let locale =
    "en-NG";

  if (
    currencyCode ===
    "USD"
  ) {
    locale =
      "en-US";
  }

  if (
    currencyCode ===
    "GBP"
  ) {
    locale =
      "en-GB";
  }

  if (
    currencyCode ===
    "EUR"
  ) {
    locale =
      "de-DE";
  }

  if (
    currencyCode ===
    "CAD"
  ) {
    locale =
      "en-CA";
  }

  return new Intl.NumberFormat(
    locale,
    {
      style: "currency",

      currency:
        currencyCode,

      minimumFractionDigits: 2,

      maximumFractionDigits: 2,
    }
  ).format(
    numericValue
  );
}


function maskAccount(
  accountNumber?: string
) {
  if (
    !accountNumber
  ) {
    return "—";
  }

  if (
    accountNumber.length <= 4
  ) {
    return accountNumber;
  }

  return `•••• ${accountNumber.slice(
    -4
  )}`;
}


function formatDate(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(
    "en-NG",
    {
      day: "2-digit",

      month: "short",

      year: "numeric",

      hour: "2-digit",

      minute: "2-digit",
    }
  ).format(date);
}


function getStatus(
  status?: string
) {
  return String(
    status || ""
  ).toUpperCase();
}


/*
 * ================================================================
 * PAGE
 * ================================================================
 */

export default function TransactionsPage() {
  const router =
    useRouter();


  /*
   * --------------------------------------------------------------
   * STATE
   * --------------------------------------------------------------
   */

  const [
    transactions,
    setTransactions,
  ] = useState<
    Transaction[]
  >([]);

  const [
    summary,
    setSummary,
  ] = useState<Summary>({
    total: 0,

    sent: 0,

    received: 0,

    successful: 0,

    failed: 0,
  });

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] = useState<
    "ALL" |
    "SENT" |
    "RECEIVED"
  >("ALL");


  /*
   * ================================================================
   * LOAD TRANSACTIONS
   * ================================================================
   */

  const loadTransactions =
    useCallback(
      async (
        showRefresh = false
      ) => {
        try {
          if (
            showRefresh
          ) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          setError("");

          const response =
            await api.get(
              "/transactions"
            );

          const data =
            response.data
              ?.data;

          const loadedTransactions =
            Array.isArray(
              data?.transactions
            )
              ? data.transactions
              : [];

          setTransactions(
            loadedTransactions
          );

          setSummary(
            data?.summary || {
              total:
                loadedTransactions.length,

              sent:
                loadedTransactions.filter(
                  (
                    transaction: Transaction
                  ) =>
                    transaction.direction ===
                    "DEBIT"
                ).length,

              received:
                loadedTransactions.filter(
                  (
                    transaction: Transaction
                  ) =>
                    transaction.direction ===
                    "CREDIT"
                ).length,

              successful:
                loadedTransactions.filter(
                  (
                    transaction: Transaction
                  ) =>
                    getStatus(
                      transaction.status
                    ) ===
                    "SUCCESS"
                ).length,

              failed:
                loadedTransactions.filter(
                  (
                    transaction: Transaction
                  ) =>
                    getStatus(
                      transaction.status
                    ) ===
                    "FAILED"
                ).length,
            }
          );
        } catch (
          requestError: any
        ) {
          console.error(
            "Transactions loading error:",
            requestError
          );

          if (
            requestError.response
              ?.status ===
            401
          ) {
            localStorage.removeItem(
              "token"
            );

            router.push(
              "/login"
            );

            return;
          }

          setError(
            requestError
              .response
              ?.data
              ?.message ||
              "Unable to load transactions."
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      [router]
    );


  useEffect(() => {
    loadTransactions();
  }, [
    loadTransactions,
  ]);


  /*
   * ================================================================
   * FILTER
   * ================================================================
   */

  const filteredTransactions =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return transactions.filter(
        (transaction) => {
          const matchesFilter =
            filter ===
              "ALL" ||
            (
              filter ===
                "SENT" &&
              transaction.direction ===
                "DEBIT"
            ) ||
            (
              filter ===
                "RECEIVED" &&
              transaction.direction ===
                "CREDIT"
            );

          if (
            !matchesFilter
          ) {
            return false;
          }

          if (
            !query
          ) {
            return true;
          }

          const searchable = [
            transaction.title,

            transaction.subtitle,

            transaction.description,

            transaction.reference,

            transaction.transaction_type,

            transaction.sender
              ?.name,

            transaction.receiver
              ?.name,

            transaction.sender
              ?.account_number,

            transaction.receiver
              ?.account_number,

            transaction.bank
              ?.name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchable.includes(
            query
          );
        }
      );
    }, [
      transactions,
      search,
      filter,
    ]);


  /*
   * ================================================================
   * LOADING
   * ================================================================
   */

  if (
    loading
  ) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">

        <div className="flex min-h-[60vh] items-center justify-center">

          <div className="flex items-center gap-3 text-sm text-white/40">

            <Loader2
              size={20}
              className="animate-spin text-emerald-300"
            />

            Loading transactions...

          </div>

        </div>

      </main>
    );
  }


  /*
   * ================================================================
   * PAGE
   * ================================================================
   */

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">

      {/* ==========================================================
          HEADER
      ========================================================== */}

      <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

        <div>

          <p className="text-sm font-semibold text-emerald-300">
            Activity
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Transactions
          </h1>

          <p className="mt-2 text-sm text-white/40">
            View your account activity and
            transaction history.
          </p>

        </div>


        <button
          type="button"
          onClick={() =>
            loadTransactions(
              true
            )
          }
          disabled={
            refreshing
          }
          className="flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
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

      </header>


      {/* ==========================================================
          ERROR
      ========================================================== */}

      {error && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-5 py-4">

          <div className="flex items-center gap-3">

            <XCircle
              size={18}
              className="text-red-300"
            />

            <p className="text-sm text-red-300">
              {error}
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              loadTransactions(
                true
              )
            }
            className="text-xs font-semibold text-red-200 underline"
          >
            Retry
          </button>

        </div>
      )}


      {/* ==========================================================
          SUMMARY
      ========================================================== */}

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

        <SummaryCard
          label="Total transactions"
          value={
            summary.total
          }
          icon={
            <WalletCards
              size={18}
            />
          }
        />

        <SummaryCard
          label="Money sent"
          value={
            summary.sent
          }
          icon={
            <ArrowUpRight
              size={18}
            />
          }
        />

        <SummaryCard
          label="Money received"
          value={
            summary.received
          }
          icon={
            <ArrowDownLeft
              size={18}
            />
          }
        />

        <SummaryCard
          label="Successful"
          value={
            summary.successful
          }
          icon={
            <CheckCircle2
              size={18}
            />
          }
        />

      </section>


      {/* ==========================================================
          CONTROLS
      ========================================================== */}

      <section className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

        <div className="relative w-full lg:max-w-md">

          <Search
            size={17}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25"
          />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search transactions..."
            className="w-full rounded-2xl border border-white/10 bg-white/[0.025] py-3.5 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-emerald-300/30"
          />

        </div>


        <div className="flex rounded-2xl border border-white/10 bg-white/[0.025] p-1">

          {[
            {
              id: "ALL",
              label: "All",
            },
            {
              id: "SENT",
              label: "Sent",
            },
            {
              id: "RECEIVED",
              label: "Received",
            },
          ].map(
            (item) => {
              const active =
                filter ===
                item.id;

              return (
                <button
                  key={
                    item.id
                  }
                  type="button"
                  onClick={() =>
                    setFilter(
                      item.id as
                        | "ALL"
                        | "SENT"
                        | "RECEIVED"
                    )
                  }
                  className={`
                    rounded-xl
                    px-4
                    py-2
                    text-xs
                    font-semibold
                    transition
                    ${
                      active
                        ? "bg-emerald-300 text-[#031421]"
                        : "text-white/40 hover:text-white"
                    }
                  `}
                >
                  {
                    item.label
                  }
                </button>
              );
            }
          )}

        </div>

      </section>


      {/* ==========================================================
          EMPTY
      ========================================================== */}

      {filteredTransactions.length ===
        0 && (
        <section className="rounded-[28px] border border-white/10 bg-white/[0.025] p-12 text-center">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">

            <WalletCards
              size={23}
              className="text-white/35"
            />

          </div>

          <h2 className="mt-5 text-lg font-semibold">
            No transactions found
          </h2>

          <p className="mt-2 text-sm text-white/30">
            {search
              ? "Try a different search term."
              : "Your transaction activity will appear here."}
          </p>

        </section>
      )}


      {/* ==========================================================
          TRANSACTION TABLE
      ========================================================== */}

      {filteredTransactions.length >
        0 && (
        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.025]">

          {/* DESKTOP HEADER */}

          <div className="hidden grid-cols-[2fr_1.4fr_1.2fr_1fr_1fr] border-b border-white/10 px-7 py-4 text-[10px] font-semibold uppercase tracking-wider text-white/25 lg:grid">

            <span>
              Transaction
            </span>

            <span>
              Reference
            </span>

            <span>
              Date
            </span>

            <span>
              Status
            </span>

            <span className="text-right">
              Amount
            </span>

          </div>


          <div>

            {filteredTransactions.map(
              (
                transaction
              ) => (
                <TransactionRow
                  key={`${transaction.source}-${transaction.id}`}
                  transaction={
                    transaction
                  }
                  onClick={() =>
                    router.push(
                      `/transactions/${transaction.id}`
                    )
                  }
                  onReceipt={() => {
                    if (
                      transaction.receipt_number
                    ) {
                      router.push(
                        `/receipts/${encodeURIComponent(
                          transaction.receipt_number
                        )}`
                      );
                    }
                  }}
                />
              )
            )}

          </div>

        </section>
      )}


      {/* ==========================================================
          SECURITY
      ========================================================== */}

      <div className="mt-6 flex items-center gap-2 text-xs text-white/25">

        <ShieldCheck
          size={15}
          className="text-emerald-300/60"
        />

        Transactions are authenticated,
        validated and recorded by the
        NovaBank backend.

      </div>

    </main>
  );
}


/*
 * ================================================================
 * SUMMARY CARD
 * ================================================================
 */

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;

  value: number;

  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">

      <div className="flex items-center justify-between">

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white/40">
          {icon}
        </div>

      </div>

      <p className="mt-4 text-2xl font-bold">
        {value}
      </p>

      <p className="mt-1 text-xs text-white/30">
        {label}
      </p>

    </div>
  );
}


/*
 * ================================================================
 * TRANSACTION ROW
 * ================================================================
 */

function TransactionRow({
  transaction,
  onClick,
  onReceipt,
}: {
  transaction:
    Transaction;

  onClick:
    () => void;

  onReceipt:
    () => void;
}) {
  const isDebit =
    transaction.direction ===
    "DEBIT";

  const isCredit =
    transaction.direction ===
    "CREDIT";

  const status =
    getStatus(
      transaction.status
    );

  const amountPrefix =
    isDebit
      ? "-"
      : isCredit
        ? "+"
        : "";


  const title =
    transaction.title ||
    (
      isDebit
        ? "Transfer sent"
        : "Transfer received"
    );


  const subtitle =
    transaction.subtitle ||
    transaction.description ||
    "Transfer";


  return (
    <button
      type="button"
      onClick={onClick}
      className="group grid w-full grid-cols-1 gap-4 border-b border-white/[0.07] px-5 py-5 text-left transition last:border-b-0 hover:bg-white/[0.025] sm:px-7 lg:grid-cols-[2fr_1.4fr_1.2fr_1fr_1fr] lg:items-center"
    >

      {/* ========================================================
          TRANSACTION
      ======================================================== */}

      <div className="flex min-w-0 items-center gap-4">

        <div
          className={`
            flex h-11 w-11
            shrink-0
            items-center
            justify-center
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
              size={19}
              className="text-red-300"
            />
          ) : (
            <ArrowDownLeft
              size={19}
              className="text-emerald-300"
            />
          )}

        </div>


        <div className="min-w-0">

          <p className="truncate text-sm font-semibold text-white">

            {title}

          </p>

          <p className="mt-1 truncate text-xs text-white/35">

            {subtitle}

          </p>

          {/* MOBILE */}

          <p className="mt-2 text-[10px] text-white/20 lg:hidden">

            {formatDate(
              transaction.created_at
            )}

          </p>

        </div>

      </div>


      {/* ========================================================
          REFERENCE
      ======================================================== */}

      <div className="hidden min-w-0 lg:block">

        <p className="truncate font-mono text-xs text-white/35">

          {transaction.reference}

        </p>

      </div>


      {/* ========================================================
          DATE
      ======================================================== */}

      <div className="hidden lg:block">

        <p className="text-xs text-white/40">

          {formatDate(
            transaction.created_at
          )}

        </p>

      </div>


      {/* ========================================================
          STATUS
      ======================================================== */}

      <div className="flex items-center">

        <StatusBadge
          status={status}
        />

      </div>


      {/* ========================================================
          AMOUNT
      ======================================================== */}

      <div className="flex items-center justify-between gap-4 lg:justify-end">

        <div className="flex items-center gap-2">

          <div className="flex items-center gap-1 text-[10px] text-white/20 lg:hidden">

            <ExternalLink
              size={12}
            />

            View

          </div>

          {transaction.receipt_number && (
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();

                onReceipt();
              }}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" ||
                  event.key === " "
                ) {
                  event.preventDefault();

                  event.stopPropagation();

                  onReceipt();
                }
              }}
              className="hidden cursor-pointer rounded-lg bg-emerald-300/10 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-300 transition hover:bg-emerald-300/20 lg:inline-flex"
            >
              Receipt
            </span>
          )}

        </div>

        <p
          className={`
            text-sm
            font-bold
            ${
              isDebit
                ? "text-red-300"
                : isCredit
                  ? "text-emerald-300"
                  : "text-white"
            }
          `}
        >

          {amountPrefix}

          {formatMoney(
            transaction.amount,
            transaction.currency
          )}

        </p>

      </div>

    </button>
  );
}


/*
 * ================================================================
 * STATUS BADGE
 * ================================================================
 */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  if (
    status ===
    "SUCCESS"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-300/10 px-3 py-1.5 text-[10px] font-semibold text-emerald-300">

        <CheckCircle2
          size={13}
        />

        SUCCESS

      </span>
    );
  }


  if (
    status ===
    "FAILED"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-400/10 px-3 py-1.5 text-[10px] font-semibold text-red-300">

        <XCircle
          size={13}
        />

        FAILED

      </span>
    );
  }


  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/10 px-3 py-1.5 text-[10px] font-semibold text-amber-300">

      <Clock3
        size={13}
      />

      {status ||
        "PENDING"}

    </span>
  );
}