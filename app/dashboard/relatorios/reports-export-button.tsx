export function ReportsExportButton({
  start,
  end,
  section = "all",
  compact = false,
}: {
  start: string;
  end: string;
  section?: "all" | "products" | "customers" | "shipping" | "payments";
  compact?: boolean;
}) {
  const searchParams = new URLSearchParams({ start, end, section });

  return (
    <a
      href={`/dashboard/relatorios/exportar?${searchParams.toString()}`}
      className={
        compact
          ? "rounded-lg bg-cyan-600 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-cyan-700"
          : "rounded-xl bg-cyan-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-cyan-600/20 transition hover:bg-cyan-700 print:hidden"
      }
    >
      Exportar PDF
    </a>
  );
}
