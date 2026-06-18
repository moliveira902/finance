"use client";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { CategoryModal } from "@/components/modals/CategoryModal";
import { useFinanceStore } from "@/stores/financeStore";
import { useTranslation } from "@/contexts/LanguageContext";
import { categories as defaultCategories, type Category } from "@/lib/mock-data";

const DEFAULT_IDS = new Set(defaultCategories.map((c) => c.id));

function CategoryRow({
  cat,
  system,
  systemBadge,
  onEdit,
  onDelete,
}: {
  cat: Category;
  system?: boolean;
  systemBadge?: string;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
        style={{ background: `${cat.color}1a` }}
      >
        {cat.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{cat.name}</p>
        {system && (
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{systemBadge}</span>
        )}
      </div>
      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.color }} />
      {!system && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors"
            aria-label="Editar"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={onDelete}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            aria-label="Excluir"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function CategoriesPage() {
  const { categories, deleteCategory } = useFinanceStore();
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<Category | undefined>(undefined);

  const systemCats = categories.filter((c) => DEFAULT_IDS.has(c.id));
  const userCats = categories.filter((c) => !DEFAULT_IDS.has(c.id));

  function openCreate() {
    setEditTarget(undefined);
    setModalOpen(true);
  }

  function openEdit(cat: Category) {
    setEditTarget(cat);
    setModalOpen(true);
  }

  function confirmDeleteAction() {
    if (confirmDelete) deleteCategory(confirmDelete.id);
    setConfirmDelete(undefined);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("categories.title")}
        subtitle={t("categories.subtitle", { total: String(categories.length), custom: String(userCats.length) })}
        actions={
          <Button onClick={openCreate}>
            <Plus size={14} className="shrink-0" />
            {t("categories.addBtn")}
          </Button>
        }
      />

      <Card>
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
          {t("categories.systemLabel")}
        </p>
        <div className="grid grid-cols-1 @sm:grid-cols-2 @xl:grid-cols-3 gap-2">
          {systemCats.map((cat) => (
            <CategoryRow key={cat.id} cat={cat} system systemBadge={t("categories.systemBadge")} />
          ))}
        </div>
      </Card>

      <Card>
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
          {t("categories.customLabel")}
        </p>
        {userCats.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-400 dark:text-slate-500 mb-3">{t("categories.emptyCustom")}</p>
            <Button size="sm" onClick={openCreate}>
              <Plus size={12} />
              {t("categories.createFirst")}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 @sm:grid-cols-2 @xl:grid-cols-3 gap-2">
            {userCats.map((cat) => (
              <CategoryRow
                key={cat.id}
                cat={cat}
                onEdit={() => openEdit(cat)}
                onDelete={() => setConfirmDelete(cat)}
              />
            ))}
          </div>
        )}
      </Card>

      <CategoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={editTarget}
      />

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl border border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
              {t("categories.confirmDeleteTitle")}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">
              {t("categories.confirmDeleteDesc", { name: confirmDelete.name })}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(undefined)}>
                {t("common.cancel")}
              </Button>
              <Button variant="danger" size="sm" onClick={confirmDeleteAction}>
                {t("common.delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
