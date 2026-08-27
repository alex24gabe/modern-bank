"use client";

import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ExternalLink,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type Transaction = {
  id: string;
  source: "INTERNAL" | "EXTERNAL";
  transaction_type: string;
  amount: string | number;
  currency?: string;
  source_currency?: string | null;
  destination_currency?: string | null;
  description?: string;
  reference: string;
  status: string;
  fee: string | number;
  created_at: string;
  has_receipt: boolean;

  sender: {
    account_number: string | null;
    name: string | null;
    email: string | null;
  };

  receiver: {
    account_number?: string | null;
    account_name?: string | null;
    name?: string | null;
    bank_name?: string | null;
  };
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  data?: {
    transactions: Transaction[];
    pagination: Pagination;
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
    localStorage.getItem("novabank_token") ||
    localStorage.getItem("accessToken")
  );
}

function formatMoney(
  value: string | number,
  currency: string
) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "NGN",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function maskAccount(value?: string | null) {
  if (!value) {
    return "—";
  }

  if (value.length < 6) {
    return value;
  }

  return `${value.slice(0, 3)}••••${value.slice(-3)}`;
}

function transactionLabel(type: string) {
  return type
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized =
    status.toUpperCase();

  const success =
    normalized === "SUCCESS";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
        success
          ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-300"
          : "border-red-300/20 bg-red-300/10 text-red-300"
      }`}
    >
      {status}
    </span>
  );
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [pagination, setPagination] =
    useState<Pagination>({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
    });

  const [search, setSearch] =
    useState("");

  const [source, setSource] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [type, setType] =
    useState("");

  const [currency, setCurrency] =
    useState("");

  const [from, setFrom] =
    useState("");

  const [to, setTo] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadTransactions =
    useCallback(
      async (
        requestedPage = 1
      ) => {
        try {
          setError("");

          if (refreshing) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          const token = getToken();

          if (!token) {
            throw new Error(
              "Admin authentication token not found."
            );
          }

          const params =
            new URLSearchParams();

          params.set(
            "page",
            String(requestedPage)
          );

          params.set("limit", "20");

          if (search.trim()) {
            params.set(
              "search",
              search.trim()
            );
          }

          if (source) {
            params.set(
              "source",
              source
            );
          }

          if (status) {
            params.set(
              "status",
              status
            );
          }

          if (type) {
            params.set(
              "type",
              type
            );
          }

          if (currency) {
            params.set(
              "currency",
              currency
            );
          }

          if (from) {
            params.set("from", from);
          }

          if (to) {
            params.set("to", to);
          }

          const response =
            await fetch(
              `${API_URL}/admin/transactions?${params.toString()}`,
              {
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

          if (!response.ok) {
            throw new Error(
              data.message ||
                "Unable to retrieve transactions."
            );
          }

          if (!data.success) {
            throw new Error(
              data.message ||
                "Unable to retrieve transactions."
            );
          }

          setTransactions(
            data.data?.transactions || []
          );

          setPagination(
            data.data?.pagination || {
              page: requestedPage,
              limit: 20,
              total: 0,
              totalPages: 1,
            }
          );
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to retrieve transactions."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        currency,
        from,
        refreshing,
        search,
        source,
        status,
        to,
        type,
      ]
    );

  useEffect(() => {
    loadTransactions(1);
  }, [
    search,
    source,
    status,
    type,
    currency,
    from,
    to,
  ]);

  function handleRefresh() {
    setRefreshing(true);
    loadTransactions(
      pagination.page
    );
  }

  function clearFilters() {
    setSearch("");
    setSource("");
    setStatus("");
    setType("");
    setCurrency("");
    setFrom("");
    setTo("");
  }

  const successful =
    useMemo(
      () =>
        transactions.filter(
          (transaction) =>
            transaction.status.toUpperCase() ===
            "SUCCESS"
        ).length,
      [transactions]
    );

  const external =
    useMemo(
      () =>
        transactions.filter(
          (transaction) =>
            transaction.source ===
            "EXTERNAL"
        ).length,
      [transactions]
    );

  const totalVolume =
    useMemo(
      () =>
        transactions.reduce(
          (sum, transaction) =>
            sum +
            Number(transaction.amount || 0),
          0
        ),
      [transactions]
    );

  return (
    <main className="min-h-screen bg-[#031421] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">

        {/* HEADER */}

        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-300/70">
              <ShieldCheck size={15} />
              Administration
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Transactions
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-white/40">
              Monitor NovaBank financial
              activity across internal and
              external transactions.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-medium text-white/70 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
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

        {/* SUMMARY */}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Transactions"
            value={pagination.total}
            icon={ArrowLeftRight}
          />

          <SummaryCard
            label="Successful"
            value={successful}
            icon={CircleDollarSign}
          />

          <SummaryCard
            label="External"
            value={external}
            icon={ExternalLink}
          />

          <SummaryCard
            label="Current page volume"
            value={formatMoney(
              totalVolume,
              currency === "USD"
                ? "USD"
                : "NGN"
            )}
            icon={CircleDollarSign}
          />
        </div>

        {/* FILTERS */}

        <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
          <div className="grid gap-3 xl:grid-cols-7">

            <div className="relative xl:col-span-2">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search reference, account or customer..."
                className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.025] pl-10 pr-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-emerald-300/30"
              />
            </div>

            <select
              value={source}
              onChange={(event) =>
                setSource(
                  event.target.value
                )
              }
              className="h-11 rounded-xl border border-white/10 bg-[#071c2b] px-3 text-sm text-white/70 outline-none"
            >
              <option value="">
                All sources
              </option>
              <option value="INTERNAL">
                Internal
              </option>
              <option value="EXTERNAL">
                External
              </option>
            </select>

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value
                )
              }
              className="h-11 rounded-xl border border-white/10 bg-[#071c2b] px-3 text-sm text-white/70 outline-none"
            >
              <option value="">
                All statuses
              </option>
              <option value="SUCCESS">
                Success
              </option>
              <option value="FAILED">
                Failed
              </option>
              <option value="PENDING">
                Pending
              </option>
            </select>

            <select
              value={type}
              onChange={(event) =>
                setType(
                  event.target.value
                )
              }
              className="h-11 rounded-xl border border-white/10 bg-[#071c2b] px-3 text-sm text-white/70 outline-none"
            >
              <option value="">
                All types
              </option>
              <option value="TRANSFER">
                Transfer
              </option>
              <option value="DEPOSIT">
                Deposit
              </option>
              <option value="DOMESTIC_TRANSFER">
                Domestic transfer
              </option>
              <option value="INTERNATIONAL_TRANSFER">
                International transfer
              </option>
              <option value="OTHER_BANK_TRANSFER">
                Other bank transfer
              </option>
            </select>

            <select
              value={currency}
              onChange={(event) =>
                setCurrency(
                  event.target.value
                )
              }
              className="h-11 rounded-xl border border-white/10 bg-[#071c2b] px-3 text-sm text-white/70 outline-none"
            >
              <option value="">
                All currencies
              </option>
              <option value="NGN">
                NGN
              </option>
              <option value="USD">
                USD
              </option>
            </select>

            <button
              type="button"
              onClick={clearFilters}
              className="h-11 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white/50 transition hover:bg-white/[0.06] hover:text-white"
            >
              Clear
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-white/25">
                From
              </label>

              <input
                type="date"
                value={from}
                onChange={(event) =>
                  setFrom(
                    event.target.value
                  )
                }
                className="h-10 w-full rounded-xl border border-white/10 bg-[#071c2b] px-3 text-sm text-white/60 outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-white/25">
                To
              </label>

              <input
                type="date"
                value={to}
                onChange={(event) =>
                  setTo(
                    event.target.value
                  )
                }
                className="h-10 w-full rounded-xl border border-white/10 bg-[#071c2b] px-3 text-sm text-white/60 outline-none"
              />
            </div>
          </div>
        </section>

        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-300/20 bg-red-300/[0.06] px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* TABLE */}

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead className="border-b border-white/10 bg-white/[0.02]">
                <tr className="text-[10px] uppercase tracking-wider text-white/25">
                  <th className="px-5 py-4">
                    Reference
                  </th>
                  <th className="px-5 py-4">
                    Type
                  </th>
                  <th className="px-5 py-4">
                    Customer
                  </th>
                  <th className="px-5 py-4">
                    Receiver
                  </th>
                  <th className="px-5 py-4">
                    Amount
                  </th>
                  <th className="px-5 py-4">
                    Fee
                  </th>
                  <th className="px-5 py-4">
                    Status
                  </th>
                  <th className="px-5 py-4">
                    Date
                  </th>
                  <th className="px-5 py-4" />
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.06]">

                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-16 text-center text-sm text-white/30"
                    >
                      Loading transactions...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-16 text-center"
                    >
                      <ArrowLeftRight
                        size={28}
                        className="mx-auto mb-3 text-white/15"
                      />

                      <p className="text-sm text-white/40">
                        No transactions found.
                      </p>
                    </td>
                  </tr>
                ) : (
                  transactions.map(
                    (transaction) => (
                      <tr
                        key={`${transaction.source}-${transaction.id}`}
                        className="group transition hover:bg-white/[0.025]"
                      >
                        <td className="px-5 py-4">
                          <Link
                            href={`/admin/transactions/${transaction.id}`}
                            className="block"
                          >
                            <p className="max-w-[220px] truncate text-xs font-medium text-white/80 group-hover:text-emerald-300">
                              {transaction.reference}
                            </p>

                            <p className="mt-1 text-[10px] text-white/25">
                              {transaction.source}
                            </p>
                          </Link>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-xs text-white/65">
                            {transactionLabel(
                              transaction.transaction_type
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-xs font-medium text-white/70">
                            {transaction.sender.name ||
                              "Unknown"}
                          </p>

                          <p className="mt-1 text-[10px] text-white/25">
                            {maskAccount(
                              transaction.sender.account_number
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-xs text-white/65">
                            {transaction.receiver.name ||
                              transaction.receiver.account_name ||
                              transaction.receiver.bank_name ||
                              "External account"}
                          </p>

                          <p className="mt-1 text-[10px] text-white/25">
                            {maskAccount(
                              transaction.receiver.account_number
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-white">
                            {formatMoney(
                              transaction.amount,
                              transaction.currency ||
                                transaction.source_currency ||
                                "NGN"
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-xs text-white/50">
                          {formatMoney(
                            transaction.fee,
                            transaction.currency ||
                              transaction.source_currency ||
                              "NGN"
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={
                              transaction.status
                            }
                          />
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-xs text-white/40">
                          {formatDate(
                            transaction.created_at
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <Link
                            href={`/admin/transactions/${transaction.id}`}
                            aria-label="View transaction"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.025] text-white/35 transition hover:bg-white/[0.06] hover:text-white"
                          >
                            <ArrowUpRight
                              size={15}
                            />
                          </Link>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}

          {!loading &&
            pagination.total > 0 && (
              <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-white/30">
                  Page{" "}
                  <span className="text-white/60">
                    {pagination.page}
                  </span>{" "}
                  of{" "}
                  <span className="text-white/60">
                    {pagination.totalPages}
                  </span>{" "}
                  ·{" "}
                  <span className="text-white/60">
                    {pagination.total}
                  </span>{" "}
                  transactions
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      pagination.page <= 1
                    }
                    onClick={() =>
                      loadTransactions(
                        pagination.page - 1
                      )
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.025] px-3 text-xs text-white/50 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                  >
                    <ChevronLeft
                      size={15}
                    />
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={
                      pagination.page >=
                      pagination.totalPages
                    }
                    onClick={() =>
                      loadTransactions(
                        pagination.page + 1
                      )
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.025] px-3 text-xs text-white/50 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                  >
                    Next
                    <ChevronRight
                      size={15}
                    />
                  </button>
                </div>
              </div>
            )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof CircleDollarSign;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-white/35">
          {label}
        </p>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-emerald-300/70">
          <Icon size={17} />
        </div>
      </div>

      <p className="text-xl font-semibold tracking-tight text-white">
        {value}
      </p>
    </div>
  );
}