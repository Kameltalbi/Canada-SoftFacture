import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from '../src/generated/prisma';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const hash = await bcrypt.hash('Demo123456', 12);

  await prisma.user.upsert({
    where: { email: 'admin@softfacture.demo' },
    create: {
      email: 'admin@softfacture.demo',
      passwordHash: hash,
      name: 'Administrateur',
      role: 'ADMIN',
      company: {
        create: {
          name: 'SoftFacture Platform',
          country: 'FR',
          city: 'Lyon',
        },
      },
    },
    update: { passwordHash: hash },
  });

  await prisma.user.upsert({
    where: { email: 'demo@softfacture.demo' },
    create: {
      email: 'demo@softfacture.demo',
      passwordHash: hash,
      name: 'Utilisateur démo',
      role: 'USER',
      company: {
        create: {
          name: 'SARL Démo Export',
          taxMatricule: '00000000/A/M/000',
          country: 'FR',
          city: 'Lyon',
          address: '1, avenue Habib Bourguiba',
        },
      },
    },
    update: { passwordHash: hash },
  });

  const demo = await prisma.user.findUnique({
    where: { email: 'demo@softfacture.demo' },
    include: { company: true },
  });
  if (demo?.company) {
    const hasInv = await prisma.invoice.findFirst({
      where: { companyId: demo.company.id },
    });
    if (!hasInv) {
      let c = await prisma.client.findFirst({
        where: { companyId: demo.company.id, name: 'Client Démo SPA' },
      });
      if (!c) {
        c = await prisma.client.create({
          data: {
            companyId: demo.company.id,
            name: 'Client Démo SPA',
            email: 'client@example.com',
            city: 'Sfax',
            country: 'FR',
          },
        });
      }
      const prod = await prisma.product.findFirst({
        where: { companyId: demo.company.id, name: 'Prestation conseil' },
      });
      if (!prod) {
        await prisma.product.create({
          data: {
            companyId: demo.company.id,
            name: 'Prestation conseil',
            unitPrice: 500,
            taxRate: 19,
            unit: 'jour',
          },
        });
      }
      const inv = await prisma.invoice.create({
        data: {
          companyId: demo.company.id,
          clientId: c.id,
          number: `F-${new Date().getFullYear()}-00001`,
          issueDate: new Date(),
          status: 'SENT',
          currency: 'EUR',
          subtotalHt: 500,
          vatTotal: 95,
          totalTtc: 595,
          lines: {
            create: [
              {
                description: 'Prestation conseil',
                quantity: 1,
                unitPriceHt: 500,
                taxRate: 19,
                lineTotalHt: 500,
                lineVat: 95,
                lineTotalTtc: 595,
                sortOrder: 0,
              },
            ],
          },
          logs: {
            create: { action: 'SEED', details: '{}' },
          },
        },
      });
      console.log('Seed invoice:', inv.number);
    }
  }
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
