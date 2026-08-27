"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  X,
} from "lucide-react";

import api from "@/lib/api";

/*
 * ================================================================
 * TYPES
 * ================================================================
 */

type ProfileUser = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  created_at: string;
};

type ProfileResponse = {
  success: boolean;
  data?: {
    user: ProfileUser;
  };
  message?: string;
};

type PinStatusResponse = {
  success: boolean;
  data?: {
    configured: boolean;
  };
  message?: string;
};


/*
 * ================================================================
 * SETTINGS PAGE
 * ================================================================
 */

export default function SettingsPage() {
  /*
   * --------------------------------------------------------------
   * PROFILE STATE
   * --------------------------------------------------------------
   */

  const [profile, setProfile] =
    useState<ProfileUser | null>(null);

  const [profileLoading, setProfileLoading] =
    useState(true);

  const [editingProfile, setEditingProfile] =
    useState(false);

  const [profileSaving, setProfileSaving] =
    useState(false);

  const [profileError, setProfileError] =
    useState("");

  const [profileForm, setProfileForm] =
    useState({
      fullName: "",
      phone: "",
      address: "",
    });


  /*
   * --------------------------------------------------------------
   * TRANSACTION PIN STATE
   * --------------------------------------------------------------
   */

  const [pinConfigured, setPinConfigured] =
    useState<boolean | null>(null);

  const [loadingStatus, setLoadingStatus] =
    useState(true);

  const [mode, setMode] = useState<
    "setup" | "change" | null
  >(null);

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [currentPin, setCurrentPin] =
    useState("");

  const [newPin, setNewPin] =
    useState("");

  const [confirmPin, setConfirmPin] =
    useState("");

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showCurrentPin, setShowCurrentPin] =
    useState(false);

  const [showNewPin, setShowNewPin] =
    useState(false);

  const [showConfirmPin, setShowConfirmPin] =
    useState(false);

  const [processing, setProcessing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");


  /*
   * ==============================================================
   * LOAD PROFILE
   * ==============================================================
   */

  const loadProfile =
    async () => {
      try {
        setProfileLoading(true);
        setProfileError("");

        const response =
          await api.get<ProfileResponse>(
            "/auth/me"
          );

        if (
          !response.data.success
        ) {
          throw new Error(
            response.data.message ||
              "Unable to retrieve profile."
          );
        }

        const user =
          response.data.data?.user;

        if (!user) {
          throw new Error(
            "Profile data was not returned."
          );
        }

        setProfile(user);

        setProfileForm({
          fullName:
            user.full_name || "",
          phone:
            user.phone || "",
          address:
            user.address || "",
        });
      } catch (error: any) {
        console.error(
          "Profile loading error:",
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

        setProfileError(
          error.response?.data?.message ||
            "Unable to load profile."
        );
      } finally {
        setProfileLoading(false);
      }
    };


  /*
   * ==============================================================
   * LOAD PIN STATUS
   * ==============================================================
   */

  const loadPinStatus =
    async () => {
      try {
        setLoadingStatus(true);
        setError("");

        const response =
          await api.get<PinStatusResponse>(
            "/transaction-pin/status"
          );

        if (
          !response.data.success
        ) {
          throw new Error(
            response.data.message ||
              "Unable to retrieve PIN status."
          );
        }

        setPinConfigured(
          Boolean(
            response.data.data
              ?.configured
          )
        );
      } catch (error: any) {
        console.error(
          "Transaction PIN status error:",
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
            "Unable to load transaction PIN status."
        );
      } finally {
        setLoadingStatus(false);
      }
    };


  useEffect(() => {
    loadProfile();
    loadPinStatus();
  }, []);


  /*
   * ==============================================================
   * PROFILE EDIT
   * ==============================================================
   */

  const openProfileEdit =
    () => {
      if (!profile) {
        return;
      }

      setProfileForm({
        fullName:
          profile.full_name || "",
        phone:
          profile.phone || "",
        address:
          profile.address || "",
      });

      setProfileError("");

      setEditingProfile(true);
    };


  const cancelProfileEdit =
    () => {
      if (profileSaving) {
        return;
      }

      if (profile) {
        setProfileForm({
          fullName:
            profile.full_name || "",
          phone:
            profile.phone || "",
          address:
            profile.address || "",
        });
      }

      setProfileError("");

      setEditingProfile(false);
    };


  /*
   * ==============================================================
   * SAVE PROFILE
   * ==============================================================
   */

  const saveProfile =
    async () => {
      const fullName =
        profileForm.fullName.trim();

      if (!fullName) {
        setProfileError(
          "Full name cannot be empty."
        );

        return;
      }

      try {
        setProfileSaving(true);
        setProfileError("");
        setError("");

        const response =
          await api.patch<ProfileResponse>(
            "/auth/profile",
            {
              fullName,
              phone:
                profileForm.phone.trim(),
              address:
                profileForm.address.trim(),
            }
          );

        if (
          !response.data.success
        ) {
          throw new Error(
            response.data.message ||
              "Unable to update profile."
          );
        }

        const updatedUser =
          response.data.data?.user;

        if (!updatedUser) {
          throw new Error(
            "Updated profile was not returned."
          );
        }

        setProfile(updatedUser);

        setProfileForm({
          fullName:
            updatedUser.full_name ||
            "",
          phone:
            updatedUser.phone || "",
          address:
            updatedUser.address ||
            "",
        });

        setEditingProfile(false);

        setSuccessMessage(
          response.data.message ||
            "Profile updated successfully."
        );
      } catch (error: any) {
        console.error(
          "Profile update error:",
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

        setProfileError(
          error.response?.data?.message ||
            "Unable to update profile."
        );
      } finally {
        setProfileSaving(false);
      }
    };


  /*
   * ==============================================================
   * RESET PIN FORM
   * ==============================================================
   */

  const resetForm = () => {
    setCurrentPassword("");
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");

    setShowCurrentPassword(false);
    setShowCurrentPin(false);
    setShowNewPin(false);
    setShowConfirmPin(false);

    setError("");
  };


  /*
   * ==============================================================
   * OPEN SETUP
   * ==============================================================
   */

  const openSetup =
    () => {
      resetForm();

      setSuccessMessage("");

      setMode("setup");
    };


  /*
   * ==============================================================
   * OPEN CHANGE
   * ==============================================================
   */

  const openChange =
    () => {
      resetForm();

      setSuccessMessage("");

      setMode("change");
    };


  /*
   * ==============================================================
   * CLOSE PIN FORM
   * ==============================================================
   */

  const closeForm =
    () => {
      if (processing) {
        return;
      }

      setMode(null);

      resetForm();
    };


  /*
   * ==============================================================
   * VALIDATE PIN FORM
   * ==============================================================
   */

  const validateForm =
    () => {
      if (
        !currentPassword
      ) {
        return "Enter your current password.";
      }

      if (
        !/^\d{6}$/.test(
          newPin
        )
      ) {
        return "Your transaction PIN must contain exactly 6 digits.";
      }

      if (
        newPin !== confirmPin
      ) {
        return "The transaction PINs do not match.";
      }

      if (
        mode === "change" &&
        !/^\d{6}$/.test(
          currentPin
        )
      ) {
        return "Enter your current 6-digit transaction PIN.";
      }

      if (
        mode === "change" &&
        currentPin === newPin
      ) {
        return "Your new PIN must be different from your current PIN.";
      }

      return "";
    };


  /*
   * ==============================================================
   * SETUP / CHANGE PIN
   * ==============================================================
   */

  const submitPin =
    async () => {
      const validationError =
        validateForm();

      if (validationError) {
        setError(
          validationError
        );

        return;
      }

      try {
        setProcessing(true);
        setError("");
        setSuccessMessage("");

        if (
          mode === "setup"
        ) {
          const response =
            await api.post(
              "/transaction-pin/setup",
              {
                currentPassword,
                pin: newPin,
                confirmPin,
              }
            );

          if (
            !response.data.success
          ) {
            throw new Error(
              response.data.message
            );
          }

          setPinConfigured(
            true
          );

          setSuccessMessage(
            response.data.message ||
              "Transaction PIN configured successfully."
          );
        }

        if (
          mode === "change"
        ) {
          const response =
            await api.patch(
              "/transaction-pin/change",
              {
                currentPassword,
                currentPin,
                newPin,
                confirmPin,
              }
            );

          if (
            !response.data.success
          ) {
            throw new Error(
              response.data.message
            );
          }

          setPinConfigured(
            true
          );

          setSuccessMessage(
            response.data.message ||
              "Transaction PIN changed successfully."
          );
        }

        setMode(null);

        resetForm();
      } catch (error: any) {
        console.error(
          "Transaction PIN operation error:",
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
            "Unable to update your transaction PIN."
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

      <div className="mx-auto max-w-5xl">

        {/* HEADER */}

        <div>

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/70">
            Account
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Settings
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-white/40">
            Manage your NovaBank preferences,
            account security and transaction
            authorization.
          </p>

        </div>


        {/* GLOBAL ERROR */}

        {error &&
          !mode && (
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


        {/* SETTINGS SECTIONS */}

        <div className="mt-8 space-y-5">

          {/* PROFILE */}

          <section className="rounded-[28px] border border-white/10 bg-white/[0.025] p-5 sm:p-6">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

              <div className="flex items-start gap-4">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.05]">

                  <ShieldCheck
                    size={22}
                    className="text-emerald-300"
                  />

                </div>

                <div>

                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/25">
                    Profile
                  </p>

                  <h2 className="mt-1 text-xl font-bold">
                    Personal information
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/35">
                    Manage the personal information
                    associated with your NovaBank
                    account.
                  </p>

                </div>

              </div>

              {!profileLoading &&
                profile &&
                !editingProfile && (
                  <button
                    type="button"
                    onClick={
                      openProfileEdit
                    }
                    className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] px-4 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-300/10"
                  >
                    Edit profile
                  </button>
                )}

            </div>


            {/* PROFILE ERROR */}

            {profileError && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-400/15 bg-red-400/[0.06] p-4">

                <AlertCircle
                  size={17}
                  className="mt-0.5 shrink-0 text-red-300"
                />

                <p className="text-sm leading-5 text-red-200/80">
                  {profileError}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setProfileError("")
                  }
                  className="ml-auto text-white/30 hover:text-white"
                >
                  <X size={16} />
                </button>

              </div>
            )}


            {/* PROFILE LOADING */}

            {profileLoading ? (
              <div className="mt-6 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/10 p-5 text-sm text-white/30">

                <Loader2
                  size={17}
                  className="animate-spin"
                />

                Loading profile...

              </div>
            ) : !profile ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-5 text-sm text-white/30">
                Profile information is unavailable.
              </div>
            ) : editingProfile ? (

              <div className="mt-6 space-y-5">

                <ProfileInput
                  label="Full name"
                  value={
                    profileForm.fullName
                  }
                  onChange={(value) =>
                    setProfileForm(
                      (current) => ({
                        ...current,
                        fullName:
                          value,
                      })
                    )
                  }
                  disabled={
                    profileSaving
                  }
                />

                <div>

                  <label className="text-xs font-medium uppercase tracking-wider text-white/30">
                    Email
                  </label>

                  <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/35">
                    {profile.email}
                  </div>

                  <p className="mt-2 text-[11px] leading-4 text-white/20">
                    Your login email cannot be changed
                    from this screen.
                  </p>

                </div>

                <ProfileInput
                  label="Phone"
                  value={
                    profileForm.phone
                  }
                  onChange={(value) =>
                    setProfileForm(
                      (current) => ({
                        ...current,
                        phone:
                          value,
                      })
                    )
                  }
                  disabled={
                    profileSaving
                  }
                  placeholder="Phone number"
                />

                <div>

                  <label className="text-xs font-medium uppercase tracking-wider text-white/30">
                    Address
                  </label>

                  <textarea
                    value={
                      profileForm.address
                    }
                    onChange={(event) =>
                      setProfileForm(
                        (current) => ({
                          ...current,
                          address:
                            event.target
                              .value,
                        })
                      )
                    }
                    disabled={
                      profileSaving
                    }
                    rows={3}
                    placeholder="Residential address"
                    className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm outline-none placeholder:text-white/20 focus:border-emerald-300/30 disabled:opacity-50"
                  />

                </div>


                <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:justify-end">

                  <button
                    type="button"
                    onClick={
                      cancelProfileEdit
                    }
                    disabled={
                      profileSaving
                    }
                    className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/45 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={
                      saveProfile
                    }
                    disabled={
                      profileSaving
                    }
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-300 px-5 py-3 text-sm font-bold text-[#031421] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >

                    {profileSaving ? (
                      <>
                        <Loader2
                          size={17}
                          className="animate-spin"
                        />

                        Saving...

                      </>
                    ) : (
                      <>
                        <CheckCircle2
                          size={17}
                        />

                        Save changes

                      </>
                    )}

                  </button>

                </div>

              </div>

            ) : (

              <div className="mt-6 grid gap-3 sm:grid-cols-2">

                <ProfileValue
                  label="Full name"
                  value={
                    profile.full_name
                  }
                />

                <ProfileValue
                  label="Email"
                  value={
                    profile.email
                  }
                />

                <ProfileValue
                  label="Phone"
                  value={
                    profile.phone ||
                    "Not provided"
                  }
                />

                <ProfileValue
                  label="Member since"
                  value={formatDate(
                    profile.created_at
                  )}
                />

                <div className="sm:col-span-2">

                  <ProfileValue
                    label="Address"
                    value={
                      profile.address ||
                      "Not provided"
                    }
                  />

                </div>

              </div>

            )}

          </section>


          {/* SECURITY */}

          <section className="rounded-[28px] border border-white/10 bg-white/[0.025] p-5 sm:p-6">

            <div className="flex items-start gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.05]">

                <ShieldCheck
                  size={22}
                  className="text-emerald-300"
                />

              </div>

              <div>

                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/25">
                  Security
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  Transaction security
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/35">
                  Your transaction PIN provides
                  an additional authorization layer
                  before money transfers are
                  executed.
                </p>

              </div>

            </div>


            {/* PIN CARD */}

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-4 sm:p-5">

              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-center gap-4">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035]">

                    <LockKeyhole
                      size={19}
                      className="text-white/45"
                    />

                  </div>

                  <div>

                    <h3 className="font-semibold">
                      Transaction PIN
                    </h3>

                    {loadingStatus ? (
                      <div className="mt-1 flex items-center gap-2 text-xs text-white/30">

                        <Loader2
                          size={13}
                          className="animate-spin"
                        />

                        Checking status...

                      </div>
                    ) : pinConfigured ? (
                      <div className="mt-1 flex items-center gap-2 text-xs text-emerald-300/70">

                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />

                        Active

                      </div>
                    ) : (
                      <div className="mt-1 flex items-center gap-2 text-xs text-amber-300/70">

                        <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />

                        Not configured

                      </div>
                    )}

                  </div>

                </div>


                {!loadingStatus &&
                  pinConfigured !==
                    null && (
                    <button
                      type="button"
                      onClick={
                        pinConfigured
                          ? openChange
                          : openSetup
                      }
                      className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] px-4 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-300/10"
                    >

                      <KeyRound
                        size={16}
                      />

                      {pinConfigured
                        ? "Change PIN"
                        : "Set up PIN"}

                    </button>
                  )}

              </div>


              <div className="mt-5 border-t border-white/10 pt-4">

                <div className="grid gap-3 sm:grid-cols-3">

                  <SecurityPoint
                    title="6 digits"
                    description="Numeric transaction PIN"
                  />

                  <SecurityPoint
                    title="Hashed"
                    description="Never stored as plaintext"
                  />

                  <SecurityPoint
                    title="Required for transfers"
                    description="Authorization before execution"
                  />

                </div>

              </div>

            </div>

          </section>
                    {/* ACCOUNT */}

          <section className="rounded-[28px] border border-white/10 bg-white/[0.025] p-5 sm:p-6">

            <div className="flex items-start gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">

                <KeyRound
                  size={21}
                  className="text-white/40"
                />

              </div>

              <div>

                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/25">
                  Account
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  Account preferences
                </h2>

                <p className="mt-2 text-sm text-white/30">
                  Additional account settings will
                  appear here as the banking platform
                  is expanded.
                </p>

              </div>

            </div>

          </section>


          {/* SECURITY NOTICE */}

          <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.018] p-4">

            <ShieldCheck
              size={17}
              className="mt-0.5 shrink-0 text-emerald-300/60"
            />

            <p className="text-xs leading-5 text-white/25">
              NovaBank never stores your transaction
              PIN in readable form. Your PIN is
              protected using a one-way password
              hashing function and is only checked
              during authorized security operations.
            </p>

          </div>

        </div>

      </div>


      {/* ==========================================================
          PIN MODAL
      ========================================================== */}

      {mode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">

          <button
            type="button"
            aria-label="Close PIN dialog"
            onClick={closeForm}
            className="absolute inset-0 cursor-default"
          />

          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[28px] border border-white/10 bg-[#071421] p-6 shadow-2xl"
          >

            <div className="flex items-start justify-between gap-4">

              <div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-300/10 bg-emerald-300/[0.05]">

                  <LockKeyhole
                    size={20}
                    className="text-emerald-300"
                  />

                </div>

                <h2 className="mt-5 text-xl font-bold">
                  {mode === "setup"
                    ? "Set up transaction PIN"
                    : "Change transaction PIN"}
                </h2>

                <p className="mt-2 text-sm leading-6 text-white/30">
                  {mode === "setup"
                    ? "Create a 6-digit PIN that will authorize your future transfers."
                    : "Verify your current credentials before creating a new transaction PIN."}
                </p>

              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={processing}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/35 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
              >
                <X size={17} />
              </button>

            </div>


            {error && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-400/15 bg-red-400/[0.06] p-4">

                <AlertCircle
                  size={17}
                  className="mt-0.5 shrink-0 text-red-300"
                />

                <p className="text-sm leading-5 text-red-200/80">
                  {error}
                </p>

              </div>
            )}


            <div className="mt-6 space-y-5">

              <PasswordField
                label="Current password"
                value={
                  currentPassword
                }
                onChange={
                  setCurrentPassword
                }
                visible={
                  showCurrentPassword
                }
                onToggle={() =>
                  setShowCurrentPassword(
                    (value) =>
                      !value
                  )
                }
                disabled={
                  processing
                }
                placeholder="Enter your login password"
              />


              {mode === "change" && (
                <PinField
                  label="Current transaction PIN"
                  value={currentPin}
                  onChange={
                    setCurrentPin
                  }
                  visible={
                    showCurrentPin
                  }
                  onToggle={() =>
                    setShowCurrentPin(
                      (value) =>
                        !value
                    )
                  }
                  disabled={
                    processing
                  }
                />
              )}


              <PinField
                label={
                  mode === "setup"
                    ? "Transaction PIN"
                    : "New transaction PIN"
                }
                value={newPin}
                onChange={
                  setNewPin
                }
                visible={
                  showNewPin
                }
                onToggle={() =>
                  setShowNewPin(
                    (value) =>
                      !value
                  )
                }
                disabled={
                  processing
                }
              />


              <PinField
                label="Confirm transaction PIN"
                value={
                  confirmPin
                }
                onChange={
                  setConfirmPin
                }
                visible={
                  showConfirmPin
                }
                onToggle={() =>
                  setShowConfirmPin(
                    (value) =>
                      !value
                  )
                }
                disabled={
                  processing
                }
              />


              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">

                <p className="text-xs font-semibold text-white/45">
                  PIN requirements
                </p>

                <div className="mt-3 space-y-2">

                  <Requirement
                    valid={
                      /^\d{6}$/.test(
                        newPin
                      )
                    }
                  >
                    Exactly 6 digits
                  </Requirement>

                  <Requirement
                    valid={
                      newPin.length >
                        0 &&
                      newPin ===
                        confirmPin
                    }
                  >
                    PINs match
                  </Requirement>

                  {mode ===
                    "change" && (
                    <Requirement
                      valid={
                        currentPin.length ===
                          6 &&
                        currentPin !==
                          newPin
                      }
                    >
                      New PIN differs from
                      current PIN
                    </Requirement>
                  )}

                </div>

              </div>


              <button
                type="button"
                disabled={
                  processing
                }
                onClick={
                  submitPin
                }
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-300 py-4 text-sm font-bold text-[#031421] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
              >

                {processing ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />

                    {mode ===
                    "setup"
                      ? "Setting up..."
                      : "Changing PIN..."}
                  </>
                ) : (
                  <>
                    <ShieldCheck
                      size={18}
                    />

                    {mode ===
                    "setup"
                      ? "Create transaction PIN"
                      : "Change transaction PIN"}
                  </>
                )}

              </button>

            </div>

          </div>
        </div>
      )}
    </main>
  );
}


