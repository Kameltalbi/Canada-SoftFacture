'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { CategoriesImportModal } from '@/components/settings/categories-import-modal';

type CategoryRow = {
  id: string;
  name: string;
  sortOrder: number;
  _count: { products: number };
};

export function CategoriesSection() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const toast = useToast();
  const { token } = useAuth();
  const [list, setList] = useState<CategoryRow[]>([]);
  const [name, setName] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(async () => {
    const data = await apiFetch<CategoryRow[]>('/categories');
    setList(data);
  }, []);

  useEffect(() => {
    if (!token) return;
    void load().catch((e: unknown) =>
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error')
    );
  }, [token, load, toast]);

  async function onAdd() {
    if (!name.trim()) return;
    try {
      await apiFetch('/categories', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      });
      setName('');
      await load();
      toast.push(tc('save') + ' ✓');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    }
  }

  async function onDelete(id: string) {
    if (!confirm(t('categoryDeleteConfirm'))) return;
    try {
      await apiFetch(`/categories/${id}`, { method: 'DELETE' });
      await load();
      toast.push(tc('delete') + ' ✓');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-s-muted">{t('categoriesIntro')}</p>
      <div className="flex flex-wrap gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('categoryNamePlaceholder')}
          className="max-w-xs"
        />
        <Button type="button" variant="primary" onClick={() => void onAdd()}>
          {t('categoryAdd')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="border border-s-border"
          onClick={() => setImportOpen(true)}
        >
          {t('categoryImport')}
        </Button>
      </div>
      <ul className="divide-y divide-s-border rounded-xl border border-s-border bg-white">
        {list.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-s-muted">{t('categoriesEmpty')}</li>
        ) : (
          list.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="font-medium text-s-navy">
                {c.name}{' '}
                <span className="font-normal text-s-muted">
                  ({c._count.products} {t('categoryProductCount')})
                </span>
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => void onDelete(c.id)}>
                {tc('delete')}
              </Button>
            </li>
          ))
        )}
      </ul>
      <CategoriesImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => void load()}
      />
    </div>
  );
}
