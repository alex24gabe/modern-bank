"use client";

import {
  Bell,
  Menu,
} from "lucide-react";

type AdminHeaderProps = {
  onOpenMobile: () => void;
};

export default function AdminHeader({
  onOpenMobile,
}: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-white/10 bg-[#031421]/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          aria-label="Open admin navigation"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/60 transition hover:bg-white/5 hover:text-white lg:hidden"
        >
          <Menu size={20} />
        </button>

        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/25">
            NovaBank
          </p>

          <p className="text-sm font-semibold">
            Administration
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/45 transition hover:bg-white/5 hover:text-white"
        >
          <Bell size={18} />

          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-emerald-300" />
        </button>

        <div className="hidden h-8 w-px bg-white/10 sm:block" />

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-cyan-400 font-bold text-[#031421]">
            A
          </div>

          <div className="hidden sm:block">
            <p className="text-sm font-semibold">
              Administrator
            </p>

            <p className="text-[10px] text-white/30">
              ADMIN
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}