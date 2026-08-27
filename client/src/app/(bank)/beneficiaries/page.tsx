"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

import api from "@/lib/api";

/*
 * ================================================================
 * TYPES
 * ================================================================
 */

type BeneficiaryAccount = {
  id: string;
  account_number: string;
  account_type: string;
  currency: string;
  status: string;
  owner: {
    id: string;
    full_name: string;
  };
};

type Beneficiary = {
  id: string;
  nickname: string;
  created_at: string;
  account: BeneficiaryAccount;
};

type BeneficiaryResponse = {
  success: boolean;
  message: string;
  data: {
    beneficiaries: Beneficiary[];
  };
};


/*
 * ================================================================
 * PAGE
 * ================================================================
 */

export default function BeneficiariesPage() {
  const [beneficiaries, setBeneficiaries] =
    useState<Beneficiary[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [showAddModal, setShowAddModal] =
    useState(false);

  const [showEditModal, setShowEditModal] =
    useState(false);

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  const [selectedBeneficiary, setSelectedBeneficiary] =
    useState<Beneficiary | null>(null);

  const [accountNumber, setAccountNumber] =
    useState("");

  const [nickname, setNickname] =
    useState("");

  /*
   * ==============================================================
   * LOAD
   * ==============================================================
   */

  const loadBeneficiaries =
    async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await api.get<BeneficiaryResponse>(
            "/beneficiaries"
          );

        if (
          !response.data.success
        ) {
          throw new Error(
            response.data.message
          );
        }

        setBeneficiaries(
          response.data.data
            ?.beneficiaries ?? []
        );
      } catch (error: any) {
        console.error(
          "Beneficiaries error:",
          error
        );

        if (
          error.response?.status ===
          401
        ) {
          localStorage.removeItem(
            "token"
          );

          window.location.href =
            "/login";

          return;
        }

        setError(
          error.response?.data?.message ||
            "Unable to load beneficiaries."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadBeneficiaries();
  }, []);

  /*
   * ==============================================================
   * FILTER
   * ==============================================================
   */

  const filteredBeneficiaries =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return beneficiaries;
      }

      return beneficiaries.filter(
        (beneficiary) =>
          beneficiary.nickname
            .toLowerCase()
            .includes(query) ||
          beneficiary.account.owner.full_name
            .toLowerCase()
            .includes(query) ||
          beneficiary.account.account_number
            .toLowerCase()
            .includes(query) ||
          beneficiary.account.currency
            .toLowerCase()
            .includes(query) ||
          beneficiary.account.account_type
            .toLowerCase()
            .includes(query)
      );
    }, [
      beneficiaries,
      search,
    ]);

  /*
   * ==============================================================
   * HELPERS
   * ==============================================================
   */

  const formatAccountNumber =
    (accountNumber: string) => {
      if (
        accountNumber.length <= 4
      ) {
        return accountNumber;
      }

      return `•••• ${accountNumber.slice(
        -4
      )}`;
    };

  const formatDate =
    (date: string) => {
      return new Intl.DateTimeFormat(
        "en-NG",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      ).format(
        new Date(date)
      );
    };

  const resetForm = () => {
    setAccountNumber("");
    setNickname("");
    setSelectedBeneficiary(null);
  };

  /*
   * ==============================================================
   * ADD BENEFICIARY
   * ==============================================================
   */

  const addBeneficiary =
    async () => {
      const normalizedAccount =
        accountNumber.trim();

      const normalizedNickname =
        nickname.trim();

      if (!normalizedAccount) {
        setError(
          "Enter the beneficiary account number."
        );

        return;
      }

      if (
        normalizedNickname.length >
        100
      ) {
        setError(
          "Nickname cannot exceed 100 characters."
        );

        return;
      }

      try {
        setProcessing(true);
        setError("");
        setSuccessMessage("");

        const response =
          await api.post(
            "/beneficiaries",
            {
              accountNumber:
                normalizedAccount,

              nickname:
                normalizedNickname ||
                undefined,
            }
          );

        if (
          !response.data.success
        ) {
          throw new Error(
            response.data.message
          );
        }

        setSuccessMessage(
          response.data.message ||
            "Beneficiary added successfully."
        );

        setShowAddModal(false);

        resetForm();

        await loadBeneficiaries();
      } catch (error: any) {
        console.error(
          "Add beneficiary error:",
          error
        );

        if (
          error.response?.status ===
          401
        ) {
          localStorage.removeItem(
            "token"
          );

          window.location.href =
            "/login";

          return;
        }

        setError(
          error.response?.data?.message ||
            "Unable to add beneficiary."
        );
      } finally {
        setProcessing(false);
      }
    };

  /*
   * ==============================================================
   * EDIT BENEFICIARY
   * ==============================================================
   */

  const openEdit =
    (beneficiary: Beneficiary) => {
      setSelectedBeneficiary(
        beneficiary
      );

      setNickname(
        beneficiary.nickname
      );

      setError("");

      setShowEditModal(true);
    };

  const updateBeneficiary =
    async () => {
      if (
        !selectedBeneficiary
      ) {
        return;
      }

      const normalizedNickname =
        nickname.trim();

      if (
        normalizedNickname.length >
        100
      ) {
        setError(
          "Nickname cannot exceed 100 characters."
        );

        return;
      }

      try {
        setProcessing(true);
        setError("");
        setSuccessMessage("");

        const response =
          await api.patch(
            `/beneficiaries/${selectedBeneficiary.id}`,
            {
              nickname:
                normalizedNickname,
            }
          );

        if (
          !response.data.success
        ) {
          throw new Error(
            response.data.message
          );
        }

        setSuccessMessage(
          response.data.message ||
            "Beneficiary updated successfully."
        );

        setShowEditModal(false);

        resetForm();

        await loadBeneficiaries();
      } catch (error: any) {
        console.error(
          "Update beneficiary error:",
          error
        );

        if (
          error.response?.status ===
          401
        ) {
          localStorage.removeItem(
            "token"
          );

          window.location.href =
            "/login";

          return;
        }

        setError(
          error.response?.data?.message ||
            "Unable to update beneficiary."
        );
      } finally {
        setProcessing(false);
      }
    };

  /*
   * ==============================================================
   * DELETE BENEFICIARY
   * ==============================================================
   */

  const openDelete =
    (beneficiary: Beneficiary) => {
      setSelectedBeneficiary(
        beneficiary
      );

      setError("");

      setShowDeleteModal(true);
    };

  const deleteBeneficiary =
    async () => {
      if (
        !selectedBeneficiary
      ) {
        return;
      }

      try {
        setProcessing(true);
        setError("");
        setSuccessMessage("");

        const response =
          await api.delete(
            `/beneficiaries/${selectedBeneficiary.id}`
          );

        if (
          !response.data.success
        ) {
          throw new Error(
            response.data.message
          );
        }

        setSuccessMessage(
          response.data.message ||
            "Beneficiary removed successfully."
        );

        setShowDeleteModal(false);

        resetForm();

        await loadBeneficiaries();
      } catch (error: any) {
        console.error(
          "Delete beneficiary error:",
          error
        );

        if (
          error.response?.status ===
          401
        ) {
          localStorage.removeItem(
            "token"
          );

          window.location.href =
            "/login";

          return;
        }

        setError(
          error.response?.data?.message ||
            "Unable to remove beneficiary."
        );
      } finally {
        setProcessing(false);
      }
    };

  /*
   * ==============================================================
   * RENDER
   * ==============================================================
   */

  return (
    <main className="min-h-screen bg-[#030b12] px-4 py-6 text-white sm:px-6 lg:px-8">

      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/70">
              Payments
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Beneficiaries
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-white/35">
              Manage the NovaBank recipients
              you use frequently for transfers.
            </p>

          </div>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setError("");
              setShowAddModal(true);
            }}
            className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-5 py-3.5 text-sm font-bold text-[#031421] transition hover:bg-emerald-200"
          >
            <Plus size={18} />
            Add beneficiary
          </button>

        </div>


        {/* GLOBAL ERROR */}

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-400/15 bg-red-400/[0.06] p-4">

            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0 text-red-300"
            />

            <p className="text-sm leading-6 text-red-200/80">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="ml-auto text-white/30 hover:text-white"
            >
              <X size={16} />
            </button>

          </div>
        )}


        {/* SUCCESS */}

        {successMessage && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.05] p-4">

            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0 text-emerald-300"
            />

            <p className="text-sm leading-6 text-emerald-100/80">
              {successMessage}
            </p>

            <button
              type="button"
              onClick={() =>
                setSuccessMessage("")
              }
              className="ml-auto text-white/30 hover:text-white"
            >
              <X size={16} />
            </button>

          </div>
        )}


        {/* CONTENT */}

        <section className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.025] p-4 sm:p-6">

          {/* SEARCH */}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="relative w-full sm:max-w-md">

              <Search
                size={17}
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
                placeholder="Search beneficiaries..."
                className="w-full rounded-2xl border border-white/10 bg-white/[0.025] py-3.5 pl-11 pr-4 text-sm outline-none placeholder:text-white/20 focus:border-emerald-300/30"
              />

            </div>

            <div className="text-xs text-white/25">
              {beneficiaries.length}{" "}
              saved{" "}
              {beneficiaries.length ===
              1
                ? "beneficiary"
                : "beneficiaries"}
            </div>

          </div>


          {/* LOADING */}

          {loading && (
            <div className="flex min-h-[360px] items-center justify-center">

              <div className="flex items-center gap-3 text-sm text-white/35">

                <Loader2
                  size={19}
                  className="animate-spin text-emerald-300"
                />

                Loading beneficiaries...

              </div>

            </div>
          )}


          {/* EMPTY */}

          {!loading &&
            beneficiaries.length ===
              0 && (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center">

                <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.035]">

                  <UserRound
                    size={26}
                    className="text-white/30"
                  />

                </div>

                <h2 className="mt-5 text-lg font-bold">
                  No beneficiaries yet
                </h2>

                <p className="mt-2 max-w-md text-sm leading-6 text-white/30">
                  Save a NovaBank recipient
                  once and use their account
                  details without entering them
                  again during future transfers.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setError("");
                    setShowAddModal(true);
                  }}
                  className="mt-6 flex items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-300/10"
                >
                  <Plus size={17} />
                  Add your first beneficiary
                </button>

              </div>
            )}


          {/* SEARCH EMPTY */}

          {!loading &&
            beneficiaries.length >
              0 &&
            filteredBeneficiaries.length ===
              0 && (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center">

                <Search
                  size={25}
                  className="text-white/20"
                />

                <h2 className="mt-4 font-semibold">
                  No matching beneficiaries
                </h2>

                <p className="mt-2 text-sm text-white/30">
                  Try a different name,
                  nickname or account number.
                </p>

              </div>
            )}


          {/* LIST */}

          {!loading &&
            filteredBeneficiaries.length >
              0 && (
              <div className="mt-5 space-y-3">

                {filteredBeneficiaries.map(
                  (beneficiary) => (
                    <article
                      key={
                        beneficiary.id
                      }
                      className="group rounded-2xl border border-white/10 bg-white/[0.018] p-4 transition hover:border-white/15 hover:bg-white/[0.03] sm:p-5"
                    >

                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                        <div className="flex min-w-0 items-center gap-4">

                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.05]">

                            <UserRound
                              size={20}
                              className="text-emerald-300"
                            />

                          </div>

                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">

                              <h3 className="truncate font-semibold">
                                {
                                  beneficiary.nickname ||
                                  beneficiary.account
                                    .owner
                                    .full_name
                                }
                              </h3>

                              {beneficiary.nickname && (
                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/30">
                                  Saved
                                </span>
                              )}

                            </div>

                            <p className="mt-1 text-sm text-white/40">
                              {
                                beneficiary
                                  .account
                                  .owner
                                  .full_name
                              }
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/25">

                              <span className="font-mono">
                                {formatAccountNumber(
                                  beneficiary
                                    .account
                                    .account_number
                                )}
                              </span>

                              <span>
                                •
                              </span>

                              <span>
                                {
                                  beneficiary
                                    .account
                                    .account_type
                                }
                              </span>

                              <span>
                                •
                              </span>

                              <span>
                                {
                                  beneficiary
                                    .account
                                    .currency
                                }
                              </span>

                            </div>

                          </div>

                        </div>


                        <div className="flex items-center justify-between gap-4 lg:justify-end">

                          <div className="hidden text-right sm:block">

                            <div className="flex items-center justify-end gap-1.5 text-xs text-emerald-300/60">

                              <ShieldCheck
                                size={13}
                              />

                              Active account

                            </div>

                            <p className="mt-1 text-[11px] text-white/20">
                              Added{" "}
                              {formatDate(
                                beneficiary.created_at
                              )}
                            </p>

                          </div>


                          <div className="flex items-center gap-2">

                            <button
                              type="button"
                              onClick={() =>
                                openEdit(
                                  beneficiary
                                )
                              }
                              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.025] text-white/35 transition hover:border-white/15 hover:bg-white/5 hover:text-white"
                              aria-label={`Edit ${
                                beneficiary.account.owner.full_name
                              }`}
                            >
                              <Pencil
                                size={16}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openDelete(
                                  beneficiary
                                )
                              }
                              className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-400/10 bg-red-400/[0.03] text-red-300/50 transition hover:border-red-400/20 hover:bg-red-400/[0.07] hover:text-red-300"
                              aria-label={`Delete ${
                                beneficiary.account.owner.full_name
                              }`}
                            >
                              <Trash2
                                size={16}
                              />
                            </button>

                          </div>

                        </div>

                      </div>

                    </article>
                  )
                )}

              </div>
            )}

        </section>


        {/* INFORMATION */}

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.018] p-4">

          <ShieldCheck
            size={17}
            className="mt-0.5 shrink-0 text-emerald-300/60"
          />

          <p className="text-xs leading-5 text-white/25">
            Beneficiaries are linked to verified
            NovaBank accounts. Your saved
            recipients are private to your
            account and cannot be managed by
            another customer.
          </p>

        </div>

      </div>


      {/* ==========================================================
          ADD MODAL
      ========================================================== */}

      {showAddModal && (
        <Modal
          title="Add beneficiary"
          description="Save another NovaBank customer for faster future transfers."
          onClose={() => {
            if (!processing) {
              setShowAddModal(false);
              resetForm();
            }
          }}
        >

          <div className="space-y-5">

            <div>

              <label
                htmlFor="beneficiary-account"
                className="text-xs font-medium uppercase tracking-wider text-white/30"
              >
                Account number
              </label>

              <input
                id="beneficiary-account"
                value={accountNumber}
                onChange={(event) => {
                  setAccountNumber(
                    event.target.value
                  );

                  setError("");
                }}
                placeholder="Enter NovaBank account number"
                autoComplete="off"
                className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 font-mono text-sm outline-none placeholder:text-white/20 focus:border-emerald-300/30"
              />

              <p className="mt-2 text-xs leading-5 text-white/20">
                The account must belong to
                another active NovaBank customer.
              </p>

            </div>


            <div>

              <label
                htmlFor="beneficiary-nickname"
                className="text-xs font-medium uppercase tracking-wider text-white/30"
              >
                Nickname
                <span className="ml-1 normal-case text-white/20">
                  optional
                </span>
              </label>

              <input
                id="beneficiary-nickname"
                value={nickname}
                onChange={(event) => {
                  setNickname(
                    event.target.value
                  );

                  setError("");
                }}
                maxLength={100}
                placeholder="e.g. John, Mom, Business"
                className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm outline-none placeholder:text-white/20 focus:border-emerald-300/30"
              />

            </div>


            <div className="flex items-start gap-3 rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.035] p-4">

              <WalletCards
                size={17}
                className="mt-0.5 shrink-0 text-emerald-300"
              />

              <p className="text-xs leading-5 text-white/30">
                We will verify the account
                exists and is active before
                saving it.
              </p>

            </div>


            <button
              type="button"
              disabled={
                processing ||
                !accountNumber.trim()
              }
              onClick={
                addBeneficiary
              }
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-300 py-4 text-sm font-bold text-[#031421] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
            >

              {processing ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />

                  Saving...
                </>
              ) : (
                <>
                  <Plus size={18} />

                  Save beneficiary
                </>
              )}

            </button>

          </div>

        </Modal>
      )}


      {/* ==========================================================
          EDIT MODAL
      ========================================================== */}

      {showEditModal &&
        selectedBeneficiary && (
          <Modal
            title="Edit beneficiary"
            description="Update the nickname used to identify this recipient."
            onClose={() => {
              if (!processing) {
                setShowEditModal(
                  false
                );

                resetForm();
              }
            }}
          >

            <div className="space-y-5">

              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">

                <p className="text-xs text-white/25">
                  Account
                </p>

                <p className="mt-2 font-semibold">
                  {
                    selectedBeneficiary
                      .account
                      .owner
                      .full_name
                  }
                </p>

                <p className="mt-1 font-mono text-xs text-white/30">
                  {
                    selectedBeneficiary
                      .account
                      .account_number
                  }
                </p>

              </div>


              <div>

                <label
                  htmlFor="edit-beneficiary-nickname"
                  className="text-xs font-medium uppercase tracking-wider text-white/30"
                >
                  Nickname
                </label>

                <input
                  id="edit-beneficiary-nickname"
                  value={nickname}
                  onChange={(event) => {
                    setNickname(
                      event.target.value
                    );

                    setError("");
                  }}
                  maxLength={100}
                  placeholder="e.g. John"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm outline-none placeholder:text-white/20 focus:border-emerald-300/30"
                />

              </div>


              <button
                type="button"
                disabled={processing}
                onClick={
                  updateBeneficiary
                }
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-300 py-4 text-sm font-bold text-[#031421] transition hover:bg-emerald-200 disabled:opacity-40"
              >

                {processing ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />

                    Saving changes...
                  </>
                ) : (
                  <>
                    <CheckCircle2
                      size={18}
                    />

                    Save changes
                  </>
                )}

              </button>

            </div>

          </Modal>
        )}


      {/* ==========================================================
          DELETE MODAL
      ========================================================== */}

      {showDeleteModal &&
        selectedBeneficiary && (
          <Modal
            title="Remove beneficiary"
            description="This will remove the saved recipient from your beneficiary list."
            onClose={() => {
              if (!processing) {
                setShowDeleteModal(
                  false
                );

                setSelectedBeneficiary(
                  null
                );
              }
            }}
          >

            <div className="rounded-2xl border border-red-400/10 bg-red-400/[0.04] p-5">

              <p className="font-semibold">
                {
                  selectedBeneficiary
                    .nickname ||
                  selectedBeneficiary
                    .account
                    .owner
                    .full_name
                }
              </p>

              <p className="mt-1 font-mono text-xs text-white/30">
                {
                  selectedBeneficiary
                    .account
                    .account_number
                }
              </p>

              <p className="mt-4 text-sm leading-6 text-white/35">
                You can add this account
                again later if needed.
              </p>

            </div>


            <div className="mt-5 flex gap-3">

              <button
                type="button"
                disabled={processing}
                onClick={() => {
                  setShowDeleteModal(
                    false
                  );

                  setSelectedBeneficiary(
                    null
                  );
                }}
                className="flex-1 rounded-2xl border border-white/10 py-4 text-sm font-semibold text-white/55 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={processing}
                onClick={
                  deleteBeneficiary
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-400/90 py-4 text-sm font-bold text-white transition hover:bg-red-400 disabled:opacity-40"
              >

                {processing ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />

                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 size={17} />

                    Remove
                  </>
                )}

              </button>

            </div>

          </Modal>
        )}

    </main>
  );
}


/*
 * ================================================================
 * MODAL
 * ================================================================
 */

function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">

      <div className="absolute inset-0" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[28px] border border-white/10 bg-[#071421] p-6 shadow-2xl"
      >

        <div className="flex items-start justify-between gap-4">

          <div>

            <h2 className="text-xl font-bold">
              {title}
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/30">
              {description}
            </p>

          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/35 transition hover:bg-white/5 hover:text-white"
          >
            <X size={17} />
          </button>

        </div>

        <div className="mt-6">
          {children}
        </div>

      </div>

    </div>
  );
}
