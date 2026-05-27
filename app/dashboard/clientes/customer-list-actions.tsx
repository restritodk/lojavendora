"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { deleteCustomerAction } from "./actions";

type CustomerListActionsProps = {
  customerId: string;
  customerName: string;
};

export function CustomerListActions({
  customerId,
  customerName,
}: CustomerListActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  function toggleMenu() {
    const rect = buttonRef.current?.getBoundingClientRect();

    if (rect) {
      setMenuPosition({
        top: rect.bottom + 8,
        left: Math.max(rect.right - 176, 12),
      });
    }

    setIsOpen((current) => !current);
  }

  return (
    <div className="flex justify-end">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-[#17293f] hover:text-[#17293f]"
        title="Ações"
      >
        ⋯
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            aria-label="Fechar menu"
            className="fixed inset-0 z-[70] cursor-default bg-transparent"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="fixed z-[80] w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm shadow-2xl"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            <Link
              href={`/dashboard/clientes/${customerId}/editar`}
              className="flex items-center gap-2 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              ✏️ Editar
            </Link>
            <form action={deleteCustomerAction.bind(null, customerId)}>
              <button
                className="flex w-full items-center gap-2 px-4 py-3 text-left font-semibold text-red-600 transition hover:bg-red-50"
                onClick={() => setIsOpen(false)}
              >
                🗑️ Excluir
              </button>
            </form>
            <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
              {customerName}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
