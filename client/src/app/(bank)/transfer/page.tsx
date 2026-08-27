"use client";

import { useEffect, useMemo, useState } from "react";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Globe2,
  Loader2,
  Send,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import { useRouter } from "next/navigation";

import api from "@/lib/api";

/* ================================================================
   TYPES
================================================================ */

type TransferTab =
  | "novabank"
  | "other-banks"
  | "international";

type Step =
  | "form"
  | "preview"
  | "success";

type Account = {
  id: string;
  account_number: string;
  account_type: string;
  balance: string | number;
  currency: string;
  status: string;
};

type Beneficiary = {
  id: string;
  nickname: string;
  created_at: string;
  account: {
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
};



type Recipient = {
  id?: string;
  account_number: string;
  account_type?: string;
  account_name?: string;
  currency: string;
  status: string;
  bank_code?: string;
  bank_name?: string;
  country?: string;
  full_name?: string;
};

type Bank = {
  id: string;
  bank_code: string;
  bank_name: string;
  country: string;
  currency: string;
  bank_type: string;
  is_active: boolean;
};

type Transaction = {
  id: string;
  amount: string | number;
  transaction_type: string;
  description: string;
  reference: string;
  status: string;
  created_at: string;
  fee?: string | number;
};

type RecipientStatus =
  | "idle"
  | "checking"
  | "verified"
  | "not-found"
  | "error";


/* ================================================================
   CONSTANTS
================================================================ */

const EXTERNAL_TRANSFER_FEE = 25;


/* ================================================================
   PAGE
================================================================ */

export default function TransferPage() {
  const router = useRouter();

  /*
   * ==============================================================
   * CORE STATE
   * ==============================================================
   */

  const [activeTab, setActiveTab] =
    useState<TransferTab>(
      "novabank"
    );

  const [step, setStep] =
    useState<Step>("form");

  const [accounts, setAccounts] =
    useState<Account[]>([]);

  const [beneficiaries, setBeneficiaries] =
  useState<Beneficiary[]>([]);

const [loadingBeneficiaries, setLoadingBeneficiaries] =
  useState(false);

const [selectedBeneficiaryId, setSelectedBeneficiaryId] =
  useState("");

  const [selectedAccountId, setSelectedAccountId] =
    useState("");

  const [recipientNumber, setRecipientNumber] =
    useState("");

  const [recipient, setRecipient] =
    useState<Recipient | null>(null);

  const [recipientStatus, setRecipientStatus] =
    useState<RecipientStatus>(
      "idle"
    );

  const [amount, setAmount] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [loadingAccounts, setLoadingAccounts] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [transferReference, setTransferReference] =
    useState("");

  const [receiptNumber, setReceiptNumber] =
    useState("");

  /*
   * ==============================================================
   * TRANSACTION PIN AUTHORIZATION
   * ==============================================================
   */

  const [showPinModal, setShowPinModal] =
    useState(false);

  const [transactionPin, setTransactionPin] =
    useState("");

  const [showTransactionPin, setShowTransactionPin] =
    useState(false);

  const [pinError, setPinError] =
    useState("");

  const [pinChecking, setPinChecking] =
    useState(false);

  const [pinSubmitting, setPinSubmitting] =
    useState(false);


  /*
   * ==============================================================
   * EXTERNAL TRANSFER STATE
   * ==============================================================
   */

  const [banks, setBanks] =
    useState<Bank[]>([]);

  const [loadingBanks, setLoadingBanks] =
    useState(false);

  const [selectedBankCode, setSelectedBankCode] =
    useState("");

  const [externalRecipientStatus, setExternalRecipientStatus] =
    useState<RecipientStatus>(
      "idle"
    );

  const [externalRecipient, setExternalRecipient] =
    useState<Recipient | null>(null);


      /*
   * ==============================================================
   * INTERNATIONAL TRANSFER STATE
   * ==============================================================
   */

  type InternationalDestination = {
    country: string;
    currency: string;
    bank_type: string;
  };

  const [countries, setCountries] =
    useState<InternationalDestination[]>([]);

  const [selectedCountry, setSelectedCountry] =
    useState("");

  const [internationalCurrency, setInternationalCurrency] =
    useState("");

  const [internationalAccountNumber, setInternationalAccountNumber] =
    useState("");

  const [internationalIban, setInternationalIban] =
    useState("");

  const [internationalSwift, setInternationalSwift] =
    useState("");

  const [internationalRecipient, setInternationalRecipient] =
    useState<any>(null);

  const [internationalRecipientStatus, setInternationalRecipientStatus] =
    useState<RecipientStatus>("idle");

  const [internationalAmount, setInternationalAmount] =
    useState("");

  const [internationalDescription, setInternationalDescription] =
    useState("");

  const [internationalFee] =
    useState(15);

  const [internationalTotal, setInternationalTotal] =
    useState(0);


  /*
   * ==============================================================
   * LOAD ACCOUNTS
   * ==============================================================
   */

  useEffect(() => {
    let mounted = true;

    const loadAccounts = async () => {
      try {
        setLoadingAccounts(true);
        setError("");

        const response =
          await api.get(
            "/transfers/accounts"
          );

        const loadedAccounts =
          response.data?.data
            ?.accounts ?? [];

        if (!mounted) {
          return;
        }

        setAccounts(
          loadedAccounts
        );

        if (
          loadedAccounts.length > 0
        ) {
          setSelectedAccountId(
            loadedAccounts[0].id
          );
        }
      } catch (error: any) {
        console.error(
          "Transfer accounts error:",
          error
        );

        if (!mounted) {
          return;
        }

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
            "Unable to load your accounts."
        );
      } finally {
        if (mounted) {
          setLoadingAccounts(false);
        }
      }
    };

    loadAccounts();

    return () => {
      mounted = false;
    };
  }, [router]);


  /*
 * ==============================================================
 * LOAD BENEFICIARIES
 * ==============================================================
 */

useEffect(() => {
  let mounted = true;

  const loadBeneficiaries = async () => {
    try {
      setLoadingBeneficiaries(true);

      const response =
        await api.get("/beneficiaries");

      const loadedBeneficiaries =
        response.data?.data
          ?.beneficiaries ?? [];

      if (!mounted) {
        return;
      }

      setBeneficiaries(
        loadedBeneficiaries
      );
    } catch (error: any) {
      console.error(
        "Beneficiaries error:",
        error
      );

      if (!mounted) {
        return;
      }

      if (
        error.response?.status === 401
      ) {
        localStorage.removeItem(
          "token"
        );

        router.push("/login");

        return;
      }

      /*
       * Beneficiaries are optional to the
       * transfer flow, so don't block transfers
       * if they fail to load.
       */
    } finally {
      if (mounted) {
        setLoadingBeneficiaries(false);
      }
    }
  };

  loadBeneficiaries();

  return () => {
    mounted = false;
  };
}, [router]);


  /*
   * ==============================================================
   * LOAD EXTERNAL BANKS
   * ==============================================================
   */

  useEffect(() => {
    if (
      activeTab !== "other-banks"
    ) {
      return;
    }

    let mounted = true;

    const loadBanks = async () => {
      try {
        setLoadingBanks(true);

        setError("");

        const response =
          await api.get(
            "/transfers/external/banks"
          );

        const loadedBanks =
          response.data?.data?.banks ??
          [];

        if (!mounted) {
          return;
        }

        setBanks(loadedBanks);

        if (
          loadedBanks.length > 0 &&
          !selectedBankCode
        ) {
          setSelectedBankCode(
            loadedBanks[0].bank_code
          );
        }
      } catch (error: any) {
        console.error(
          "External banks error:",
          error
        );

        if (!mounted) {
          return;
        }

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
            "Unable to load Nigerian banks."
        );
      } finally {
        if (mounted) {
          setLoadingBanks(false);
        }
      }
    };

    loadBanks();

    return () => {
      mounted = false;
    };
  }, [
    activeTab,
    router,
    selectedBankCode,
  ]);


    /*
   * ==============================================================
   * LOAD INTERNATIONAL DESTINATIONS
   * ==============================================================
   */

  useEffect(() => {
    if (
      activeTab !== "international"
    ) {
      return;
    }

    let mounted = true;

    const loadCountries = async () => {
      try {
        setError("");

        const response =
          await api.get(
            "/transfers/international/countries"
          );

        const loadedCountries =
          response.data?.data
            ?.countries ?? [];

        if (!mounted) {
          return;
        }

        setCountries(
          loadedCountries
        );
      } catch (error: any) {
        console.error(
          "International destinations error:",
          error
        );

        if (!mounted) {
          return;
        }

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
            "Unable to load international destinations."
        );
      }
    };

    loadCountries();

    return () => {
      mounted = false;
    };
  }, [
    activeTab,
    router,
  ]);



    


  /*
   * ==============================================================
   * SELECTED ACCOUNT
   * ==============================================================
   */

  const selectedAccount =
    useMemo(() => {
      return (
        accounts.find(
          (account) =>
            account.id ===
            selectedAccountId
        ) || null
      );
    }, [
      accounts,
      selectedAccountId,
    ]);


  /*
   * ==============================================================
   * SELECTED BANK
   * ==============================================================
   */

  const selectedBank =
    useMemo(() => {
      return (
        banks.find(
          (bank) =>
            bank.bank_code ===
            selectedBankCode
        ) || null
      );
    }, [
      banks,
      selectedBankCode,
    ]);


  /*
   * ==============================================================
   * AUTOMATIC NOVABANK RECIPIENT
   * ==============================================================
   */

  useEffect(() => {
    if (
      activeTab !== "novabank"
    ) {
      return;
    }

    setRecipient(null);

    setRecipientStatus("idle");

    const accountNumber =
      recipientNumber.trim();

    if (
      accountNumber.length === 0
    ) {
      return;
    }

    if (
      !/^\d{10}$/.test(
        accountNumber
      )
    ) {
      return;
    }

    const timer =
      setTimeout(async () => {
        try {
          setRecipientStatus(
            "checking"
          );

          const response =
            await api.get(
              `/transfers/recipient/${accountNumber}`
            );

          const foundRecipient =
            response.data?.data
              ?.account;

          if (
            !foundRecipient
          ) {
            setRecipientStatus(
              "not-found"
            );

            return;
          }

          if (
            selectedAccount &&
            foundRecipient.currency !==
              selectedAccount.currency
          ) {
            setRecipientStatus(
              "error"
            );

            setError(
              `Currency mismatch. Your ${selectedAccount.currency} account cannot directly transfer to a ${foundRecipient.currency} account.`
            );

            return;
          }

          if (
            selectedAccount &&
            foundRecipient.account_number ===
              selectedAccount.account_number
          ) {
            setRecipientStatus(
              "error"
            );

            setError(
              "You cannot transfer money to the same account."
            );

            return;
          }

          setRecipient(
            foundRecipient
          );

          setRecipientStatus(
            "verified"
          );
        } catch (error: any) {
          console.error(
            "NovaBank recipient verification error:",
            error
          );

          if (
            error.response?.status ===
            401
          ) {
            localStorage.removeItem(
              "token"
            );

            router.push("/login");

            return;
          }

          if (
            error.response?.status ===
            404
          ) {
            setRecipientStatus(
              "not-found"
            );

            return;
          }

          setRecipientStatus(
            "error"
          );

          setError(
            error.response?.data?.message ||
              "Unable to verify this account."
          );
        }
      }, 450);

    return () => {
      clearTimeout(timer);
    };
  }, [
    activeTab,
    recipientNumber,
    selectedAccount,
    router,
  ]);


  /*
   * ==============================================================
   * AUTOMATIC EXTERNAL RECIPIENT
   * ==============================================================
   */

  useEffect(() => {
    if (
      activeTab !==
      "other-banks"
    ) {
      return;
    }

    setExternalRecipient(
      null
    );

    setExternalRecipientStatus(
      "idle"
    );

    if (
      !selectedBankCode
    ) {
      return;
    }

    const accountNumber =
      recipientNumber.trim();

    if (
      accountNumber.length === 0
    ) {
      return;
    }

    if (
      !/^\d{10}$/.test(
        accountNumber
      )
    ) {
      return;
    }

    const timer =
      setTimeout(async () => {
        try {
          setExternalRecipientStatus(
            "checking"
          );

          setError("");

          const response =
            await api.get(
              `/transfers/external/recipient/${selectedBankCode}/${accountNumber}`
            );

          const foundRecipient =
            response.data?.data
              ?.account;

          if (
            !foundRecipient
          ) {
            setExternalRecipientStatus(
              "not-found"
            );

            return;
          }

          if (
            selectedAccount &&
            selectedAccount.currency !==
              foundRecipient.currency
          ) {
            setExternalRecipientStatus(
              "error"
            );

            setError(
              `Your ${selectedAccount.currency} account cannot fund a ${foundRecipient.currency} external account.`
            );

            return;
          }

          setExternalRecipient(
            foundRecipient
          );

          setExternalRecipientStatus(
            "verified"
          );
        } catch (error: any) {
          console.error(
            "External recipient verification error:",
            error
          );

          if (
            error.response?.status ===
            401
          ) {
            localStorage.removeItem(
              "token"
            );

            router.push("/login");

            return;
          }

          if (
            error.response?.status ===
            404
          ) {
            setExternalRecipientStatus(
              "not-found"
            );

            return;
          }

          setExternalRecipientStatus(
            "error"
          );

          setError(
            error.response?.data?.message ||
              "Unable to verify the bank account."
          );
        }
      }, 450);

    return () => {
      clearTimeout(timer);
    };
  }, [
    activeTab,
    selectedBankCode,
    recipientNumber,
    selectedAccount,
    router,
  ]);



 /*
 * ================================================================
 * VERIFY INTERNATIONAL RECIPIENT
 * ================================================================
 */

