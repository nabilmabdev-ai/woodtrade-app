// tests/api/billing/invoices.test.ts
import { POST } from '@/app/api/billing/invoices/route';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { NextRequest } from 'next/server';

const mockGetSession = jest.fn().mockResolvedValue({
  data: { session: { user: { id: 'test-user-id' } } },
});

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    invoice: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: () => ({
    auth: {
      getSession: mockGetSession,
    },
  }),
}));

describe('POST /api/billing/invoices', () => {
  afterEach(() => {
    jest.clearAllMocks();
    // Reset to default for other tests
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'test-user-id' } } },
    });
  });

  const mockInvoiceData = {
    companyId: 'test-company-id',
    amount: 100,
    dueDate: new Date().toISOString(),
    items: [{ productId: 'test-product-id', quantity: 1, unitPrice: 100 }],
  };

  it('should return 403 FORBIDDEN when user has an unauthorized role', async () => {
    // Mock user with a role not allowed to create invoices
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: Role.WAREHOUSE });

    const request = new NextRequest('http://localhost/api/billing/invoices', {
      method: 'POST',
      body: JSON.stringify(mockInvoiceData),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    const body = await response.text();
    expect(body).toBe('FORBIDDEN');
  });

  it('should return 201 Created and the new invoice for an authorized user', async () => {
    // Mock user with an authorized role
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: Role.ADMIN });
    const createdInvoice = { ...mockInvoiceData, id: 'test-invoice-id', status: 'PENDING' };
    (prisma.invoice.create as jest.Mock).mockResolvedValue(createdInvoice);

    const request = new NextRequest('http://localhost/api/billing/invoices', {
      method: 'POST',
      body: JSON.stringify(mockInvoiceData),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual(createdInvoice);
    expect(prisma.invoice.create).toHaveBeenCalledWith({
      data: {
        companyId: mockInvoiceData.companyId,
        amount: mockInvoiceData.amount,
        dueDate: new Date(mockInvoiceData.dueDate),
        status: 'PENDING',
        invoiceItems: {
          create: mockInvoiceData.items,
        },
      },
    });
  });

  it('should return 401 UNAUTHORIZED when there is no session', async () => {
    // Mock no active session
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const request = new NextRequest('http://localhost/api/billing/invoices', {
        method: 'POST',
        body: JSON.stringify(mockInvoiceData),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    const body = await response.text();
    expect(body).toBe('UNAUTHORIZED');
  });
});
