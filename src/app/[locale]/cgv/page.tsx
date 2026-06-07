import { CgvContent } from '@/components/legal/cgv-content';
import { LegalPageLayout } from '@/components/legal/legal-page-layout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions générales — SoftFacture Canada',
  description:
    'CGU/CGV des abonnements SoftFacture Canada : tarifs en CAD, TPS/TVQ, essai gratuit, paiement et annulation.',
};

export default function CgvPage() {
  return (
    <LegalPageLayout title="Conditions générales d'utilisation et de vente">
      <CgvContent />
    </LegalPageLayout>
  );
}
