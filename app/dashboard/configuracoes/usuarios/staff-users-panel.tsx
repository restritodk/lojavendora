"use client";

import { useEffect, useState, useTransition } from "react";
import {
  deleteStaffUserAction,
  saveStaffUserAction,
  toggleStaffUserAction,
  type StaffUserActionResult,
} from "./actions";

type PermissionOption = {
  id: string;
  label: string;
  description: string;
};

type StaffUserRow = {
  id: string;
  name: string;
  email: string;
  level: string;
  active: boolean;
  permissions: string[];
  createdAt: string;
};

export function StaffUsersPanel({
  users,
  permissions,
  canManage,
  query,
  currentPage,
  totalPages,
  totalUsers,
}: {
  users: StaffUserRow[];
  permissions: PermissionOption[];
  canManage: boolean;
  query: string;
  currentPage: number;
  totalPages: number;
  totalUsers: number;
}) {
  const [feedback, setFeedback] = useState<StaffUserActionResult | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(["dashboard"]);
  const [editingUser, setEditingUser] = useState<StaffUserRow | null>(null);
  const [actionUser, setActionUser] = useState<StaffUserRow | null>(null);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
    action: () => Promise<StaffUserActionResult>;
  } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!feedback || feedback.type !== "success") return;

    const timer = window.setTimeout(() => setFeedback(null), 3000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  function submitUser(formData: FormData) {
    setPendingFormData(formData);
  }

  function confirmSubmitUser() {
    if (!pendingFormData) return;

    setFeedback(null);
    startTransition(async () => {
      const result = await saveStaffUserAction(pendingFormData);
      setFeedback(result);
      setPendingFormData(null);

      if (result.type === "success") {
        setSelectedPermissions(["dashboard"]);
        setEditingUser(null);
        setModalOpen(false);
      }
    });
  }

  function runAction(action: () => Promise<StaffUserActionResult>) {
    setFeedback(null);
    startTransition(async () => {
      setFeedback(await action());
      setActionUser(null);
      setConfirmAction(null);
    });
  }

  function requestToggle(user: StaffUserRow) {
    setActionUser(null);
    setConfirmAction({
      title: user.active ? "Desativar usuário?" : "Ativar usuário?",
      message: user.active
        ? `O usuário ${user.name} perderá o acesso ao painel desta loja.`
        : `O usuário ${user.name} voltará a acessar o painel conforme as permissões liberadas.`,
      confirmLabel: user.active ? "Sim, desativar" : "Sim, ativar",
      action: () => toggleStaffUserAction(user.id),
    });
  }

  function requestDelete(user: StaffUserRow) {
    setActionUser(null);
    setConfirmAction({
      title: "Excluir usuário?",
      message: `O usuário ${user.name} será removido da equipe desta loja. Esta ação não remove outros dados da loja.`,
      confirmLabel: "Sim, excluir",
      danger: true,
      action: () => deleteStaffUserAction(user.id),
    });
  }

  function startEdit(user: StaffUserRow) {
    setEditingUser(user);
    setSelectedPermissions(user.permissions);
    setActionUser(null);
    setModalOpen(true);
  }

  function cancelEdit() {
    setEditingUser(null);
    setSelectedPermissions(["dashboard"]);
    setModalOpen(false);
  }

  function openCreateModal() {
    setEditingUser(null);
    setSelectedPermissions(["dashboard"]);
    setModalOpen(true);
  }

  function pageHref(page: number) {
    const params = new URLSearchParams();

    if (query) params.set("q", query);
    if (page > 1) params.set("page", String(page));

    const qs = params.toString();
    return qs ? `/dashboard/configuracoes/usuarios?${qs}` : "/dashboard/configuracoes/usuarios";
  }

  return (
    <div className="grid gap-6">
      {feedback ? (
        <div className={`rounded-2xl border p-4 text-sm font-bold ${
          feedback.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-red-200 bg-red-50 text-red-800"
        }`}>
          {feedback.message}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-100 px-5 py-4">
          <div>
            <h1 className="text-lg font-black">Listagem de Usuários</h1>
            <p className="mt-1 text-sm text-slate-500">
              Gerencie usuários e permissões da equipe desta loja.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            disabled={!canManage}
            className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-cyan-700 disabled:bg-slate-300"
          >
            + Adicionar Usuário
          </button>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <form className="relative w-full max-w-xs">
            <input
              name="q"
              defaultValue={query}
              placeholder="O que você procura?"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm outline-none focus:border-cyan-400"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label="Buscar usuário">
              🔎
            </button>
          </form>
          <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">
            Mostrando {users.length} de {totalUsers} usuário(s)
          </span>
        </div>

        {users.length > 0 ? (
          <div className="pb-10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  <th className="px-5 py-4">Nome</th>
                  <th className="px-5 py-4">E-mail</th>
                  <th className="px-5 py-4">Função</th>
                  <th className="px-5 py-4">Login</th>
                  <th className="px-5 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="bg-white transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <strong className="block text-slate-950">{user.name}</strong>
                      <span className="text-xs font-semibold text-slate-400">Criado em {user.createdAt}</span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-600">{user.email}</td>
                    <td className="px-5 py-4">
                      <div className="group relative inline-flex pb-2">
                        <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">
                          {formatLevel(user.level)}
                        </span>
                        <div className="invisible absolute bottom-full left-0 z-40 mb-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 opacity-0 shadow-2xl transition group-hover:visible group-hover:opacity-100">
                          <strong className="block text-xs text-slate-950">Permissões liberadas</strong>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {user.permissions.map((permissionId) => (
                              <span key={permissionId} className="rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-black text-cyan-700">
                                {permissions.find((permission) => permission.id === permissionId)?.label ?? permissionId}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-2 text-xs font-black ${
                        user.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                      }`}>
                        {user.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="relative px-5 py-4 text-right">
                      <button
                        type="button"
                        disabled={isPending || !canManage}
                        onClick={() => setActionUser(actionUser?.id === user.id ? null : user)}
                        className="inline-grid size-9 place-items-center rounded-full border border-slate-200 bg-white text-lg font-black text-slate-500 transition hover:border-cyan-300 hover:text-cyan-700 disabled:opacity-50"
                        aria-label="Abrir ações do usuário"
                      >
                        ⋯
                      </button>
                      {actionUser?.id === user.id ? (
                        <div className="absolute bottom-14 right-5 z-50 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-2xl">
                          <button type="button" onClick={() => startEdit(user)} className="block w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
                            Editar
                          </button>
                          <button type="button" onClick={() => requestToggle(user)} className="block w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
                            {user.active ? "Desativar" : "Ativar"}
                          </button>
                          <button type="button" onClick={() => requestDelete(user)} className="block w-full px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50">
                            Excluir
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid place-items-center p-12 text-center">
            <div className="grid size-20 place-items-center rounded-3xl bg-slate-100 text-4xl">📋</div>
            <h3 className="mt-4 text-lg font-black text-slate-900">Nenhum usuário cadastrado</h3>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              Adicione usuários da sua equipe para controlar quem acessa clientes, produtos, pedidos e configurações.
            </p>
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
          <span className="text-sm font-semibold text-slate-500">
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex gap-2">
            <a
              href={pageHref(Math.max(currentPage - 1, 1))}
              className={`rounded-xl border px-4 py-2 text-sm font-black ${currentPage <= 1 ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              Anterior
            </a>
            <a
              href={pageHref(Math.min(currentPage + 1, totalPages))}
              className={`rounded-xl border px-4 py-2 text-sm font-black ${currentPage >= totalPages ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              Próxima
            </a>
          </div>
        </footer>
      </section>

      {modalOpen ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <form action={submitUser} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <header className="flex items-center justify-between gap-4 bg-[#17293f] px-5 py-4 text-white">
              <div>
                <h2 className="text-lg font-black">{editingUser ? "Editar usuário" : "Adicionar usuário"}</h2>
                <p className="text-xs font-semibold text-white/70">Defina dados de acesso e permissões deste usuário.</p>
              </div>
              <button type="button" onClick={cancelEdit} className="text-2xl font-black">×</button>
            </header>
            <div className="grid gap-5 p-5">
              <input type="hidden" name="staffUserId" value={editingUser?.id ?? ""} />
              <div className="grid gap-4 md:grid-cols-2">
                <Input name="name" label="Nome do usuário" defaultValue={editingUser?.name ?? ""} required />
                <Input name="email" label="E-mail de acesso" type="email" defaultValue={editingUser?.email ?? ""} required />
                <Input name="password" label="Senha" type="password" placeholder={editingUser ? "Deixe vazio para manter" : "Mínimo 8 caracteres"} />
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-700">Nível</span>
                  <select
                    name="level"
                    defaultValue={editingUser?.level ?? "GERENTE"}
                    className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-cyan-400"
                  >
                    <option value="GERENTE">Gerente</option>
                    <option value="OPERADOR">Operador</option>
                    <option value="ATENDIMENTO">Atendimento</option>
                    <option value="FINANCEIRO">Financeiro</option>
                  </select>
                </label>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <strong className="block text-sm text-slate-900">Permissões do usuário</strong>
                    <span className="text-xs font-semibold text-slate-500">As permissões valem apenas para esta loja.</span>
                  </div>
                  <button type="button" onClick={() => setSelectedPermissions(permissions.map((permission) => permission.id))} className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-700">
                    Selecionar tudo
                  </button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {permissions.map((permission) => (
                    <label key={permission.id} className="flex cursor-pointer gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <input
                        type="checkbox"
                        name="permissions"
                        value={permission.id}
                        checked={selectedPermissions.includes(permission.id)}
                        onChange={(event) => {
                          setSelectedPermissions((current) =>
                            event.target.checked
                              ? [...new Set([...current, permission.id])]
                              : current.filter((item) => item !== permission.id),
                          );
                        }}
                        className="mt-1 size-4 rounded border-slate-300"
                      />
                      <span>
                        <strong className="block text-sm text-slate-800">{permission.label}</strong>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">{permission.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button type="button" onClick={cancelEdit} className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-600">
                Cancelar
              </button>
              <button className="rounded-full bg-[#17293f] px-6 py-3 text-sm font-black text-white disabled:bg-slate-300" disabled={isPending || !canManage}>
                {isPending ? "Salvando..." : editingUser ? "Salvar alterações" : "Salvar usuário"}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
      {pendingFormData ? (
        <ConfirmDialog
          title={editingUser ? "Salvar alterações?" : "Cadastrar usuário?"}
          message={editingUser
            ? "Confirme para atualizar os dados e permissões deste usuário."
            : "Confirme para cadastrar este usuário e liberar o acesso ao painel desta loja."}
          confirmLabel={editingUser ? "Sim, salvar" : "Sim, cadastrar"}
          isPending={isPending}
          onCancel={() => setPendingFormData(null)}
          onConfirm={confirmSubmitUser}
        />
      ) : null}
      {confirmAction ? (
        <ConfirmDialog
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel={confirmAction.confirmLabel}
          danger={confirmAction.danger}
          isPending={isPending}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => runAction(confirmAction.action)}
        />
      ) : null}
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  isPending,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[130] grid place-items-center bg-slate-950/55 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
        <div className={`mx-auto grid size-14 place-items-center rounded-2xl text-2xl font-black ${danger ? "bg-red-50 text-red-600" : "bg-cyan-50 text-cyan-700"}`}>
          !
        </div>
        <h3 className="mt-4 text-xl font-black text-slate-950">{title}</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-black text-slate-600 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`rounded-full px-5 py-2.5 text-sm font-black text-white disabled:bg-slate-300 ${danger ? "bg-red-600 hover:bg-red-700" : "bg-[#17293f] hover:bg-[#0f1f31]"}`}
          >
            {isPending ? "Processando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({
  name,
  label,
  type = "text",
  placeholder,
  defaultValue = "",
  required,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-cyan-400"
      />
    </label>
  );
}

function formatLevel(level: string) {
  const labels: Record<string, string> = {
    GERENTE: "Gerente",
    OPERADOR: "Operador",
    ATENDIMENTO: "Atendimento",
    FINANCEIRO: "Financeiro",
  };

  return labels[level] ?? level;
}

