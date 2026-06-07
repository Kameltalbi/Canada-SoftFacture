import { describe, expect, it } from 'vitest';
import { parseCiiInvoiceSummary } from './parseCiiSummary.js';

const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100">
  <rsm:ExchangedDocument>
    <ram:ID xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100">FOUR-2026-0042</ram:ID>
    <ram:IssueDateTime xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100">
      <udt:DateTimeString xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100" format="102">20260615</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100">
      <ram:SellerTradeParty>
        <ram:Name>Acme Fournisseur SAS</ram:Name>
        <ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">732829320</ram:ID>
        </ram:SpecifiedLegalOrganization>
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">FR44732829320</ram:ID>
        </ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>Mon Entreprise</ram:Name>
        <ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">123456789</ram:ID>
        </ram:SpecifiedLegalOrganization>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeSettlement xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100">
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:TaxBasisTotalAmount>1000.00</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount>200.00</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>1200.00</ram:GrandTotalAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100" format="102">20260715</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

describe('parseCiiInvoiceSummary', () => {
  it('extrait numéro, dates, parties et montants', () => {
    const s = parseCiiInvoiceSummary(sampleXml);
    expect(s.invoiceNumber).toBe('FOUR-2026-0042');
    expect(s.issueDate.toISOString().slice(0, 10)).toBe('2026-06-15');
    expect(s.dueDate?.toISOString().slice(0, 10)).toBe('2026-07-15');
    expect(s.currency).toBe('EUR');
    expect(s.supplierName).toBe('Acme Fournisseur SAS');
    expect(s.supplierSiren).toBe('732829320');
    expect(s.supplierVat).toBe('FR44732829320');
    expect(s.buyerName).toBe('Mon Entreprise');
    expect(s.buyerSiren).toBe('123456789');
    expect(s.subtotalHt).toBe(1000);
    expect(s.vatTotal).toBe(200);
    expect(s.totalTtc).toBe(1200);
  });

  it('retourne des valeurs par défaut si XML minimal', () => {
    const s = parseCiiInvoiceSummary('<root></root>');
    expect(s.invoiceNumber).toBe('SANS-NUMERO');
    expect(s.supplierName).toBe('Fournisseur inconnu');
    expect(s.currency).toBe('EUR');
  });
});