useEffect(() => {
  if (activeTab !== "international") {
    return;
  }

  setInternationalRecipient(null);
  setInternationalRecipientStatus("idle");

  const country = selectedCountry.trim();
  const currency =
    internationalCurrency.trim().toUpperCase();

  const accountNumber =
    internationalAccountNumber.trim();

  const iban =
    internationalIban.trim().toUpperCase();

  const swift =
    internationalSwift.trim().toUpperCase();

  /*
   * Do not call the backend until the minimum
   * banking information is available.
   */
  if (!country || !currency || !swift) {
    return;
  }

  /*
   * Either account number or IBAN must exist.
   */
  if (!accountNumber && !iban) {
    return;
  }

  /*
   * SWIFT/BIC:
   * 8 characters or 11 characters.
   */
  if (
    !/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(swift)
  ) {
    return;
  }

  const timer = setTimeout(async () => {
    try {
      setInternationalRecipientStatus(
        "checking"
      );

      setError("");

      const response = await api.post(
        "/transfers/international/verify",
        {
          country,
          currency,
          accountNumber:
            accountNumber || undefined,
          iban: iban || undefined,
          swift,
        }
      );

      const foundRecipient =
        response.data?.data?.account ??
        response.data?.data?.recipient ??
        response.data?.data;

      if (!foundRecipient) {
        setInternationalRecipientStatus(
          "not-found"
        );

        return;
      }

      /*
       * Backend is authoritative for currency.
       */
      if (
        foundRecipient.currency &&
        foundRecipient.currency
          .toUpperCase() !== currency
      ) {
        setInternationalRecipientStatus(
          "error"
        );

        setError(
          `Currency mismatch. The recipient account uses ${foundRecipient.currency}, not ${currency}.`
        );

        return;
      }

      setInternationalRecipient(
        foundRecipient
      );

      setInternationalRecipientStatus(
        "verified"
      );
    } catch (error: any) {
      console.error(
        "International recipient verification error:",
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

      if (
        error.response?.status === 404
      ) {
        setInternationalRecipientStatus(
          "not-found"
        );

        return;
      }

      setInternationalRecipientStatus(
        "error"
      );

      setError(
        error.response?.data?.message ||
          "Unable to verify the international banking details."
      );
    }
  }, 500);

  return () => {
    clearTimeout(timer);
  };
}, [
  activeTab,
  selectedCountry,
  internationalCurrency,
  internationalAccountNumber,
  internationalIban,
  internationalSwift,
  router,
]);

  /*
   * ==============================================================
   * TOTAL EXTERNAL DEBIT
   * ==============================================================
   */

  const externalAmount =
    Number(amount);

  const externalFee =
    EXTERNAL_TRANSFER_FEE;

  const externalTotal =
    Number.isFinite(
      externalAmount
    ) && externalAmount > 0
      ? Number(
          (
            externalAmount +
            externalFee
          ).toFixed(2)
        )
      : 0;


  /*
   * ==============================================================
   * FORMAT MONEY
   * ==============================================================
   */

  const formatMoney = (
    value: string | number,
    currency: string
  ) => {
    const normalizedCurrency =
      (
        currency || "NGN"
      ).toUpperCase();

    let locale = "en-US";

    if (
      normalizedCurrency === "NGN"
    ) {
      locale = "en-NG";
    }

    if (
      normalizedCurrency === "GBP"
    ) {
      locale = "en-GB";
    }

    if (
      normalizedCurrency === "EUR"
    ) {
      locale = "en-IE";
    }

    try {
      return new Intl.NumberFormat(
        locale,
        {
          style: "currency",
          currency:
            normalizedCurrency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      ).format(Number(value));
    } catch {
      return `${normalizedCurrency} ${Number(
        value
      ).toFixed(2)}`;
    }
  };


  /*
   * ==============================================================
   * RESET
   * ==============================================================
   */

  const resetTransfer = () => {
    setStep("form");

    setRecipientNumber("");

    setSelectedBeneficiaryId("");

    setRecipient(null);

    setRecipientStatus(
      "idle"
    );

    setExternalRecipient(
      null
    );

    setExternalRecipientStatus(
      "idle"
    );

    setSelectedBankCode(
      banks[0]?.bank_code || ""
    );

    setAmount("");

    setDescription("");

    setError("");

    setSuccessMessage("");

    setTransferReference("");
    setReceiptNumber("");
    setShowPinModal(false);
    setTransactionPin("");
    setShowTransactionPin(false);
    setPinError("");
    setPinChecking(false);
    setPinSubmitting(false);
  };


  /*
   * ==============================================================
   * TAB SWITCH
   * ==============================================================
   */

  const switchTab = (
    tab: TransferTab
  ) => {
    setActiveTab(tab);

    resetTransfer();
  };

  /*
 * ==============================================================
 * SELECT BENEFICIARY
 * ==============================================================
 */

const selectBeneficiary = (
  beneficiary: Beneficiary
) => {
  /*
   * Beneficiaries belong to NovaBank accounts,
   * therefore they are only usable in the
   * NovaBank transfer flow.
   */

  setActiveTab("novabank");

  setStep("form");

  setSelectedBeneficiaryId(
    beneficiary.id
  );

  setRecipientNumber(
    beneficiary.account.account_number
  );

  setRecipient(null);

  setRecipientStatus("idle");

  setError("");
};


  /*
   * ==============================================================
   * CONTINUE NOVABANK
   * ==============================================================
   */

  const continueNovaBank =
    () => {
      setError("");

      if (
        !selectedAccount
      ) {
        setError(
          "Select the account to transfer from."
        );

        return;
      }

      if (
        recipientStatus !==
          "verified" ||
        !recipient
      ) {
        setError(
          "Enter a valid NovaBank account number and wait for automatic verification."
        );

        return;
      }

      const numericAmount =
        Number(amount);

      if (
        !Number.isFinite(
          numericAmount
        ) ||
        numericAmount <= 0
      ) {
        setError(
          "Enter a valid transfer amount."
        );

        return;
      }

      if (
        Math.round(
          numericAmount * 100
        ) !==
        numericAmount * 100
      ) {
        setError(
          "Amount can have a maximum of two decimal places."
        );

        return;
      }

      if (
        numericAmount >
        Number(
          selectedAccount.balance
        )
      ) {
        setError(
          "Insufficient funds."
        );

        return;
      }

      setStep("preview");
    };


  /*
   * ==============================================================
   * CONTINUE EXTERNAL
   * ==============================================================
   */

  const continueExternal =
    () => {
      setError("");

      if (
        !selectedAccount
      ) {
        setError(
          "Select the account to transfer from."
        );

        return;
      }

      if (
        selectedAccount.currency !==
        "NGN"
      ) {
        setError(
          "Other Nigerian bank transfers require an NGN account."
        );

        return;
      }

      if (
        !selectedBank
      ) {
        setError(
          "Select the recipient's bank."
        );

        return;
      }

      if (
        externalRecipientStatus !==
          "verified" ||
        !externalRecipient
      ) {
        setError(
          "Enter a valid account number and wait for automatic verification."
        );

        return;
      }

      const numericAmount =
        Number(amount);

      if (
        !Number.isFinite(
          numericAmount
        ) ||
        numericAmount <= 0
      ) {
        setError(
          "Enter a valid transfer amount."
        );

        return;
      }

      if (
        Math.round(
          numericAmount * 100
        ) !==
        numericAmount * 100
      ) {
        setError(
          "Amount can have a maximum of two decimal places."
        );

        return;
      }

      const total =
        numericAmount +
        externalFee;

      if (
        total >
        Number(
          selectedAccount.balance
        )
      ) {
        setError(
          "Insufficient funds for the transfer and fee."
        );

        return;
      }

      setStep("preview");
    };



      /*
   * ==============================================================
   * CONTINUE INTERNATIONAL
   * ==============================================================
   */

  const continueInternational =
    () => {
      setError("");

      if (
        !selectedAccount
      ) {
        setError(
          "Select the account to transfer from."
        );

        return;
      }

      if (
        !selectedCountry
      ) {
        setError(
          "Select the destination country."
        );

        return;
      }

      if (
        !internationalCurrency
      ) {
        setError(
          "Select the destination currency."
        );

        return;
      }

      if (
        internationalRecipientStatus !==
          "verified" ||
        !internationalRecipient
      ) {
        setError(
          "Verify the international recipient before continuing."
        );

        return;
      }

      const numericAmount =
        Number(
          internationalAmount
        );

      if (
        !Number.isFinite(
          numericAmount
        ) ||
        numericAmount <= 0
      ) {
        setError(
          "Enter a valid transfer amount."
        );

        return;
      }

      if (
        Math.round(
          numericAmount * 100
        ) !==
        numericAmount * 100
      ) {
        setError(
          "Amount can have a maximum of two decimal places."
        );

        return;
      }

      if (
        selectedAccount.currency !==
        internationalCurrency
      ) {
        setError(
          `Your ${selectedAccount.currency} account cannot directly fund a ${internationalCurrency} international transfer.`
        );

        return;
      }

      const total =
        numericAmount +
        internationalFee;

      if (
        total >
        Number(
          selectedAccount.balance
        )
      ) {
        setError(
          "Insufficient funds for the transfer and fee."
        );

        return;
      }

      setInternationalTotal(
        Number(
          total.toFixed(2)
        )
      );

      setStep("preview");
    };


  /*
   * ==============================================================
   * EXECUTE NOVABANK
   * ==============================================================
   */

  const executeNovaBank =
    async (pin: string) => {
      if (
        !selectedAccount ||
        !recipient
      ) {
        return;
      }

      try {
        setProcessing(true);

        setError("");

        const response =
          await api.post(
            "/transfers",
            {
              senderAccountId:
                selectedAccount.id,

              receiverAccountNumber:
                recipient.account_number,

              amount:
                Number(amount),

              description:
                description.trim(),

              transactionPin:
                pin,
            }
          );

        const transaction =
          response.data?.data
            ?.transaction as
            | Transaction
            | undefined;

        setTransferReference(
          transaction?.reference ||
            ""
        );

        setReceiptNumber(
          response.data?.data?.receipt?.receipt_number ||
            response.data?.data?.receipt_number ||
            ""
        );

        setSuccessMessage(
          response.data?.message ||
            "Transfer completed successfully."
        );

        setStep("success");
      } catch (error: any) {
        console.error(
          "NovaBank transfer error:",
          error
        );

        if (
          error.response?.status ===
          401
        ) {
          localStorage.removeItem(
            "token"
          );

          router.push("/login");

          return;
        }

        setError(
          error.response?.data?.message ||
            "Unable to complete transfer."
        );
      } finally {
        setProcessing(false);
      }
    };


  /*
   * ==============================================================
   * EXECUTE EXTERNAL
   * ==============================================================
   */

  const executeExternal =
    async (pin: string) => {
      if (
        !selectedAccount ||
        !selectedBank ||
        !externalRecipient
      ) {
        return;
      }

      try {
        setProcessing(true);

        setError("");

        const response =
          await api.post(
            "/transfers/external",
            {
              senderAccountId:
                selectedAccount.id,

              bankCode:
                selectedBank.bank_code,

              receiverAccountNumber:
                externalRecipient.account_number,

              amount:
                Number(amount),

              description:
                description.trim(),

              transactionPin:
                pin,
            }
          );

        const transaction =
          response.data?.data
            ?.transaction as
            | Transaction
            | undefined;

        setTransferReference(
          transaction?.reference ||
            ""
        );

        setReceiptNumber(
          response.data?.data?.receipt?.receipt_number ||
            response.data?.data?.receipt_number ||
            ""
        );

        setSuccessMessage(
          response.data?.message ||
            "External transfer completed successfully."
        );

        setStep("success");
      } catch (error: any) {
        console.error(
          "External transfer error:",
          error
        );

        if (
          error.response?.status ===
          401
        ) {
          localStorage.removeItem(
            "token"
          );

          router.push("/login");

          return;
        }

        setError(
          error.response?.data?.message ||
            "Unable to complete external transfer."
        );
      } finally {
        setProcessing(false);
      }
    };


      /*
   * ==============================================================
   * EXECUTE INTERNATIONAL
   * ==============================================================
   */

  const executeInternational =
    async (pin: string) => {
      if (
        !selectedAccount ||
        !internationalRecipient
      ) {
        return;
      }

      try {
        setProcessing(true);

        setError("");

        const response =
          await api.post(
            "/transfers/international",
            {
              senderAccountId:
                selectedAccount.id,

              country:
                selectedCountry,

              currency:
                internationalCurrency,

              accountNumber:
                internationalAccountNumber ||
                undefined,

              iban:
                internationalIban ||
                undefined,

              swift:
                internationalSwift
                  .trim()
                  .toUpperCase(),

              amount:
                Number(
                  internationalAmount
                ),

              description:
                internationalDescription.trim(),

              transactionPin:
                pin,
            }
          );

        const transaction =
          response.data?.data
            ?.transaction as
            | Transaction
            | undefined;

        setTransferReference(
          transaction?.reference ||
            ""
        );

        setReceiptNumber(
          response.data?.data?.receipt?.receipt_number ||
            response.data?.data?.receipt_number ||
            ""
        );

        setSuccessMessage(
          response.data?.message ||
            "International transfer completed successfully."
        );

        setStep("success");
      } catch (error: any) {
        console.error(
          "International transfer error:",
          error
        );

        if (
          error.response?.status ===
          401
        ) {
          localStorage.removeItem(
            "token"
          );

          router.push("/login");

          return;
        }

        setError(
          error.response?.data?.message ||
            "Unable to complete international transfer."
        );
      } finally {
        setProcessing(false);
      }
    };


  /*
   * ==============================================================
   * TRANSACTION PIN FLOW
   * ==============================================================
   */

  const openPinAuthorization = async () => {
    if (processing || pinChecking || pinSubmitting) {
      return;
    }

    try {
      setPinChecking(true);
      setError("");
      setPinError("");

      const response = await api.get(
        "/transaction-pin/status"
      );

      const configured =
        response.data?.data?.configured ??
        response.data?.configured ??
        false;

      if (!configured) {
        setError(
          "A transaction PIN is required before you can send money. Set one up in Settings."
        );
        return;
      }

      setTransactionPin("");
      setShowTransactionPin(false);
      setPinError("");
      setShowPinModal(true);
    } catch (error: any) {
      console.error(
        "Transaction PIN status error:",
        error
      );

      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
        return;
      }

      setError(
        error.response?.data?.message ||
          "Unable to verify your transaction PIN status."
      );
    } finally {
      setPinChecking(false);
    }
  };

  const closePinAuthorization = () => {
    if (pinSubmitting) {
      return;
    }

    setShowPinModal(false);
    setTransactionPin("");
    setShowTransactionPin(false);
    setPinError("");
  };

  const submitPinAuthorization = async () => {
    const pin = transactionPin.replace(/\D/g, "");

    if (!/^\d{6}$/.test(pin)) {
      setPinError("Enter your 6-digit transaction PIN.");
      return;
    }

    try {
      setPinSubmitting(true);
      setPinError("");
      setError("");

      if (activeTab === "novabank") {
        await executeNovaBank(pin);
      } else if (activeTab === "other-banks") {
        await executeExternal(pin);
      } else {
        await executeInternational(pin);
      }

      /*
       * Keep the modal closed after a successful transfer.
       * The success screen is controlled by the transfer flow.
       */
      setShowPinModal(false);
      setTransactionPin("");
      setShowTransactionPin(false);
    } catch (error) {
      /*
       * execute* already handles Axios errors and updates
       * the page error state. This guard prevents the PIN modal
       * from closing when a transfer request fails.
       */
      console.error(
        "Transaction PIN authorization error:",
        error
      );
    } finally {
      setPinSubmitting(false);
    }
  };

  /*
   * ==============================================================
   * LOADING
   * ==============================================================
   */

  if (loadingAccounts) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-10">

        <div className="flex items-center gap-3 text-sm text-white/40">

          <Loader2
            size={20}
            className="animate-spin text-emerald-300"
          />

          Loading transfer accounts...

        </div>

      </main>
    );
  }


  /*
   * ==============================================================
   * SUCCESS
   * ==============================================================
   */

  if (step === "success") {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-5 py-10">

        <section className="w-full rounded-[32px] border border-white/10 bg-white/[0.025] p-8 text-center sm:p-12">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-300/10">

            <CheckCircle2
              size={34}
              className="text-emerald-300"
            />

          </div>

          <p className="mt-6 text-sm font-medium text-emerald-300">
            Transfer successful
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Money sent successfully
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/40">
            {successMessage}
          </p>

          {transferReference && (
            <div className="mx-auto mt-7 max-w-md rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-left">

              <p className="text-[10px] uppercase tracking-wider text-white/25">
                Transaction reference
              </p>

              <p className="mt-2 break-all font-mono text-sm text-white/70">
                {transferReference}
              </p>

            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">

            {receiptNumber && (
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/receipts/${encodeURIComponent(
                      receiptNumber
                    )}`
                  )
                }
                className="rounded-2xl bg-emerald-300 px-6 py-3.5 text-sm font-bold text-[#031421] transition hover:bg-emerald-200"
              >
                View receipt
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/transactions"
                )
              }
              className="rounded-2xl border border-white/10 px-6 py-3.5 text-sm font-semibold text-white/70 transition hover:bg-white/5 hover:text-white"
            >
              View transactions
            </button>

            <button
              type="button"
              onClick={resetTransfer}
              className="rounded-2xl border border-white/10 px-6 py-3.5 text-sm font-semibold text-white/70 transition hover:bg-white/5 hover:text-white"
            >
              Make another transfer
            </button>

          </div>

        </section>

      </main>
    );
  }


  /*
   * ================================================================
   * TABS
   * ================================================================
   */

  const tabs = [
    {
      id: "novabank" as const,
      label: "NovaBank",
      description:
        "Instant transfer to another NovaBank customer.",
      icon: WalletCards,
    },

    {
      id: "other-banks" as const,
      label: "Other Banks",
      description:
        "Send money to a Nigerian bank account.",
      icon: Building2,
    },

    {
      id: "international" as const,
      label: "International",
      description:
        "Send money internationally.",
      icon: Globe2,
    },
  ];


  /*
   * ================================================================
   * MAIN PAGE
   * ================================================================
   */

  return (
    <main className="mx-auto max-w-6xl px-5 py-7 sm:px-6 lg:px-8 lg:py-9">

      {/* ==========================================================
          HEADER
      ========================================================== */}

      <header className="mb-8">

        <p className="text-sm font-medium text-emerald-300">
          Payments
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Transfer money
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
          Send money securely within
          NovaBank or to supported
          external Nigerian bank
          accounts.
        </p>

      </header>


      {/* ==========================================================
          GLOBAL ERROR
      ========================================================== */}

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/[0.07] px-5 py-4 text-sm text-red-300">

          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />

          <p>{error}</p>

        </div>
      )}


      {/* ==========================================================
          TRANSFER TABS
      ========================================================== */}

      <div className="mb-8 grid gap-3 md:grid-cols-3">

        {tabs.map((tab) => {
          const Icon = tab.icon;

          const active =
            activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                switchTab(tab.id)
              }
              className={`
                group rounded-[24px]
                border p-5 text-left
                transition
                ${
                  active
                    ? "border-emerald-300/30 bg-emerald-300/[0.07]"
                    : "border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.04]"
                }
              `}
            >

              <div className="flex items-start justify-between">

                <div
                  className={`
                    flex h-11 w-11
                    items-center justify-center
                    rounded-xl
                    ${
                      active
                        ? "bg-emerald-300/10"
                        : "bg-white/5"
                    }
                  `}
                >

                  <Icon
                    size={20}
                    className={
                      active
                        ? "text-emerald-300"
                        : "text-white/45"
                    }
                  />

                </div>

                {active && (
                  <CheckCircle2
                    size={18}
                    className="text-emerald-300"
                  />
                )}

              </div>

              <p className="mt-4 font-semibold">
                {tab.label}
              </p>

              <p className="mt-1 text-xs leading-5 text-white/30">
                {tab.description}
              </p>

            </button>
          );
        })}

      </div>


      {/* ==========================================================
          NOVABANK
      ========================================================== */}

      {activeTab ===
        "novabank" && (
        <section className="rounded-[30px] border border-white/10 bg-white/[0.025] p-6 sm:p-8">

          <div className="mb-8 flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-300/10">

              <WalletCards
                size={18}
                className="text-emerald-300"
              />

            </div>

            <div>

              <h2 className="font-semibold">
                NovaBank transfer
              </h2>

              <p className="mt-1 text-xs text-white/30">
                Instant internal transfer
              </p>

            </div>

          </div>


          {step === "form" && (
            <>

              {/* FROM */}

              <div>

                <label className="text-xs font-medium uppercase tracking-wider text-white/30">
                  From account
                </label>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">

                  {accounts.map(
                    (account) => {
                      const selected =
                        account.id ===
                        selectedAccountId;

                      return (
                        <button
                          key={account.id}
                          type="button"
                          onClick={() => {
                            setSelectedAccountId(
                              account.id
                            );

                            setSelectedBeneficiaryId(
                              ""
                            );

                            setRecipient(
                              null
                            );

                            setRecipientStatus(
                              "idle"
                            );

                            setError("");
                          }}
                          className={`
                            rounded-2xl
                            border p-4
                            text-left
                            transition
                            ${
                              selected
                                ? "border-emerald-300/30 bg-emerald-300/[0.06]"
                                : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                            }
                          `}
                        >

                          <div className="flex items-center justify-between">

                            <span className="text-sm font-semibold">
                              {
                                account.account_type
                              }
                            </span>

                            <span className="text-[10px] uppercase text-white/25">
                              {
                                account.currency
                              }
                            </span>

                          </div>

                          <p className="mt-2 font-mono text-xs text-white/35">
                            ••••{" "}
                            {
                              account.account_number.slice(
                                -4
                              )
                            }
                          </p>

                          <p className="mt-4 text-lg font-bold">
                            {formatMoney(
                              account.balance,
                              account.currency
                            )}
                          </p>

                        </button>
                      );
                    }
                  )}

                </div>

              </div>


              {/* SAVED BENEFICIARIES */}

{beneficiaries.length > 0 && (
  <div className="mt-7">

    <div className="flex items-center justify-between">

      <label className="text-xs font-medium uppercase tracking-wider text-white/30">
        Saved beneficiaries
      </label>

      <button
        type="button"
        onClick={() =>
          router.push("/beneficiaries")
        }
        className="text-xs font-medium text-emerald-300 transition hover:text-emerald-200"
      >
        Manage
      </button>

    </div>

    <div className="mt-3 grid gap-3 sm:grid-cols-2">

      {beneficiaries.map(
        (beneficiary) => {

          const selected =
            selectedBeneficiaryId ===
            beneficiary.id;

          const account =
            beneficiary.account;

          const displayName =
            beneficiary.nickname ||
            account.owner.full_name ||
            "NovaBank customer";

          return (
            <button
              key={beneficiary.id}
              type="button"
              onClick={() =>
                selectBeneficiary(
                  beneficiary
                )
              }
              className={`
                rounded-2xl
                border p-4
                text-left
                transition
                ${
                  selected
                    ? "border-emerald-300/30 bg-emerald-300/[0.07]"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                }
              `}
            >

              <div className="flex items-start justify-between gap-3">

                <div className="min-w-0">

                  <p className="truncate text-sm font-semibold">
                    {displayName}
                  </p>

                  <p className="mt-1 text-xs text-white/35">
                    {account.owner.full_name}
                  </p>

                  <p className="mt-2 font-mono text-xs text-white/35">
                    ••••{" "}
                    {account.account_number.slice(-4)}
                  </p>

                </div>

                {selected && (
                  <CheckCircle2
                    size={18}
                    className="shrink-0 text-emerald-300"
                  />
                )}

              </div>

            </button>
          );
        }
      )}

    </div>

  </div>
)}


              {/* RECIPIENT */}

              <div className="mt-7">

                <label
                  htmlFor="nova-recipient"
                  className="text-xs font-medium uppercase tracking-wider text-white/30"
                >
                  NovaBank account number
                </label>

                <div className="relative mt-3">

                  <input
                    id="nova-recipient"
                    value={
                      recipientNumber
                    }
                    onChange={(event) => {
                      const value =
                        event.target.value
                          .replace(
                            /\D/g,
                            ""
                          )
                          .slice(
                            0,
                            10
                          );

                      setRecipientNumber(
                        value
                      );

                      setSelectedBeneficiaryId(
                        ""
                      );

                      setRecipient(
                        null
                      );

                      setRecipientStatus(
                        "idle"
                      );

                      setError("");
                    }}
                    maxLength={10}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Enter 10-digit account number"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 pr-12 text-sm outline-none placeholder:text-white/20 focus:border-emerald-300/30"
                  />

                  {recipientStatus ===
                    "checking" && (
                    <Loader2
                      size={19}
                      className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-white/40"
                    />
                  )}

                  {recipientStatus ===
                    "verified" && (
                    <CheckCircle2
                      size={19}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-300"
                    />
                  )}

                  {recipientStatus ===
                    "not-found" && (
                    <AlertCircle
                      size={19}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-red-300"
                    />
                  )}

                </div>

                {recipientStatus ===
                  "checking" && (
                  <StatusMessage>
                    Verifying NovaBank account...
                  </StatusMessage>
                )}

                {recipientStatus ===
                  "verified" &&
                  recipient && (
                    <RecipientCard
                      name={
                        recipient.full_name ||
                        "NovaBank customer"
                      }
                      accountNumber={
                        recipient.account_number
                      }
                      bankName="NovaBank"
                      currency={
                        recipient.currency
                      }
                    />
                  )}

                {recipientStatus ===
                  "not-found" && (
                  <StatusMessage
                    error
                  >
                    NovaBank account not
                    found.
                  </StatusMessage>
                )}

              </div>


              {/* AMOUNT */}

              <div className="mt-7">

                <label
                  htmlFor="nova-amount"
                  className="text-xs font-medium uppercase tracking-wider text-white/30"
                >
                  Amount
                </label>

                <div className="relative mt-3">

                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-white/35">
                    {selectedAccount?.currency ===
                    "USD"
                      ? "$"
                      : "₦"}
                  </span>

                  <input
                    id="nova-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(event) => {
                      setAmount(
                        event.target.value
                      );

                      setError("");
                    }}
                    placeholder="0.00"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-4 pl-9 pr-4 text-2xl font-bold outline-none placeholder:text-white/15 focus:border-emerald-300/30"
                  />

                </div>

                {selectedAccount && (
                  <p className="mt-2 text-xs text-white/25">
                    Available balance:{" "}
                    {formatMoney(
                      selectedAccount.balance,
                      selectedAccount.currency
                    )}
                  </p>
                )}

              </div>


              {/* DESCRIPTION */}

              <div className="mt-7">

                <label className="text-xs font-medium uppercase tracking-wider text-white/30">
                  Narration
                </label>

                <input
                  value={description}
                  maxLength={255}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  placeholder="Optional transfer description"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-sm outline-none placeholder:text-white/20 focus:border-emerald-300/30"
                />

              </div>


              <button
                type="button"
                disabled={
                  !selectedAccount ||
                  recipientStatus !==
                    "verified" ||
                  !recipient ||
                  !amount
                }
                onClick={
                  continueNovaBank
                }
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-300 py-4 text-sm font-bold text-[#031421] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
              >

                Review transfer

                <ArrowRight
                  size={17}
                />

              </button>

            </>
          )}


          {step === "preview" && (
            <NovaPreview
              selectedAccount={
                selectedAccount
              }
              recipient={
                recipient
              }
              amount={amount}
              description={
                description
              }
              formatMoney={
                formatMoney
              }
              processing={
                processing
              }
              onBack={() =>
                setStep("form")
              }
              onConfirm={openPinAuthorization}
            />
          )}

        </section>
      )}


      {/* ==========================================================
          OTHER BANKS
      ========================================================== */}

      {activeTab ===
        "other-banks" && (
        <section className="rounded-[30px] border border-white/10 bg-white/[0.025] p-6 sm:p-8">

          <div className="mb-8 flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-300/10">

              <Building2
                size={18}
                className="text-emerald-300"
              />

            </div>

            <div>

              <h2 className="font-semibold">
                Other Nigerian banks
              </h2>

              <p className="mt-1 text-xs text-white/30">
                Send NGN to a supported
                Nigerian bank account
              </p>

            </div>

          </div>


          {step === "form" && (
            <>

              {/* FROM ACCOUNT */}

              <div>

                <label className="text-xs font-medium uppercase tracking-wider text-white/30">
                  From account
                </label>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">

                  {accounts
                    .filter(
                      (account) =>
                        account.currency ===
                        "NGN"
                    )
                    .map(
                      (account) => {
                        const selected =
                          account.id ===
                          selectedAccountId;

                        return (
                          <button
                            key={account.id}
                            type="button"
                            onClick={() => {
                              setSelectedAccountId(
                                account.id
                              );

                              setError("");
                            }}
                            className={`
                              rounded-2xl
                              border p-4
                              text-left
                              transition
                              ${
                                selected
                                  ? "border-emerald-300/30 bg-emerald-300/[0.06]"
                                  : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                              }
                            `}
                          >

                            <div className="flex items-center justify-between">

                              <span className="text-sm font-semibold">
                                {
                                  account.account_type
                                }
                              </span>

                              <span className="rounded-full bg-emerald-300/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">
                                NGN
                              </span>

                            </div>

                            <p className="mt-2 font-mono text-xs text-white/35">
                              ••••{" "}
                              {
                                account.account_number.slice(
                                  -4
                                )
                              }
                            </p>

                            <p className="mt-4 text-lg font-bold">
                              {formatMoney(
                                account.balance,
                                "NGN"
                              )}
                            </p>

                          </button>
                        );
                      }
                    )}

                </div>

                {accounts.filter(
                  (account) =>
                    account.currency ===
                    "NGN"
                ).length === 0 && (
                  <div className="mt-3 rounded-2xl border border-amber-300/10 bg-amber-300/[0.04] p-4 text-xs text-amber-200">
                    You need an NGN
                    account to send money
                    to another Nigerian
                    bank.
                  </div>
                )}

              </div>


              {/* BANK */}

              <div className="mt-7">

                <label
                  htmlFor="external-bank"
                  className="text-xs font-medium uppercase tracking-wider text-white/30"
                >
                  Recipient bank
                </label>

                <div className="relative mt-3">

                  <select
                    id="external-bank"
                    value={
                      selectedBankCode
                    }
                    onChange={(event) => {
                      setSelectedBankCode(
                        event.target.value
                      );

                      setRecipientNumber(
                        ""
                      );

                      setExternalRecipient(
                        null
                      );

                      setExternalRecipientStatus(
                        "idle"
                      );

                      setError("");
                    }}
                    disabled={
                      loadingBanks
                    }
                    className="w-full appearance-none rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 pr-12 text-sm text-white outline-none focus:border-emerald-300/30 disabled:opacity-50"
                  >

                    <option
                      value=""
                      className="bg-[#071421]"
                    >
                      {loadingBanks
                        ? "Loading banks..."
                        : "Select recipient bank"}
                    </option>

                    {banks.map(
                      (bank) => (
                        <option
                          key={
                            bank.bank_code
                          }
                          value={
                            bank.bank_code
                          }
                          className="bg-[#071421]"
                        >
                          {
                            bank.bank_name
                          }
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


              {/* ACCOUNT NUMBER */}

              <div className="mt-7">

                <label
                  htmlFor="external-recipient"
                  className="text-xs font-medium uppercase tracking-wider text-white/30"
                >
                  Account number
                </label>

                <div className="relative mt-3">

                  <input
                    id="external-recipient"
                    value={
                      recipientNumber
                    }
                    onChange={(event) => {
                      const value =
                        event.target.value
                          .replace(
                            /\D/g,
                            ""
                          )
                          .slice(
                            0,
                            10
                          );

                      setRecipientNumber(
                        value
                      );

                      setExternalRecipient(
                        null
                      );

                      setExternalRecipientStatus(
                        "idle"
                      );

                      setError("");
                    }}
                    maxLength={10}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Enter 10-digit account number"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 pr-12 text-sm outline-none placeholder:text-white/20 focus:border-emerald-300/30"
                  />

                  {externalRecipientStatus ===
                    "checking" && (
                    <Loader2
                      size={19}
                      className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-white/40"
                    />
                  )}

                  {externalRecipientStatus ===
                    "verified" && (
                    <CheckCircle2
                      size={19}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-300"
                    />
                  )}

                  {externalRecipientStatus ===
                    "not-found" && (
                    <AlertCircle
                      size={19}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-red-300"
                    />
                  )}

                </div>

                {externalRecipientStatus ===
                  "checking" && (
                  <StatusMessage>
                    Verifying bank account...
                  </StatusMessage>
                )}

                {externalRecipientStatus ===
                  "verified" &&
                  externalRecipient && (
                    <RecipientCard
                      name={
                        externalRecipient.account_name ||
                        "Account holder"
                      }
                      accountNumber={
                        externalRecipient.account_number
                      }
                      bankName={
                        externalRecipient.bank_name ||
                        selectedBank?.bank_name ||
                        "External bank"
                      }
                      currency={
                        externalRecipient.currency
                      }
                    />
                  )}

                {externalRecipientStatus ===
                  "not-found" && (
                  <StatusMessage
                    error
                  >
                    Account not found at the
                    selected bank.
                  </StatusMessage>
                )}

              </div>


              {/* AMOUNT */}

              <div className="mt-7">

                <label
                  htmlFor="external-amount"
                  className="text-xs font-medium uppercase tracking-wider text-white/30"
                >
                  Amount
                </label>

                <div className="relative mt-3">

                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-white/35">
                    ₦
                  </span>

                  <input
                    id="external-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(event) => {
                      setAmount(
                        event.target.value
                      );

                      setError("");
                    }}
                    placeholder="0.00"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-4 pl-9 pr-4 text-2xl font-bold outline-none placeholder:text-white/15 focus:border-emerald-300/30"
                  />

                </div>

                {selectedAccount && (
                  <p className="mt-2 text-xs text-white/25">
                    Available balance:{" "}
                    {formatMoney(
                      selectedAccount.balance,
                      "NGN"
                    )}
                  </p>
                )}

              </div>


              {/* FEE PREVIEW */}

              {Number(amount) >
                0 && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">

                  <div className="flex items-center justify-between text-sm">

                    <span className="text-white/40">
                      Transfer amount
                    </span>

                    <span className="font-medium">
                      {formatMoney(
                        Number(amount),
                        "NGN"
                      )}
                    </span>

                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">

                    <span className="text-white/40">
                      Transfer fee
                    </span>

                    <span className="font-medium">
                      {formatMoney(
                        EXTERNAL_TRANSFER_FEE,
                        "NGN"
                      )}
                    </span>

                  </div>

                  <div className="mt-4 border-t border-white/10 pt-4">

                    <div className="flex items-center justify-between">

                      <span className="text-sm font-semibold">
                        Total debit
                      </span>

                      <span className="text-lg font-bold text-emerald-300">
                        {formatMoney(
                          externalTotal,
                          "NGN"
                        )}
                      </span>

                    </div>

                  </div>

                </div>
              )}


              {/* DESCRIPTION */}

              <div className="mt-7">

                <label className="text-xs font-medium uppercase tracking-wider text-white/30">
                  Narration
                </label>

                <input
                  value={description}
                  maxLength={255}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  placeholder="Optional transfer description"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-sm outline-none placeholder:text-white/20 focus:border-emerald-300/30"
                />

              </div>


              {/* REVIEW */}

              <button
                type="button"
                disabled={
                  !selectedAccount ||
                  !selectedBank ||
                  externalRecipientStatus !==
                    "verified" ||
                  !externalRecipient ||
                  !amount
                }
                onClick={
                  continueExternal
                }
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-300 py-4 text-sm font-bold text-[#031421] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
              >

                Review transfer

                <ArrowRight
                  size={17}
                />

              </button>

            </>
          )}


          {step === "preview" && (
            <ExternalPreview
              selectedAccount={
                selectedAccount
              }
              selectedBank={
                selectedBank
              }
              recipient={
                externalRecipient
              }
              amount={amount}
              fee={EXTERNAL_TRANSFER_FEE}
              total={externalTotal}
              description={
                description
              }
              formatMoney={
                formatMoney
              }
              processing={
                processing
              }
              onBack={() =>
                setStep("form")
              }
              onConfirm={openPinAuthorization}
            />
          )}

        </section>
      )}


      {/* ==========================================================
          INTERNATIONAL
      ========================================================== */}

      {activeTab ===
        "international" && (
        <section className="rounded-[30px] border border-white/10 bg-white/[0.025] p-6 sm:p-8">

          <div className="flex items-start gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-300/10">

              <Globe2
                size={22}
                className="text-emerald-300"
              />

            </div>

            <div>

              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300/70">
                International payments
              </p>

              <h2 className="mt-1 text-xl font-bold">
                Send money internationally
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-white/35">
                Send funds to a supported
                international account using
                verified banking details.
              </p>

            </div>

          </div>


          {step === "form" && (
            <>

              {/* FROM ACCOUNT */}

              <div className="mt-8">

                <label className="text-xs font-medium uppercase tracking-wider text-white/30">
                  From account
                </label>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">

                  {accounts.map(
                    (account) => {

                      const selected =
                        account.id ===
                        selectedAccountId;

                      return (
                        <button
                          key={account.id}
                          type="button"
                          onClick={() => {
                            setSelectedAccountId(
                              account.id
                            );

                            setInternationalRecipient(
                              null
                            );

                            setInternationalRecipientStatus(
                              "idle"
                            );

                            setError("");
                          }}
                          className={`
                            rounded-2xl
                            border p-4
                            text-left
                            transition
                            ${
                              selected
                                ? "border-emerald-300/30 bg-emerald-300/[0.06]"
                                : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                            }
                          `}
                        >

                          <div className="flex items-center justify-between">

                            <span className="text-sm font-semibold">
                              {
                                account.account_type
                              }
                            </span>

                            <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase text-white/35">
                              {
                                account.currency
                              }
                            </span>

                          </div>

                          <p className="mt-2 font-mono text-xs text-white/35">
                            ••••{" "}
                            {
                              account.account_number.slice(
                                -4
                              )
                            }
                          </p>

                          <p className="mt-4 text-lg font-bold">
                            {formatMoney(
                              account.balance,
                              account.currency
                            )}
                          </p>

                        </button>
                      );
                    }
                  )}

                </div>

              </div>


              {/* DESTINATION */}

              <div className="mt-7 grid gap-4 sm:grid-cols-2">

                <div>

                  <label
                    htmlFor="international-country"
                    className="text-xs font-medium uppercase tracking-wider text-white/30"
                  >
                    Destination country
                  </label>

                  <select
                    id="international-country"
                    value={
                      selectedCountry
                    }
                    onChange={(event) => {

                      const country =
                        event.target.value;

                      const destination =
                        countries.find(
                          (item) =>
                            item.country ===
                            country
                        );

                      setSelectedCountry(
                        country
                      );

                      setInternationalCurrency(
                        destination?.currency ||
                          ""
                      );

                      setInternationalRecipient(
                        null
                      );

                      setInternationalRecipientStatus(
                        "idle"
                      );

                      setError("");
                    }}
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-[#07141f] px-4 py-4 text-sm text-white outline-none focus:border-emerald-300/30"
                  >

                    <option value="">
                      Select destination
                    </option>

                    {countries.map(
                      (destination) => (
                        <option
                          key={`${destination.country}-${destination.currency}`}
                          value={
                            destination.country
                          }
                        >
                          {
                            destination.country
                          }{" "}
                          ·{" "}
                          {
                            destination.currency
                          }
                        </option>
                      )
                    )}

                  </select>

                </div>


                <div>

                  <label
                    htmlFor="international-currency"
                    className="text-xs font-medium uppercase tracking-wider text-white/30"
                  >
                    Destination currency
                  </label>

                  <select
                    id="international-currency"
                    value={
                      internationalCurrency
                    }
                    onChange={(event) => {

                      setInternationalCurrency(
                        event.target.value
                      );

                      setInternationalRecipient(
                        null
                      );

                      setInternationalRecipientStatus(
                        "idle"
                      );

                      setError("");
                    }}
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-[#07141f] px-4 py-4 text-sm text-white outline-none focus:border-emerald-300/30"
                  >

                    <option value="">
                      Select currency
                    </option>

                    {Array.from(
                      new Set(
                        countries.map(
                          (item) =>
                            item.currency
                        )
                      )
                    ).map(
                      (currency) => (
                        <option
                          key={currency}
                          value={currency}
                        >
                          {currency}
                        </option>
                      )
                    )}

                  </select>

                </div>

              </div>


              {/* ACCOUNT NUMBER */}

              <div className="mt-6">

                <label
                  htmlFor="international-account"
                  className="text-xs font-medium uppercase tracking-wider text-white/30"
                >
                  Recipient account number
                </label>

                <input
                  id="international-account"
                  value={
                    internationalAccountNumber
                  }
                  onChange={(event) => {

                    setInternationalAccountNumber(
                      event.target.value
                    );

                    setInternationalRecipient(
                      null
                    );

                    setInternationalRecipientStatus(
                      "idle"
                    );

                    setError("");
                  }}
                  placeholder="Enter recipient account number"
                  autoComplete="off"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm outline-none placeholder:text-white/20 focus:border-emerald-300/30"
                />

              </div>


              {/* IBAN */}

              <div className="mt-5">

                <label
                  htmlFor="international-iban"
                  className="text-xs font-medium uppercase tracking-wider text-white/30"
                >
                  IBAN
                </label>

                <input
                  id="international-iban"
                  value={
                    internationalIban
                  }
                  onChange={(event) => {

                    setInternationalIban(
                      event.target.value
                        .replace(
                          /\s/g,
                          ""
                        )
                        .toUpperCase()
                    );

                    setInternationalRecipient(
                      null
                    );

                    setInternationalRecipientStatus(
                      "idle"
                    );

                    setError("");
                  }}
                  placeholder="Enter IBAN if required"
                  autoComplete="off"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm uppercase outline-none placeholder:text-white/20 focus:border-emerald-300/30"
                />

              </div>


              {/* SWIFT */}

              <div className="mt-5">

                <label
                  htmlFor="international-swift"
                  className="text-xs font-medium uppercase tracking-wider text-white/30"
                >
                  SWIFT / BIC
                </label>

                <input
                  id="international-swift"
                  value={
                    internationalSwift
                  }
                  onChange={(event) => {

                    setInternationalSwift(
                      event.target.value
                        .replace(
                          /\s/g,
                          ""
                        )
                        .toUpperCase()
                    );

                    setInternationalRecipient(
                      null
                    );

                    setInternationalRecipientStatus(
                      "idle"
                    );

                    setError("");
                  }}
                  maxLength={11}
                  placeholder="e.g. CHASUS33"
                  autoComplete="off"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm uppercase outline-none placeholder:text-white/20 focus:border-emerald-300/30"
                />

              </div>


              {/* VERIFICATION */}

              {internationalRecipientStatus ===
                "checking" && (
                <StatusMessage>
                  Verifying international
                  banking details...
                </StatusMessage>
              )}

              {internationalRecipientStatus ===
                "verified" &&
                internationalRecipient && (
                <RecipientCard
                  name={
                    internationalRecipient.account_name ||
                    "Verified recipient"
                  }
                  accountNumber={
                    internationalRecipient.account_number
                  }
                  bankName={
                    internationalRecipient.bank_name ||
                    "International bank"
                  }
                  currency={
                    internationalRecipient.currency ||
                    internationalCurrency
                  }
                />
              )}

              {internationalRecipientStatus ===
                "not-found" && (
                <StatusMessage error>
                  International recipient
                  could not be verified.
                </StatusMessage>
              )}


              {/* AMOUNT */}

              <div className="mt-7">

                <label
                  htmlFor="international-amount"
                  className="text-xs font-medium uppercase tracking-wider text-white/30"
                >
                  Transfer amount
                </label>

                <div className="relative mt-3">

                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-white/35">
                    {
                      internationalCurrency ||
                      "—"
                    }
                  </span>

                  <input
                    id="international-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      internationalAmount
                    }
                    onChange={(event) => {

                      const value =
                        event.target.value;

                      setInternationalAmount(
                        value
                      );

                      setError("");

                      const numericValue =
                        Number(value);

                      if (
                        Number.isFinite(
                          numericValue
                        ) &&
                        numericValue > 0
                      ) {
                        setInternationalTotal(
                          Number(
                            (
                              numericValue +
                              internationalFee
                            ).toFixed(2)
                          )
                        );
                      } else {
                        setInternationalTotal(
                          0
                        );
                      }
                    }}
                    placeholder="0.00"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-4 pl-20 pr-4 text-2xl font-bold outline-none placeholder:text-white/15 focus:border-emerald-300/30"
                  />

                </div>

                {selectedAccount && (
                  <p className="mt-2 text-xs text-white/25">
                    Available balance:{" "}
                    {formatMoney(
                      selectedAccount.balance,
                      selectedAccount.currency
                    )}
                  </p>
                )}

              </div>


              {/* FEE */}

              {Number(
                internationalAmount
              ) > 0 && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">

                  <div className="flex items-center justify-between text-sm">

                    <span className="text-white/40">
                      Transfer amount
                    </span>

                    <span>
                      {formatMoney(
                        internationalAmount,
                        internationalCurrency ||
                          "USD"
                      )}
                    </span>

                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">

                    <span className="text-white/40">
                      International fee
                    </span>

                    <span>
                      {formatMoney(
                        internationalFee,
                        internationalCurrency ||
                          "USD"
                      )}
                    </span>

                  </div>

                  <div className="mt-4 border-t border-white/10 pt-4">

                    <div className="flex items-center justify-between">

                      <span className="font-semibold">
                        Total debit
                      </span>

                      <span className="text-xl font-bold text-emerald-300">
                        {formatMoney(
                          internationalTotal,
                          internationalCurrency ||
                            "USD"
                        )}
                      </span>

                    </div>

                  </div>

                </div>
              )}


              {/* NARRATION */}

              <div className="mt-7">

                <label
                  htmlFor="international-description"
                  className="text-xs font-medium uppercase tracking-wider text-white/30"
                >
                  Narration
                </label>

                <input
                  id="international-description"
                  value={
                    internationalDescription
                  }
                  maxLength={255}
                  onChange={(event) =>
                    setInternationalDescription(
                      event.target.value
                    )
                  }
                  placeholder="Optional transfer description"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-sm outline-none placeholder:text-white/20 focus:border-emerald-300/30"
                />

              </div>


              {/* REVIEW */}

              <button
                type="button"
                disabled={
                  !selectedAccount ||
                  !selectedCountry ||
                  !internationalCurrency ||
                  internationalRecipientStatus !==
                    "verified" ||
                  !internationalRecipient ||
                  !internationalAmount
                }
                onClick={
                  continueInternational
                }
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-300 py-4 text-sm font-bold text-[#031421] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
              >

                Review international transfer

                <ArrowRight
                  size={17}
                />

              </button>

            </>
          )}


          {step === "preview" && (
            <InternationalPreview
              selectedAccount={
                selectedAccount
              }
              recipient={
                internationalRecipient
              }
              country={
                selectedCountry
              }
              currency={
                internationalCurrency
              }
              accountNumber={
                internationalAccountNumber
              }
              iban={
                internationalIban
              }
              swift={
                internationalSwift
              }
              amount={
                internationalAmount
              }
              fee={
                internationalFee
              }
              total={
                internationalTotal
              }
              description={
                internationalDescription
              }
              formatMoney={
                formatMoney
              }
              processing={
                processing
              }
              onBack={() =>
                setStep("form")
              }
              onConfirm={openPinAuthorization}
            />
          )}

        </section>
      )}


      {/* ==========================================================
          TRANSACTION PIN AUTHORIZATION
      ========================================================== */}

      {showPinModal && (
        <TransactionPinModal
          pin={transactionPin}
          setPin={setTransactionPin}
          showPin={showTransactionPin}
          setShowPin={setShowTransactionPin}
          error={pinError}
          submitting={pinSubmitting}
          onClose={closePinAuthorization}
          onConfirm={submitPinAuthorization}
        />
      )}

      {/* ==========================================================
          SECURITY
      ========================================================== */}

      <div className="mt-6 flex items-center gap-3 px-1 text-xs text-white/25">

        <ShieldCheck
          size={15}
          className="text-emerald-300/60"
        />

        Transfers are authenticated,
        validated and processed by
        the NovaBank backend.

      </div>

    </main>
  );
}


/* ================================================================
   STATUS MESSAGE
================================================================ */

function StatusMessage({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={
        error
          ? "mt-3 flex items-center gap-2 text-xs text-red-300"
          : "mt-3 flex items-center gap-2 text-xs text-white/35"
      }
    >
      {error ? (
        <AlertCircle size={14} />
      ) : (
        <Loader2
          size={14}
          className="animate-spin"
        />
      )}

      {children}
    </div>
  );
}


/* ================================================================
   RECIPIENT CARD
================================================================ */

function RecipientCard({
  name,
  accountNumber,
  bankName,
  currency,
}: {
  name: string;
  accountNumber: string;
  bankName: string;
  currency: string;
}) {
  return (
    <div className="mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.05] p-4">

      <div className="flex items-center justify-between gap-4">

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-300/10">

            <CheckCircle2
              size={19}
              className="text-emerald-300"
            />

          </div>

          <div>

            <p className="text-sm font-semibold text-emerald-100">
              {name}
            </p>

            <p className="mt-1 text-xs text-white/35">
              {bankName}
            </p>

            <p className="mt-1 font-mono text-xs text-white/35">
              ••••{" "}
              {accountNumber.slice(
                -4
              )}
            </p>

          </div>

        </div>

        <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-[10px] font-semibold text-emerald-300">
          {currency}
        </span>

      </div>

    </div>
  );
}


/* ================================================================
   NOVABANK PREVIEW
================================================================ */

function NovaPreview({
  selectedAccount,
  recipient,
  amount,
  description,
  formatMoney,
  processing,
  onBack,
  onConfirm,
}: {
  selectedAccount: Account | null;
  recipient: Recipient | null;
  amount: string;
  description: string;
  formatMoney: (
    value: string | number,
    currency: string
  ) => string;
  processing: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div>

      <button
        type="button"
        onClick={onBack}
        disabled={processing}
        className="mb-7 flex items-center gap-2 text-sm text-white/40 transition hover:text-white disabled:opacity-40"
      >

        <ArrowLeft size={16} />

        Back

      </button>

      <p className="text-sm font-medium text-emerald-300">
        Review
      </p>

      <h2 className="mt-1 text-2xl font-bold">
        Confirm your transfer
      </h2>

      <p className="mt-2 text-sm text-white/35">
        Review the details before
        sending.
      </p>


      <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.02] p-5">

        <p className="text-[10px] uppercase tracking-wider text-white/25">
          From
        </p>

        <div className="mt-3 flex items-center justify-between gap-4">

          <div>

            <p className="font-semibold">
              {
                selectedAccount?.account_type
              }
            </p>

            <p className="mt-1 font-mono text-xs text-white/35">
              ••••{" "}
              {
                selectedAccount?.account_number.slice(
                  -4
                )
              }
            </p>

          </div>

          <p className="font-semibold">
            {formatMoney(
              amount,
              selectedAccount?.currency ||
                "NGN"
            )}
          </p>

        </div>

      </div>


      <div className="flex justify-center py-4">

        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">

          <ArrowRight
            size={16}
            className="text-emerald-300"
          />

        </div>

      </div>


      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">

        <p className="text-[10px] uppercase tracking-wider text-white/25">
          To
        </p>

        <div className="mt-3 flex items-center justify-between gap-4">

          <div>

            <p className="font-semibold">
              {recipient?.full_name ||
                "NovaBank customer"}
            </p>

            <p className="mt-1 text-xs text-white/35">
              NovaBank
            </p>

            <p className="mt-1 font-mono text-xs text-white/35">
              ••••{" "}
              {
                recipient?.account_number.slice(
                  -4
                )
              }
            </p>

          </div>

          <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-[10px] font-semibold text-emerald-300">
            Verified
          </span>

        </div>

      </div>


      <div className="mt-6 rounded-2xl bg-emerald-300/[0.06] p-6 text-center">

        <p className="text-xs text-white/35">
          Amount
        </p>

        <p className="mt-2 text-3xl font-bold text-emerald-300">
          {formatMoney(
            amount,
            selectedAccount?.currency ||
              "NGN"
          )}
        </p>

      </div>


      {description && (
        <div className="mt-4 rounded-2xl border border-white/10 p-5">

          <p className="text-[10px] uppercase tracking-wider text-white/25">
            Narration
          </p>

          <p className="mt-2 text-sm text-white/60">
            {description}
          </p>

        </div>
      )}


      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">

        <ShieldCheck
          size={18}
          className="text-emerald-300"
        />

        <p className="text-xs leading-5 text-white/35">
          Your account will be debited
          and the recipient will receive
          the transfer immediately.
        </p>

      </div>


      <div className="mt-7 flex gap-3">

        <button
          type="button"
          onClick={onBack}
          disabled={processing}
          className="flex-1 rounded-2xl border border-white/10 py-4 text-sm font-semibold text-white/60 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={processing}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-300 py-4 text-sm font-bold text-[#031421] transition hover:bg-emerald-200 disabled:opacity-40"
        >

          {processing ? (
            <>
              <Loader2
                size={18}
                className="animate-spin"
              />

              Sending...
            </>
          ) : (
            <>
              <Send size={17} />

              Confirm transfer
            </>
          )}

        </button>

      </div>

    </div>
  );
}


/* ================================================================
   EXTERNAL PREVIEW
================================================================ */

function ExternalPreview({
  selectedAccount,
  selectedBank,
  recipient,
  amount,
  fee,
  total,
  description,
  formatMoney,
  processing,
  onBack,
  onConfirm,
}: {
  selectedAccount: Account | null;
  selectedBank: Bank | null;
  recipient: Recipient | null;
  amount: string;
  fee: number;
  total: number;
  description: string;
  formatMoney: (
    value: string | number,
    currency: string
  ) => string;
  processing: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div>

      <button
        type="button"
        onClick={onBack}
        disabled={processing}
        className="mb-7 flex items-center gap-2 text-sm text-white/40 transition hover:text-white disabled:opacity-40"
      >

        <ArrowLeft size={16} />

        Back

      </button>

      <p className="text-sm font-medium text-emerald-300">
        Review
      </p>

      <h2 className="mt-1 text-2xl font-bold">
        Confirm external transfer
      </h2>

      <p className="mt-2 text-sm text-white/35">
        Review the recipient and
        charges carefully.
      </p>


      {/* FROM */}

      <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.02] p-5">

        <p className="text-[10px] uppercase tracking-wider text-white/25">
          From
        </p>

        <div className="mt-3 flex items-center justify-between gap-4">

          <div>

            <p className="font-semibold">
              {
                selectedAccount?.account_type
              }
            </p>

            <p className="mt-1 font-mono text-xs text-white/35">
              ••••{" "}
              {
                selectedAccount?.account_number.slice(
                  -4
                )
              }
            </p>

          </div>

          <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-semibold text-white/40">
            NGN
          </span>

        </div>

      </div>


      {/* ARROW */}

      <div className="flex justify-center py-4">

        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">

          <ArrowRight
            size={16}
            className="text-emerald-300"
          />

        </div>

      </div>


      {/* RECIPIENT */}

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">

        <div className="flex items-start justify-between gap-4">

          <div>

            <p className="text-[10px] uppercase tracking-wider text-white/25">
              Recipient
            </p>

            <p className="mt-3 text-lg font-semibold">
              {
                recipient?.account_name
              }
            </p>

            <p className="mt-1 text-sm text-white/40">
              {
                selectedBank?.bank_name
              }
            </p>

            <p className="mt-2 font-mono text-xs text-white/30">
              {
                recipient?.account_number
              }
            </p>

          </div>

          <CheckCircle2
            size={20}
            className="shrink-0 text-emerald-300"
          />

        </div>

      </div>


      {/* AMOUNT BREAKDOWN */}

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">

        <div className="flex items-center justify-between text-sm">

          <span className="text-white/40">
            Transfer amount
          </span>

          <span>
            {formatMoney(
              amount,
              "NGN"
            )}
          </span>

        </div>

        <div className="mt-4 flex items-center justify-between text-sm">

          <span className="text-white/40">
            Transfer fee
          </span>

          <span>
            {formatMoney(
              fee,
              "NGN"
            )}
          </span>

        </div>

        <div className="mt-5 border-t border-white/10 pt-5">

          <div className="flex items-center justify-between">

            <span className="font-semibold">
              Total debit
            </span>

            <span className="text-2xl font-bold text-emerald-300">
              {formatMoney(
                total,
                "NGN"
              )}
            </span>

          </div>

        </div>

      </div>


      {/* DESCRIPTION */}

      {description && (
        <div className="mt-4 rounded-2xl border border-white/10 p-5">

          <p className="text-[10px] uppercase tracking-wider text-white/25">
            Narration
          </p>

          <p className="mt-2 text-sm text-white/60">
            {description}
          </p>

        </div>
      )}


      {/* SECURITY */}

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.04] p-4">

        <ShieldCheck
          size={18}
          className="mt-0.5 shrink-0 text-emerald-300"
        />

        <p className="text-xs leading-5 text-white/35">

          The recipient will receive{" "}
          <span className="font-semibold text-white/60">
            {formatMoney(
              amount,
              "NGN"
            )}
          </span>
          . Your NovaBank account will
          be debited{" "}
          <span className="font-semibold text-white/60">
            {formatMoney(
              total,
              "NGN"
            )}
          </span>{" "}
          including the transfer fee.

        </p>

      </div>


      {/* ACTIONS */}

      <div className="mt-7 flex gap-3">

        <button
          type="button"
          onClick={onBack}
          disabled={processing}
          className="flex-1 rounded-2xl border border-white/10 py-4 text-sm font-semibold text-white/60 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={processing}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-300 py-4 text-sm font-bold text-[#031421] transition hover:bg-emerald-200 disabled:opacity-40"
        >

          {processing ? (
            <>
              <Loader2
                size={18}
                className="animate-spin"
              />

              Sending...
            </>
          ) : (
            <>
              <Send size={17} />

              Confirm transfer
            </>
          )}

        </button>

      </div>

    </div>
  );
}


/* ================================================================
   TRANSACTION PIN MODAL
================================================================ */

function TransactionPinModal({
  pin,
  setPin,
  showPin,
  setShowPin,
  error,
  submitting,
  onClose,
  onConfirm,
}: {
  pin: string;
  setPin: (value: string) => void;
  showPin: boolean;
  setShowPin: (value: boolean) => void;
  error: string;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-pin-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-[#071824] shadow-2xl">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-300/10">
              <ShieldCheck
                size={21}
                className="text-emerald-300"
              />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300/70">
                Authorization
              </p>

              <h2
                id="transaction-pin-title"
                className="mt-1 text-lg font-bold"
              >
                Enter transaction PIN
              </h2>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          <p className="text-sm leading-6 text-white/40">
            Confirm this transfer with your 6-digit
            transaction PIN. Your PIN is verified securely
            by NovaBank and is never displayed or stored
            by this page.
          </p>

          <label
            htmlFor="transaction-pin"
            className="mt-6 block text-xs font-medium uppercase tracking-wider text-white/30"
          >
            Transaction PIN
          </label>

          <div className="relative mt-3">
            <input
              id="transaction-pin"
              type={showPin ? "text" : "password"}
              value={pin}
              onChange={(event) => {
                const value = event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 6);

                setPin(value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onConfirm();
                }

                if (event.key === "Escape" && !submitting) {
                  event.preventDefault();
                  onClose();
                }
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              disabled={submitting}
              placeholder="••••••"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 pr-14 text-center text-2xl font-bold tracking-[0.45em] text-white outline-none placeholder:text-white/15 focus:border-emerald-300/40 disabled:opacity-50"
            />

            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              disabled={submitting}
              aria-label={
                showPin
                  ? "Hide transaction PIN"
                  : "Show transaction PIN"
              }
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-2 text-white/35 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
            >
              {showPin ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-white/25">
              {pin.length}/6 digits
            </p>

            {error && (
              <p className="text-right text-xs text-red-300">
                {error}
              </p>
            )}
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.04] p-4">
            <ShieldCheck
              size={17}
              className="mt-0.5 shrink-0 text-emerald-300"
            />

            <p className="text-xs leading-5 text-white/35">
              Never share your transaction PIN with anyone.
              NovaBank will not ask you to disclose it outside
              this secure authorization step.
            </p>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-2xl border border-white/10 py-3.5 text-sm font-semibold text-white/60 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting || pin.length !== 6}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-300 py-3.5 text-sm font-bold text-[#031421] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                  Authorizing...
                </>
              ) : (
                <>
                  <ShieldCheck size={17} />
                  Authorize transfer
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ================================================================
   TRANSFER STAGE
================================================================ */

function TransferStage({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 p-5">

      <div className="flex items-center gap-3">

        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-xs font-bold text-white/50">
          {number}
        </span>

        <p className="text-sm font-semibold">
          {title}
        </p>

      </div>

      <p className="mt-3 text-xs leading-5 text-white/30">
        {description}
      </p>

    </div>
  );
}


/* ================================================================
   INTERNATIONAL PREVIEW
================================================================ */

function InternationalPreview({
  selectedAccount,
  recipient,
  country,
  currency,
  accountNumber,
  iban,
  swift,
  amount,
  fee,
  total,
  description,
  formatMoney,
  processing,
  onBack,
  onConfirm,
}: {
  selectedAccount: Account | null;
  recipient: any;
  country: string;
  currency: string;
  accountNumber: string;
  iban: string;
  swift: string;
  amount: string;
  fee: number;
  total: number;
  description: string;
  formatMoney: (
    value: string | number,
    currency: string
  ) => string;
  processing: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div>

      <button
        type="button"
        onClick={onBack}
        disabled={processing}
        className="mb-7 flex items-center gap-2 text-sm text-white/40 transition hover:text-white disabled:opacity-40"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <p className="text-sm font-medium text-emerald-300">
        Review
      </p>

      <h2 className="mt-1 text-2xl font-bold">
        Confirm international transfer
      </h2>

      <p className="mt-2 text-sm leading-6 text-white/35">
        Verify the recipient, destination,
        amount and total debit before
        confirming.
      </p>


      {/* RECIPIENT */}

      <div className="mt-7 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.04] p-5">

        <div className="flex items-start justify-between gap-4">

          <div>

            <p className="text-[10px] uppercase tracking-wider text-white/25">
              Recipient
            </p>

            <p className="mt-3 text-lg font-bold">
              {
                recipient?.account_name ||
                "Verified recipient"
              }
            </p>

            <p className="mt-1 text-sm text-white/40">
              {
                recipient?.bank_name ||
                "International bank"
              }
            </p>

            <p className="mt-1 text-xs text-white/30">
              {country}
            </p>

          </div>

          <CheckCircle2
            size={20}
            className="text-emerald-300"
          />

        </div>

      </div>


      {/* BANK DETAILS */}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">

          <p className="text-[10px] uppercase tracking-wider text-white/25">
            Account
          </p>

          <p className="mt-2 break-all font-mono text-sm text-white/65">
            {accountNumber || iban}
          </p>

        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">

          <p className="text-[10px] uppercase tracking-wider text-white/25">
            SWIFT / BIC
          </p>

          <p className="mt-2 font-mono text-sm text-white/65">
            {swift}
          </p>

        </div>

      </div>


      {/* AMOUNT */}

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6">

        <div className="flex items-center justify-between text-sm">

          <span className="text-white/40">
            Transfer amount
          </span>

          <span>
            {formatMoney(
              amount,
              currency
            )}
          </span>

        </div>

        <div className="mt-4 flex items-center justify-between text-sm">

          <span className="text-white/40">
            International fee
          </span>

          <span>
            {formatMoney(
              fee,
              currency
            )}
          </span>

        </div>

        <div className="mt-5 border-t border-white/10 pt-5">

          <div className="flex items-center justify-between">

            <span className="font-semibold">
              Total debit
            </span>

            <span className="text-2xl font-bold text-emerald-300">
              {formatMoney(
                total,
                currency
              )}
            </span>

          </div>

        </div>

      </div>


      {/* DESCRIPTION */}

      {description && (
        <div className="mt-4 rounded-2xl border border-white/10 p-5">

          <p className="text-[10px] uppercase tracking-wider text-white/25">
            Narration
          </p>

          <p className="mt-2 text-sm text-white/60">
            {description}
          </p>

        </div>
      )}


      {/* SECURITY */}

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.04] p-4">

        <ShieldCheck
          size={18}
          className="mt-0.5 shrink-0 text-emerald-300"
        />

        <p className="text-xs leading-5 text-white/35">

          Your account will be debited{" "}

          <span className="font-semibold text-white/65">
            {formatMoney(
              total,
              currency
            )}
          </span>

          .

        </p>

      </div>


      {/* ACTIONS */}

      <div className="mt-7 flex gap-3">

        <button
          type="button"
          onClick={onBack}
          disabled={processing}
          className="flex-1 rounded-2xl border border-white/10 py-4 text-sm font-semibold text-white/60 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={processing}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-300 py-4 text-sm font-bold text-[#031421] transition hover:bg-emerald-200 disabled:opacity-40"
        >

          {processing ? (
            <>
              <Loader2
                size={18}
                className="animate-spin"
              />

              Sending...
            </>
          ) : (
            <>
              <Send size={17} />

              Confirm transfer
            </>
          )}

        </button>

      </div>

    </div>
  );
}