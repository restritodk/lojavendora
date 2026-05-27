type SummaryCardProps = {
  label: string;
  value: string;
  change?: string;
};

export function SummaryCard({ label, value, change }: SummaryCardProps) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <div className="mt-4 flex items-end justify-between">
        <strong className="text-3xl">{value}</strong>
        {change ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">
            {change}
          </span>
        ) : null}
      </div>
    </article>
  );
}
