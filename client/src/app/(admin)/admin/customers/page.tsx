"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Search,
  Users,
  WalletCards,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

import api from "@/lib/api";

type Account = {
  id: string;
  account_number: string;
  account_type: string;
  balance: number | string;
  currency: string;
  status: string;
};

type Customer = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  role: string;
  created_at: string;
  account_count: number;
  total_balance: string;
  accounts: Account[];
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [pagination, setPagination] =
    useState<Pagination>({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadCustomers = async (
    currentSearch = search,
    page = 1
  ) => {
    try {
      setLoading(true);
      setError("");

      const response =
        await api.get(
          "/admin/customers",
          {
            params: {
              search:
                currentSearch.trim() ||
                undefined,
              page,
              limit: 20,
            },
          }
        );

      const data =
        response.data.data;

      setCustomers(
        data.customers || []
      );

      setPagination(
        data.pagination
      );
    } catch (error: any) {
      console.error(
        "Admin customers error:",
        error
      );

      setError(
        error?.response?.data
          ?.message ||
          "Unable to load customers."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers("", 1);
  }, []);

  const handleSearch = (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    loadCustomers(search, 1);
  };

  const clearSearch = () => {
    setSearch("");
    loadCustomers("", 1);
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Page header */}

      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-300">
            Administration
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Customers
          </h1>

          <p className="mt-2 text-sm text-white/40">
            Manage and inspect NovaBank customers.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-white/35">
          <Users size={16} />

          <span>
            {pagination.total} customer
            {pagination.total === 1
              ? ""
              : "s"}
          </span>
        </div>
      </div>

      {/* Search */}

      <form
        onSubmit={handleSearch}
        className="mt-8 flex flex-col gap-3 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/25"
          />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search name, email or phone..."
            className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/30 focus:bg-white/[0.05]"
          />
        </div>

        <button
          type="submit"
          className="h-12 rounded-xl bg-emerald-400 px-6 text-sm font-semibold text-[#031421] transition hover:bg-emerald-300"
        >
          Search
        </button>

        {search && (
          <button
            type="button"
            onClick={clearSearch}
            className="h-12 rounded-xl border border-white/10 px-5 text-sm text-white/50 transition hover:bg-white/5 hover:text-white"
          >
            Clear
          </button>
        )}
      </form>

      {/* Error */}

      {error && (
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300">
          <span>{error}</span>

          <button
            type="button"
            onClick={() =>
              loadCustomers(search, 1)
            }
            className="flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-red-400/10"
          >
            <RefreshCw size={15} />
            Retry
          </button>
        </div>
      )}

      {/* Loading */}

      {loading && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          {Array.from({
            length: 5,
          }).map((_, index) => (
            <div
              key={index}
              className="flex animate-pulse items-center gap-4 border-b border-white/5 p-5 last:border-0"
            >
              <div className="h-10 w-10 rounded-full bg-white/10" />

              <div className="flex-1">
                <div className="h-4 w-40 rounded bg-white/10" />

                <div className="mt-2 h-3 w-56 rounded bg-white/5" />
              </div>

              <div className="hidden h-4 w-24 rounded bg-white/5 sm:block" />

              <div className="h-8 w-20 rounded bg-white/5" />
            </div>
          ))}
        </div>
      )}

      {/* Customer table */}

      {!loading &&
        !error && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            {/* Desktop header */}

            <div className="hidden grid-cols-[minmax(260px,2fr)_160px_140px_140px_48px] gap-4 border-b border-white/10 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/25 lg:grid">
              <span>Customer</span>
              <span>Accounts</span>
              <span>Balance</span>
              <span>Joined</span>
              <span />
            </div>

            {customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white/30">
                  <Users size={24} />
                </div>

                <h2 className="mt-4 font-semibold">
                  No customers found
                </h2>

                <p className="mt-2 text-sm text-white/30">
                  Try another search term.
                </p>
              </div>
            ) : (
              customers.map(
                (customer) => (
                  <Link
                    key={customer.id}
                    href={`/admin/customers/${customer.id}`}
                    className="group block border-b border-white/5 px-5 py-5 transition last:border-0 hover:bg-white/[0.035]"
                  >
                    {/* Desktop */}

                    <div className="hidden grid-cols-[minmax(260px,2fr)_160px_140px_140px_48px] items-center gap-4 lg:grid">
                      <CustomerIdentity
                        customer={
                          customer
                        }
                      />

                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <WalletCards
                          size={16}
                          className="text-white/25"
                        />

                        {
                          customer.account_count
                        }
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-white">
                          {formatBalance(
                            customer
                              .total_balance
                          )}
                        </p>

                        <p className="mt-1 text-[10px] text-white/25">
                          Combined balances
                        </p>
                      </div>

                      <div className="text-sm text-white/40">
                        {formatDate(
                          customer.created_at
                        )}
                      </div>

                      <ChevronRight
                        size={18}
                        className="text-white/20 transition group-hover:translate-x-1 group-hover:text-emerald-300"
                      />
                    </div>

                    {/* Mobile / tablet */}

                    <div className="lg:hidden">
                      <div className="flex items-start justify-between gap-4">
                        <CustomerIdentity
                          customer={
                            customer
                          }
                        />

                        <ChevronRight
                          size={18}
                          className="mt-2 shrink-0 text-white/20"
                        />
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                        <Info
                          label="Accounts"
                          value={String(
                            customer.account_count
                          )}
                        />

                        <Info
                          label="Balance"
                          value={formatBalance(
                            customer
                              .total_balance
                          )}
                        />

                        <Info
                          label="Joined"
                          value={formatDate(
                            customer.created_at
                          )}
                        />
                      </div>
                    </div>
                  </Link>
                )
              )
            )}

            {/* Pagination */}

            {pagination.totalPages >
              1 && (
              <div className="flex items-center justify-between border-t border-white/10 px-5 py-4">
                <p className="text-xs text-white/30">
                  Page{" "}
                  {pagination.page}{" "}
                  of{" "}
                  {
                    pagination.totalPages
                  }
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={
                      pagination.page <=
                      1
                    }
                    onClick={() =>
                      loadCustomers(
                        search,
                        pagination.page -
                          1
                      )
                    }
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={
                      pagination.page >=
                      pagination.totalPages
                    }
                    onClick={() =>
                      loadCustomers(
                        search,
                        pagination.page +
                          1
                      )
                    }
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| CUSTOMER IDENTITY
|--------------------------------------------------------------------------
*/

function CustomerIdentity({
  customer,
}: {
  customer: Customer;
}) {
  const initial =
    customer.full_name
      ?.trim()
      ?.charAt(0)
      ?.toUpperCase() || "?";

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-cyan-400 font-bold text-[#031421]">
        {initial}
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">
          {customer.full_name}
        </p>

        <p className="truncate text-xs text-white/35">
          {customer.email}
        </p>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| INFO
|--------------------------------------------------------------------------
*/

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-white/25">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-white/70">
        {value}
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| FORMATTERS
|--------------------------------------------------------------------------
*/

function formatBalance(
  value: string | number
) {
  const amount =
    Number(value) || 0;

  return `₦${amount.toLocaleString(
    "en-NG",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en-NG",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(new Date(value));
}
