import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import db from '../lib/db';

// ── Validation schemas ────────────────────────────────────────
const RegisterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const LoginSchema = z.object({
  email: z.string().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

function signToken(userId: string, role: string): string {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET!,
    { expiresIn: '7d', algorithm: 'HS256' }
  );
}

// ── POST /api/auth/register ───────────────────────────────────
export async function register(req: Request, res: Response): Promise<void> {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { name, email, password } = parsed.data;

  const existing = await db('users').where({ email }).first();
  if (existing) {
    res.status(409).json({ error: 'Email already in use' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const userId = uuidv4();
  const now = new Date().toISOString();

  await db('users').insert({
    id: userId,
    name,
    email,
    password_hash: passwordHash,
    role: 'user',
    created_at: now,
    updated_at: now,
  });

  const token = signToken(userId, 'user');
  res.status(201).json({ userId, token });
}

// ── POST /api/auth/login ──────────────────────────────────────
export async function login(req: Request, res: Response): Promise<void> {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { email, password } = parsed.data;
  const GENERIC_ERROR = 'Invalid email or password';

  const user = await db('users').where({ email }).first();
  if (!user) {
    res.status(401).json({ error: GENERIC_ERROR });
    return;
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    res.status(401).json({ error: GENERIC_ERROR });
    return;
  }

  const token = signToken(user.id, user.role);
  res.status(200).json({ token, userId: user.id, role: user.role });
}
