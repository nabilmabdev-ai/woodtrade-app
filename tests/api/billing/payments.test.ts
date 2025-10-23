// tests/api/billing/payments.test.ts
import { POST } from '@/app/api/billing/payments/route';
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
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/authorize', () => ({
  authorize: jest.fn(),
}));

describe('POST /api/billing/payments', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockPaymentData = {
    companyId: 'test-company-id',
    amount: 100,
    paymentDate: new Date().toISOString(),
    method: 'CASH',
  };

  it('should return 403 FORBIDDEN when user has an unauthorized role', async () => {
    (authorize as jest.Mock).mockRejectedValue(new Error('FORBIDDEN'));

    const request = new NextRequest('http://localhost/api/billing/payments', {
      method: 'POST',
      body: JSON.stringify(mockPaymentData),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it('should return 201 Created and the new payment for an authorized user', async () => {
    (authorize as jest.Mock).mockResolvedValue({ role: Role.ADMIN });
    const createdPayment = { ...mockPaymentData, id: 'test-payment-id', status: 'AVAILABLE' };
    (prisma.payment.create as jest.Mock).mockResolvedValue(createdPayment);

    const request = new NextRequest('http://localhost/api/billing/payments', {
      method: 'POST',
      body: JSON.stringify(mockPaymentData),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual(createdPayment);
  });
});
