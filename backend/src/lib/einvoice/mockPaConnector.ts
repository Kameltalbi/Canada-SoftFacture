import type { PaConnector, PaSubmitResult, PaStatusResult } from './paConnector.js';

/** Connecteur sandbox pour développement OD sans PA réelle. */
export class MockPaConnector implements PaConnector {
  readonly provider = 'MOCK' as const;

  async submitInvoice(): Promise<PaSubmitResult> {
    const externalId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return { externalId, status: 'DEPOSITED' };
  }

  async getTransmissionStatus(externalId: string): Promise<PaStatusResult> {
    if (externalId.startsWith('mock-reject-')) {
      return { status: 'REJECTED', errorMessage: 'Rejet technique simulé (sandbox)' };
    }
    return { status: 'DEPOSITED' };
  }
}

export const mockPaConnector = new MockPaConnector();
