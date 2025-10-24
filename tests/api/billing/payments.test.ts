// tests/api/billing/payments.test.ts
import { POST } from '@/app/api/billing/payments/route';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { NextRequest } from 'next/server';

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

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: () => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user-id' } } },
      }),
    },
  }),
}));

describe('POST /api/billing/payments', () => {
  it('should return 403 Forbidden for unauthorized user', async () => {
    // Mock the user role
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: Role.CASHIER });

    const request = new NextRequest('http://localhost/api/billing/payments', {
      method: 'POST',
      body: JSON.stringify({
        companyId: 'test-company-id',
        amount: 100,
        paymentDate: new Date().toISOString(),
        method: 'CASH',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });
});
