"use client";

import Link from "next/link";
import {
  Bell,
  Check,
  CheckCheck,
  Loader2,
  Menu,
  Search,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import api from "@/lib/api";

type HeaderProps = {
  onOpenMobile: () => void;
};

type Notification = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

type NotificationsResponse = {
  success: boolean;
  data?: {
    notifications: Notification[];
  };
  message?: string;
};

type UnreadCountResponse = {
  success: boolean;
  data?: {
    count: number;
  };
  message?: string;
};

export default function Header({
  onOpenMobile,
}: HeaderProps) {
  /*
   * ================================================================
   * NOTIFICATION STATE
   * ================================================================
   */

  const [
    notificationsOpen,
    setNotificationsOpen,
  ] = useState(false);

  const [
    notifications,
    setNotifications,
  ] = useState<Notification[]>([]);

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const [
    notificationsLoading,
    setNotificationsLoading,
  ] = useState(false);

  const [
    notificationsError,
    setNotificationsError,
  ] = useState("");

  const [
    markingAllRead,
    setMarkingAllRead,
  ] = useState(false);

  const [
    markingReadId,
    setMarkingReadId,
  ] = useState<string | null>(null);

  const notificationRef =
    useRef<HTMLDivElement | null>(null);


  /*
   * ================================================================
   * LOAD UNREAD COUNT
   * ================================================================
   */

  const loadUnreadCount =
    async () => {
      try {
        const response =
          await api.get<UnreadCountResponse>(
            "/notifications/unread-count"
          );

        if (
          !response.data.success
        ) {
          return;
        }

        setUnreadCount(
          Number(
            response.data.data?.count ||
              0
          )
        );
      } catch (error) {
        console.error(
          "Unread notification count error:",
          error
        );
      }
    };


  /*
   * ================================================================
   * LOAD NOTIFICATIONS
   * ================================================================
   */

  const loadNotifications =
    async () => {
      try {
        setNotificationsLoading(
          true
        );

        setNotificationsError("");

        const response =
          await api.get<NotificationsResponse>(
            "/notifications?limit=20"
          );

        if (
          !response.data.success
        ) {
          throw new Error(
            response.data.message ||
              "Unable to retrieve notifications."
          );
        }

        setNotifications(
          response.data.data
            ?.notifications || []
        );
      } catch (error: any) {
        console.error(
          "Notifications loading error:",
          error
        );

        setNotificationsError(
          error.response?.data?.message ||
            "Unable to load notifications."
        );
      } finally {
        setNotificationsLoading(
          false
        );
      }
    };


  /*
   * ================================================================
   * INITIAL UNREAD COUNT
   * ================================================================
   */

  useEffect(() => {
    loadUnreadCount();

    /*
     * Refresh the unread count periodically.
     *
     * This keeps the notification badge reasonably
     * current without requiring a websocket yet.
     */

    const interval =
      window.setInterval(
        loadUnreadCount,
        30000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, []);


  /*
   * ================================================================
   * LOAD NOTIFICATIONS WHEN OPENED
   * ================================================================
   */

  useEffect(() => {
    if (
      notificationsOpen
    ) {
      loadNotifications();
    }
  }, [
    notificationsOpen,
  ]);


  /*
   * ================================================================
   * CLOSE WHEN CLICKING OUTSIDE
   * ================================================================
   */

  useEffect(() => {
    const handleClickOutside =
      (event: MouseEvent) => {
        if (
          !notificationRef.current
        ) {
          return;
        }

        if (
          !notificationRef.current.contains(
            event.target as Node
          )
        ) {
          setNotificationsOpen(
            false
          );
        }
      };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);


  /*
   * ================================================================
   * MARK ONE AS READ
   * ================================================================
   */

  const markAsRead =
    async (
      notificationId: string
    ) => {
      try {
        setMarkingReadId(
          notificationId
        );

        const response =
          await api.patch(
            `/notifications/${notificationId}/read`
          );

        if (
          !response.data.success
        ) {
          throw new Error(
            response.data.message ||
              "Unable to mark notification as read."
          );
        }

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

        setUnreadCount(
          (current) =>
            Math.max(
              0,
              current - 1
            )
        );
      } catch (error) {
        console.error(
          "Mark notification as read error:",
          error
        );
      } finally {
        setMarkingReadId(
          null
        );
      }
    };


  /*
   * ================================================================
   * MARK ALL AS READ
   * ================================================================
   */

  const markAllAsRead =
    async () => {
      if (
        unreadCount === 0
      ) {
        return;
      }

      try {
        setMarkingAllRead(
          true
        );

        const response =
          await api.patch(
            "/notifications/read-all"
          );

        if (
          !response.data.success
        ) {
          throw new Error(
            response.data.message ||
              "Unable to mark all notifications as read."
          );
        }

        setNotifications(
          (current) =>
            current.map(
              (notification) => ({
                ...notification,
                is_read: true,
              })
            )
        );

        setUnreadCount(0);
      } catch (error) {
        console.error(
          "Mark all notifications read error:",
          error
        );
      } finally {
        setMarkingAllRead(
          false
        );
      }
    };


  /*
   * ================================================================
   * FORMAT NOTIFICATION TIME
   * ================================================================
   */

  const formatNotificationTime =
    (
      value: string
    ) => {
      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return "";
      }

      const now =
        new Date();

      const difference =
        now.getTime() -
        date.getTime();

      const minute =
        60 * 1000;

      const hour =
        60 * minute;

      const day =
        24 * hour;

      if (
        difference < minute
      ) {
        return "Just now";
      }

      if (
        difference < hour
      ) {
        const minutes =
          Math.floor(
            difference / minute
          );

        return `${minutes}m ago`;
      }

      if (
        difference < day
      ) {
        const hours =
          Math.floor(
            difference / hour
          );

        return `${hours}h ago`;
      }

      if (
        difference < 7 * day
      ) {
        const days =
          Math.floor(
            difference / day
          );

        return `${days}d ago`;
      }

      return new Intl.DateTimeFormat(
        "en-NG",
        {
          day: "numeric",
          month: "short",
        }
      ).format(date);
    };


  /*
   * ================================================================
   * RENDER
   * ================================================================
   */

  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-white/10 bg-[#031421]/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">

      {/* Left */}

      <div className="flex min-w-0 items-center gap-3">

        <button
          type="button"
          onClick={
            onOpenMobile
          }
          aria-label="Open navigation"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/60 transition hover:bg-white/5 hover:text-white lg:hidden"
        >
          <Menu size={20} />
        </button>


        {/* Search */}

        <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2.5 md:flex md:w-[240px] lg:w-[300px]">

          <Search
            size={17}
            className="text-white/25"
          />

          <input
            type="search"
            placeholder="Search..."
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/25"
          />

          <kbd className="hidden rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-white/20 lg:block">
            /
          </kbd>

        </div>


        {/* Mobile title */}

        <div className="md:hidden">

          <p className="text-[10px] uppercase tracking-[0.16em] text-white/25">
            NovaBank
          </p>

          <p className="text-sm font-semibold">
            Banking
          </p>

        </div>

      </div>


      {/* Right */}

      <div className="flex items-center gap-2 sm:gap-3">


        {/* ========================================================
            NOTIFICATIONS
            ======================================================== */}

        <div
          ref={
            notificationRef
          }
          className="relative"
        >

          <button
            type="button"
            aria-label="Notifications"
            aria-expanded={
              notificationsOpen
            }
            onClick={() =>
              setNotificationsOpen(
                (current) =>
                  !current
              )
            }
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/45 transition hover:bg-white/5 hover:text-white"
          >

            <Bell size={18} />

            {unreadCount >
              0 && (
              <span className="absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[#031421] bg-emerald-300 px-1 text-[9px] font-bold text-[#031421]">
                {unreadCount >
                99
                  ? "99+"
                  : unreadCount}
              </span>
            )}

          </button>


          {/* ======================================================
              NOTIFICATION PANEL
              ====================================================== */}

          {notificationsOpen && (
            <div className="absolute right-0 top-[52px] z-50 w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-white/10 bg-[#071421]/98 shadow-2xl backdrop-blur-2xl">

              {/* Header */}

              <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">

                <div>

                  <h3 className="text-sm font-bold">
                    Notifications
                  </h3>

                  <p className="mt-1 text-[11px] text-white/30">
                    {unreadCount ===
                    0
                      ? "You're all caught up."
                      : `${unreadCount} unread notification${
                          unreadCount ===
                          1
                            ? ""
                            : "s"
                        }`}
                  </p>

                </div>


                <div className="flex items-center gap-1">

                  {unreadCount >
                    0 && (
                    <button
                      type="button"
                      onClick={
                        markAllAsRead
                      }
                      disabled={
                        markingAllRead
                      }
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-medium text-emerald-300/70 transition hover:bg-emerald-300/[0.06] hover:text-emerald-200 disabled:opacity-40"
                    >

                      {markingAllRead ? (
                        <Loader2
                          size={13}
                          className="animate-spin"
                        />
                      ) : (
                        <CheckCheck
                          size={13}
                        />
                      )}

                      Mark all read

                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setNotificationsOpen(
                        false
                      )
                    }
                    aria-label="Close notifications"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white/25 transition hover:bg-white/5 hover:text-white"
                  >
                    <X
                      size={15}
                    />
                  </button>

                </div>

              </div>


              {/* Content */}

              <div className="max-h-[420px] overflow-y-auto">

                {notificationsLoading ? (

                  <div className="flex items-center justify-center gap-2 px-5 py-12 text-xs text-white/30">

                    <Loader2
                      size={17}
                      className="animate-spin"
                    />

                    Loading notifications...

                  </div>

                ) : notificationsError ? (

                  <div className="px-5 py-10 text-center">

                    <p className="text-xs leading-5 text-red-200/60">
                      {notificationsError}
                    </p>

                    <button
                      type="button"
                      onClick={
                        loadNotifications
                      }
                      className="mt-3 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/50 transition hover:bg-white/5 hover:text-white"
                    >
                      Try again
                    </button>

                  </div>

                ) : notifications.length ===
                  0 ? (

                  <div className="px-5 py-12 text-center">

                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">

                      <Bell
                        size={20}
                        className="text-white/20"
                      />

                    </div>

                    <p className="mt-4 text-sm font-semibold text-white/60">
                      No notifications
                    </p>

                    <p className="mt-1 text-xs leading-5 text-white/25">
                      Important banking activity
                      will appear here.
                    </p>

                  </div>

                ) : (

                  <div>

                    {notifications.map(
                      (
                        notification
                      ) => (
                        <div
                          key={
                            notification.id
                          }
                          className={`border-b border-white/[0.06] px-4 py-4 transition hover:bg-white/[0.025] ${
                            notification.is_read
                              ? ""
                              : "bg-emerald-300/[0.025]"
                          }`}
                        >

                          <div className="flex items-start gap-3">

                            {/* Unread indicator */}

                            <div className="mt-1.5 flex h-2.5 w-2.5 shrink-0 items-center justify-center">

                              {!notification.is_read && (
                                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                              )}

                            </div>


                            {/* Notification body */}

                            <div className="min-w-0 flex-1">

                              <div className="flex items-start justify-between gap-3">

                                <p
                                  className={`text-sm ${
                                    notification.is_read
                                      ? "font-medium text-white/55"
                                      : "font-semibold text-white/85"
                                  }`}
                                >
                                  {
                                    notification.title
                                  }
                                </p>

                                <span className="shrink-0 text-[10px] text-white/20">
                                  {formatNotificationTime(
                                    notification.created_at
                                  )}
                                </span>

                              </div>

                              <p className="mt-1 text-xs leading-5 text-white/35">
                                {
                                  notification.message
                                }
                              </p>


                              {/* Mark as read */}

                              {!notification.is_read && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    markAsRead(
                                      notification.id
                                    )
                                  }
                                  disabled={
                                    markingReadId ===
                                    notification.id
                                  }
                                  className="mt-2.5 flex items-center gap-1.5 text-[10px] font-medium text-emerald-300/60 transition hover:text-emerald-200 disabled:opacity-40"
                                >

                                  {markingReadId ===
                                  notification.id ? (
                                    <Loader2
                                      size={
                                        12
                                      }
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Check
                                      size={
                                        12
                                      }
                                    />
                                  )}

                                  Mark as read

                                </button>
                              )}

                            </div>

                          </div>

                        </div>
                      )
                    )}

                  </div>

                )}

              </div>

            </div>
          )}

        </div>


        {/* Divider */}

        <div className="hidden h-8 w-px bg-white/10 sm:block" />


        {/* Profile */}

        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-white/5"
        >

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-cyan-400 font-bold text-[#031421]">
            A
          </div>

          <div className="hidden text-left sm:block">

            <p className="text-sm font-semibold">
              Account
            </p>

            <p className="text-[10px] text-white/30">
              Personal
            </p>

          </div>

        </Link>

      </div>

    </header>
  );
}