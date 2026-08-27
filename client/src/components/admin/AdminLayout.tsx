"use client";

import {
  ReactNode,
  useState,
} from "react";

import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({
  children,
}: AdminLayoutProps) {
  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [collapsed, setCollapsed] =
    useState(false);

  return (
    <div className="min-h-screen bg-[#031421] text-white">
      <AdminSidebar
        mobileOpen={mobileOpen}
        collapsed={collapsed}
        onCloseMobile={() =>
          setMobileOpen(false)
        }
        onToggleCollapsed={() =>
          setCollapsed(
            (current) => !current
          )
        }
      />

      <div
        className={`
          min-h-screen transition-[padding] duration-300
          ${
            collapsed
              ? "lg:pl-[84px]"
              : "lg:pl-[260px]"
          }
        `}
      >
        <AdminHeader
          onOpenMobile={() =>
            setMobileOpen(true)
          }
        />

        <main>{children}</main>
      </div>
    </div>
  );
}