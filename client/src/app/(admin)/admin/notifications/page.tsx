"use client";

import {
  Bell,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  MailOpen,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "@/lib/api";

type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
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
    notifications: Notification[];
    pagination: Pagination;
    filters?: {
      search: string | null;
      read: boolean | null;
    };
  };
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [pagination, setPagination] =
    useState<Pagination>({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
    });

  const [search, setSearch] =
    useState("");

  const [readFilter, setReadFilter] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [actionId, setActionId] =
    useState<string | null>(null);

  const [markingAll, setMarkingAll] =
    useState(false);

  const loadNotifications =
    useCallback(
      async (
        requestedPage = 1,
        showRefresh = false
      ) => {
        try {
          setError("");

          if (showRefresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          const params = new URLSearchParams();

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

          if (readFilter) {
            params.set(
              "read",
              readFilter
            );
          }

          const response =
            await api.get<ApiResponse>(
              `/admin/notifications?${params.toString()}`
            );

          const data =
            response.data;

          if (!data.success) {
            throw new Error(
              data.message ||
                "Unable to retrieve notifications."
            );
          }

          setNotifications(
            data.data?.notifications || []
          );

          setPagination(
            data.data?.pagination || {
              page: requestedPage,
              limit: 20,
              total: 0,
              totalPages: 1,
            }
          );
        } catch (requestError: any) {
          console.error(
            "Admin notifications error:",
            requestError
          );

          setError(
            requestError.response?.data?.message ||
              requestError.message ||
              "Unable to retrieve notifications."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [search, readFilter]
    );

  useEffect(() => {
    loadNotifications(1);
  }, [
    search,
    readFilter,
    loadNotifications,
  ]);

  const unreadOnPage = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          !notification.is_read
      ).length,
    [notifications]
  );

  const readOnPage = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          notification.is_read
      ).length,
    [notifications]
  );

  async function markAsRead(
    notificationId: string
  ) {
    try {
      setActionId(notificationId);

      await api.patch(
        `/admin/notifications/${notificationId}/read`
      );

      setNotifications(
        (current) =>
          current.map(
            (notification) =>
              notification.id ===
              notificationId
                ? {
                    ...notification,
                    is_read: true,
                  }
                : notification
          )
      );
    } catch (requestError: any) {
      console.error(
        "Mark notification read error:",
        requestError
      );

      setError(
        requestError.response?.data?.message ||
          "Unable to mark notification as read."
      );
    } finally {
      setActionId(null);
    }
  }

  async function markAllAsRead() {
    if (unreadOnPage === 0) {
      return;
    }

    try {
      setMarkingAll(true);

      await api.patch(
        "/admin/notifications/read-all"
      );

      setNotifications(
        (current) =>
          current.map(
            (notification) => ({
              ...notification,
              is_read: true,
            })
          )
      );
    } catch (requestError: any) {
      console.error(
        "Mark all notifications read error:",
        requestError
      );

      setError(
        requestError.response?.data?.message ||
          "Unable to mark all notifications as read."
      );
    } finally {
      setMarkingAll(false);
    }
  }

  function handleRefresh() {
    loadNotifications(
      pagination.page,
      true
    );
  }

  function goToPage(page: number) {
    if (
      page < 1 ||
      page > pagination.totalPages
    ) {
      return;
    }

    loadNotifications(page);
  }

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
              Notifications
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-white/40">
              Monitor customer notifications
              and notification activity across
              NovaBank.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={
                markingAll ||
                unreadOnPage === 0
              }
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-2.5 text-sm font-medium text-white/65 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CheckCheck size={17} />

              {markingAll
                ? "Marking..."
                : "Mark all as read"}
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-2.5 text-sm font-medium text-white/65 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />
              Refresh
            </button>
          </div>
        </div>

        {/* SUMMARY */}

        <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">

          <SummaryCard
            icon={<Bell size={19} />}
            label="Total notifications"
            value={pagination.total}
          />

          <SummaryCard
            icon={<MailOpen size={19} />}
            label="Read on page"
            value={readOnPage}
          />

          <SummaryCard
            icon={<Bell size={19} />}
            label="Unread on page"
            value={unreadOnPage}
          />

        </div>

        {/* FILTERS */}

        <section className="mb-7 rounded-2xl border border-white/10 bg-white/[0.025] p-3">
          <div className="flex flex-col gap-3 lg:flex-row">

            <div className="relative flex-1">
              <Search
                size={19}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search customer, email, title or message..."
                className="h-12 w-full rounded-xl border border-white/10 bg-[#071c2a] pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-emerald-300/30"
              />
            </div>

            <select
              value={readFilter}
              onChange={(event) =>
                setReadFilter(
                  event.target.value
                )
              }
              className="h-12 rounded-xl border border-white/10 bg-[#071c2a] px-4 text-sm text-white/70 outline-none focus:border-emerald-300/30"
            >
              <option value="">
                All notifications
              </option>

              <option value="false">
                Unread only
              </option>

              <option value="true">
                Read only
              </option>
            </select>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setReadFilter("");
              }}
              className="h-12 rounded-xl border border-white/10 px-5 text-sm text-white/45 transition hover:bg-white/5 hover:text-white"
            >
              Clear
            </button>

          </div>
        </section>

        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/5 px-5 py-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* CONTENT */}

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">

          <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
            <div>
              <h2 className="font-semibold text-white">
                Customer notifications
              </h2>

              <p className="mt-1 text-xs text-white/35">
                {pagination.total} total
                notification
                {pagination.total === 1
                  ? ""
                  : "s"}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-white/35">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Live database
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-white/40">
                <RefreshCw
                  size={18}
                  className="animate-spin text-emerald-300"
                />
                Loading notifications...
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white/35">
                <Bell size={24} />
              </div>

              <h3 className="mt-5 text-lg font-semibold text-white">
                No notifications found
              </h3>

              <p className="mt-2 max-w-md text-sm text-white/35">
                There are no notifications
                matching the current filters.
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-white/10">

                {notifications.map(
                  (notification) => (
                    <article
                      key={
                        notification.id
                      }
                      className={`px-5 py-5 transition hover:bg-white/[0.02] ${
                        !notification.is_read
                          ? "bg-emerald-300/[0.015]"
                          : ""
                      }`}
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                        <div className="flex min-w-0 gap-4">

                          <div className="relative shrink-0">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-300/10 text-sm font-bold text-emerald-300">
                              {getInitials(
                                notification.customer_name
                              )}
                            </div>

                            {!notification.is_read && (
                              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#071c2a] bg-emerald-300" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">

                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-white">
                                {notification.title}
                              </h3>

                              {!notification.is_read && (
                                <span className="rounded-full bg-emerald-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                                  Unread
                                </span>
                              )}

                              {notification.is_read && (
                                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/35">
                                  Read
                                </span>
                              )}
                            </div>

                            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">
                              {notification.message}
                            </p>

                            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/30">

                              <span className="inline-flex items-center gap-1.5">
                                <UserRound size={14} />
                                {notification.customer_name}
                              </span>

                              <span>
                                {notification.customer_email}
                              </span>

                              <span>
                                {formatDate(
                                  notification.created_at
                                )}
                              </span>

                            </div>
                          </div>
                        </div>

                        {!notification.is_read && (
                          <button
                            type="button"
                            onClick={() =>
                              markAsRead(
                                notification.id
                              )
                            }
                            disabled={
                              actionId ===
                              notification.id
                            }
                            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-emerald-300/20 bg-emerald-300/5 px-4 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-300/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Check size={16} />

                            {actionId ===
                            notification.id
                              ? "Saving..."
                              : "Mark as read"}
                          </button>
                        )}

                      </div>
                    </article>
                  )
                )}

              </div>

              {/* PAGINATION */}

              <div className="flex flex-col gap-4 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

                <p className="text-xs text-white/35">
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
                    onClick={() =>
                      goToPage(
                        pagination.page - 1
                      )
                    }
                    disabled={
                      pagination.page <= 1
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/50 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Previous page"
                  >
                    <ChevronLeft
                      size={17}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      goToPage(
                        pagination.page + 1
                      )
                    }
                    disabled={
                      pagination.page >=
                      pagination.totalPages
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/50 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Next page"
                  >
                    <ChevronRight
                      size={17}
                    />
                  </button>

                </div>
              </div>
            </>
          )}
        </section>

      </div>
    </main>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-300">
        {icon}
      </div>

      <p className="mt-5 text-sm text-white/40">
        {label}
      </p>

      <p className="mt-1 text-3xl font-bold tracking-tight text-white">
        {value}
      </p>
    </div>
  );
}
