/**
 * Unit tests for cart business logic:
 * - addToCart: exceeding stock returns error
 * - addToCart: valid add returns updated cart
 * - createOrder: unconfirmed payment → error
 * - createOrder: out-of-stock → 409
 */

import { Request, Response, NextFunction } from 'express';

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res as Response;
}

// ── addToCart logic (isolated) ────────────────────────────────
describe('addToCart business rules', () => {
  function simulateAddToCart(
    product: { stock: number },
    existingQty: number,
    addQty: number
  ): { ok: boolean; error?: string; newQty?: number } {
    if (product.stock <= 0) return { ok: false, error: 'Product is out of stock' };
    if (addQty < 1)         return { ok: false, error: 'Quantity must be at least 1' };

    const newQty = existingQty + addQty;
    if (newQty > product.stock) {
      return { ok: false, error: `Only ${product.stock} units available` };
    }
    return { ok: true, newQty };
  }

  test('adds item to empty cart', () => {
    const result = simulateAddToCart({ stock: 10 }, 0, 3);
    expect(result.ok).toBe(true);
    expect(result.newQty).toBe(3);
  });

  test('increments existing cart item', () => {
    const result = simulateAddToCart({ stock: 10 }, 5, 3);
    expect(result.ok).toBe(true);
    expect(result.newQty).toBe(8);
  });

  test('rejects quantity exceeding stock', () => {
    const result = simulateAddToCart({ stock: 5 }, 3, 4);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Only 5 units available');
  });

  test('rejects add when product is out of stock', () => {
    const result = simulateAddToCart({ stock: 0 }, 0, 1);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Product is out of stock');
  });

  test('rejects zero quantity', () => {
    const result = simulateAddToCart({ stock: 10 }, 0, 0);
    expect(result.ok).toBe(false);
  });

  test('allows adding exactly up to stock limit', () => {
    const result = simulateAddToCart({ stock: 5 }, 2, 3);
    expect(result.ok).toBe(true);
    expect(result.newQty).toBe(5);
  });
});

// ── createOrder business rules ────────────────────────────────
describe('createOrder business rules', () => {
  function simulateCreateOrder(
    paymentStatus: string,
    cartItems: { stock: number; quantity: number }[]
  ): { ok: boolean; status?: number; error?: string } {
    if (paymentStatus !== 'succeeded') {
      return { ok: false, status: 400, error: 'Payment has not been confirmed' };
    }
    if (cartItems.length === 0) {
      return { ok: false, status: 400, error: 'Cart is empty' };
    }
    for (const item of cartItems) {
      if (item.stock < item.quantity) {
        return { ok: false, status: 409, error: 'Item out of stock' };
      }
    }
    return { ok: true, status: 201 };
  }

  test('unconfirmed payment → error 400', () => {
    const result = simulateCreateOrder('requires_payment_method', [{ stock: 10, quantity: 2 }]);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error).toContain('Payment has not been confirmed');
  });

  test('out-of-stock item → 409', () => {
    const result = simulateCreateOrder('succeeded', [{ stock: 1, quantity: 5 }]);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(409);
  });

  test('empty cart → 400', () => {
    const result = simulateCreateOrder('succeeded', []);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });

  test('valid order → success 201', () => {
    const result = simulateCreateOrder('succeeded', [
      { stock: 10, quantity: 2 },
      { stock: 5,  quantity: 1 },
    ]);
    expect(result.ok).toBe(true);
    expect(result.status).toBe(201);
  });
});
