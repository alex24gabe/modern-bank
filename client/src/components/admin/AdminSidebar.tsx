"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Activity,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  WalletCards,
  ArrowLeftRight,
  Bell,
  X,
} from "lucide-react";

type AdminSidebarProps = {
  mobileOpen: boolean;
  collapsed: boolean;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
};

const navigation = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Customers",
    href: "/admin/customers",
    icon: Users,
  },
  {
    label: "Accounts",
    href: "/admin/accounts",
    icon: WalletCards,
  },
  {
    label: "Transactions",
    href: "/admin/transactions",
    icon: BarChart3,
  },
  {
    label: "Transfers",
    href: "/admin/transfers",
    icon: ArrowLeftRight,
  },
  {
    label: "Deposits",
    href: "/admin/deposits",
    icon: Activity,
  },
  {
    label: "Notifications",
    href: "/admin/notifications",
    icon: Bell,
  },
  {
    label: "Audit Logs",
    href: "/admin/audit-logs",
    icon: FileText,
  },
];

export default function AdminSidebar({
  mobileOpen,
  collapsed,
  onCloseMobile,
  onToggleCollapsed,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close admin navigation"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex flex-col
          border-r border-white/10
          bg-[#041b29]
          transition-all duration-300

          ${collapsed ? "w-[84px]" : "w-[260px]"}

          ${
            mobileOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }
        `}
      >
        {/* Brand */}

        <div
          className={`
            flex h-[76px] shrink-0 items-center
            border-b border-white/10

            ${
              collapsed
                ? "justify-center px-3"
                : "justify-between px-5"
            }
          `}
        >
          <Link
            href="/admin"
            onClick={onCloseMobile}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400 font-black text-[#031421]">
              N
            </div>

            {!collapsed && (
              <div>
                <p className="font-bold tracking-tight">
                  NovaBank
                </p>

                <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">
                  Administration
                </p>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white lg:hidden"
          >
            <X size={19} />
          </button>
        </div>

        {/* Navigation */}

        <nav className="flex-1 overflow-y-auto px-3 py-6">
          {!collapsed && (
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
              Administration
            </p>
          )}

          <div className="space-y-1.5">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  title={
                    collapsed
                      ? item.label
                      : undefined
                  }
                  className={`
                    group flex items-center rounded-xl
                    py-3 text-sm transition

                    ${
                      collapsed
                        ? "justify-center px-2"
                        : "gap-3 px-3"
                    }

                    ${
                      active
                        ? "bg-emerald-400/10 text-emerald-300"
                        : "text-white/45 hover:bg-white/5 hover:text-white"
                    }
                  `}
                >
                  <Icon
                    size={19}
                    strokeWidth={
                      active ? 2.2 : 1.8
                    }
                    className="shrink-0"
                  />

                  {!collapsed && (
                    <span>{item.label}</span>
                  )}

                  {!collapsed && active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={`
              mb-2 hidden w-full items-center rounded-xl
              py-3 text-sm text-white/35
              transition hover:bg-white/5 hover:text-white
              lg:flex

              ${
                collapsed
                  ? "justify-center"
                  : "gap-3 px-3"
              }
            `}
            title={
              collapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
            }
          >
            {collapsed ? (
              <ChevronRight size={18} />
            ) : (
              <>
                <ChevronLeft size={18} />
                <span>Collapse sidebar</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            title={
              collapsed
                ? "Logout"
                : undefined
            }
            className={`
              flex w-full items-center rounded-xl
              py-3 text-sm text-white/40
              transition hover:bg-red-400/10
              hover:text-red-300

              ${
                collapsed
                  ? "justify-center"
                  : "gap-3 px-3"
              }
            `}
          >
            <LogOut size={19} />

            {!collapsed && (
              <span>Logout</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}