// tests/msw/handlers.ts
import { rest } from 'msw';

export const handlers = [
  // Mock the login request
  rest.post('http://localhost:3000/api/auth/callback', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({}));
  }),

  // Mock the user profile request
  rest.get('http://localhost:3000/api/users/:userId', (req, res, ctx) => {
    const { userId } = req.params;
    // The role will be encoded in the userId for testing purposes
    const role = userId.toString().toUpperCase();

    return res(
      ctx.status(200),
      ctx.json({
        id: userId,
        role: role,
      })
    );
  }),

  // Mock the invoice creation endpoint
  rest.post('http://localhost:3000/api/billing/invoices', (req, res, ctx) => {
    return res(ctx.status(201), ctx.json({ id: 'new-invoice-id' }));
  }),
];
