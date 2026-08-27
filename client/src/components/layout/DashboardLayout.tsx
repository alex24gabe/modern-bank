"use client";

import {
  ReactNode,
  useState,
} from "react";

import Sidebar from "./Sidebar";
import Header from "./Header";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [collapsed, setCollapsed] =
    useState(false);

  return (
    <div className="min-h-screen bg-[#031421] text-white">
      <Sidebar
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
        <Header
          onOpenMobile={() =>
            setMobileOpen(true)
          }
        />

        <main>{children}</main>
      </div>
    </div>
  );
}
