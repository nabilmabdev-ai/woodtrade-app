// tests/api/billing/credit-notes.test.ts
import { POST } from '@/app/api/billing/credit-notes/route';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { NextRequest } from 'next/server';
import { authorize } from '@/lib/authorize';

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

jest.mock('@/lib/authorize', () => ({
  authorize: jest.fn(),
}));

describe('POST /api/billing/credit-notes', () => {
    afterEach(() => {
        jest.clearAllMocks();
      });

  const mockCreditNoteData = {
    companyId: 'test-company-id',
    amount: 100,
    reason: 'Test reason',
    date: new Date().toISOString(),
  };

  it('should return 403 FORBIDDEN when user has an unauthorized role', async () => {
    (authorize as jest.Mock).mockRejectedValue(new Error('FORBIDDEN'));

    const request = new NextRequest('http://localhost/api/billing/credit-notes', {
      method: 'POST',
      body: JSON.stringify(mockCreditNoteData),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it('should return 201 Created and the new credit note for an authorized user', async () => {
    (authorize as jest.Mock).mockResolvedValue({ role: Role.ADMIN });
    const createdCreditNote = { ...mockCreditNoteData, id: 'test-credit-note-id' };
    (prisma.creditNote.create as jest.Mock).mockResolvedValue(createdCreditNote);

    const request = new NextRequest('http://localhost/api/billing/credit-notes', {
      method: 'POST',
      body: JSON.stringify(mockCreditNoteData),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual(createdCreditNote);
  });
});
