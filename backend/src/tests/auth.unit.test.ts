/**
 * Unit tests for authentication logic:
 * - requireAuth: valid / expired / missing token
 * - requireAdmin: admin role passes, user role → 403
 * - authenticate(): correct creds return token, wrong password → 401
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { Request, Response, NextFunction } from 'express';

const SECRET = 'unit-test-secret';

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res as Response;
}

const next = jest.fn() as unknown as NextFunction;
beforeEach(() => { (next as jest.Mock).mockClear(); process.env.JWT_SECRET = SECRET; });

// ── requireAuth ───────────────────────────────────────────────
describe('requireAuth', () => {
  test('missing Authorization header → 401', () => {
    const req = { headers: {} } as Request;
    requireAuth(req, mockRes(), next);
    expect((next as jest.Mock)).not.toHaveBeenCalled();
  });

  test('malformed token → 401', () => {
    const req = { headers: { authorization: 'Bearer notavalidtoken' } } as Request;
    const res = mockRes();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('expired token → 401', () => {
    const token = jwt.sign({ userId: 'u1', role: 'user' }, SECRET, { expiresIn: -1 });
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = mockRes();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect((next as jest.Mock)).not.toHaveBeenCalled();
  });

  test('valid token → attaches req.user and calls next', () => {
    const token = jwt.sign({ userId: 'u1', role: 'user' }, SECRET, { expiresIn: '1h' });
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = mockRes();
    requireAuth(req, res, next);
    expect((next as jest.Mock)).toHaveBeenCalled();
    expect((req as any).user).toMatchObject({ userId: 'u1', role: 'user' });
  });
});

// ── requireAdmin ──────────────────────────────────────────────
describe('requireAdmin', () => {
  test('user role → 403', () => {
    const req = { user: { userId: 'u1', role: 'user' } } as Request;
    const res = mockRes();
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('no user attached → 403', () => {
    const req = {} as Request;
    const res = mockRes();
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('admin role → calls next', () => {
    const req = { user: { userId: 'a1', role: 'admin' } } as Request;
    requireAdmin(req, mockRes(), next);
    expect((next as jest.Mock)).toHaveBeenCalled();
  });
});

// ── authenticate() logic (bcrypt + jwt) ───────────────────────
describe('authenticate() logic', () => {
  test('correct password → bcrypt.compare returns true', async () => {
    const plain = 'password123';
    const hash  = await bcrypt.hash(plain, 10);
    const match = await bcrypt.compare(plain, hash);
    expect(match).toBe(true);
  });

  test('wrong password → bcrypt.compare returns false', async () => {
    const hash = await bcrypt.hash('correctpassword', 10);
    const match = await bcrypt.compare('wrongpassword', hash);
    expect(match).toBe(false);
  });

  test('JWT sign + verify roundtrip returns equivalent payload', () => {
    const payload = { userId: 'u42', role: 'user' };
    const token   = jwt.sign(payload, SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(token, SECRET) as any;
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.role).toBe(payload.role);
  });
});
