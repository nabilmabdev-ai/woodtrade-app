
// @ts-nocheck
// tests/api/cash-register-movements.test.ts
import { POST } from '@/app/api/cash-registers/[id]/movements/route';
import { prisma } from '@/lib/prisma';
import { authorize } from '@/lib/authorize';
import { Role, CashRegisterType, CashMovementType } from '@prisma/client';
import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    cashRegister: {
      findUnique: jest.fn(),
    },
    cashMovement: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/authorize', () => ({
  authorize: jest.fn(),
}));

describe('POST /api/cash-registers/[id]/movements', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a movement linked to cashRegisterId when sessionId is not provided', async () => {
    const mockUser = { id: 'test-user-id', role: Role.ADMIN };
    (authorize as jest.Mock).mockResolvedValue(mockUser);

    const cashRegisterId = 'test-register-id';
    const mockCashRegister = {
      id: cashRegisterId,
      type: CashRegisterType.SALES,
    };
    (prisma.cashRegister.findUnique as jest.Mock).mockResolvedValue(mockCashRegister);
    (prisma.cashMovement.create as jest.Mock).mockResolvedValue({});

    const request = new NextRequest(`http://localhost/api/cash-registers/${cashRegisterId}/movements`, {
      method: 'POST',
      body: JSON.stringify({
        amount: 100,
        type: CashMovementType.PAY_IN,
        reason: 'Test movement',
        // sessionId is intentionally omitted
      }),
    });

    const context = { params: { id: cashRegisterId } };

    const response = await POST(request, { params: Promise.resolve(context.params) });

    expect(response.status).toBe(201);
    expect(prisma.cashMovement.create).toHaveBeenCalledWith({
      data: {
        amount: 100,
        type: CashMovementType.PAY_IN,
        reason: 'Test movement',
        userId: mockUser.id,
        sessionId: undefined,
        cashRegisterId: cashRegisterId,
      },
    });
  });

  it('should create a movement linked to sessionId when sessionId is provided', async () => {
    const mockUser = { id: 'test-user-id', role: Role.ADMIN };
    (authorize as jest.Mock).mockResolvedValue(mockUser);

    const cashRegisterId = 'test-register-id';
    const sessionId = 'test-session-id';
    const mockCashRegister = {
      id: cashRegisterId,
      type: CashRegisterType.SALES,
    };
    (prisma.cashRegister.findUnique as jest.Mock).mockResolvedValue(mockCashRegister);
    (prisma.cashMovement.create as jest.Mock).mockResolvedValue({});

    const request = new NextRequest(`http://localhost/api/cash-registers/${cashRegisterId}/movements`, {
      method: 'POST',
      body: JSON.stringify({
        amount: 100,
        type: CashMovementType.PAY_IN,
        reason: 'Test movement',
        sessionId: sessionId,
      }),
    });

    const context = { params: { id: cashRegisterId } };

    const response = await POST(request, { params: Promise.resolve(context.params) });

    expect(response.status).toBe(201);
    expect(prisma.cashMovement.create).toHaveBeenCalledWith({
      data: {
        amount: 100,
        type: CashMovementType.PAY_IN,
        reason: 'Test movement',
        userId: mockUser.id,
        sessionId: sessionId,
        cashRegisterId: cashRegisterId,
      },
    });
  });
});
