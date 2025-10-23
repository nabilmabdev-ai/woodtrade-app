// tests/api/billing/credit-notes.test.ts
import { POST } from '@/app/api/billing/credit-notes/route';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    creditNote: {
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

describe('POST /api/billing/credit-notes', () => {
  it('should return 403 Forbidden for unauthorized user', async () => {
    // Mock the user role
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: Role.WAREHOUSE });

    const request = new NextRequest('http://localhost/api/billing/credit-notes', {
      method: 'POST',
      body: JSON.stringify({
        companyId: 'test-company-id',
        amount: 100,
        reason: 'Test credit note',
        date: new Date().toISOString(),
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });
});