/*
 * ================================================================
 * PROFILE INPUT
 * ================================================================
 */

function ProfileInput({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  placeholder?: string;
}) {
  return (
    <div>

      <label className="text-xs font-medium uppercase tracking-wider text-white/30">
        {label}
      </label>

      <input
        type="text"
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        disabled={disabled}
        placeholder={
          placeholder
        }
        className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm outline-none placeholder:text-white/20 focus:border-emerald-300/30 disabled:opacity-50"
      />

    </div>
  );
}


/*
 * ================================================================
 * PROFILE VALUE
 * ================================================================
 */

function ProfileValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">

      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/20">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-medium text-white/70">
        {value}
      </p>

    </div>
  );
}


/*
 * ================================================================
 * FORMAT DATE
 * ================================================================
 */

function formatDate(
  value: string
) {
  try {
    return new Intl.DateTimeFormat(
      "en-NG",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    ).format(
      new Date(value)
    );
  } catch {
    return value;
  }
}


/*
 * ================================================================
 * SECURITY POINT
 * ================================================================
 */

function SecurityPoint({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">

      <p className="text-xs font-semibold text-white/55">
        {title}
      </p>

      <p className="mt-1 text-[11px] leading-4 text-white/20">
        {description}
      </p>

    </div>
  );
}


