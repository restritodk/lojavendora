"use client";

import Link from "next/link";
import { useState } from "react";

type AdminMenuGroup = {
  title: string;
  href?: string;
  items?: {
    label: string;
    href: string;
  }[];
};

type AdminSidebarProps = {
  email: string;
  menuGroups: AdminMenuGroup[];
  logoutAction: () => Promise<void>;
};

export function AdminSidebar({
  email,
  menuGroups,
  logoutAction,
}: AdminSidebarProps) {
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  function toggleMenu(title: string) {
    setOpenMenus((current) => ({
      ...current,
      [title]: !current[title],
    }));
  }

  return (
    <aside className="flex max-h-screen flex-col border-b border-slate-200 bg-white p-5 text-slate-900 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
      <div className="shrink-0 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 shadow-sm">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[#17293f] font-black text-white">
            V
          </span>
          <span>
            <strong className="block text-lg leading-none text-slate-950">Vendora</strong>
            <small className="text-xs font-semibold text-slate-500">
              Admin master
            </small>
          </span>
        </Link>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
            Proprietário
          </p>
          <p className="mt-2 truncate text-sm font-semibold text-slate-800">
            {email}
          </p>
        </div>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-color:#94a3b8_transparent] [scrollbar-width:thin]">
        <nav className="space-y-2 pb-4">
          {menuGroups.map((group) => {
            const hasItems = Boolean(group.items?.length);
            const isOpen = Boolean(openMenus[group.title]);

            if (!hasItems) {
              return (
                <a
                  key={group.title}
                  href={group.href}
                  className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 hover:text-[#17293f]"
                >
                  {group.title}
                </a>
              );
            }

            return (
              <div key={group.title} className="rounded-2xl">
                <button
                  type="button"
                  onClick={() => toggleMenu(group.title)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-100 hover:text-[#17293f]"
                >
                  <span>{group.title}</span>
                  <span
                    className={`text-slate-400 transition ${
                      isOpen ? "rotate-90" : ""
                    }`}
                  >
                    ›
                  </span>
                </button>

                {isOpen ? (
                  <div className="ml-4 mt-1 grid gap-1 border-l border-slate-200 pl-3">
                    {group.items?.map((item) => (
                      <a
                        key={item.label}
                        href={item.href}
                        className="rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-[#17293f]"
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </div>

      <form action={logoutAction} className="mt-5 shrink-0">
        <button className="w-full rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-red-50 hover:text-red-700">
          Sair do painel
        </button>
      </form>
    </aside>
  );
}
