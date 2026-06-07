import { PolitiqueConfidentialiteContent } from '@/components/legal/politique-confidentialite-content';
import { LegalPageLayout } from '@/components/legal/legal-page-layout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — SoftFacture France (Nexiora)',
  description:
    'Politique de confidentialité (RGPD) du service SoftFacture France, marque de la société Nexiora.',
};

export default function PolitiqueConfidentialitePage() {
  return (
    <LegalPageLayout title="Politique de confidentialité">
      <PolitiqueConfidentialiteContent />
    </LegalPageLayout>
  );
}
