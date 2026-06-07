import { LEGAL_SITE } from '@/lib/legal-site';
import { LegalSection } from '@/components/legal/legal-page-layout';

export function PolitiqueConfidentialiteContent() {
  const L = LEGAL_SITE;
  const rpName = process.env.NEXT_PUBLIC_LEGAL_DPO_NAME ?? 'Omar Talbi';
  const rpEmail = process.env.NEXT_PUBLIC_LEGAL_DPO_EMAIL ?? 'vieprivee@softfacture.ca';

  return (
    <>
      <p className="mb-6 text-sm text-slate-500">
        <strong>Dernière mise à jour :</strong> {L.lastUpdated}
      </p>

      <p className="mb-8 text-slate-700">
        Chez <strong>{L.brand}</strong>, nous prenons la protection de vos renseignements personnels
        et de vos données financières très au sérieux. La présente Politique de confidentialité
        décrit de manière claire et transparente comment nous collectons, utilisons, stockons,
        protégeons et supprimons vos renseignements personnels, conformément à la{' '}
        <strong>Loi 25 du Québec</strong> et à la <strong>LPRPDE du Canada</strong>.
      </p>
      <p className="mb-8 text-slate-700">
        Cette politique s&apos;applique à l&apos;utilisation de notre site web vitrine ainsi
        qu&apos;à notre plateforme de facturation en mode SaaS (ci-après désignée « la Plateforme
        »).
      </p>

      <LegalSection
        id="responsable"
        title="1. Responsable de la protection des renseignements personnels"
      >
        <p>
          Pour toute question, commentaire ou pour exercer vos droits relatifs à vos renseignements
          personnels, vous pouvez communiquer directement avec notre responsable :
        </p>
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>
            <strong>Nom du responsable :</strong> {rpName}
          </li>
          <li>
            <strong>Titre :</strong> Responsable de la protection des renseignements personnels
          </li>
          <li>
            <strong>Adresse courriel dédiée :</strong>{' '}
            <a href={`mailto:${rpEmail}`} className="text-emerald-700 underline">
              {rpEmail}
            </a>
          </li>
        </ul>
      </LegalSection>

      <LegalSection
        id="donnees-collectees"
        title="2. Renseignements personnels que nous collectons"
      >
        <p>
          Nous ne collectons que les renseignements personnels strictement nécessaires à la
          fourniture de nos services de facturation.
        </p>

        <p className="mt-4">
          <strong>A. Données collectées lors de la création d&apos;un compte</strong>
        </p>
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>
            Nom, prénom et adresse courriel de l&apos;administrateur et des utilisateurs autorisés.
          </li>
          <li>Nom de votre entreprise, adresse professionnelle et numéro de téléphone.</li>
          <li>
            Informations de facturation et de paiement (gérées de manière sécurisée par notre
            passerelle de paiement tierce).
          </li>
        </ul>

        <p className="mt-4">
          <strong>
            B. Données de facturation de vos propres clients (En tant que sous-traitant)
          </strong>
        </p>
        <p>
          Dans le cadre de l&apos;utilisation de la Plateforme, vous entrez des données concernant
          vos propres clients (noms, adresses, courriels, détails des prestations et montants).{' '}
          <strong>
            {L.brand} traite ces données uniquement en tant que sous-traitant (mandataire)
          </strong>
          , selon vos instructions exclusives, pour générer, envoyer et stocker vos factures.
        </p>

        <p className="mt-4">
          <strong>C. Données de navigation (Cookies)</strong>
        </p>
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>Adresse IP, type de navigateur, pages consultées sur notre site vitrine.</li>
          <li>
            Les cookies strictement nécessaires à la sécurité et au maintien de votre session de
            facturation sur la Plateforme sont activés par défaut. Les cookies d&apos;analyse ou de
            marketing sont bloqués par défaut et requièrent votre consentement explicite.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="finalites" title="3. Finalités du traitement">
        <p>Nous utilisons vos renseignements personnels uniquement pour les fins suivantes :</p>
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>Créer, gérer et sécuriser votre compte utilisateur sur {L.brand}.</li>
          <li>Assurer le bon fonctionnement technique de la Plateforme et générer vos factures.</li>
          <li>Traiter vos paiements d&apos;abonnement de manière sécurisée.</li>
          <li>Assurer le support technique et répondre à vos demandes d&apos;assistance.</li>
          <li>Respecter nos obligations légales et fiscales en matière de comptabilité.</li>
        </ul>
      </LegalSection>

      <LegalSection
        id="hebergement"
        title="4. Hébergement et Souveraineté des données (100 % Québec)"
      >
        <p>Pour vous garantir une sécurité juridique et technique optimale face à la Loi 25 :</p>
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>
            L&apos;infrastructure principale, les bases de données et les sauvegardes de {L.brand}{' '}
            sont <strong>intégralement et physiquement hébergées au Québec, Canada</strong>.
          </li>
          <li>
            Aucun transfert transfrontalier de vos données principales de facturation n&apos;est
            effectué en dehors de la province du Québec pour le stockage.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="tiers" title="5. Partage des données avec des tiers">
        <p>
          Nous ne vendons, n&apos;échangeons ni ne louons vos renseignements personnels à des tiers.
          Vos données ne sont partagées qu&apos;avec des sous-traitants de confiance indispensables
          à l&apos;exécution de nos services, notamment :
        </p>
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>Notre fournisseur d&apos;infrastructure cloud (hébergé au Québec).</li>
          <li>
            Notre passerelle de paiement sécurisée (ex. Stripe) pour la gestion des transactions.
          </li>
          <li>
            Notre service d&apos;envoi de courriels transactionnels pour l&apos;expédition
            automatisée de vos factures.
          </li>
        </ul>
        <p className="mt-3">
          Tous nos sous-traitants sont liés par des ententes contractuelles strictes et doivent
          déployer des mesures de sécurité équivalentes à celles exigées par la Loi 25.
        </p>
      </LegalSection>

      <LegalSection id="duree" title="6. Durée de conservation, destruction et anonymisation">
        <p>
          Nous conservons vos renseignements personnels aussi longtemps que votre compte {L.brand}{' '}
          est actif, ou selon les obligations légales applicables (notamment les exigences de
          conservation des dossiers fiscaux).
        </p>
        <p className="mt-3">En cas de résiliation de votre abonnement :</p>
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>
            Vos données d&apos;accès et utilisateurs sont conservées pendant une période de grâce de{' '}
            <strong>90 jours</strong>, puis sont définitivement <strong>détruites</strong> de nos
            serveurs.
          </li>
          <li>
            Conformément à la Loi 25, les données de facturation résiduelles nécessaires à nos
            analyses internes et statistiques globales font l&apos;objet d&apos;un processus d&apos;
            <strong>anonymisation irréversible</strong>. Il devient alors totalement impossible de
            les associer à une personne physique.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="securite" title="7. Sécurité des données">
        <p>
          Nous appliquons des mesures de sécurité techniques et organisationnelles rigoureuses pour
          protéger vos renseignements personnels contre l&apos;accès non autorisé, la perte, le vol
          ou la modification :
        </p>
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>
            Chiffrement de toutes les données en transit (protocole HTTPS/TLS) et au repos
            (at-rest).
          </li>
          <li>
            Isolation stricte des données (Multi-Tenancy) empêchant toute interconnexion entre les
            comptes de différentes entreprises.
          </li>
          <li>
            Tenue d&apos;un registre interne des incidents de confidentialité et processus
            d&apos;alerte rapide en cas de risque de préjudice sérieux.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="droits" title="8. Vos droits (Accès, Rectification et Portabilité)">
        <p>
          En vertu des lois canadiennes et québécoises, vous disposez de droits majeurs concernant
          vos renseignements personnels :
        </p>
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>
            <strong>Droit d&apos;accès et de rectification :</strong> Vous pouvez consulter,
            modifier ou mettre à jour vos renseignements personnels à tout moment depuis votre
            tableau de bord {L.brand} ou en contactant {rpName}.
          </li>
          <li>
            <strong>Droit à la portabilité des données :</strong> Vous pouvez demander et
            télécharger un export complet de vos données de facturation et de profil dans un format
            technologique structuré, couramment utilisé et lisible par ordinateur (format JSON ou
            CSV).
          </li>
          <li>
            <strong>Droit au retrait du consentement :</strong> Vous pouvez retirer votre
            consentement à l&apos;utilisation de vos données non essentielles (comme les cookies
            marketing) via notre centre de gestion des préférences.
          </li>
        </ul>
        <p className="mt-3">
          Pour exercer l&apos;un de ces droits, veuillez adresser une demande écrite à{' '}
          <strong>{rpName}</strong> à l&apos;adresse :{' '}
          <a href={`mailto:${rpEmail}`} className="text-emerald-700 underline">
            {rpEmail}
          </a>
          . Nous répondrons à votre demande dans un délai maximum de <strong>30 jours</strong>,
          conformément à la loi.
        </p>
        <p className="mt-3">
          Vous pouvez également déposer une plainte auprès de la{' '}
          <a
            href="https://www.cai.gouv.qc.ca"
            className="text-emerald-700 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Commission d&apos;accès à l&apos;information du Québec (CAI)
          </a>{' '}
          ou du{' '}
          <a
            href="https://www.priv.gc.ca"
            className="text-emerald-700 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Commissariat à la protection de la vie privée du Canada
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="modifications" title="9. Modifications de la présente politique">
        <p>
          Nous nous réservons le droit de modifier cette Politique de confidentialité pour refléter
          les changements technologiques ou l&apos;évolution de la réglementation. En cas de
          modification majeure, une notification sera affichée de manière visible sur la Plateforme
          lors de votre connexion.
        </p>
      </LegalSection>
    </>
  );
}
