"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/modules/core-tenancy/actions/auth.actions";
import { TenantSwitcher, AuthorizedBusiness } from "./tenant-switcher";
import {
  LayoutDashboard,
  Users,
  Settings,
  History,
  Building,
  PlusCircle,
  LogOut,
  ShieldCheck,
  Coins,
} from "lucide-react";

interface NavHeaderProps {
  user: {
    id: string;
    email: string;
    fullName: string;
    isSuperAdmin: boolean;
  };
  currentBusiness: {
    id: string;
    name: string;
    role: string;
  } | null;
  businesses: AuthorizedBusiness[];
}

export function NavHeader({ user, currentBusiness, businesses }: NavHeaderProps) {
  const pathname = usePathname();
  const [isLoggingOut, startLogout] = useTransition();

  const handleLogout = () => {
    startLogout(async () => {
      await logoutAction();
    });
  };

  const navLinks = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/finance", label: "Finance & Accounting", icon: Coins },
    { href: "/members", label: "Members & Partners", icon: Users },
    { href: "/settings", label: "Settings", icon: Settings },
    { href: "/activity", label: "Activity Log", icon: History },
    { href: "/businesses", label: "All Businesses", icon: Building },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Tenant Switcher */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white text-lg shadow-md shadow-emerald-900/30">
                B
              </div>
              <span className="font-bold text-white tracking-tight hidden sm:inline">
                BusinessHub
              </span>
            </Link>

            {businesses.length > 0 && (
              <TenantSwitcher
                currentBusinessId={currentBusiness?.id ?? null}
                currentBusinessName={currentBusiness?.name ?? null}
                currentRole={currentBusiness?.role ?? null}
                businesses={businesses}
              />
            )}
          </div>

          {/* Navigation Items (when a business is active) */}
          <nav className="hidden md:flex items-center gap-1">
            {currentBusiness &&
              navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-slate-800 text-emerald-400 font-semibold"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}

            {user.isSuperAdmin && (
              <Link
                href="/businesses/new"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600/25 transition-colors ml-2"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Business</span>
              </Link>
            )}
          </nav>

          {/* User profile & Sign Out */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-xs font-medium text-slate-200">{user.fullName}</span>
                {user.isSuperAdmin && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                    <ShieldCheck className="w-3 h-3" />
                    Super Admin
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[180px]">{user.email}</p>
            </div>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-label="Sign out"
              title="Sign out"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
