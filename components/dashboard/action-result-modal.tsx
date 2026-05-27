export type ActionResultModalData = {
  type: "success" | "error";
  message: string;
};

export function ActionResultModal({
  result,
  successTitle = "Operação concluída com sucesso!",
  errorTitle = "Não foi possível concluir",
  onClose,
  children,
}: {
  result: ActionResultModalData;
  successTitle?: string;
  errorTitle?: string;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  const isSuccess = result.type === "success";

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 text-center shadow-2xl">
        <div
          className={`mx-auto grid size-14 place-items-center rounded-2xl text-2xl ${
            isSuccess ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {isSuccess ? "✓" : "!"}
        </div>
        <h2 className="mt-5 text-xl font-black text-slate-950">
          {isSuccess ? successTitle : errorTitle}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{result.message}</p>
        {children}
        <button
          type="button"
          onClick={onClose}
          className="mt-7 w-full rounded-full bg-[#17293f] px-5 py-3 text-sm font-black text-white transition hover:bg-[#0f1f31]"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
