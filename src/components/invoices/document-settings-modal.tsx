'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DocumentSettingsDrawer,
  type DocumentSettings,
} from '@/components/invoices/document-settings-drawer';

export type { DocumentSettings };

interface DocumentSettingsModalProps {
  settings: DocumentSettings;
  onChange: (settings: DocumentSettings) => void;
}

/** Bouton compact pour les pages qui n’utilisent pas la barre latérale (ex. devis). */
export function DocumentSettingsModal({ settings, onChange }: DocumentSettingsModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Settings className="h-4 w-4" />
      </Button>
      <DocumentSettingsDrawer
        open={open}
        onClose={() => setOpen(false)}
        settings={settings}
        onChange={onChange}
      />
    </>
  );
}
