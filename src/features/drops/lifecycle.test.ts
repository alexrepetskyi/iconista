import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Drop } from '@/models/Drop';
import { Product } from '@/models/Product';
import {
  publishDropLive,
  moveProductToDrop,
  MAX_PIECES_PER_DROP,
} from './lifecycle';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri('test');
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.AUTH_SECRET = 't';
  process.env.STRIPE_SECRET_KEY = 't';
  process.env.STRIPE_WEBHOOK_SECRET = 't';
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 't';
  process.env.RESEND_API_KEY = 't';
  process.env.EMAIL_FROM = 't';
  process.env.ANTHROPIC_API_KEY = 't';
  process.env.AWS_ACCESS_KEY_ID = 't';
  process.env.AWS_SECRET_ACCESS_KEY = 't';
  process.env.AWS_BUCKET_NAME = 't';
  await mongoose.connect(process.env.MONGODB_URI);
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Drop.deleteMany({});
  await Product.deleteMany({});
});

function makeDrop(number: number, overrides: Record<string, unknown> = {}) {
  return Drop.create({
    number,
    slug: `drop-${number}`,
    title: { en: `Drop ${number}` },
    releaseAt: new Date('2026-06-01'),
    closesAt: new Date('2026-06-10'),
    status: 'draft',
    ...overrides,
  });
}

function makeProduct(dropId: unknown, n: number, overrides: Record<string, unknown> = {}) {
  return Product.create({
    dropId,
    brand: 'Chanel',
    title: { en: `Piece ${n}` },
    slug: `piece-${n}-${String(dropId)}`,
    price: 100_00,
    ...overrides,
  });
}

describe('publishDropLive', () => {
  it('publishes the drop as live', async () => {
    const drop = await makeDrop(8);
    const result = await publishDropLive(String(drop._id));
    expect(result.ok).toBe(true);
    expect((await Drop.findById(drop._id))!.status).toBe('live');
  });

  it('closes the previously live drop (old drop goes to the archive)', async () => {
    const old = await makeDrop(7, { status: 'live' });
    const next = await makeDrop(8);
    await publishDropLive(String(next._id));
    expect((await Drop.findById(old._id))!.status).toBe('closed');
    expect((await Drop.findById(next._id))!.status).toBe('live');
  });

  it('inherits the hero video from the latest previous drop when empty', async () => {
    await makeDrop(6, { status: 'closed', heroVideoUrl: 'https://cdn/video-6.mp4' });
    await makeDrop(7, { status: 'live', heroVideoUrl: 'https://cdn/video-7.mp4' });
    const next = await makeDrop(8, { heroVideoUrl: '' });
    await publishDropLive(String(next._id));
    expect((await Drop.findById(next._id))!.heroVideoUrl).toBe('https://cdn/video-7.mp4');
  });

  it('keeps its own hero video when set', async () => {
    await makeDrop(7, { status: 'live', heroVideoUrl: 'https://cdn/video-7.mp4' });
    const next = await makeDrop(8, { heroVideoUrl: 'https://cdn/video-8.mp4' });
    await publishDropLive(String(next._id));
    expect((await Drop.findById(next._id))!.heroVideoUrl).toBe('https://cdn/video-8.mp4');
  });

  it('fails for a missing drop', async () => {
    const result = await publishDropLive('000000000000000000000000');
    expect(result.ok).toBe(false);
  });
});

describe('moveProductToDrop', () => {
  it('moves an unsold product into a draft drop', async () => {
    const old = await makeDrop(7, { status: 'closed' });
    const next = await makeDrop(8);
    const piece = await makeProduct(old._id, 1);
    const result = await moveProductToDrop(String(piece._id), String(next._id));
    expect(result.ok).toBe(true);
    expect(String((await Product.findById(piece._id))!.dropId)).toBe(String(next._id));
  });

  it('refuses to move a sold product', async () => {
    const old = await makeDrop(7, { status: 'closed' });
    const next = await makeDrop(8);
    const piece = await makeProduct(old._id, 1, { status: 'sold' });
    const result = await moveProductToDrop(String(piece._id), String(next._id));
    expect(result).toEqual({ ok: false, error: 'sold' });
  });

  it('refuses to move into a closed drop', async () => {
    const old = await makeDrop(7, { status: 'closed' });
    const next = await makeDrop(8, { status: 'closed' });
    const piece = await makeProduct(old._id, 1);
    const result = await moveProductToDrop(String(piece._id), String(next._id));
    expect(result).toEqual({ ok: false, error: 'target_closed' });
  });

  it(`refuses when the target already holds ${MAX_PIECES_PER_DROP} pieces`, async () => {
    const old = await makeDrop(7, { status: 'closed' });
    const next = await makeDrop(8);
    for (let i = 0; i < MAX_PIECES_PER_DROP; i++) {
      await makeProduct(next._id, 100 + i);
    }
    const piece = await makeProduct(old._id, 1);
    const result = await moveProductToDrop(String(piece._id), String(next._id));
    expect(result).toEqual({ ok: false, error: 'target_full' });
  });
});
