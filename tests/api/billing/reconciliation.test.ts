// tests/api/billing/reconciliation.test.ts
import { POST } from '@/app/api/billing/reconciliation/route';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { NextRequest } from 'next/server';
import { authorize } from '@/lib/authorize';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    payment: {
      findUniqueOrThrow: jest.fn(),
    },
    creditNote: {
        findUniqueOrThrow: jest.fn(),
    },
    invoice: {
        findMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
    },
    paymentAllocation: {
      create: jest.fn(),
    },
    creditNoteAllocation: {
        create: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(async (callback) => callback(prisma)),
  },
}));

jest.mock('@/lib/authorize', () => ({
  authorize: jest.fn(),
}));

describe('POST /api/billing/reconciliation', () => {
    afterEach(() => {
        jest.clearAllMocks();
      });

  const mockReconciliationData = {
    sourceId: 'test-payment-id',
    sourceType: 'PAYMENT',
    invoiceIds: ['test-invoice-id'],
  };

  it('should return 403 FORBIDDEN when user has an unauthorized role', async () => {
    (authorize as jest.Mock).mockRejectedValue(new Error('FORBIDDEN'));

    const request = new NextRequest('http://localhost/api/billing/reconciliation', {
      method: 'POST',
      body: JSON.stringify(mockReconciliationData),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });
});
