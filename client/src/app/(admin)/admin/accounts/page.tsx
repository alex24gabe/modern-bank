"use client";

import Link from "next/link";
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  WalletCards,
  UserRound,
  ArrowUpRight,
  CircleDollarSign,
} from "lucide-react";
import {
  useCallback,
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

  transaction_count: number;
  deposit_count: number;
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
    accounts: Account[];
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
    localStorage.getItem(
      "novabank_token"
    ) ||
    localStorage.getItem(
      "accessToken"
    )
  );
}

function formatMoney(
  value: string | number,
  currency: string
) {
  const amount = Number(value || 0);

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
  ).format(amount);
}

function formatDate(
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

function maskAccount(
  accountNumber: string
) {
  if (
    !accountNumber ||
    accountNumber.length < 6
  ) {
    return accountNumber;
  }

  return `${accountNumber.slice(
    0,
    3
  )}••••${accountNumber.slice(-3)}`;
}

export default function AdminAccountsPage() {
  const [accounts, setAccounts] =
    useState<Account[]>([]);

  const [pagination, setPagination] =
    useState<Pagination>({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
    });

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [accountType, setAccountType] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [refreshing, setRefreshing] =
    useState(false);

  const loadAccounts =
    useCallback(
      async (
        requestedPage = pagination.page
      ) => {
        try {
          setError("");

          if (!refreshing) {
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

          params.set(
            "limit",
            "20"
          );

          if (search.trim()) {
            params.set(
              "search",
              search.trim()
            );
          }

          if (status) {
            params.set(
              "status",
              status
            );
          }

          if (accountType) {
            params.set(
              "accountType",
              accountType
            );
          }

          const response =
            await fetch(
              `${API_URL}/admin/accounts?${params.toString()}`,
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

          if (!response.ok) {
            throw new Error(
              data.message ||
                "Unable to retrieve accounts."
            );
          }

          if (!data.success) {
            throw new Error(
              data.message ||
                "Unable to retrieve accounts."
            );
          }

          setAccounts(
            data.data?.accounts || []
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
              : "Unable to retrieve accounts."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        accountType,
        pagination.page,
        refreshing,
        search,
        status,
      ]
    );

  useEffect(() => {
    loadAccounts(1);
  }, [
    search,
    status,
    accountType,
  ]);

  function handleRefresh() {
    setRefreshing(true);
    loadAccounts(
      pagination.page
    );
  }

  const activeAccounts =
    accounts.filter(
      (account) =>
        account.status.toLowerCase() ===
        "active"
    ).length;

  const suspendedAccounts =
    accounts.filter(
      (account) =>
        account.status.toLowerCase() ===
        "suspended"
    ).length;

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
              Accounts
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-white/40">
              Manage customer accounts,
              balances, statuses and
              account activity.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={
              loading || refreshing
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white/70 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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
            icon={
              <WalletCards
                size={18}
              />
            }
            label="Total accounts"
            value={pagination.total}
          />

          <SummaryCard
            icon={
              <ShieldCheck
                size={18}
              />
            }
            label="Active on page"
            value={activeAccounts}
          />

          <SummaryCard
            icon={
              <UserRound
                size={18}
              />
            }
            label="Suspended on page"
            value={
              suspendedAccounts
            }
          />

          <SummaryCard
            icon={
              <CircleDollarSign
                size={18}
              />
            }
            label="Page records"
            value={accounts.length}
          />

        </div>

        {/* FILTERS */}

        <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_200px_auto]">

            <div className="flex h-11 items-center gap-3 rounded-xl border border-white/10 bg-[#071c2a] px-3">
              <Search
                size={17}
                className="shrink-0 text-white/25"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search account, customer or email..."
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/25"
              />
            </div>

            <select
              value={accountType}
              onChange={(event) =>
                setAccountType(
                  event.target.value
                )
              }
              className="h-11 rounded-xl border border-white/10 bg-[#071c2a] px-3 text-sm text-white/70 outline-none"
            >
              <option value="">
                All account types
              </option>
              <option value="SAVINGS">
                Savings
              </option>
              <option value="CURRENT">
                Current
              </option>
              <option value="DOMICILIARY">
                Domiciliary
              </option>
            </select>

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value
                )
              }
              className="h-11 rounded-xl border border-white/10 bg-[#071c2a] px-3 text-sm text-white/70 outline-none"
            >
              <option value="">
                All statuses
              </option>
              <option value="Active">
                Active
              </option>
              <option value="Suspended">
                Suspended
              </option>
              <option value="Closed">
                Closed
              </option>
            </select>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatus("");
                setAccountType("");
              }}
              className="h-11 rounded-xl border border-white/10 px-4 text-sm text-white/45 transition hover:bg-white/5 hover:text-white"
            >
              Clear
            </button>

          </div>
        </section>

        {/* ERROR */}

        {error && (
          <section className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-red-300">
                  Unable to load accounts
                </p>

                <p className="mt-1 text-sm text-red-200/60">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  loadAccounts(
                    pagination.page
                  )
                }
                className="rounded-lg border border-red-300/20 px-3 py-2 text-sm text-red-200 hover:bg-red-300/10"
              >
                Try again
              </button>
            </div>
          </section>
        )}

        {/* TABLE */}

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">

          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">
                Customer accounts
              </h2>

              <p className="mt-1 text-xs text-white/30">
                {pagination.total} total account
                {pagination.total === 1
                  ? ""
                  : "s"}
              </p>
            </div>

            <div className="hidden items-center gap-2 text-xs text-white/30 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Live database
            </div>
          </div>

          {loading ? (
            <LoadingTable />
          ) : accounts.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[1000px] text-left">

                <thead>
                  <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.14em] text-white/25">
                    <th className="px-5 py-4 font-medium">
                      Account
                    </th>

                    <th className="px-5 py-4 font-medium">
                      Customer
                    </th>

                    <th className="px-5 py-4 font-medium">
                      Type
                    </th>

                    <th className="px-5 py-4 font-medium">
                      Balance
                    </th>

                    <th className="px-5 py-4 font-medium">
                      Activity
                    </th>

                    <th className="px-5 py-4 font-medium">
                      Status
                    </th>

                    <th className="px-5 py-4 font-medium">
                      Created
                    </th>

                    <th className="px-5 py-4 font-medium">
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.06]">

                  {accounts.map(
                    (account) => (
                      <tr
                        key={account.id}
                        className="transition hover:bg-white/[0.025]"
                      >

                        <td className="px-5 py-4">
                          <div>
                            <p className="font-mono text-sm text-white/85">
                              {maskAccount(
                                account.account_number
                              )}
                            </p>

                            <p className="mt-1 text-xs text-white/25">
                              {account.account_number}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-white/80">
                            {account.customer_name}
                          </p>

                          <p className="mt-1 text-xs text-white/30">
                            {account.customer_email}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white/55">
                            {account.account_type}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-white/85">
                            {formatMoney(
                              account.balance,
                              account.currency
                            )}
                          </p>

                          <p className="mt-1 text-xs text-white/25">
                            {account.currency}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm text-white/60">
                            {account.transaction_count}
                            {" "}
                            transactions
                          </p>

                          <p className="mt-1 text-xs text-white/25">
                            {account.deposit_count}
                            {" "}
                            deposits
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={
                              account.status
                            }
                          />
                        </td>

                        <td className="px-5 py-4 text-xs text-white/35">
                          {formatDate(
                            account.created_at
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <Link
                            href={`/admin/accounts/${account.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/55 transition hover:bg-white/5 hover:text-white"
                          >
                            View
                            <ArrowUpRight
                              size={13}
                            />
                          </Link>
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>
            </div>
          )}

          {/* PAGINATION */}

          {!loading &&
            accounts.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

                <p className="text-xs text-white/30">
                  Page{" "}
                  <span className="text-white/60">
                    {pagination.page}
                  </span>{" "}
                  of{" "}
                  <span className="text-white/60">
                    {pagination.totalPages}
                  </span>
                </p>

                <div className="flex items-center gap-2">

                  <button
                    type="button"
                    disabled={
                      pagination.page <=
                      1
                    }
                    onClick={() =>
                      loadAccounts(
                        pagination.page -
                          1
                      )
                    }
                    className="flex h-9 items-center gap-1 rounded-lg border border-white/10 px-3 text-xs text-white/55 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft
                      size={14}
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
                      loadAccounts(
                        pagination.page +
                          1
                      )
                    }
                    className="flex h-9 items-center gap-1 rounded-lg border border-white/10 px-3 text-xs text-white/55 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Next
                    <ChevronRight
                      size={14}
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

/*
 * ================================================================
 * SUMMARY CARD
 * ================================================================
 */

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-300">
        {icon}
      </div>

      <p className="text-xs text-white/30">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold tracking-tight text-white/90">
        {value}
      </p>
    </div>
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
  const normalized =
    status.toLowerCase();

  const isActive =
    normalized === "active";

  const isSuspended =
    normalized === "suspended";

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
        isActive
          ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-300"
          : isSuspended
            ? "border-amber-300/20 bg-amber-300/10 text-amber-300"
            : "border-red-300/20 bg-red-300/10 text-red-300",
      ].join(" ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

/*
 * ================================================================
 * LOADING
 * ================================================================
 */

function LoadingTable() {
  return (
    <div className="divide-y divide-white/[0.06]">
      {Array.from({
        length: 7,
      }).map((_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-center gap-6 px-5 py-5"
        >
          <div className="h-8 w-32 rounded-lg bg-white/5" />

          <div className="h-8 w-40 rounded-lg bg-white/5" />

          <div className="h-8 w-24 rounded-lg bg-white/5" />

          <div className="h-8 w-28 rounded-lg bg-white/5" />

          <div className="h-8 w-24 rounded-lg bg-white/5" />

          <div className="h-8 w-20 rounded-lg bg-white/5" />
        </div>
      ))}
    </div>
  );
}

/*
 * ================================================================
 * EMPTY
 * ================================================================
 */

function EmptyState() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-white/30">
        <WalletCards
          size={24}
        />
      </div>

      <h3 className="text-sm font-semibold text-white/80">
        No accounts found
      </h3>

      <p className="mt-2 max-w-sm text-xs leading-5 text-white/30">
        No customer accounts match
        the current search and filter
        criteria.
      </p>
    </div>
  );
}
