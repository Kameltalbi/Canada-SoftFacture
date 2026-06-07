import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  Coins,
  Percent,
  Hash,
  CalendarDays,
  LayoutTemplate,
  PanelBottom,
  Tags,
  Users,
  Shield,
  Warehouse,
} from 'lucide-react';

export type SettingsSectionId =
  | 'organisation'
  | 'devises'
  | 'taxes'
  | 'numerotation'
  | 'exercice'
  | 'templates'
  | 'pied'
  | 'stock'
  | 'categories'
  | 'utilisateurs'
  | 'roles';

export type SettingsNavItem = {
  id: SettingsSectionId;
  icon: LucideIcon;
  labelKey: string;
  soon?: boolean;
};

export type SettingsNavGroup = {
  id: string;
  labelKey: string;
  items: SettingsNavItem[];
};

export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    id: 'company',
    labelKey: 'navGroup_company',
    items: [{ id: 'organisation', icon: Building2, labelKey: 'nav_organisation' }],
  },
  {
    id: 'accounting',
    labelKey: 'navGroup_accounting',
    items: [
      { id: 'devises', icon: Coins, labelKey: 'nav_devises' },
      { id: 'taxes', icon: Percent, labelKey: 'nav_taxes' },
      { id: 'numerotation', icon: Hash, labelKey: 'nav_numerotation' },
      { id: 'exercice', icon: CalendarDays, labelKey: 'nav_exercice', soon: true },
    ],
  },
  {
    id: 'documents',
    labelKey: 'navGroup_documents',
    items: [
      { id: 'templates', icon: LayoutTemplate, labelKey: 'nav_templates' },
      { id: 'pied', icon: PanelBottom, labelKey: 'nav_pied' },
    ],
  },
  {
    id: 'catalog',
    labelKey: 'navGroup_catalog',
    items: [
      { id: 'stock', icon: Warehouse, labelKey: 'nav_stock' },
      { id: 'categories', icon: Tags, labelKey: 'nav_categories' },
    ],
  },
  {
    id: 'team',
    labelKey: 'navGroup_team',
    items: [
      { id: 'utilisateurs', icon: Users, labelKey: 'nav_collaborators' },
      { id: 'roles', icon: Shield, labelKey: 'nav_roles', soon: true },
    ],
  },
];

export const DEFAULT_SETTINGS_SECTION: SettingsSectionId = 'organisation';

export function isSettingsSectionId(value: string | null): value is SettingsSectionId {
  if (!value) return false;
  return SETTINGS_NAV_GROUPS.some((g) => g.items.some((i) => i.id === value));
}

/** Anciens identifiants (rétrocompatibilité URL / liens). */
export function normalizeSettingsSection(raw: string | null): SettingsSectionId {
  if (raw === 'entreprise') return 'organisation';
  if (raw === 'paiement' || raw === 'modules' || raw === 'whatsapp') return 'organisation';
  if (isSettingsSectionId(raw)) return raw;
  return DEFAULT_SETTINGS_SECTION;
}
