"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowDownToLine,
  CheckCircle2,
  ChevronDown,
  Info,
  Loader2,
  WalletCards,
} from "lucide-react";

import api from "@/lib/api";

type Account = {
  id: string;
  account_number: string;
  account_type: string;
  balance: string | number;
  currency: string;
  status: string;
};

type DepositResponse = {
  success: boolean;
  message: string;
  data?: {
    account: Account;
    transaction: {
      id: string;
      amount: string | number;
      transaction_type: string;
      description: string | null;
      status: string;
      created_at: string;
    };
  };
};

export default function DepositPage() {
  const [accounts, setAccounts] =
    useState<Account[]>([]);

  const [selectedAccountId, setSelectedAccountId] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [transactionId, setTransactionId] =
    useState("");

  const formatMoney = (
    value: string | number,
    currency = "NGN"
  ) => {
    const numericValue = Number(value);

    return new Intl.NumberFormat(
      "en-NG",
      {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
      }
    ).format(
      Number.isFinite(numericValue)
        ? numericValue
        : 0
    );
  };

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        "/deposits/accounts"
      );

      const fetchedAccounts =
        response.data?.data?.accounts || [];

      setAccounts(fetchedAccounts);

      if (
        fetchedAccounts.length > 0 &&
        !selectedAccountId
      ) {
        setSelectedAccountId(
          fetchedAccounts[0].id
        );
      }
    } catch (error: any) {
      console.error(
        "Fetch accounts error:",
        error
      );

      if (
        error.response?.status === 401
      ) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }

      setError(
        error.response?.data?.message ||
          "Unable to load your accounts."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const selectedAccount = useMemo(
    () =>
      accounts.find(
        (account) =>
          account.id ===
          selectedAccountId
      ),
    [accounts, selectedAccountId]
  );

  const handleDeposit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setTransactionId("");

    if (!selectedAccountId) {
      setError(
        "Please select an account."
      );
      return;
    }

    const depositAmount =
      Number(amount);

    if (
      !Number.isFinite(depositAmount) ||
      depositAmount <= 0
    ) {
      setError(
        "Enter a valid deposit amount."
      );
      return;
    }

    if (
      !Number.isInteger(
        depositAmount * 100
      )
    ) {
      setError(
        "Amount can have a maximum of two decimal places."
      );
      return;
    }

    try {
      setSubmitting(true);

      const response =
        await api.post<DepositResponse>(
          "/deposits",
          {
            accountId:
              selectedAccountId,
            amount:
              depositAmount,
            description:
              description.trim(),
          }
        );

      if (!response.data.success) {
        setError(
          response.data.message ||
            "Deposit failed."
        );
        return;
      }

      const updatedAccount =
        response.data.data?.account;

      const transaction =
        response.data.data?.transaction;

      if (updatedAccount) {
        setAccounts(
          (current) =>
            current.map((account) =>
              account.id ===
              updatedAccount.id
                ? {
                    ...account,
                    balance:
                      updatedAccount.balance,
                  }
                : account
            )
        );
      }

      setSuccess(
        response.data.message ||
          "Deposit successful."
      );

      if (transaction?.id) {
        setTransactionId(
          transaction.id
        );
      }

      setAmount("");
      setDescription("");
    } catch (error: any) {
      console.error(
        "Deposit error:",
        error
      );

      if (
        error.response?.status === 401
      ) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }

      setError(
        error.response?.data?.message ||
          "Unable to process your deposit."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded-lg bg-white/5" />
          <div className="h-96 rounded-[28px] bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-7 sm:px-6 lg:px-8 lg:py-9">

      {/* Header */}

      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-300">
          Banking
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          Deposit funds
        </h1>

        <p className="mt-2 max-w-xl text-sm leading-6 text-white/40">
          Add money to one of your active
          NovaBank accounts.
        </p>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">

          <WalletCards
            size={38}
            className="mx-auto text-white/20"
          />

          <h2 className="mt-5 text-xl font-bold">
            No active accounts
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-white/35">
            You don't currently have an
            active account available for
            deposits.
          </p>

        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">

          {/* FORM */}

          <form
            onSubmit={handleDeposit}
            className="rounded-[28px] border border-white/10 bg-white/[0.025] p-6 sm:p-8"
          >

            <div className="mb-8">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/10">
                <ArrowDownToLine
                  size={20}
                  className="text-emerald-300"
                />
              </div>

              <h2 className="mt-5 text-xl font-bold">
                Deposit details
              </h2>

              <p className="mt-1 text-sm text-white/35">
                Enter the amount you want
                to deposit.
              </p>

            </div>

            {/* Account */}

            <div className="mb-6">

              <label
                htmlFor="account"
                className="mb-2 block text-sm font-semibold"
              >
                Account
              </label>

              <div className="relative">

                <select
                  id="account"
                  value={
                    selectedAccountId
                  }
                  onChange={(event) =>
                    setSelectedAccountId(
                      event.target.value
                    )
                  }
                  className="w-full appearance-none rounded-2xl border border-white/10 bg-[#071d2b] px-4 py-4 pr-11 text-sm outline-none transition focus:border-emerald-400/50"
                >
                  {accounts.map(
                    (account) => (
                      <option
                        key={account.id}
                        value={account.id}
                        className="bg-[#071d2b]"
                      >
                        {account.account_type}{" "}
                        ••••{" "}
                        {account.account_number.slice(
                          -4
                        )}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={18}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/30"
                />

              </div>

            </div>

            {/* Selected account */}

            {selectedAccount && (
              <div className="mb-6 flex items-center justify-between rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.04] p-4">

                <div>

                  <p className="text-xs text-white/30">
                    Current balance
                  </p>

                  <p className="mt-1 font-semibold">
                    {formatMoney(
                      selectedAccount.balance,
                      selectedAccount.currency
                    )}
                  </p>

                </div>

                <div className="text-right">

                  <p className="text-xs text-white/30">
                    Account
                  </p>

                  <p className="mt-1 font-mono text-xs text-white/55">
                    ••••{" "}
                    {selectedAccount.account_number.slice(
                      -4
                    )}
                  </p>

                </div>

              </div>
            )}

            {/* Amount */}

            <div className="mb-6">

              <label
                htmlFor="amount"
                className="mb-2 block text-sm font-semibold"
              >
                Amount
              </label>

              <div className="relative">

                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-semibold text-white/35">
                  ₦
                </span>

                <input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) =>
                    setAmount(
                      event.target.value
                    )
                  }
                  placeholder="0.00"
                  className="w-full rounded-2xl border border-white/10 bg-[#071d2b] py-4 pl-11 pr-5 text-xl font-semibold outline-none placeholder:text-white/15 focus:border-emerald-400/50"
                />

              </div>

            </div>

            {/* Description */}

            <div className="mb-6">

              <label
                htmlFor="description"
                className="mb-2 block text-sm font-semibold"
              >
                Description{" "}
                <span className="font-normal text-white/25">
                  Optional
                </span>
              </label>

              <textarea
                id="description"
                rows={4}
                maxLength={500}
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                placeholder="e.g. Salary, savings, cash deposit..."
                className="w-full resize-none rounded-2xl border border-white/10 bg-[#071d2b] px-4 py-4 text-sm outline-none placeholder:text-white/15 focus:border-emerald-400/50"
              />

              <p className="mt-1 text-right text-[10px] text-white/20">
                {description.length}/500
              </p>

            </div>

            {/* Error */}

            {error && (
              <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Success */}

            {success && (
              <div className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">

                <div className="flex gap-3">

                  <CheckCircle2
                    size={19}
                    className="mt-0.5 shrink-0 text-emerald-300"
                  />

                  <div>

                    <p className="text-sm font-semibold text-emerald-300">
                      {success}
                    </p>

                    {transactionId && (
                      <p className="mt-1 break-all text-[11px] text-white/30">
                        Transaction:{" "}
                        {transactionId}
                      </p>
                    )}

                  </div>

                </div>

              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-5 py-4 text-sm font-bold text-[#031421] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowDownToLine
                    size={18}
                  />
                  Deposit funds
                </>
              )}
            </button>

          </form>

          {/* SUMMARY */}

          <aside className="space-y-5">

            <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-[#073c3b] to-[#061b28] p-6">

              <p className="text-sm text-white/40">
                Deposit summary
              </p>

              <p className="mt-6 text-xs text-white/30">
                Amount
              </p>

              <p className="mt-1 text-3xl font-bold">
                {amount
                  ? formatMoney(
                      amount,
                      selectedAccount?.currency ||
                        "NGN"
                    )
                  : "₦0.00"}
              </p>

              <div className="mt-7 border-t border-white/10 pt-5">

                <div className="flex justify-between gap-4 text-sm">

                  <span className="text-white/35">
                    Account
                  </span>

                  <span className="text-right">
                    {selectedAccount
                      ? selectedAccount.account_type
                      : "—"}
                  </span>

                </div>

                <div className="mt-4 flex justify-between gap-4 text-sm">

                  <span className="text-white/35">
                    Currency
                  </span>

                  <span>
                    {selectedAccount?.currency ||
                      "NGN"}
                  </span>

                </div>

              </div>

            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.02] p-5">

              <div className="flex gap-3">

                <Info
                  size={18}
                  className="mt-0.5 shrink-0 text-white/30"
                />

                <div>

                  <p className="text-sm font-semibold">
                    Secure deposit
                  </p>

                  <p className="mt-1 text-xs leading-5 text-white/30">
                    Successful deposits update
                    your account balance and
                    create a transaction record
                    automatically.
                  </p>

                </div>

              </div>

            </div>

          </aside>

        </div>
      )}

    </div>
  );
}