import { CgvContent } from '@/components/legal/cgv-content';
import { LegalPageLayout } from '@/components/legal/legal-page-layout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions générales — SoftFacture France (Nexiora)',
  description:
    'CGV/CGU des abonnements SoftFacture France, marque Nexiora : tarifs HT, essai gratuit, paiement et résiliation.',
};

export default function CgvPage() {
  return (
    <LegalPageLayout title="Conditions générales de vente et d'utilisation">
      <CgvContent />
    </LegalPageLayout>
  );
}
