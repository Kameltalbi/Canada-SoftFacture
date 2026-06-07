'use client';

import { NewInvoiceEditor } from '@/components/invoices/new-invoice-editor';

export default function NewDepositInvoicePage() {
  return <NewInvoiceEditor invoiceKind="DEPOSIT" />;
}
