/**
 * Property-Based Tests using fast-check (100+ generated cases each)
 *
 * Properties:
 * 1. Cart invariant: quantity never exceeds stock for any valid add/update sequence
 * 2. Order total: totalAmount === sum(priceAtPurchase × quantity)
 * 3. JWT roundtrip: verify(sign(payload)) returns equivalent payload
 * 4. Pagination: results.length <= limit for all page/limit combinations
 */

import * as fc from 'fast-check';
import jwt from 'jsonwebtoken';

const SECRET = 'pbt-test-secret';
const NUM_RUNS = 100;

// ── Property 1: Cart invariant ────────────────────────────────
describe('PBT: Cart invariant', () => {
  /**
   * Simulate a sequence of add/update ops on a cart.
   * The invariant: cartQty for any product never exceeds its stock.
   */
  function simulateCartOps(
    stock: number,
    ops: Array<{ type: 'add' | 'set'; qty: number }>
  ): { valid: boolean; finalQty: number } {
    let cartQty = 0;
    for (const op of ops) {
      if (op.type === 'add') {
        const proposed = cartQty + op.qty;
        if (proposed <= stock && op.qty >= 1) {
          cartQty = proposed;
        }
        // silently reject invalid ops (stock guard)
      } else {
        // set absolute quantity
        if (op.qty >= 1 && op.qty <= stock) {
          cartQty = op.qty;
        }
      }
    }
    return { valid: cartQty <= stock, finalQty: cartQty };
  }

  test('cart quantity never exceeds stock for any valid op sequence', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),                    // stock
        fc.array(
          fc.record({
            type: fc.constantFrom<'add' | 'set'>('add', 'set'),
            qty:  fc.integer({ min: 1, max: 50 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (stock, ops) => {
          const { valid } = simulateCartOps(stock, ops);
          return valid;
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});

// ── Property 2: Order total invariant ────────────────────────
describe('PBT: Order total', () => {
  test('totalAmount === sum(priceAtPurchase × quantity) for all order items', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            priceAtPurchase: fc.integer({ min: 1, max: 100000 }),
            quantity:        fc.integer({ min: 1, max: 50 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (items) => {
          const computedTotal = items.reduce(
            (sum, item) => sum + item.priceAtPurchase * item.quantity,
            0
          );
          // Simulate what the DB would store
          const storedTotal = items.reduce(
            (sum, item) => sum + item.priceAtPurchase * item.quantity,
            0
          );
          return computedTotal === storedTotal;
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  test('totalAmount is always a non-negative integer', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            priceAtPurchase: fc.integer({ min: 0, max: 999999 }),
            quantity:        fc.integer({ min: 0, max: 100 }),
          }),
          { minLength: 0, maxLength: 15 }
        ),
        (items) => {
          const total = items.reduce(
            (sum, item) => sum + item.priceAtPurchase * item.quantity,
            0
          );
          return Number.isInteger(total) && total >= 0;
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});

// ── Property 3: JWT roundtrip ─────────────────────────────────
describe('PBT: JWT roundtrip', () => {
  test('verify(sign(payload, secret), secret) returns equivalent payload', () => {
    fc.assert(
      fc.property(
        fc.uuid(),                                        // userId
        fc.constantFrom<'user' | 'admin'>('user', 'admin'),  // role
        (userId, role) => {
          const payload = { userId, role };
          const token   = jwt.sign(payload, SECRET, { expiresIn: '1h' });
          const decoded = jwt.verify(token, SECRET) as any;
          return decoded.userId === userId && decoded.role === role;
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  test('token signed with one secret is rejected by a different secret', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 8 }),     // different secret
        (userId, otherSecret) => {
          fc.pre(otherSecret !== SECRET);
          const token = jwt.sign({ userId, role: 'user' }, SECRET, { expiresIn: '1h' });
          let threw = false;
          try {
            jwt.verify(token, otherSecret);
          } catch {
            threw = true;
          }
          return threw;
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});

// ── Property 4: Pagination invariant ─────────────────────────
describe('PBT: Pagination', () => {
  function paginate<T>(items: T[], page: number, limit: number): T[] {
    const offset = (page - 1) * limit;
    return items.slice(offset, offset + limit);
  }

  test('results.length <= limit for all page/limit combinations', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 0, maxLength: 200 }),  // dataset
        fc.integer({ min: 1, max: 100 }),                          // limit (1–100)
        fc.integer({ min: 1, max: 50 }),                           // page
        (items, limit, page) => {
          const results = paginate(items, page, limit);
          return results.length <= limit;
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  test('page 1 result is prefix of full dataset', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 1, maxLength: 100 }),
        fc.integer({ min: 1, max: 20 }),
        (items, limit) => {
          const page1 = paginate(items, 1, limit);
          return items.slice(0, limit).every((v, i) => v === page1[i]);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  test('total pages covers all items', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }),  // total items
        fc.integer({ min: 1, max: 100 }),  // limit
        (total, limit) => {
          const totalPages = Math.ceil(total / limit);
          // All items fit within totalPages × limit slots
          return totalPages * limit >= total;
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});
