import {
  LEGAL_SITE,
  brandOfCompanySentence,
  companyLegalLabel,
  formatLegalAddress,
} from '@/lib/legal-site';
import { LegalSection } from '@/components/legal/legal-page-layout';
import { Link } from '@/i18n/navigation';
import { PLAN_PRICES_HT_EUR, TRIAL_DAYS } from '@/lib/pricing-plans';

export function CgvContent() {
  const L = LEGAL_SITE;
  const prices = `Starter ${PLAN_PRICES_HT_EUR.starter.toFixed(2).replace('.', ',')} € HT/mois, Pro ${PLAN_PRICES_HT_EUR.pro.toFixed(2).replace('.', ',')} € HT/mois, Business ${PLAN_PRICES_HT_EUR.business.toFixed(2).replace('.', ',')} € HT/mois (TVA en sus)`;

  return (
    <>
      <LegalSection id="objet" title="1. Objet">
        <p>
          {brandOfCompanySentence()} Les présentes Conditions Générales de Vente et
          d&apos;Utilisation (ci-après « CGV/CGU ») régissent l&apos;accès et l&apos;utilisation du
          service en ligne <strong>{L.brand}</strong>, logiciel de facturation et devis accessible
          par abonnement, édité par {companyLegalLabel()}.
        </p>
        <p>
          Toute souscription ou utilisation du service implique l&apos;acceptation sans réserve des
          présentes CGV/CGU par le client (ci-après l&apos;« Utilisateur »), professionnel ou
          consommateur.
        </p>
      </LegalSection>

      <LegalSection id="definitions" title="2. Définitions">
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>
            <strong>Service</strong> : plateforme {L.brand} (création de factures, devis, exports,
            paramétrage e-Facture, etc.).
          </li>
          <li>
            <strong>Utilisateur</strong> : personne physique ou morale disposant d&apos;un compte.
          </li>
          <li>
            <strong>Abonnement</strong> : formule payante mensuelle (Starter, Pro, Business).
          </li>
          <li>
            <strong>Période d&apos;essai</strong> : {TRIAL_DAYS} jours gratuits à
            l&apos;inscription, sauf mention contraire.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="offres" title="3. Offres et tarifs">
        <p>
          Les offres, fonctionnalités et limites (utilisateurs, volume de factures, modèles PDF,
          etc.) sont décrites sur la page{' '}
          <Link href="/tarifs" className="text-emerald-700 underline">
            Tarifs
          </Link>
          . À la date de mise à jour : {prices}. Les prix sont indiqués en euros, TVA française
          incluse (taux en vigueur) pour les clients établis en France.
        </p>
        <p>
          {L.companyName} se réserve le droit de modifier ses tarifs. Toute modification
          s&apos;applique aux renouvellements suivants, avec information préalable par email ou dans
          l&apos;espace client.
        </p>
      </LegalSection>

      <LegalSection id="commande" title="4. Commande et paiement">
        <p>
          La souscription s&apos;effectue en ligne via le parcours de checkout sécurisé.
          L&apos;Utilisateur renseigne ses informations de facturation (raison sociale, email, SIRET
          le cas échéant, n° de TVA intracommunautaire le cas échéant) et valide son abonnement.
        </p>
        <p>
          Le paiement est effectué par carte bancaire ou tout autre moyen proposé sur la page de
          paiement (prestataire de paiement tiers, ex. Stripe). Le contrat est conclu à la
          confirmation du paiement ou, en période d&apos;essai, à l&apos;activation du compte selon
          les modalités affichées au checkout.
        </p>
        <p>
          Une facture d&apos;abonnement est émise par {L.companyName} conformément à la
          réglementation française.
        </p>
      </LegalSection>

      <LegalSection id="essai" title="5. Période d'essai">
        <p>
          Sauf indication contraire, un essai gratuit de {TRIAL_DAYS} jours est proposé à la
          première souscription. Pendant l&apos;essai, l&apos;Utilisateur peut résilier sans frais
          avant la fin de la période pour éviter tout prélèvement, sous réserve d&apos;avoir fourni
          un moyen de paiement si le parcours l&apos;exige.
        </p>
        <p>
          À l&apos;issue de l&apos;essai, l&apos;abonnement est reconduit tacitement au tarif de
          l&apos;offre choisie, sauf résiliation préalable.
        </p>
      </LegalSection>

      <LegalSection id="duree" title="6. Durée et résiliation">
        <p>
          L&apos;abonnement est conclu pour une durée indéterminée, avec facturation mensuelle.
          L&apos;Utilisateur peut résilier à tout moment depuis son espace client ou par demande à{' '}
          <a href={`mailto:${L.contactEmail}`} className="text-emerald-700 underline">
            {L.contactEmail}
          </a>
          . La résiliation prend effet à la fin de la période de facturation en cours ; aucun
          remboursement au prorata n&apos;est dû sauf disposition légale impérative.
        </p>
        <p>
          {L.companyName} peut suspendre ou résilier l&apos;accès en cas de manquement grave
          (impayé, usage frauduleux, atteinte à la sécurité du Service).
        </p>
      </LegalSection>

      <LegalSection id="obligations" title="7. Obligations de l'Utilisateur">
        <p>L&apos;Utilisateur s&apos;engage à :</p>
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>fournir des informations exactes et les maintenir à jour ;</li>
          <li>préserver la confidentialité de ses identifiants ;</li>
          <li>
            utiliser le Service conformément aux lois applicables (facturation, TVA, protection des
            données de ses propres clients) ;
          </li>
          <li>
            ne pas porter atteinte au fonctionnement du Service (intrusion, surcharge, contenu
            illicite).
          </li>
        </ul>
        <p>
          {L.brand} est un outil d&apos;aide à la facturation ; l&apos;Utilisateur demeure
          responsable de la conformité fiscale et comptable de ses documents (validation avec un
          expert-comptable recommandée).
        </p>
      </LegalSection>

      <LegalSection id="disponibilite" title="8. Disponibilité et support">
        <p>
          {L.companyName} s&apos;efforce d&apos;assurer une disponibilité du Service 24h/24, 7j/7,
          hors maintenance programmée ou force majeure. Le support est fourni selon l&apos;offre
          souscrite (email, délais indiqués sur la page Tarifs).
        </p>
      </LegalSection>

      <LegalSection id="donnees" title="9. Données personnelles">
        <p>
          Le traitement des données est décrit dans notre{' '}
          <Link href="/politique-de-confidentialite" className="text-emerald-700 underline">
            politique de confidentialité
          </Link>
          . L&apos;Utilisateur garantit disposer des bases légales pour traiter les données de ses
          clients saisies dans le Service.
        </p>
      </LegalSection>

      <LegalSection id="responsabilite" title="10. Responsabilité">
        <p>
          Le Service est fourni « en l&apos;état ». La responsabilité de {L.companyName} est limitée
          aux dommages directs prouvés, dans la limite du montant des sommes versées par
          l&apos;Utilisateur au cours des douze (12) derniers mois, sauf faute lourde ou dolosive.
        </p>
        <p>
          {L.companyName} n&apos;est pas responsable des pertes indirectes (perte de chiffre
          d&apos;affaires, perte de données imputable à l&apos;Utilisateur, sanctions
          administratives liées à une facturation non conforme).
        </p>
      </LegalSection>

      <LegalSection id="consommateur" title="11. Dispositions relatives aux consommateurs">
        <p>
          Si l&apos;Utilisateur est un consommateur (personne physique agissant hors activité
          professionnelle), les dispositions du Code de la consommation applicables au contrat à
          distance s&apos;appliquent, notamment le droit de rétractation de 14 jours, sauf
          renonciation expresse à l&apos;exécution immédiate du service numérique conformément à
          l&apos;article L221-28 lorsque le Service a été pleinement exécuté ou lorsque
          l&apos;Utilisateur a demandé l&apos;exécution immédiate après la période d&apos;essai.
        </p>
        <p>
          Médiation de la consommation : conformément aux articles L612-1 et suivants,
          l&apos;Utilisateur peut recourir gratuitement à un médiateur de la consommation en cas de
          litige non résolu. Le médiateur compétent sera indiqué sur demande à {L.contactEmail}.
        </p>
      </LegalSection>

      <LegalSection id="droit" title="12. Droit applicable et litiges">
        <p>
          Les présentes CGV/CGU sont soumises au droit français. En cas de litige, et à défaut de
          résolution amiable, compétence est attribuée aux tribunaux du ressort du siège social de{' '}
          {L.companyName} ({formatLegalAddress()}), sous réserve d&apos;une compétence spécifique
          imposée au consommateur.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="13. Contact">
        <p>
          {L.companyName} — {formatLegalAddress()} —{' '}
          <a href={`mailto:${L.contactEmail}`} className="text-emerald-700 underline">
            {L.contactEmail}
          </a>
        </p>
      </LegalSection>
    </>
  );
}
