import { describe, it, expect } from 'vitest';
import { canCancelInvoice } from './invoiceValidate.js';

describe('Invoice Validation Service', () => {
  describe('canCancelInvoice', () => {
    it('should return true for VALIDATED status', () => {
      expect(canCancelInvoice('VALIDATED')).toBe(true);
    });

    it('should return true for SENT status', () => {
      expect(canCancelInvoice('SENT')).toBe(true);
    });

    it('should return true for PARTIALLY_PAID status', () => {
      expect(canCancelInvoice('PARTIALLY_PAID')).toBe(true);
    });

    it('should return false for DRAFT status', () => {
      expect(canCancelInvoice('DRAFT')).toBe(false);
    });

    it('should return false for PAID status', () => {
      expect(canCancelInvoice('PAID')).toBe(false);
    });

    it('should return false for CANCELLED status', () => {
      expect(canCancelInvoice('CANCELLED')).toBe(false);
    });

    it('should return false for unknown status', () => {
      expect(canCancelInvoice('UNKNOWN')).toBe(false);
    });
  });
});
