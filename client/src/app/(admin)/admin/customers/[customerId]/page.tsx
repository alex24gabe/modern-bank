"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  WalletCards,
  Activity,
  UserRound,
} from "lucide-react";

import api from "@/lib/api";

type Customer = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  role: string;
  created_at: string;
};

type Account = {
  id: string;
  account_number: string;
  account_type: string;
  balance: string | number;
  currency: string;
  status: string;
  created_at: string;
};

type TransactionSummary = {
  transaction_count: number;
  successful_transactions: number;
  successful_volume: string;
};

type CustomerResponse = {
  customer: Customer;
  accounts: Account[];
  transactionSummary: TransactionSummary;
};

export default function AdminCustomerDetailPage() {
  const params = useParams();

  const customerId =
    String(
      params.customerId || ""
    );

  const [data, setData] =
    useState<CustomerResponse | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!customerId) {
      return;
    }

    const loadCustomer =
      async () => {
        try {
          setLoading(true);
          setError("");

          const response =
            await api.get(
              `/admin/customers/${customerId}`
            );

          setData(
            response.data.data
          );
        } catch (error: any) {
          console.error(
            "Admin customer detail error:",
            error
          );

          setError(
            error?.response?.data
              ?.message ||
              "Unable to load customer."
          );
        } finally {
          setLoading(false);
        }
      };

    loadCustomer();
  }, [customerId]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse">
          <div className="h-4 w-24 rounded bg-white/10" />

          <div className="mt-6 h-8 w-64 rounded bg-white/10" />

          <div className="mt-8 h-40 rounded-2xl bg-white/5" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 lg:p-8">
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-2 text-sm text-white/40 transition hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to customers
        </Link>

        <div className="mt-8 rounded-2xl border border-red-400/20 bg-red-400/5 p-5 text-red-300">
          {error ||
            "Customer not found."}
        </div>
      </div>
    );
  }

  const customer =
    data.customer;

  const balancesByCurrency =
  data.accounts.reduce(
    (
      balances,
      account
    ) => {
      const currency =
        account.currency || "NGN";

      balances[currency] =
        (balances[currency] || 0) +
        (Number(account.balance) || 0);

      return balances;
    },
    {} as Record<string, number>
  );

  const initial =
    customer.full_name
      ?.trim()
      ?.charAt(0)
      ?.toUpperCase() || "?";

  return (
    <div className="p-6 lg:p-8">
      {/* Back */}

      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-2 text-sm text-white/40 transition hover:text-white"
      >
        <ArrowLeft size={16} />
        Back to customers
      </Link>

      {/* Customer header */}

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-cyan-400 text-xl font-bold text-[#031421]">
            {initial}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {customer.full_name}
              </h1>

              <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                {customer.role}
              </span>
            </div>

            <p className="mt-1 text-sm text-white/35">
              Customer since{" "}
              {formatDate(
                customer.created_at
              )}
            </p>
          </div>
        </div>

        {/* Contact information */}

        <div className="mt-7 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          <Contact
            icon={Mail}
            label="Email"
            value={
              customer.email
            }
          />

          <Contact
            icon={Phone}
            label="Phone"
            value={
              customer.phone ||
              "Not provided"
            }
          />

          <Contact
            icon={MapPin}
            label="Address"
            value={
              customer.address ||
              "Not provided"
            }
          />
        </div>
      </div>

      {/* Summary */}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat
          icon={WalletCards}
          label="Accounts"
          value={String(
            data.accounts.length
          )}
        />

        <Stat
          icon={Activity}
          label="Transactions"
          value={String(
            data.transactionSummary
              .transaction_count
          )}
        />

        <Stat
          icon={UserRound}
          label="Successful volume"
          value={formatBalance(
            data.transactionSummary
              .successful_volume
          )}
        />
      </div>

      {/* Accounts */}

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="font-semibold">
            Accounts
          </h2>

          <p className="mt-1 text-xs text-white/30">
            All accounts belonging to this customer.
          </p>
        </div>

        {data.accounts.length ===
        0 ? (
          <div className="px-6 py-12 text-center text-sm text-white/30">
            This customer has no accounts.
          </div>
        ) : (
          <div>
            {data.accounts.map(
              (account) => (
               <Link
                  key={account.id}
                  href={`/admin/accounts/${account.id}`}
                  className="group block border-b border-white/5 px-6 py-5 transition hover:bg-white/[0.035] last:border-0"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-semibold">
                          {account.account_type}
                        </p>

                        <span
                          className={`
                            rounded-full px-2.5 py-1
                            text-[10px] font-semibold
                            uppercase tracking-wider

                            ${
                              account.status.toLowerCase() ===
                              "active"
                                ? "bg-emerald-400/10 text-emerald-300"
                                : "bg-white/10 text-white/40"
                            }
                          `}
                        >
                          {account.status}
                        </span>
                      </div>

                      <p className="mt-1 text-sm tracking-wider text-white/35">
                        {account.account_number}
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-lg font-bold">
                        {formatCurrency(
                          account.balance,
                          account.currency
                        )}
                      </p>

                      <p className="mt-1 text-[10px] uppercase tracking-wider text-white/25">
                        {account.currency}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            )}

            <div className="border-t border-white/10 bg-white/[0.02] px-6 py-5">
  <p className="text-sm text-white/40">
    Balance by currency
  </p>

  <div className="mt-4 flex flex-wrap gap-6">
    {Object.entries(
      balancesByCurrency
    ).map(
      ([
        currency,
        amount,
      ]) => (
        <div
          key={currency}
        >
          <p className="text-[10px] uppercase tracking-wider text-white/25">
            {currency}
          </p>

          <p className="mt-1 font-bold">
            {formatCurrency(
              amount,
              currency
            )}
          </p>
        </div>
      )
    )}
  </div>
</div>
          </div>
        )}
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| CONTACT
|--------------------------------------------------------------------------
*/

function Contact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/35">
        <Icon size={16} />
      </div>

      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-white/25">
          {label}
        </p>

        <p className="mt-1 truncate text-sm text-white/60">
          {value}
        </p>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| STAT
|--------------------------------------------------------------------------
*/

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof WalletCards;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
          <Icon size={17} />
        </div>

        <p className="text-sm text-white/40">
          {label}
        </p>
      </div>

      <p className="mt-4 text-2xl font-bold">
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

function formatCurrency(
  value: string | number,
  currency: string
) {
  const amount =
    Number(value) || 0;

  if (currency === "NGN") {
    return `₦${amount.toLocaleString(
      "en-NG",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  }

  return `${currency} ${amount.toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}