/*
 * ================================================================
 * PASSWORD FIELD
 * ================================================================
 */

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggle,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  disabled: boolean;
  placeholder: string;
}) {
  return (
    <div>

      <label className="text-xs font-medium uppercase tracking-wider text-white/30">
        {label}
      </label>

      <div className="relative mt-3">

        <input
          type={
            visible
              ? "text"
              : "password"
          }
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          disabled={disabled}
          autoComplete="current-password"
          placeholder={
            placeholder
          }
          className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 pr-12 text-sm outline-none placeholder:text-white/20 focus:border-emerald-300/30 disabled:opacity-50"
        />

        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-white/25 hover:bg-white/5 hover:text-white disabled:opacity-40"
          aria-label={
            visible
              ? "Hide password"
              : "Show password"
          }
        >
          {visible ? (
            <EyeOff size={17} />
          ) : (
            <Eye size={17} />
          )}
        </button>

      </div>

    </div>
  );
}


/*
 * ================================================================
 * PIN FIELD
 * ================================================================
 */

function PinField({
  label,
  value,
  onChange,
  visible,
  onToggle,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <div>

      <label className="text-xs font-medium uppercase tracking-wider text-white/30">
        {label}
      </label>

      <div className="relative mt-3">

        <input
          type={
            visible
              ? "text"
              : "password"
          }
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={value}
          onChange={(event) => {
            const digits =
              event.target.value.replace(
                /\D/g,
                ""
              );

            onChange(
              digits.slice(0, 6)
            );
          }}
          disabled={disabled}
          autoComplete="off"
          placeholder="••••••"
          className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 pr-12 text-center font-mono text-lg tracking-[0.45em] outline-none placeholder:text-white/15 focus:border-emerald-300/30 disabled:opacity-50"
        />

        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-white/25 hover:bg-white/5 hover:text-white disabled:opacity-40"
          aria-label={
            visible
              ? "Hide PIN"
              : "Show PIN"
          }
        >
          {visible ? (
            <EyeOff size={17} />
          ) : (
            <Eye size={17} />
          )}
        </button>

      </div>

    </div>
  );
}


/*
 * ================================================================
 * REQUIREMENT
 * ================================================================
 */

function Requirement({
  valid,
  children,
}: {
  valid: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">

      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full ${
          valid
            ? "bg-emerald-300/15 text-emerald-300"
            : "bg-white/5 text-white/20"
        }`}
      >
        <CheckCircle2
          size={11}
        />
      </span>

      <span
        className={`text-xs ${
          valid
            ? "text-emerald-200/60"
            : "text-white/25"
        }`}
      >
        {children}
      </span>

    </div>
  );
}