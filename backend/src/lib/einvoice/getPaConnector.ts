import type { PaProvider } from '../../generated/prisma/index.js';
import type { PaConnector } from './paConnector.js';
import { mockPaConnector } from './mockPaConnector.js';

export function getPaConnector(provider: PaProvider): PaConnector | null {
  switch (provider) {
    case 'MOCK':
      return mockPaConnector;
    case 'NONE':
    default:
      return null;
  }
}
