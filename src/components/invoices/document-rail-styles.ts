/** Styles partagés — barre d’outils verticale droite (éditeur + modales). */
export const DOCUMENT_RAIL_NAV_CLASS =
  'flex w-14 shrink-0 flex-col border-s border-s-border bg-slate-100 shadow-[-8px_0_20px_-12px_rgba(15,23,42,0.15)]';

export const documentRailItemClass = (active: boolean) =>
  active
    ? 'bg-brand-blue-soft text-brand-blue'
    : 'text-s-navy hover:bg-slate-200/60 hover:text-s-navy';

export const documentRailIconClass = 'h-4 w-4 stroke-[2]';

/** Compense le padding droit de `<main>` pour coller le rail au bord de l’écran. */
export const DOCUMENT_EDITOR_RAIL_BLEED_CLASS = '-me-4 md:-me-6';
