/**
 * Module de portabilité des données — Loi 25 art. 27, PIPEDA principe 9.
 *
 * Droit d'accès et de portabilité : l'administrateur du compte peut exporter
 * l'intégralité des données de son organisation dans un format structuré,
 * lisible par machine et compatible avec d'autres logiciels de comptabilité.
 *
 * Format de sortie :
 *   - JSON structuré (organisation, utilisateurs, clients, factures, lignes)
 *   - CSV des factures (compatible Excel / logiciels comptables québécois)
 *
 * L'export est tracé dans DataAccessLog (art. 63.1 Loi 25).
 */

import { prisma } from '../db.js';
import { decryptField } from './fieldEncryption.js';

// ─────────────────────────────────────────────────────────────────
// Types de l'export
// ─────────────────────────────────────────────────────────────────

export interface ExportedInvoiceLine {
  description: string;
  quantity: number;
  unitPriceHt: number;
  taxRate: number;
  lineTotalHt: number;
  lineVat: number;
  lineTotalTtc: number;
}

export interface ExportedInvoice {
  number: string | null;
  issueDate: string;
  dueDate: string | null;
  status: string;
  currency: string;
  clientName: string;
  clientEmail: string | null; // déchiffré
  subtotalHt: number;
  vatTotal: number;
  totalTtc: number;
  lines: ExportedInvoiceLine[];
}

export interface ExportedClient {
  id: string;
  name: string;
  email: string | null; // déchiffré
  phone: string | null; // déchiffré
  taxId: string | null;
  address: string | null;
  city: string | null;
  country: string;
}

export interface ExportedUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
}

export interface TenantExportPayload {
  exportVersion: string;
  exportedAt: string;
  legalNotice: string;
  organization: {
    id: string;
    name: string;
    taxMatricule: string | null;
    address: string | null;
    city: string | null;
    country: string;
    defaultCurrency: string;
    createdAt: string;
  };
  users: ExportedUser[];
  clients: ExportedClient[];
  invoices: ExportedInvoice[];
}

// ─────────────────────────────────────────────────────────────────
// Collecte et assemblage
// ─────────────────────────────────────────────────────────────────

/**
 * Collecte toutes les données de l'organisation et les retourne
 * sous forme d'objet structuré. Les champs chiffrés sont déchiffrés à la volée.
 */
export async function collectTenantData(organizationId: string): Promise<TenantExportPayload> {
  const [org, users, clients, invoices] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId } }),

    prisma.user.findMany({
      where: { organizationId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    }),

    prisma.client.findMany({
      where: { organizationId },
    }),

    prisma.invoice.findMany({
      where: { organizationId },
      include: {
        client: { select: { name: true, email: true } },
        lines: true,
      },
      orderBy: { issueDate: 'asc' },
    }),
  ]);

  // Déchiffrement des données personnelles des clients
  const exportedClients: ExportedClient[] = clients.map((c) => ({
    id: c.id,
    name: c.name,
    email: decryptField(c.email),
    phone: decryptField(c.phone),
    taxId: c.taxId,
    address: c.address,
    city: c.city,
    country: c.country,
  }));

  const exportedInvoices: ExportedInvoice[] = invoices.map((inv) => ({
    number: inv.number,
    issueDate: inv.issueDate.toISOString().slice(0, 10),
    dueDate: inv.dueDate?.toISOString().slice(0, 10) ?? null,
    status: inv.status,
    currency: inv.currency,
    clientName: inv.client.name,
    clientEmail: decryptField(inv.client.email),
    subtotalHt: Number(inv.subtotalHt),
    vatTotal: Number(inv.vatTotal),
    totalTtc: Number(inv.totalTtc),
    lines: inv.lines.map((l) => ({
      description: l.description,
      quantity: Number(l.quantity),
      unitPriceHt: Number(l.unitPriceHt),
      taxRate: Number(l.taxRate),
      lineTotalHt: Number(l.lineTotalHt),
      lineVat: Number(l.lineVat),
      lineTotalTtc: Number(l.lineTotalTtc),
    })),
  }));

  return {
    exportVersion: '1.0',
    exportedAt: new Date().toISOString(),
    legalNotice:
      'Export généré conformément à la Loi 25 (Québec) et à la LPRPDE (Canada). ' +
      "Ces données sont confidentielles et destinées exclusivement à l'administrateur du compte.",
    organization: {
      id: org.id,
      name: org.name,
      taxMatricule: org.taxMatricule,
      address: org.address,
      city: org.city,
      country: org.country,
      defaultCurrency: org.defaultCurrency,
      createdAt: org.createdAt.toISOString(),
    },
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
    })),
    clients: exportedClients,
    invoices: exportedInvoices,
  };
}

// ─────────────────────────────────────────────────────────────────
// Générateur CSV des factures (compatible logiciels comptables CA)
// ─────────────────────────────────────────────────────────────────

/** Échappe une valeur pour le format CSV (RFC 4180). */
function csvCell(value: string | number | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Génère un fichier CSV des factures.
 * Format : UTF-8 avec BOM (pour compatibilité Excel québécois).
 */
export function generateInvoicesCsv(invoices: ExportedInvoice[]): string {
  const BOM = '\uFEFF';

  const headers = [
    'Numéro',
    'Date émission',
    'Date échéance',
    'Statut',
    'Devise',
    'Client',
    'Courriel client',
    'Sous-total avant taxes ($)',
    'TPS/TVQ ($)',
    'Total après taxes ($)',
  ];

  const rows = invoices.map((inv) => [
    csvCell(inv.number),
    csvCell(inv.issueDate),
    csvCell(inv.dueDate),
    csvCell(inv.status),
    csvCell(inv.currency),
    csvCell(inv.clientName),
    csvCell(inv.clientEmail),
    csvCell(inv.subtotalHt.toFixed(2)),
    csvCell(inv.vatTotal.toFixed(2)),
    csvCell(inv.totalTtc.toFixed(2)),
  ]);

  const csvLines = [headers.join(','), ...rows.map((r) => r.join(','))];
  return BOM + csvLines.join('\r\n');
}
