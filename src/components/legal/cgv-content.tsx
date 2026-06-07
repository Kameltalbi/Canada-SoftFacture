import {
  LEGAL_SITE,
  brandOfCompanySentence,
  companyLegalLabel,
  formatLegalAddress,
} from '@/lib/legal-site';
import { LegalSection } from '@/components/legal/legal-page-layout';
import { Link } from '@/i18n/navigation';
import { PLAN_PRICES_HT_CAD, TRIAL_DAYS } from '@/lib/pricing-plans';

export function CgvContent() {
  const L = LEGAL_SITE;
  const prices = `Essentiel $${PLAN_PRICES_HT_CAD.starter.toFixed(2)} CAD/mois, Pro $${PLAN_PRICES_HT_CAD.pro.toFixed(2)} CAD/mois, Expert $${PLAN_PRICES_HT_CAD.business.toFixed(2)} CAD/mois (avant TPS/TVQ)`;

  return (
    <>
      <LegalSection id="objet" title="1. Objet">
        <p>
          {brandOfCompanySentence()} Les présentes Conditions Générales d&apos;Utilisation et de
          Vente (ci-après « CGU/CGV ») régissent l&apos;accès et l&apos;utilisation du service en
          ligne <strong>{L.brand}</strong>, logiciel de facturation et devis accessible par
          abonnement, fourni par {companyLegalLabel()}.
        </p>
        <p>
          Toute souscription ou utilisation du Service implique l&apos;acceptation sans réserve des
          présentes CGU/CGV par le client (ci-après l&apos;« Utilisateur »).
        </p>
      </LegalSection>

      <LegalSection id="definitions" title="2. Définitions">
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>
            <strong>Service</strong> : plateforme {L.brand} (création de factures, soumissions,
            exports PDF, gestion des paiements, etc.).
          </li>
          <li>
            <strong>Utilisateur</strong> : personne physique ou morale titulaire d&apos;un compte.
          </li>
          <li>
            <strong>Abonnement</strong> : formule payante mensuelle (Essentiel, Pro, Expert).
          </li>
          <li>
            <strong>Période d&apos;essai</strong> : {TRIAL_DAYS} jours gratuits à
            l&apos;inscription, sauf indication contraire.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="offres" title="3. Offres et tarifs">
        <p>
          Les offres, fonctionnalités et limites sont décrites sur la page{' '}
          <Link href="/tarifs" className="text-emerald-700 underline">
            Tarifs
          </Link>
          . À la date de mise à jour : {prices}. Les taxes applicables (TPS 5 % et, le cas échéant,
          TVQ 9,975 %) s&apos;ajoutent au prix indiqué selon la province de résidence de
          l&apos;Utilisateur.
        </p>
        <p>
          {L.companyName} se réserve le droit de modifier ses tarifs. Toute modification
          s&apos;applique aux renouvellements suivants, avec préavis par courriel ou dans
          l&apos;espace client.
        </p>
      </LegalSection>

      <LegalSection id="commande" title="4. Souscription et paiement">
        <p>
          La souscription s&apos;effectue en ligne via le formulaire de paiement sécurisé.
          L&apos;Utilisateur renseigne ses informations de facturation (raison sociale ou nom,
          courriel, numéro TPS/TVQ le cas échéant) et confirme son abonnement.
        </p>
        <p>
          Le paiement est traité par carte de crédit ou tout autre moyen proposé (ex. Stripe). Le
          contrat est conclu à la confirmation du paiement ou, en période d&apos;essai, à
          l&apos;activation du compte selon les modalités affichées au moment de la souscription.
        </p>
        <p>
          Un reçu ou une facture d&apos;abonnement est émis par {L.companyName} conformément à la
          réglementation fiscale canadienne applicable.
        </p>
      </LegalSection>

      <LegalSection id="essai" title="5. Période d'essai">
        <p>
          Sauf indication contraire, un essai gratuit de {TRIAL_DAYS} jours est offert à la première
          souscription. L&apos;Utilisateur peut annuler sans frais avant la fin de cette période. À
          l&apos;issue de l&apos;essai, l&apos;abonnement est reconduit automatiquement au tarif de
          l&apos;offre choisie, sauf annulation préalable.
        </p>
      </LegalSection>

      <LegalSection id="duree" title="6. Durée et annulation">
        <p>
          L&apos;abonnement est à durée indéterminée, renouvelé mensuellement. L&apos;Utilisateur
          peut l&apos;annuler à tout moment depuis son espace client ou en écrivant à{' '}
          <a href={`mailto:${L.contactEmail}`} className="text-emerald-700 underline">
            {L.contactEmail}
          </a>
          . L&apos;annulation prend effet à la fin de la période de facturation en cours ; aucun
          remboursement au prorata n&apos;est dû sauf disposition législative impérative.
        </p>
        <p>
          {L.companyName} peut suspendre ou résilier l&apos;accès en cas de manquement grave (défaut
          de paiement, usage frauduleux, atteinte à la sécurité du Service).
        </p>
      </LegalSection>

      <LegalSection id="obligations" title="7. Obligations de l'Utilisateur">
        <p>L&apos;Utilisateur s&apos;engage à :</p>
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>fournir des informations exactes et les maintenir à jour ;</li>
          <li>préserver la confidentialité de ses identifiants de connexion ;</li>
          <li>
            utiliser le Service conformément aux lois applicables (TPS/TVQ, LPRPDE, Loi 25 et toute
            autre loi fiscale ou sur la protection des renseignements personnels) ;
          </li>
          <li>
            ne pas perturber le fonctionnement du Service (intrusion, surcharge, contenu illicite).
          </li>
        </ul>
        <p>
          {L.brand} est un outil d&apos;aide à la facturation ; l&apos;Utilisateur demeure
          responsable de la conformité fiscale et comptable de ses documents (consultation d&apos;un
          comptable ou fiscaliste recommandée).
        </p>
      </LegalSection>

      <LegalSection id="disponibilite" title="8. Disponibilité et soutien">
        <p>
          {L.companyName} s&apos;efforce d&apos;assurer la disponibilité du Service 24 h/24, 7 j/7,
          sauf maintenance planifiée ou cas de force majeure. Le soutien est fourni selon
          l&apos;offre souscrite (courriel, délais indiqués sur la page Tarifs).
        </p>
      </LegalSection>

      <LegalSection id="donnees" title="9. Renseignements personnels">
        <p>
          Le traitement des renseignements personnels est décrit dans notre{' '}
          <Link href="/politique-de-confidentialite" className="text-emerald-700 underline">
            politique de confidentialité
          </Link>
          . L&apos;Utilisateur garantit détenir les bases légales nécessaires pour traiter les
          données de ses propres clients saisies dans le Service, conformément à la Loi sur la
          protection des renseignements personnels et les documents électroniques (LPRPDE) et à la
          Loi 25 (Québec).
        </p>
      </LegalSection>

      <LegalSection id="responsabilite" title="10. Limitation de responsabilité">
        <p>
          Le Service est fourni « tel quel ». La responsabilité de {L.companyName} est limitée aux
          dommages directs prouvés, dans la limite des sommes versées par l&apos;Utilisateur au
          cours des douze (12) derniers mois, sauf faute lourde ou intentionnelle.
        </p>
        <p>
          {L.companyName} n&apos;est pas responsable des préjudices indirects (perte de revenus,
          perte de données imputable à l&apos;Utilisateur, sanctions fiscales liées à une
          facturation non conforme).
        </p>
      </LegalSection>

      <LegalSection id="consommateur" title="11. Droits des consommateurs">
        <p>
          Si l&apos;Utilisateur est un consommateur au sens de la Loi sur la protection du
          consommateur (LPC, Québec), les dispositions impératives de cette loi s&apos;appliquent.
          Pour tout contrat à distance conclu électroniquement, l&apos;Utilisateur bénéficie des
          droits prévus aux articles 54.1 et suivants de la LPC, notamment le droit de résolution
          dans les délais prévus par la Loi.
        </p>
        <p>
          Pour tout litige non résolu, l&apos;Utilisateur peut s&apos;adresser à l&apos;Office de la
          protection du consommateur (OPC) du Québec :{' '}
          <a
            href="https://www.opc.gouv.qc.ca"
            className="text-emerald-700 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            www.opc.gouv.qc.ca
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="droit" title="12. Droit applicable et tribunaux compétents">
        <p>
          Les présentes CGU/CGV sont régies par les lois de la province de {L.province} et les lois
          fédérales du Canada applicables. En cas de litige non résolu à l&apos;amiable, les
          tribunaux de {L.province} ({formatLegalAddress()}) sont compétents, sous réserve des
          droits impératifs du consommateur.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="13. Contact">
        <p>
          {companyLegalLabel()} — {formatLegalAddress()} —{' '}
          <a href={`mailto:${L.contactEmail}`} className="text-emerald-700 underline">
            {L.contactEmail}
          </a>
        </p>
      </LegalSection>
    </>
  );
}
