// tests/api/cash-registers.test.ts
import { POST } from '@/app/api/cash-registers/route';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    cashRegister: {
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

describe('POST /api/cash-registers', () => {
  it('should return 403 Forbidden for unauthorized user', async () => {
    // Mock the user role
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: Role.CASHIER });

    const request = new NextRequest('http://localhost/api/cash-registers', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Cash Register',
        location: 'Test Location',
        type: 'SALES',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });
});
