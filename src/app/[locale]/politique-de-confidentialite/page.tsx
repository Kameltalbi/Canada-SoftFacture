import { PolitiqueConfidentialiteContent } from '@/components/legal/politique-confidentialite-content';
import { LegalPageLayout } from '@/components/legal/legal-page-layout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — SoftFacture Canada',
  description:
    'Politique de confidentialité (LPRPDE / Loi 25) du service SoftFacture Canada : renseignements personnels, droits et sécurité.',
};

export default function PolitiqueConfidentialitePage() {
  return (
    <LegalPageLayout title="Politique de confidentialité">
      <PolitiqueConfidentialiteContent />
    </LegalPageLayout>
  );
}
