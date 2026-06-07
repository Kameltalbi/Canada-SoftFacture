'use client';

import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { toNumber } from '@/lib/utils';

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  logoSection: {
    width: '45%',
  },
  logoPlaceholder: {
    width: 120,
    height: 50,
    backgroundColor: '#059669',
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  companyTax: {
    fontSize: 9,
    color: '#64748b',
  },
  documentInfo: {
    width: '45%',
    alignItems: 'flex-end',
  },
  documentTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 4,
  },
  documentNumber: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  documentDate: {
    fontSize: 9,
    color: '#64748b',
  },
  validUntil: {
    fontSize: 9,
    color: '#f59e0b',
    fontWeight: 'bold',
  },
  // Section divider
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginVertical: 20,
  },
  // Addresses
  addresses: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  addressSection: {
    width: '45%',
  },
  addressLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 3,
  },
  addressLine: {
    fontSize: 9,
    color: '#475569',
    marginBottom: 1,
  },
  // Table
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#059669',
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1e293b',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f1f5f9',
  },
  tableColDescription: { width: '45%' },
  tableColQty: { width: '10%', textAlign: 'right' },
  tableColPrice: { width: '15%', textAlign: 'right' },
  tableColVat: { width: '12%', textAlign: 'right' },
  tableColTotal: { width: '18%', textAlign: 'right' },
  cellText: {
    fontSize: 9,
    color: '#334155',
  },
  cellTextBold: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  // Totals
  totalsSection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalsBox: {
    width: '50%',
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalLabel: {
    fontSize: 9,
    color: '#64748b',
  },
  totalValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#334155',
  },
  totalRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  totalLabelFinal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  totalValueFinal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
  },
  // Payment terms
  paymentTerms: {
    marginTop: 25,
    backgroundColor: '#fefce8',
    padding: 12,
    borderRadius: 6,
  },
  paymentTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#854d0e',
    marginBottom: 4,
  },
  paymentText: {
    fontSize: 8,
    color: '#a16207',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
  },
  footerText: {
    fontSize: 8,
    color: '#94a3b8',
  },
  footerBold: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748b',
  },
});

export type QuotePdfData = {
  number: string;
  issueDate: string;
  validUntil?: string | null;
  companyName: string;
  companyTax?: string | null;
  companyAddress?: string | null;
  companyCity?: string | null;
  companyCountry?: string | null;
  clientName: string;
  clientTax?: string | null;
  clientAddress?: string | null;
  clientCity?: string | null;
  clientCountry?: string | null;
  lines: {
    description: string;
    qty: number;
    unitHt: number;
    rate: number;
    ht: number;
    vat: number;
    ttc: number;
  }[];
  subtotalHt: number;
  vatTotal: number;
  tpsTotal: number;
  tvqTotal: number;
  timbreFiscal: number;
  totalTtc: number;
  currency: string;
  paymentTerms?: string | null;
};

