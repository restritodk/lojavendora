"use client";

import { useState } from "react";
import { FieldLabel, getFieldHelp } from "@/components/dashboard/field-help";

export type ProductCategoryOption = {
  id: string;
  name: string;
  parentId: string | null;
};

export function ProductCategoryPicker({
  categories,
  defaultValue = "",
}: {
  categories: ProductCategoryOption[];
  defaultValue?: string;
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState(defaultValue);
  const rootCategories = categories.filter((category) => !category.parentId);
  const selectedCategory = categories.find((category) => category.id === selectedId);

  function toggle(categoryId: string) {
    setOpenIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  }

  return (
    <div className="relative">
      <FieldLabel help={getFieldHelp("categoryId", "Categoria")}>
        Categoria
      </FieldLabel>
      <input type="hidden" name="categoryId" value={selectedId} />
      <button
        type="button"
        onClick={() => setIsDropdownOpen((current) => !current)}
        className="mt-2 flex h-12 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm text-slate-900 outline-none transition hover:border-[#17293f]"
      >
        <span className={selectedCategory ? "font-semibold" : "text-slate-400"}>
          {selectedCategory?.name ?? "Selecione uma categoria"}
        </span>
        <span className="text-xs text-slate-500">{isDropdownOpen ? "▲" : "▼"}</span>
      </button>

      {isDropdownOpen ? (
        <div className="absolute left-0 right-0 z-40 mt-2 max-h-80 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {rootCategories.length > 0 ? (
            rootCategories.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                categories={categories}
                selectedId={selectedId}
                openIds={openIds}
                level={0}
                onToggle={toggle}
                onSelect={(categoryId) => {
                  setSelectedId(categoryId);
                  setIsDropdownOpen(false);
                }}
              />
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-slate-400">
              Nenhuma categoria cadastrada.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function CategoryRow({
  category,
  categories,
  selectedId,
  openIds,
  level,
  onToggle,
  onSelect,
}: {
  category: ProductCategoryOption;
  categories: ProductCategoryOption[];
  selectedId: string;
  openIds: string[];
  level: number;
  onToggle: (categoryId: string) => void;
  onSelect: (categoryId: string) => void;
}) {
  const children = categories.filter((item) => item.parentId === category.id);
  const isOpen = openIds.includes(category.id);
  const isSelected = selectedId === category.id;

  return (
    <div>
      <div
        className={`group flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm transition ${
          isSelected
            ? "bg-[#17293f] text-white"
            : "bg-white text-slate-700 hover:bg-slate-100"
        }`}
        style={{ paddingLeft: 12 + level * 20 }}
      >
        {children.length > 0 ? (
          <button
            type="button"
            onClick={() => onToggle(category.id)}
            className={`grid size-7 place-items-center rounded-lg text-xs font-black ${
              isSelected ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
            } transition group-hover:bg-white group-hover:text-[#17293f] group-hover:shadow-sm`}
            title={isOpen ? "Fechar subcategorias" : "Abrir subcategorias"}
          >
            {isOpen ? "-" : "+"}
          </button>
        ) : (
          <span className="size-7" />
        )}
        <button
          type="button"
          onClick={() => onSelect(category.id)}
          className="flex-1 py-1 text-left font-bold"
        >
          {category.name}
        </button>
      </div>
      {isOpen
        ? children.map((child) => (
            <CategoryRow
              key={child.id}
              category={child}
              categories={categories}
              selectedId={selectedId}
              openIds={openIds}
              level={level + 1}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))
        : null}
    </div>
  );
}
