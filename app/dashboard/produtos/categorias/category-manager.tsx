"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ActionResultModal } from "@/components/dashboard/action-result-modal";
import { FieldLabel, getFieldHelp } from "@/components/dashboard/field-help";
import {
  createCategoryAction,
  deleteCategoryAction,
  toggleCategoryStatusAction,
  updateCategoryAction,
  type CategoryActionResult,
} from "./actions";

type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  googleShoppingCategory: string | null;
  active: boolean;
  featured: boolean;
  showContent: boolean;
  parentId: string | null;
  children: CategoryNode[];
};

type CategoryManagerProps = {
  categories: CategoryNode[];
  storeUrl: string;
};

export function CategoryManager({
  categories,
  storeUrl,
}: CategoryManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryNode | null>(
    null,
  );
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [feedback, setFeedback] = useState<CategoryActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeout = window.setTimeout(() => setFeedback(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  function handleSubmit(formData: FormData) {
    if (editingCategory) {
      formData.delete("parentId");
    } else if (selectedParent) {
      formData.set("parentId", selectedParent.id);
    } else {
      formData.delete("parentId");
    }

    setPendingFormData(formData);
    setShowConfirm(true);
  }

  function openRootCategoryModal() {
    setSelectedParent(null);
    setEditingCategory(null);
    setIsModalOpen(true);
  }

  function openSubcategoryModal(parent: { id: string; name: string }) {
    setSelectedParent(parent);
    setEditingCategory(null);
    setIsModalOpen(true);
  }

  function openEditModal(category: CategoryNode) {
    setSelectedParent(null);
    setEditingCategory(category);
    setIsModalOpen(true);
  }

  function confirmSave() {
    if (!pendingFormData) {
      return;
    }

    setShowConfirm(false);

    startTransition(() => {
      const action = editingCategory
        ? updateCategoryAction(editingCategory.id, pendingFormData)
        : createCategoryAction(pendingFormData);

      void action.then((result) => {
        setFeedback(result);

        if (result.type === "success") {
          formRef.current?.reset();
          setPendingFormData(null);
          setIsModalOpen(false);
          setEditingCategory(null);
        }
      });
    });
  }

  function toggleStatus(categoryId: string) {
    startTransition(() => {
      void toggleCategoryStatusAction(categoryId).then((result) => {
        setFeedback(result);
      });
    });
  }

  function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    const categoryId = deleteTarget.id;
    setDeleteTarget(null);

    startTransition(() => {
      void deleteCategoryAction(categoryId).then((result) => {
        setFeedback(result);
      });
    });
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-white text-xl shadow-sm">
              🖼️
            </span>
            <div>
              <h1 className="font-black text-slate-950">
                Categorias de Produto
              </h1>
              <p className="text-sm text-slate-500">
                Organize produtos com categorias e subcategorias.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={openRootCategoryModal}
              className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-sm"
            >
              + Criar nova categoria
            </button>
          </div>
        </header>

        <div className="p-5">
          <div className="rounded-2xl border-l-4 border-cyan-500 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            ℹ️ As categorias ajudam seus clientes a encontrar produtos como
            Eletrônicos, Roupas, Calçados e Acessórios. Use subcategorias para
            deixar a navegação mais profissional.
          </div>

          <div className="mt-5 grid gap-2">
            {categories.length > 0 ? (
              categories.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  level={0}
                  onAddSubcategory={openSubcategoryModal}
                  onEdit={openEditModal}
                  onToggleStatus={toggleStatus}
                  onDelete={(category) => setDeleteTarget(category)}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
                Nenhuma categoria cadastrada ainda.
              </div>
            )}
          </div>
        </div>
      </section>

      {isModalOpen ? (
        <CategoryModal
          formRef={formRef}
          parentCategory={selectedParent}
          editingCategory={editingCategory}
          storeUrl={storeUrl}
          isPending={isPending}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedParent(null);
            setEditingCategory(null);
          }}
          onSubmit={handleSubmit}
        />
      ) : null}

      {showConfirm ? (
        <ConfirmModal
          isPending={isPending}
          onClose={() => setShowConfirm(false)}
          onConfirm={confirmSave}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteConfirmModal
          categoryName={deleteTarget.name}
          isPending={isPending}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
      {feedback ? (
        <ActionResultModal
          result={feedback}
          successTitle="Categoria salva com sucesso!"
          errorTitle="Não foi possível atualizar a categoria"
          onClose={() => setFeedback(null)}
        />
      ) : null}
    </div>
  );
}

function CategoryRow({
  category,
  level,
  onAddSubcategory,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  category: CategoryNode;
  level: number;
  onAddSubcategory: (category: { id: string; name: string }) => void;
  onEdit: (category: CategoryNode) => void;
  onToggleStatus: (categoryId: string) => void;
  onDelete: (category: { id: string; name: string }) => void;
}) {
  return (
    <div>
      <div
        className="group flex items-center justify-between border-l-2 border-cyan-600 bg-[#ededed] px-4 py-3 text-sm"
        style={{ marginLeft: level * 32 }}
      >
        <div>
          <p className="font-black text-cyan-800 underline decoration-dotted underline-offset-4">
            {category.name}
          </p>
          {category.description ? (
            <p className="mt-1 text-xs text-slate-500">
              {category.description}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase">
          <button
            type="button"
            onClick={() =>
              onAddSubcategory({ id: category.id, name: category.name })
            }
            className="rounded-full bg-white px-3 py-1 text-cyan-800 opacity-0 shadow-sm transition group-hover:opacity-100"
          >
            + Adicionar Sub-Categoria
          </button>
          {category.active ? (
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
              Ativa
            </span>
          ) : (
            <span className="rounded-full bg-red-50 px-2 py-1 text-red-700">
              Inativa
            </span>
          )}
          {!category.parentId && category.featured ? (
            <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
              Destaque
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => onEdit(category)}
            className="grid size-8 place-items-center rounded-full bg-sky-50 text-sky-700 shadow-sm transition hover:scale-105"
            title="Editar categoria"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={() => onToggleStatus(category.id)}
            className={`grid size-8 place-items-center rounded-full shadow-sm transition hover:scale-105 ${
              category.active
                ? "bg-amber-50 text-amber-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
            title={category.active ? "Inativar categoria" : "Ativar categoria"}
          >
            {category.active ? "⏸" : "▶"}
          </button>
          <button
            type="button"
            onClick={() => onDelete({ id: category.id, name: category.name })}
            className="grid size-8 place-items-center rounded-full bg-red-50 text-red-700 shadow-sm transition hover:scale-105"
            title="Excluir categoria"
          >
            🗑
          </button>
        </div>
      </div>

      {category.children.map((child) => (
        <CategoryRow
          key={child.id}
          category={child}
          level={level + 1}
          onAddSubcategory={onAddSubcategory}
          onEdit={onEdit}
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function CategoryModal({
  formRef,
  parentCategory,
  editingCategory,
  storeUrl,
  isPending,
  onClose,
  onSubmit,
}: {
  formRef: React.RefObject<HTMLFormElement | null>;
  parentCategory: { id: string; name: string } | null;
  editingCategory: CategoryNode | null;
  storeUrl: string;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const isSubcategory = Boolean(parentCategory || editingCategory?.parentId);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 px-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔗</span>
            <h2 className="text-xl font-black text-slate-950">
              {editingCategory
                ? "Editar Categoria"
                : parentCategory
                  ? "Adicionar Sub-Categoria"
                  : "Adicionar Categoria"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white px-3 py-1 text-sm font-black text-slate-500 shadow-sm"
          >
            ×
          </button>
        </header>

        <form ref={formRef} action={onSubmit}>
          <div className="max-h-[62vh] overflow-y-auto p-5">
            <div className="grid gap-5 md:grid-cols-2">
              <SwitchField
                label="Ativar Categoria"
                name="active"
                defaultChecked={editingCategory?.active ?? true}
              />
              {!isSubcategory ? (
                <SwitchField
                  label="Categoria Destaque"
                  name="featured"
                  defaultChecked={editingCategory?.featured ?? false}
                />
              ) : null}
              <FormField
                label={isSubcategory ? "Nome da Sub-Categoria" : "Nome da Categoria"}
                name="name"
                placeholder="Ex: Calçados, Eletrodomésticos, Ferramentas..."
                defaultValue={editingCategory?.name ?? ""}
                required
                className="md:col-span-2"
              />
              {editingCategory ? (
                <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm font-semibold text-sky-800 md:col-span-2">
                  Editando <strong>{editingCategory.name}</strong>.
                </div>
              ) : parentCategory ? (
                <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm font-semibold text-cyan-800 md:col-span-2">
                  Esta subcategoria será criada dentro de{" "}
                  <strong>{parentCategory.name}</strong>.
                </div>
              ) : null}
              <FormField
                label="Descrição da categoria"
                name="description"
                placeholder="Ex: Veja os produtos da categoria..."
                defaultValue={editingCategory?.description ?? ""}
                className="md:col-span-2"
              />
              <FormField
                label="Categoria do Google Shopping"
                name="googleShoppingCategory"
                placeholder="Ex: Eletrônico > Celular"
                defaultValue={editingCategory?.googleShoppingCategory ?? ""}
                className="md:col-span-2"
              />
              <label className="md:col-span-2">
                <FieldLabel help={getFieldHelp("categoryUrl", "URL da Categoria")}>
                  URL da Categoria
                </FieldLabel>
                <div className="mt-2 flex overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 text-sm text-slate-600">
                  <span className="flex-1 px-4 py-3">{storeUrl}/categoria/</span>
                  <span className="grid w-12 place-items-center border-l border-slate-200">
                    ✎
                  </span>
                </div>
              </label>
              <SwitchField
                label="Exibir conteúdos adicionais"
                name="showContent"
                defaultChecked={editingCategory?.showContent ?? false}
              />
            </div>
          </div>

          <footer className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl bg-slate-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              disabled={isPending}
              className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              ✓ Salvar
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

function ConfirmModal({
  isPending,
  onClose,
  onConfirm,
}: {
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-cyan-50 text-2xl">
          ✓
        </div>
        <h2 className="mt-5 text-xl font-black text-slate-950">
          Salvar categoria?
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Confirme se os dados estão corretos para cadastrar esta categoria na
          sua loja.
        </p>
        <div className="mt-7 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-full border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
          >
            Não
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-full bg-[#17293f] px-5 py-3 text-sm font-black text-white transition hover:bg-[#0f1f31] disabled:opacity-60"
          >
            {isPending ? "Salvando..." : "Sim"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  categoryName,
  isPending,
  onClose,
  onConfirm,
}: {
  categoryName: string;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-2xl">
          🗑
        </div>
        <h2 className="mt-5 text-xl font-black text-slate-950">
          Excluir categoria?
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Deseja realmente excluir <strong>{categoryName}</strong>? Essa ação
          também remove subcategorias vinculadas.
        </p>
        <div className="mt-7 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-full border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
          >
            Não
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-full bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {isPending ? "Excluindo..." : "Sim, excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  name,
  placeholder,
  defaultValue,
  required,
  className = "",
}: {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={className}>
      <FieldLabel help={getFieldHelp(name, label)}>{label}</FieldLabel>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#17293f]"
      />
    </label>
  );
}

function SwitchField({
  label,
  name,
  defaultChecked = false,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label>
      <FieldLabel help={getFieldHelp(name, label)}>{label}</FieldLabel>
      <span className="mt-3 flex items-center gap-3 text-sm font-semibold text-slate-600">
        <span>Sim</span>
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />
        <span className="relative h-6 w-12 rounded-full bg-red-500 shadow-inner transition after:absolute after:left-1 after:top-1 after:size-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:bg-emerald-500 peer-checked:after:translate-x-6" />
        <span>Não</span>
      </span>
    </label>
  );
}
