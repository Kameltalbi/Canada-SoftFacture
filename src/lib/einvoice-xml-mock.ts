/**
 * Génération d’un XML **placeholder** inspiré UBL / Factur-X (e-facturation PA).
 * Phase A — structure EN 16931 simplifiée ; remplacer par schéma officiel + Factur-X PDF/A-3.
 */
export type EinvoiceLineInput = {
  description: string;
  quantity: string;
  unitCode: string;
  unitPriceHt: string;
  taxRatePercent: string;
  lineHt: string;
  lineVat: string;
  lineTtc: string;
};

export type EinvoiceOperationNature = 'GOODS' | 'SERVICES' | 'MIXED';

export type EinvoiceXmlInput = {
  uuid: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  currency: string;
  operationNature: EinvoiceOperationNature;
  vatOnDebits: boolean;
  supplier: {
    name: string;
    taxMatricule?: string;
    address?: string;
    city?: string;
    country: string;
  };
  customer: {
    name: string;
    siren?: string;
    taxId?: string;
    address?: string;
    city?: string;
    country: string;
  };
  delivery?: {
    address: string;
    city?: string;
    country: string;
  };
  lines: EinvoiceLineInput[];
  totals: { subtotalHt: string; vatTotal: string; totalTtc: string };
};

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const OPERATION_LABEL: Record<EinvoiceOperationNature, string> = {
  GOODS: 'Livraison de biens',
  SERVICES: 'Prestation de services',
  MIXED: 'Opération mixte',
};

export function buildEinvoiceXmlMock(data: EinvoiceXmlInput): string {
  const linesXml = data.lines
    .map(
      (l, i) => `
  <cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${esc(l.unitCode)}">${esc(l.quantity)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${esc(data.currency)}">${esc(l.lineHt)}</cbc:LineExtensionAmount>
    <cac:Item><cbc:Description>${esc(l.description)}</cbc:Description></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="${esc(data.currency)}">${esc(l.unitPriceHt)}</cbc:PriceAmount></cac:Price>
    <cac:TaxTotal><cbc:TaxAmount currencyID="${esc(data.currency)}">${esc(l.lineVat)}</cbc:TaxAmount>
      <cac:TaxSubtotal><cbc:TaxableAmount currencyID="${esc(data.currency)}">${esc(l.lineHt)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="${esc(data.currency)}">${esc(l.lineVat)}</cbc:TaxAmount>
        <cac:TaxCategory><cbc:Percent>${esc(l.taxRatePercent)}</cbc:Percent></cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
  </cac:InvoiceLine>`
    )
    .join('');

  const deliveryXml =
    data.delivery && data.delivery.address.trim()
      ? `
  <cac:Delivery>
    <cac:DeliveryLocation>
      <cac:Address>
        <cbc:StreetName>${esc(data.delivery.address)}</cbc:StreetName>
        ${data.delivery.city ? `<cbc:CityName>${esc(data.delivery.city)}</cbc:CityName>` : ''}
        <cbc:CountrySubentity>${esc(data.delivery.country)}</cbc:CountrySubentity>
      </cac:Address>
    </cac:DeliveryLocation>
  </cac:Delivery>`
      : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- E-invoice Phase A (UBL simplifié) — SoftFacture France — non validé juridiquement -->
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ID>${esc(data.invoiceNumber)}</cbc:ID>
  <cbc:UUID>${esc(data.uuid)}</cbc:UUID>
  <cbc:IssueDate>${esc(data.issueDate)}</cbc:IssueDate>
  ${data.dueDate ? `<cbc:DueDate>${esc(data.dueDate)}</cbc:DueDate>` : ''}
  <cbc:DocumentCurrencyCode>${esc(data.currency)}</cbc:DocumentCurrencyCode>
  <cbc:Note>${esc(OPERATION_LABEL[data.operationNature])}</cbc:Note>
  ${data.vatOnDebits ? '<cbc:Note>TVA sur les débits</cbc:Note>' : ''}
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${esc(data.supplier.name)}</cbc:Name></cac:PartyName>
      ${data.supplier.taxMatricule ? `<cac:PartyTaxScheme><cbc:CompanyID>${esc(data.supplier.taxMatricule)}</cbc:CompanyID></cac:PartyTaxScheme>` : ''}
      <cac:PostalAddress>
        <cbc:StreetName>${esc(data.supplier.address ?? '')}</cbc:StreetName>
        <cbc:CityName>${esc(data.supplier.city ?? '')}</cbc:CityName>
        <cbc:CountrySubentity>${esc(data.supplier.country)}</cbc:CountrySubentity>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${esc(data.customer.name)}</cbc:Name></cac:PartyName>
      ${data.customer.siren ? `<cac:PartyLegalEntity><cbc:CompanyID schemeID="0002">${esc(data.customer.siren)}</cbc:CompanyID></cac:PartyLegalEntity>` : ''}
      ${data.customer.taxId ? `<cac:PartyTaxScheme><cbc:CompanyID>${esc(data.customer.taxId)}</cbc:CompanyID></cac:PartyTaxScheme>` : ''}
      <cac:PostalAddress>
        <cbc:StreetName>${esc(data.customer.address ?? '')}</cbc:StreetName>
        <cbc:CityName>${esc(data.customer.city ?? '')}</cbc:CityName>
        <cbc:CountrySubentity>${esc(data.customer.country)}</cbc:CountrySubentity>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingCustomerParty>
  ${deliveryXml}
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${esc(data.currency)}">${esc(data.totals.vatTotal)}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${esc(data.currency)}">${esc(data.totals.subtotalHt)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${esc(data.currency)}">${esc(data.totals.subtotalHt)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${esc(data.currency)}">${esc(data.totals.totalTtc)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${esc(data.currency)}">${esc(data.totals.totalTtc)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${linesXml}
</Invoice>`;
}
