"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Loader2,
  Plus,
  Wallet,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

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

type AccountType = {
  type: string;
  name: string;
  currency: string;
};

export default function AccountsPage() {
  const router = useRouter();

  const [accounts, setAccounts] =
    useState<Account[]>([]);

  const [availableTypes, setAvailableTypes] =
    useState<AccountType[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [selectedType, setSelectedType] =
    useState<AccountType | null>(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  /*
   * ================================================================
   * FETCH ACCOUNTS
   * ================================================================
   */

  const fetchAccounts = async () => {
    const response =
      await api.get("/accounts");

    setAccounts(
      response.data?.data?.accounts ?? []
    );
  };


  /*
   * ================================================================
   * FETCH AVAILABLE ACCOUNT TYPES
   * ================================================================
   */

  const fetchAvailableTypes = async () => {
    const response =
      await api.get("/accounts/types");

    setAvailableTypes(
      response.data?.data?.accountTypes ?? []
    );
  };


  /*
   * ================================================================
   * INITIAL PAGE LOAD
   * ================================================================
   */

  useEffect(() => {
    const loadPage = async () => {
      try {
        setLoading(true);
        setError("");

        await Promise.all([
          fetchAccounts(),
          fetchAvailableTypes(),
        ]);
      } catch (error: any) {
        console.error(
          "Accounts page error:",
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
            "Unable to load accounts."
        );
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [router]);


  /*
   * ================================================================
   * CREATE ACCOUNT
   * ================================================================
   */

  const createAccount = async () => {
    if (!selectedType) {
      return;
    }

    try {
      setCreating(true);
      setError("");
      setSuccess("");

      const response =
        await api.post(
          "/accounts",
          {
            accountType:
              selectedType.type,
          }
        );

      const newAccount =
        response.data?.data?.account;

      if (newAccount) {
        setAccounts(
          (current) => [
            ...current,
            newAccount,
          ]
        );
      }

      await fetchAvailableTypes();

      setSuccess(
        response.data?.message ||
          "Account created successfully."
      );

      setSelectedType(null);
      setModalOpen(false);
    } catch (error: any) {
      console.error(
        "Create account error:",
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
          "Unable to create account."
      );
    } finally {
      setCreating(false);
    }
  };


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
    accountType: string
  ) => {
    switch (accountType) {
      case "SAVINGS":
        return "Savings Account";

      case "CURRENT":
        return "Current Account";

      case "DOMICILIARY":
        return "Domiciliary Account";

      default:
        return accountType;
    }
  };


  /*
   * ================================================================
   * LOADING
   * ================================================================
   */

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">

        <div className="animate-pulse space-y-6">

          <div className="h-8 w-56 rounded-lg bg-white/5" />

          <div className="h-4 w-80 rounded bg-white/5" />

          <div className="grid gap-5 md:grid-cols-2">

            <div className="h-56 rounded-[28px] bg-white/5" />

            <div className="h-56 rounded-[28px] bg-white/5" />

          </div>

        </div>

      </main>
    );
  }


  /*
   * ================================================================
   * MAIN PAGE
   * ================================================================
   */

  return (
    <>
      <main className="mx-auto max-w-7xl px-5 py-7 sm:px-6 lg:px-8 lg:py-9">

        {/* Header */}

        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">

          <div>

            <p className="text-sm font-medium text-emerald-300">
              Banking
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Your accounts
            </h1>

            <p className="mt-2 max-w-xl text-sm text-white/40">
              Manage your NovaBank accounts,
              balances and currencies from
              one place.
            </p>

          </div>


          <button
            type="button"
            disabled={
              availableTypes.length === 0
            }
            onClick={() => {
              setError("");
              setSuccess("");
              setSelectedType(null);
              setModalOpen(true);
            }}
            className="flex w-fit items-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 text-sm font-bold text-[#031421] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
          >

            <Plus size={18} />

            {availableTypes.length === 0
              ? "All accounts opened"
              : "Open new account"}

          </button>

        </div>


        {/* Error */}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm text-red-300">
            {error}
          </div>
        )}


        {/* Success */}

        {success && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-300">

            <CheckCircle2
              size={18}
              className="shrink-0"
            />

            <span>{success}</span>

          </div>
        )}


        {/* Accounts */}

        {accounts.length > 0 ? (
          <section className="grid gap-5 md:grid-cols-2">

            {accounts.map((account) => (
              <article
                key={account.id}
                role="button"
                tabIndex={0}
                onClick={() =>
                  router.push(
                    `/accounts/${account.id}`
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" ||
                    event.key === " "
                  ) {
                    event.preventDefault();

                    router.push(
                      `/accounts/${account.id}`
                    );
                  }
                }}
                className="group relative cursor-pointer overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.015] p-6 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-300/20 hover:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
              >

                <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-emerald-300/5 blur-3xl" />

                <div className="relative">

                  {/* Account header */}

                  <div className="flex items-start justify-between gap-4">

                    <div className="flex items-center gap-3">

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10">

                        <CreditCard
                          size={21}
                          className="text-emerald-300"
                        />

                      </div>


                      <div>

                        <p className="font-semibold">
                          {getAccountName(
                            account.account_type
                          )}
                        </p>

                        <p className="mt-1 font-mono text-xs text-white/35">
                          ••••{" "}
                          {account.account_number.slice(
                            -4
                          )}
                        </p>

                      </div>

                    </div>


                    <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                      {account.status}
                    </span>

                  </div>


                  {/* Balance */}

                  <div className="mt-10">

                    <p className="text-xs text-white/30">
                      Available balance
                    </p>

                    <p className="mt-1 text-3xl font-bold tracking-tight">
                      {formatMoney(
                        account.balance,
                        account.currency
                      )}
                    </p>

                  </div>


                  {/* Footer */}

                  <div className="mt-7 flex items-center justify-between gap-4 border-t border-white/10 pt-4">

                    <div className="min-w-0">

                      <p className="text-[10px] uppercase tracking-wider text-white/20">
                        Account number
                      </p>

                      <p className="mt-1 font-mono text-sm text-white/55">
                        ••••{" "}
                        {account.account_number.slice(
                          -4
                        )}
                      </p>

                    </div>


                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/30 transition group-hover:border-emerald-300/20 group-hover:text-emerald-300">

                      <ChevronRight
                        size={17}
                      />

                    </div>

                  </div>

                </div>

              </article>
            ))}

          </section>
        ) : (
          <section className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">

              <Wallet
                size={24}
                className="text-white/30"
              />

            </div>

            <h2 className="mt-5 text-xl font-bold">
              No accounts
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-white/35">
              You currently do not have any
              accounts.
            </p>

          </section>
        )}

      </main>


      {/* ============================================================
          CREATE ACCOUNT MODAL
      ============================================================ */}

      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              if (!creating) {
                setModalOpen(false);
              }
            }
          }}
        >

          <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#061b28] p-6 shadow-2xl sm:p-7">

            {/* Modal header */}

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="text-sm font-medium text-emerald-300">
                  New account
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  Choose account type
                </h2>

                <p className="mt-2 text-sm leading-6 text-white/35">
                  Each customer can have one
                  account of each type.
                </p>

              </div>


              <button
                type="button"
                disabled={creating}
                onClick={() => {
                  setModalOpen(false);
                  setSelectedType(null);
                }}
                className="rounded-xl p-2 text-white/30 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Close"
              >
                <X size={19} />
              </button>

            </div>


            {/* Available types */}

            <div className="mt-7 space-y-3">

              {availableTypes.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center">

                  <CheckCircle2
                    size={24}
                    className="mx-auto text-emerald-300"
                  />

                  <p className="mt-3 font-semibold">
                    You have opened all
                    available account types.
                  </p>

                </div>
              ) : (
                availableTypes.map(
                  (accountType) => {
                    const selected =
                      selectedType?.type ===
                      accountType.type;

                    return (
                      <button
                        key={
                          accountType.type
                        }
                        type="button"
                        disabled={creating}
                        onClick={() =>
                          setSelectedType(
                            accountType
                          )
                        }
                        className={`
                          w-full rounded-2xl border
                          p-4 text-left
                          transition
                          disabled:cursor-not-allowed
                          ${
                            selected
                              ? "border-emerald-300/40 bg-emerald-300/[0.08]"
                              : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                          }
                        `}
                      >

                        <div className="flex items-center justify-between gap-4">

                          <div className="flex items-center gap-3">

                            <div
                              className={`
                                flex h-11 w-11
                                shrink-0 items-center
                                justify-center rounded-xl
                                ${
                                  selected
                                    ? "bg-emerald-300/15"
                                    : "bg-white/5"
                                }
                              `}
                            >

                              <CreditCard
                                size={18}
                                className={
                                  selected
                                    ? "text-emerald-300"
                                    : "text-white/40"
                                }
                              />

                            </div>


                            <div>

                              <p className="font-semibold">
                                {accountType.name}
                              </p>

                              <p className="mt-1 text-xs text-white/30">

                                Account currency:{" "}

                                <span className="font-semibold text-white/50">
                                  {
                                    accountType.currency
                                  }
                                </span>

                              </p>

                            </div>

                          </div>


                          {selected && (
                            <CheckCircle2
                              size={20}
                              className="shrink-0 text-emerald-300"
                            />
                          )}

                        </div>

                      </button>
                    );
                  }
                )
              )}

            </div>


            {/* Actions */}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

              <button
                type="button"
                disabled={creating}
                onClick={() => {
                  setModalOpen(false);
                  setSelectedType(null);
                }}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-white/55 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Cancel
              </button>


              <button
                type="button"
                disabled={
                  !selectedType ||
                  creating
                }
                onClick={createAccount}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-300 px-5 py-3 text-sm font-bold text-[#031421] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
              >

                {creating && (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                )}

                {creating
                  ? "Opening account..."
                  : "Open account"}

              </button>

            </div>

          </div>

        </div>
      )}
    </>
  );
}