import { MentionsLegalesContent } from '@/components/legal/mentions-legales-content';
import { LegalPageLayout } from '@/components/legal/legal-page-layout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Informations légales — SoftFacture Canada',
  description:
    'Informations légales du service SoftFacture Canada : fournisseur, hébergement, NEQ, TPS/TVQ et renseignements personnels.',
};

export default function MentionsLegalesPage() {
  return (
    <LegalPageLayout title="Informations légales">
      <MentionsLegalesContent />
    </LegalPageLayout>
  );
}
