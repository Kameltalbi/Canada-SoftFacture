import { MentionsLegalesContent } from '@/components/legal/mentions-legales-content';
import { LegalPageLayout } from '@/components/legal/legal-page-layout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentions légales — SoftFacture France (Nexiora)',
  description:
    'Mentions légales du service SoftFacture France, marque de la société Nexiora : éditeur, hébergement et données personnelles.',
};

export default function MentionsLegalesPage() {
  return (
    <LegalPageLayout title="Mentions légales">
      <MentionsLegalesContent />
    </LegalPageLayout>
  );
}
