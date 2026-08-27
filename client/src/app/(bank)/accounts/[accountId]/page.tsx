"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  CheckCircle2,
  Copy,
  CreditCard,
  Loader2,
} from "lucide-react";
import {
  useParams,
  useRouter,
} from "next/navigation";

import api from "@/lib/api";

type Account = {
  id: string;
  account_number: string;
  account_type: string;
  balance: string | number;
  currency: string;
  status: string;
  created_at: string;
};

export default function AccountDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const accountId =
    params.accountId as string;

  const [account, setAccount] =
    useState<Account | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [copied, setCopied] =
    useState(false);


  /*
   * ================================================================
   * FETCH ONE ACCOUNT
   * ================================================================
   */

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await api.get(
            `/accounts/${accountId}`
          );

        const selectedAccount =
          response.data?.data?.account;

        if (!selectedAccount) {
          setError(
            "Account not found."
          );

          return;
        }

        setAccount(selectedAccount);
      } catch (error: any) {
        console.error(
          "Account details error:",
          error
        );

        if (
          error.response?.status === 401
        ) {
          localStorage.removeItem(
            "token"
          );

          router.push("/login");

          return;
        }

        setError(
          error.response?.data?.message ||
            "Unable to load account."
        );
      } finally {
        setLoading(false);
      }
    };

    if (accountId) {
      fetchAccount();
    }
  }, [accountId, router]);


  /*
   * ================================================================
   * FORMAT MONEY
   * ================================================================
   */

  const formatMoney = (
    value: string | number,
    currency: string
  ) => {
    return new Intl.NumberFormat(
      currency === "USD"
        ? "en-US"
        : "en-NG",
      {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
      }
    ).format(Number(value));
  };


  /*
   * ================================================================
   * ACCOUNT NAME
   * ================================================================
   */

  const getAccountName = (
    type: string
  ) => {
    switch (type) {
      case "SAVINGS":
        return "Savings Account";

      case "CURRENT":
        return "Current Account";

      case "DOMICILIARY":
        return "Domiciliary Account";

      default:
        return type;
    }
  };


  /*
   * ================================================================
   * COPY ACCOUNT NUMBER
   * ================================================================
   */

  const copyAccountNumber = async () => {
    if (!account) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        account.account_number
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(
        "Copy failed:",
        error
      );
    }
  };


  /*
   * ================================================================
   * LOADING
   * ================================================================
   */

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-6 lg:px-8">

        <div className="flex items-center gap-3 text-sm text-white/40">

          <Loader2
            size={20}
            className="animate-spin text-emerald-300"
          />

          Loading account...

        </div>

      </main>
    );
  }


  /*
   * ================================================================
   * ERROR
   * ================================================================
   */

  if (error || !account) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-6 lg:px-8">

        <button
          type="button"
          onClick={() =>
            router.push("/accounts")
          }
          className="flex items-center gap-2 text-sm text-white/45 transition hover:text-white"
        >
          <ArrowLeft size={17} />
          Back to accounts
        </button>


        <div className="mt-10 rounded-[28px] border border-red-400/20 bg-red-400/10 p-8 text-center">

          <p className="text-red-300">
            {error ||
              "Account not found."}
          </p>

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
    <main className="mx-auto max-w-6xl px-5 py-7 sm:px-6 lg:px-8 lg:py-9">

      {/* Back */}

      <button
        type="button"
        onClick={() =>
          router.push("/accounts")
        }
        className="mb-7 flex items-center gap-2 text-sm text-white/40 transition hover:text-white"
      >
        <ArrowLeft size={17} />
        Back to accounts
      </button>


      {/* Header */}

      <header className="mb-8">

        <p className="text-sm font-medium text-emerald-300">
          Account
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {getAccountName(
            account.account_type
          )}
        </h1>

      </header>


      {/* ============================================================
          BALANCE
      ============================================================ */}

      <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.015] p-7 sm:p-9">

        <div className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-emerald-300/10 blur-3xl" />

        <div className="relative">

          <div className="flex flex-col justify-between gap-8 sm:flex-row">

            <div>

              <div className="flex items-center gap-3">

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-300/10">

                  <CreditCard
                    size={22}
                    className="text-emerald-300"
                  />

                </div>


                <div>

                  <p className="font-semibold">
                    {account.account_type}
                  </p>

                  <p className="font-mono text-xs text-white/35">
                    ••••{" "}
                    {account.account_number.slice(
                      -4
                    )}
                  </p>

                </div>

              </div>


              <p className="mt-10 text-sm text-white/35">
                Available balance
              </p>

              <p className="mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
                {formatMoney(
                  account.balance,
                  account.currency
                )}
              </p>

            </div>


            <div className="flex h-fit items-center gap-2 rounded-full bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-300">

              <span className="h-2 w-2 rounded-full bg-emerald-300" />

              {account.status}

            </div>

          </div>

        </div>

      </section>


      {/* ============================================================
          ACCOUNT INFORMATION
      ============================================================ */}

      <section className="mt-5 grid gap-5 md:grid-cols-2">

        {/* Account number */}

        <div className="rounded-[26px] border border-white/10 bg-white/[0.025] p-6">

          <p className="text-xs uppercase tracking-wider text-white/25">
            Account number
          </p>

          <div className="mt-3 flex items-center justify-between gap-4">

            <p className="font-mono text-lg text-white/80">
              ••••{" "}
              {account.account_number.slice(
                -4
              )}
            </p>

            <button
              type="button"
              onClick={copyAccountNumber}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/40 transition hover:bg-white/5 hover:text-white"
              title="Copy account number"
            >
              {copied ? (
                <CheckCircle2
                  size={17}
                  className="text-emerald-300"
                />
              ) : (
                <Copy size={17} />
              )}
            </button>

          </div>

          {copied && (
            <p className="mt-2 text-xs text-emerald-300">
              Account number copied.
            </p>
          )}

        </div>


        {/* Currency */}

        <div className="rounded-[26px] border border-white/10 bg-white/[0.025] p-6">

          <p className="text-xs uppercase tracking-wider text-white/25">
            Currency
          </p>

          <p className="mt-3 text-lg font-semibold">

            {account.currency ===
            "USD"
              ? "US Dollar (USD)"
              : "Nigerian Naira (NGN)"}

          </p>

        </div>


        {/* Type */}

        <div className="rounded-[26px] border border-white/10 bg-white/[0.025] p-6">

          <p className="text-xs uppercase tracking-wider text-white/25">
            Account type
          </p>

          <p className="mt-3 text-lg font-semibold">
            {getAccountName(
              account.account_type
            )}
          </p>

        </div>


        {/* Status */}

        <div className="rounded-[26px] border border-white/10 bg-white/[0.025] p-6">

          <p className="text-xs uppercase tracking-wider text-white/25">
            Status
          </p>

          <p className="mt-3 text-lg font-semibold text-emerald-300">
            {account.status}
          </p>

        </div>

      </section>


      {/* ============================================================
          ACCOUNT ACTIONS
      ============================================================ */}

      <section className="mt-8">

        <h2 className="mb-4 text-lg font-semibold">
          Account actions
        </h2>


        <div className="grid gap-4 sm:grid-cols-2">

          {/* Deposit */}

          <button
            type="button"
            onClick={() =>
              router.push(
                `/deposit?account=${account.id}`
              )
            }
            className="flex items-center gap-4 rounded-[22px] border border-white/10 bg-white/[0.025] p-5 text-left transition hover:border-emerald-300/20 hover:bg-white/[0.045]"
          >

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-300/10">

              <ArrowDownToLine
                size={20}
                className="text-emerald-300"
              />

            </div>


            <div>

              <p className="font-semibold">
                Deposit
              </p>

              <p className="mt-1 text-xs text-white/30">
                Add money to this account
              </p>

            </div>

          </button>


          {/* Transfer */}

          <button
            type="button"
            onClick={() =>
              router.push(
                `/transfer?account=${account.id}`
              )
            }
            className="flex items-center gap-4 rounded-[22px] border border-white/10 bg-white/[0.025] p-5 text-left transition hover:border-emerald-300/20 hover:bg-white/[0.045]"
          >

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5">

              <ArrowUpFromLine
                size={20}
                className="text-white/60"
              />

            </div>


            <div>

              <p className="font-semibold">
                Transfer
              </p>

              <p className="mt-1 text-xs text-white/30">
                Send money from this account
              </p>

            </div>

          </button>

        </div>

      </section>

    </main>
  );
}
