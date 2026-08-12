/**
 * RBAC Integration Tests
 * Verifies:
 * - Unauthenticated requests → 401
 * - Authenticated user-role on admin endpoints → 403
 * - requireAuth runs before requireAdmin
 */

import jwt from 'jsonwebtoken';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = 'testsecret';

function makeReq(token?: string): Partial<Request> {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    user: undefined,
  };
}

function makeRes(): Partial<Response> {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const next: NextFunction = jest.fn();

beforeEach(() => {
  (next as jest.Mock).mockClear();
  process.env.JWT_SECRET = JWT_SECRET;
});

// ── requireAuth ───────────────────────────────────────────────

test('requireAuth: missing token → 401', () => {
  const req = makeReq() as Request;
  const res = makeRes() as Response;

  requireAuth(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});

test('requireAuth: expired token → 401', () => {
  const token = jwt.sign({ userId: 'u1', role: 'user' }, JWT_SECRET, { expiresIn: -1 });
  const req = makeReq(token) as Request;
  const res = makeRes() as Response;

  requireAuth(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});

test('requireAuth: valid token → attaches user and calls next', () => {
  const token = jwt.sign({ userId: 'u1', role: 'user' }, JWT_SECRET, { expiresIn: '1h' });
  const req = makeReq(token) as Request;
  const res = makeRes() as Response;

  requireAuth(req, res, next);

  expect(next).toHaveBeenCalled();
  expect((req as any).user).toMatchObject({ userId: 'u1', role: 'user' });
});

// ── requireAdmin ──────────────────────────────────────────────

test('requireAdmin: user role → 403', () => {
  const req = { user: { userId: 'u1', role: 'user' } } as Request;
  const res = makeRes() as Response;

  requireAdmin(req, res, next);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(next).not.toHaveBeenCalled();
});

test('requireAdmin: no user (unauthenticated) → 403', () => {
  const req = {} as Request;
  const res = makeRes() as Response;

  requireAdmin(req, res, next);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(next).not.toHaveBeenCalled();
});

test('requireAdmin: admin role → calls next', () => {
  const req = { user: { userId: 'a1', role: 'admin' } } as Request;
  const res = makeRes() as Response;

  requireAdmin(req, res, next);

  expect(next).toHaveBeenCalled();
});