export function QuoteDoc({ data }: { data: QuotePdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>SF</Text>
            </View>
            <Text style={styles.companyName}>{data.companyName}</Text>
            {data.companyTax && <Text style={styles.companyTax}>MF : {data.companyTax}</Text>}
          </View>
          <View style={styles.documentInfo}>
            <Text style={styles.documentTitle}>DEVIS</Text>
            <Text style={styles.documentNumber}>N° {data.number}</Text>
            <Text style={styles.documentDate}>Date : {data.issueDate}</Text>
            {data.validUntil && (
              <Text style={styles.validUntil}>Valide jusqu&apos;au : {data.validUntil}</Text>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Addresses */}
        <View style={styles.addresses}>
          <View style={styles.addressSection}>
            <Text style={styles.addressLabel}>Émetteur</Text>
            <Text style={styles.addressName}>{data.companyName}</Text>
            {data.companyAddress && <Text style={styles.addressLine}>{data.companyAddress}</Text>}
            {data.companyCity && <Text style={styles.addressLine}>{data.companyCity}</Text>}
            {data.companyCountry && <Text style={styles.addressLine}>{data.companyCountry}</Text>}
            {data.companyTax && <Text style={styles.addressLine}>MF : {data.companyTax}</Text>}
          </View>
          <View style={styles.addressSection}>
            <Text style={styles.addressLabel}>Destinataire</Text>
            <Text style={styles.addressName}>{data.clientName}</Text>
            {data.clientAddress && <Text style={styles.addressLine}>{data.clientAddress}</Text>}
            {data.clientCity && <Text style={styles.addressLine}>{data.clientCity}</Text>}
            {data.clientCountry && <Text style={styles.addressLine}>{data.clientCountry}</Text>}
            {data.clientTax && <Text style={styles.addressLine}>MF : {data.clientTax}</Text>}
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.tableColDescription]}>Description</Text>
            <Text style={[styles.tableHeaderText, styles.tableColQty]}>Qté</Text>
            <Text style={[styles.tableHeaderText, styles.tableColPrice]}>PU HT</Text>
            <Text style={[styles.tableHeaderText, styles.tableColVat]}>TVA</Text>
            <Text style={[styles.tableHeaderText, styles.tableColTotal]}>TTC</Text>
          </View>
          {data.lines.map((l, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.cellTextBold, styles.tableColDescription]}>{l.description}</Text>
              <Text style={[styles.cellText, styles.tableColQty]}>{l.qty}</Text>
              <Text style={[styles.cellText, styles.tableColPrice]}>{l.unitHt.toFixed(3)}</Text>
              <Text style={[styles.cellText, styles.tableColVat]}>{l.rate}%</Text>
              <Text style={[styles.cellTextBold, styles.tableColTotal]}>{l.ttc.toFixed(3)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total HT</Text>
              <Text style={styles.totalValue}>
                {data.subtotalHt.toFixed(3)} {data.currency}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TPS (5%)</Text>
              <Text style={styles.totalValue}>
                {data.tpsTotal.toFixed(3)} {data.currency}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TVQ (9,975%)</Text>
              <Text style={styles.totalValue}>
                {data.tvqTotal.toFixed(3)} {data.currency}
              </Text>
            </View>
            {data.timbreFiscal > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Timbre fiscal</Text>
                <Text style={styles.totalValue}>
                  {data.timbreFiscal.toFixed(3)} {data.currency}
                </Text>
              </View>
            )}
            <View style={styles.totalRowFinal}>
              <Text style={styles.totalLabelFinal}>Total TTC</Text>
              <Text style={styles.totalValueFinal}>
                {data.totalTtc.toFixed(3)} {data.currency}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment terms */}
        {data.paymentTerms && (
          <View style={styles.paymentTerms}>
            <Text style={styles.paymentTitle}>Conditions de règlement</Text>
            <Text style={styles.paymentText}>{data.paymentTerms}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerBold}>{data.companyName}</Text>
            <Text style={styles.footerText}>Document conforme à la réglementation en vigueur</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.footerText}>contact@softfacture.fr</Text>
            <Text style={styles.footerText}>www.softfacture.fr</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export function QuotePdfButton({ data, label }: { data: QuotePdfData; label: string }) {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={async () => {
        const blob = await pdf(<QuoteDoc data={data} />).toBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.number}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }}
    >
      {label}
    </Button>
  );
}

export function mapQuoteToPdfData(quote: {
  number: string;
  issueDate: Date;
  validUntil?: Date | null;
  currency: string;
  subtotalHt: unknown;
  vatTotal: unknown;
  totalTtc: unknown;
  company: {
    name: string;
    taxMatricule: string | null;
    address: string | null;
    city: string | null;
    country: string;
  };
  client: {
    name: string;
    taxId: string | null;
    address: string | null;
    city: string | null;
    country: string;
  };
  lines: {
    description: string;
    quantity: unknown;
    unitPriceHt: unknown;
    taxRate: unknown;
    lineTotalHt: unknown;
    lineVat: unknown;
    lineTotalTtc: unknown;
  }[];
}): QuotePdfData {
  return {
    number: quote.number,
    issueDate: quote.issueDate.toLocaleDateString('fr-FR'),
    validUntil: quote.validUntil ? quote.validUntil.toLocaleDateString('fr-FR') : null,
    companyName: quote.company.name,
    companyTax: quote.company.taxMatricule,
    companyAddress: quote.company.address,
    companyCity: quote.company.city,
    companyCountry: quote.company.country,
    clientName: quote.client.name,
    clientTax: quote.client.taxId,
    clientAddress: quote.client.address,
    clientCity: quote.client.city,
    clientCountry: quote.client.country,
    currency: quote.currency,
    subtotalHt: toNumber(quote.subtotalHt),
    vatTotal: toNumber(quote.vatTotal),
    tpsTotal: toNumber(quote.subtotalHt) * 0.05,
    tvqTotal: toNumber(quote.subtotalHt) * 0.09975,
    timbreFiscal: 0,
    totalTtc: toNumber(quote.totalTtc),
    paymentTerms: 'Paiement à réception de facture',
    lines: quote.lines.map((l) => ({
      description: l.description,
      qty: toNumber(l.quantity),
      unitHt: toNumber(l.unitPriceHt),
      rate: toNumber(l.taxRate),
      ht: toNumber(l.lineTotalHt),
      vat: toNumber(l.lineVat),
      ttc: toNumber(l.lineTotalTtc),
    })),
  };
}
