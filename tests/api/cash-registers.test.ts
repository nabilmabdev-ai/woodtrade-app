// tests/api/cash-registers.test.ts
import { POST } from '@/app/api/cash-registers/route';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { NextRequest } from 'next/server';
import { authorize } from '@/lib/authorize';

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

jest.mock('@/lib/authorize', () => ({
  authorize: jest.fn(),
}));

describe('POST /api/cash-registers', () => {
  it('should return 403 Forbidden for unauthorized user', async () => {
    // Mock authorize to reject the request
    (authorize as jest.Mock).mockRejectedValue(new Error('FORBIDDEN'));

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
