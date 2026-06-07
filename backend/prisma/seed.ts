import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { Prisma, PrismaClient } from '../src/generated/prisma/index.js';
import { hashPassword } from '../src/lib/password.js';
import { calcLine } from '../src/lib/money.js';

const prismaDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(prismaDir, '..');
loadEnv({ path: path.join(backendRoot, '.env') });
loadEnv({ path: path.join(backendRoot, '.env.local'), override: true });
loadEnv({ path: path.join(backendRoot, '..', '.env') });
loadEnv({ path: path.join(backendRoot, '..', '.env.local'), override: true });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl?.trim()) {
  console.error(
    'DATABASE_URL est absent. Copiez backend/.env.example vers backend/.env et renseignez DATABASE_URL.'
  );
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: dbUrl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const DEMO_ORG_NAME = 'Démo SoftFacture SARL';
const DEMO_OWNER_EMAIL = 'owner@demo.softfacture.local';
const DEMO_MEMBER_EMAIL = 'user@demo.softfacture.local';

function lineRow(
  sortOrder: number,
  description: string,
  quantity: number,
  unitPriceHt: number,
  taxRate: number,
  productId?: string
) {
  const { lineTotalHt, lineVat, lineTotalTtc } = calcLine(quantity, unitPriceHt, taxRate);
  return {
    description,
    quantity: new Prisma.Decimal(quantity),
    unitPriceHt: new Prisma.Decimal(unitPriceHt),
    taxRate: new Prisma.Decimal(taxRate),
    lineTotalHt,
    lineVat,
    lineTotalTtc,
    sortOrder,
    ...(productId ? { productId } : {}),
  };
}

function sumTotals(lines: ReturnType<typeof lineRow>[]) {
  let sub = new Prisma.Decimal(0);
  let vat = new Prisma.Decimal(0);
  let ttc = new Prisma.Decimal(0);
  for (const l of lines) {
    sub = sub.add(l.lineTotalHt);
    vat = vat.add(l.lineVat);
    ttc = ttc.add(l.lineTotalTtc);
  }
  return { subtotalHt: sub, vatTotal: vat, totalTtc: ttc };
}

async function main() {
  const passwordHash = await hashPassword('SuperAdmin123!');
  await prisma.user.upsert({
    where: { email: 'superadmin@softfacture.local' },
    create: {
      email: 'superadmin@softfacture.local',
      passwordHash,
      name: 'Super administrateur',
      role: 'SUPERADMIN',
      organizationId: null,
    },
    update: { passwordHash },
  });
  console.log('Superadmin: superadmin@softfacture.local / SuperAdmin123!');

  const deleted = await prisma.organization.deleteMany({ where: { name: DEMO_ORG_NAME } });
  if (deleted.count) {
    console.log(`Organisation démo précédente supprimée (${deleted.count}).`);
  }

  const year = new Date().getFullYear();
  const ownerHash = await hashPassword('DemoOwner123!');
  const memberHash = await hashPassword('DemoUser123!');

  const org = await prisma.organization.create({
    data: {
      name: DEMO_ORG_NAME,
      taxMatricule: '12345678900012',
      billingLegalName: DEMO_ORG_NAME,
      billingSiret: '12345678900012',
      billingEmail: DEMO_OWNER_EMAIL,
      address: '24 rue de la République',
      city: 'Lyon',
      postalCode: '69002',
      country: 'CA',
      defaultCurrency: 'CAD',
      defaultVatRate: new Prisma.Decimal(20),
      subscriptionPlan: 'PRO',
      billingStatus: 'TRIAL',
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      onboardingCompletedAt: new Date(),
      invoicePrefix: 'FAC',
      quotePrefix: 'DEV',
      invoiceSequence: 3,
      lastInvoiceYear: year,
      quoteSequence: 4,
      lastQuoteYear: year,
    },
  });

  await prisma.user.createMany({
    data: [
      {
        email: DEMO_OWNER_EMAIL,
        passwordHash: ownerHash,
        name: 'Samira Ben Salah',
        phone: '+33601020304',
        role: 'ADMIN',
        organizationId: org.id,
      },
      {
        email: DEMO_MEMBER_EMAIL,
        passwordHash: memberHash,
        name: 'Karim Haddad',
        role: 'USER',
        organizationId: org.id,
      },
    ],
  });

  const [c1, c2, c3] = await prisma.$transaction([
    prisma.client.create({
      data: {
        organizationId: org.id,
        name: 'Café du Centre',
        email: 'contact@cafeducentre.fr',
        phone: '+33 4 78 00 00 01',
        taxId: '12345678900011',
        address: 'Place Bellecour',
        city: 'Lyon',
        country: 'FR',
      },
    }),
    prisma.client.create({
      data: {
        organizationId: org.id,
        name: 'SARL Tech Solutions',
        email: 'compta@techsolutions.fr',
        phone: '+33 4 78 00 00 02',
        taxId: '98765432100022',
        address: 'Quai Rambaud',
        city: 'Lyon',
        country: 'FR',
      },
    }),
    prisma.client.create({
      data: {
        organizationId: org.id,
        name: 'Pharmacie du Centre',
        email: 'contact@pharmacie-centre.fr',
        phone: '+33 4 78 00 00 03',
        taxId: '45678912300033',
        city: 'Sousse',
        country: 'FR',
      },
    }),
  ]);

  const [p1, p2, p3] = await prisma.$transaction([
    prisma.product.create({
      data: {
        organizationId: org.id,
        name: 'Prestation conseil (jour)',
        description: 'Accompagnement et audit',
        unitPriceHt: new Prisma.Decimal(480),
        vatRate: new Prisma.Decimal(20),
        unit: 'jour',
      },
    }),
    prisma.product.create({
      data: {
        organizationId: org.id,
        name: 'Abonnement maintenance',
        unitPriceHt: new Prisma.Decimal(120),
        vatRate: new Prisma.Decimal(20),
        unit: 'mois',
      },
    }),
    prisma.product.create({
      data: {
        organizationId: org.id,
        name: 'Licence logiciel',
        unitPriceHt: new Prisma.Decimal(890),
        vatRate: new Prisma.Decimal(20),
        unit: 'licence',
      },
    }),
  ]);

  const invDraftLines = [lineRow(0, 'Formation équipe (brouillon)', 1, 350, 19)];
  const invDraftTotals = sumTotals(invDraftLines);

  const invValLines = [
    lineRow(0, 'Audit processus facturation', 3, 480, 19, p1.id),
    lineRow(1, 'Abonnement maintenance — trimestre', 3, 120, 19, p2.id),
  ];
  const invValTotals = sumTotals(invValLines);

  const invSentLines = [lineRow(0, 'Licence logiciel — pack 2 postes', 2, 890, 19, p3.id)];
  const invSentTotals = sumTotals(invSentLines);

  const invPaidLines = [
    lineRow(0, 'Prestation conseil', 5, 480, 19, p1.id),
    lineRow(1, 'Déplacement', 1, 60, 19),
  ];
  const invPaidTotals = sumTotals(invPaidLines);

  const invDraft = await prisma.invoice.create({
    data: {
      organizationId: org.id,
      clientId: c1.id,
      number: null,
      issueDate: new Date(year, 3, 2),
      dueDate: new Date(year, 4, 2),
      status: 'DRAFT',
      currency: 'CAD',
      notes: 'Exemple de brouillon — valider pour obtenir le numéro FAC.',
      ...invDraftTotals,
      lines: { create: invDraftLines },
    },
  });

  await prisma.invoice.create({
    data: {
      organizationId: org.id,
      clientId: c2.id,
      number: `FAC-${year}-0001`,
      invoiceYear: year,
      sequenceNumber: 1,
      issueDate: new Date(year, 2, 10),
      dueDate: new Date(year, 3, 10),
      status: 'VALIDATED',
      currency: 'CAD',
      ...invValTotals,
      lines: { create: invValLines },
    },
  });

  const invSent = await prisma.invoice.create({
    data: {
      organizationId: org.id,
      clientId: c1.id,
      number: `FAC-${year}-0002`,
      invoiceYear: year,
      sequenceNumber: 2,
      issueDate: new Date(year, 3, 18),
      dueDate: new Date(year, 5, 18),
      status: 'PARTIALLY_PAID',
      currency: 'CAD',
      ...invSentTotals,
      lines: { create: invSentLines },
    },
  });

  const invPaid = await prisma.invoice.create({
    data: {
      organizationId: org.id,
      clientId: c3.id,
      number: `FAC-${year}-0003`,
      invoiceYear: year,
      sequenceNumber: 3,
      issueDate: new Date(year, 1, 5),
      dueDate: new Date(year, 2, 5),
      status: 'PAID',
      currency: 'CAD',
      ...invPaidTotals,
      lines: { create: invPaidLines },
    },
  });

  const sentTtc = invSentTotals.totalTtc;
  const partialAmount = sentTtc.mul(0.4).toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);
  await prisma.payment.create({
    data: {
      organizationId: org.id,
      invoiceId: invSent.id,
      amount: partialAmount,
      paymentDate: new Date(year, 3, 22),
      method: 'VIREMENT',
      reference: 'VIR-DEMO-001',
    },
  });

  await prisma.payment.create({
    data: {
      organizationId: org.id,
      invoiceId: invPaid.id,
      amount: invPaidTotals.totalTtc,
      paymentDate: new Date(year, 2, 1),
      method: 'CHEQUE',
      reference: 'CHQ 458821',
    },
  });

  const qDraftLines = [lineRow(0, 'Étude faisabilité (devis brouillon)', 1, 1200, 19)];
  const qDraftTotals = sumTotals(qDraftLines);

  const qSentLines = [lineRow(0, 'Refonte site vitrine', 1, 2500, 19, p1.id)];
  const qSentTotals = sumTotals(qSentLines);

  const qAccLines = [lineRow(0, 'Hébergement annuel', 1, 480, 19, p2.id)];
  const qAccTotals = sumTotals(qAccLines);

  const qRejLines = [lineRow(0, 'Fourniture matériel réseau', 10, 85, 19)];
  const qRejTotals = sumTotals(qRejLines);

  const qConvLines = [lineRow(0, 'Pack démarrage e-invoicing', 1, 1500, 19, p1.id)];
  const qConvTotals = sumTotals(qConvLines);

  await prisma.quote.create({
    data: {
      organizationId: org.id,
      clientId: c1.id,
      number: null,
      issueDate: new Date(year, 4, 1),
      validUntil: new Date(year, 5, 30),
      status: 'DRAFT',
      currency: 'CAD',
      notes: "Devis brouillon — cliquer Valider dans l'app pour numéroter.",
      ...qDraftTotals,
      lines: { create: qDraftLines },
    },
  });

  await prisma.quote.create({
    data: {
      organizationId: org.id,
      clientId: c2.id,
      number: `DEV-${year}-0001`,
      quoteYear: year,
      sequenceNumber: 1,
      issueDate: new Date(year, 3, 5),
      validUntil: new Date(year, 4, 5),
      status: 'SENT',
      currency: 'CAD',
      ...qSentTotals,
      lines: { create: qSentLines },
    },
  });

  await prisma.quote.create({
    data: {
      organizationId: org.id,
      clientId: c3.id,
      number: `DEV-${year}-0002`,
      quoteYear: year,
      sequenceNumber: 2,
      issueDate: new Date(year, 2, 20),
      validUntil: new Date(year, 3, 20),
      status: 'ACCEPTED',
      currency: 'CAD',
      ...qAccTotals,
      lines: { create: qAccLines },
    },
  });

  await prisma.quote.create({
    data: {
      organizationId: org.id,
      clientId: c1.id,
      number: `DEV-${year}-0003`,
      quoteYear: year,
      sequenceNumber: 3,
      issueDate: new Date(year, 1, 12),
      validUntil: new Date(year, 2, 12),
      status: 'REJECTED',
      currency: 'CAD',
      ...qRejTotals,
      lines: { create: qRejLines },
    },
  });

  const quoteConverted = await prisma.quote.create({
    data: {
      organizationId: org.id,
      clientId: c2.id,
      number: `DEV-${year}-0004`,
      quoteYear: year,
      sequenceNumber: 4,
      issueDate: new Date(year, 0, 8),
      validUntil: new Date(year, 1, 8),
      status: 'CONVERTED',
      currency: 'CAD',
      ...qConvTotals,
      lines: { create: qConvLines },
    },
  });

  const convLineCreates = qConvLines.map((l) => {
    const base = {
      description: l.description,
      quantity: l.quantity,
      unitPriceHt: l.unitPriceHt,
      taxRate: l.taxRate,
      lineTotalHt: l.lineTotalHt,
      lineVat: l.lineVat,
      lineTotalTtc: l.lineTotalTtc,
      sortOrder: l.sortOrder,
    };
    return 'productId' in l && l.productId ? { ...base, productId: l.productId } : base;
  });

  await prisma.invoice.create({
    data: {
      organizationId: org.id,
      clientId: c2.id,
      quoteId: quoteConverted.id,
      number: null,
      issueDate: new Date(year, 1, 15),
      status: 'DRAFT',
      currency: 'CAD',
      notes: 'Facture brouillon générée depuis le devis converti.',
      subtotalHt: qConvTotals.subtotalHt,
      vatTotal: qConvTotals.vatTotal,
      totalTtc: qConvTotals.totalTtc,
      lines: { create: convLineCreates },
    },
  });

  console.log('\n--- Compte démo entreprise ---');
  console.log(`Organisation : ${DEMO_ORG_NAME} (${org.id})`);
  console.log(`OWNER  : ${DEMO_OWNER_EMAIL} / DemoOwner123!`);
  console.log(`USER   : ${DEMO_MEMBER_EMAIL} / DemoUser123!`);
  console.log(`Clients : ${c1.name}, ${c2.name}, ${c3.name}`);
  console.log(
    `Factures : brouillon + FAC-${year}-0001..0003 (dont 1 partiellement payée, 1 payée)`
  );
  console.log(
    `Devis : 1 brouillon, DEV-${year}-0001 (envoyé), 0002 (accepté), 0003 (refusé), 0004 (converti → facture brouillon liée)`
  );
  console.log(`Ids utiles — facture brouillon: ${invDraft.id}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
