import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateEnv } from '../src/config/env';
import { createRateLimiter } from '../src/middlewares/rateLimit';
import { isApiDocsEnabled } from '../src/swagger';

afterEach(() => {
  vi.unstubAllEnvs();
});

function appWith(limiter: express.RequestHandler) {
  const app = express();
  app.set('trust proxy', 1);
  app.post('/auth/login', limiter, (_req, res) => {
    res.status(401).json({ error: 'Invalid email or password' });
  });
  return app;
}

describe('createRateLimiter', () => {
  it('fica desativado quando NODE_ENV=test', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    const app = appWith(createRateLimiter({ windowMs: 60_000, max: 2 }));

    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/auth/login');
      expect(res.status).toBe(401);
    }
  });

  it('responde 429 com Retry-After depois do limite', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const app = appWith(createRateLimiter({ windowMs: 15 * 60_000, max: 10 }));

    for (let i = 0; i < 10; i++) {
      const res = await request(app).post('/auth/login');
      expect(res.status).toBe(401);
    }

    const blocked = await request(app).post('/auth/login');
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: expect.stringContaining('Muitas tentativas') });
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect(Number(blocked.headers['retry-after'])).toBeLessThanOrEqual(15 * 60);
  });

  it('conta cada IP separadamente (X-Forwarded-For com trust proxy)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const app = appWith(createRateLimiter({ windowMs: 60_000, max: 1 }));

    expect((await request(app).post('/auth/login').set('X-Forwarded-For', '1.1.1.1')).status).toBe(401);
    expect((await request(app).post('/auth/login').set('X-Forwarded-For', '1.1.1.1')).status).toBe(429);
    expect((await request(app).post('/auth/login').set('X-Forwarded-For', '2.2.2.2')).status).toBe(401);
  });

  it('libera de novo quando a janela expira e limpa entradas antigas', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    let now = 1_000_000;
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, now: () => now });
    const app = appWith(limiter);

    expect((await request(app).post('/auth/login').set('X-Forwarded-For', '1.1.1.1')).status).toBe(401);
    expect((await request(app).post('/auth/login').set('X-Forwarded-For', '2.2.2.2')).status).toBe(401);
    expect((await request(app).post('/auth/login').set('X-Forwarded-For', '1.1.1.1')).status).toBe(429);
    expect(limiter.size()).toBe(2);

    now += 60_000;
    expect((await request(app).post('/auth/login').set('X-Forwarded-For', '1.1.1.1')).status).toBe(401);
    // 2.2.2.2 expirou e foi removido; só sobra o IP que acabou de voltar
    expect(limiter.size()).toBe(1);
  });

  it('conta pela chave do keyGenerator em vez do IP (limite por usuário no webhook)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const app = appWith(
      createRateLimiter({ windowMs: 60_000, max: 1, keyGenerator: (req) => String(req.headers['x-user']) })
    );

    // mesmo usuário em IPs diferentes: bloqueia
    expect((await request(app).post('/auth/login').set('X-User', 'a').set('X-Forwarded-For', '1.1.1.1')).status).toBe(401);
    expect((await request(app).post('/auth/login').set('X-User', 'a').set('X-Forwarded-For', '2.2.2.2')).status).toBe(429);
    // outro usuário no mesmo IP: passa
    expect((await request(app).post('/auth/login').set('X-User', 'b').set('X-Forwarded-For', '1.1.1.1')).status).toBe(401);
  });
});

describe('validateEnv', () => {
  const complete = {
    DATABASE_URL: 'postgresql://u:p@localhost/db',
    JWT_SECRET: 'segredo-super-secreto',
    JWT_EXPIRES_IN: '7d',
    OPENAI_API_KEY: 'sk-fake',
  };

  it('aceita env completo e PORT opcional', () => {
    const ok = validateEnv(complete);
    expect(ok).toMatchObject({ success: true, env: complete });
    expect(ok.success && ok.env.PORT).toBeUndefined();

    const withPort = validateEnv({ ...complete, PORT: '3065' });
    expect(withPort).toMatchObject({ success: true, env: { PORT: '3065' } });
  });

  it('lista as variáveis ausentes ou vazias', () => {
    const result = validateEnv({ DATABASE_URL: complete.DATABASE_URL, JWT_SECRET: '  ', OPENAI_API_KEY: '' });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.missing.sort()).toEqual(['JWT_EXPIRES_IN', 'JWT_SECRET', 'OPENAI_API_KEY']);
    expect(result.invalid).toEqual([]);
  });

  it('marca PORT inválida sem expor valores', () => {
    const result = validateEnv({ ...complete, PORT: 'abc' });
    expect(result).toEqual({ success: false, missing: [], invalid: ['PORT'] });
    expect(JSON.stringify(result)).not.toContain(complete.JWT_SECRET);
  });
});

describe('isApiDocsEnabled', () => {
  it('só esconde a doc em produção sem API_DOCS_ENABLED=true', () => {
    expect(isApiDocsEnabled({})).toBe(true);
    expect(isApiDocsEnabled({ NODE_ENV: 'development' })).toBe(true);
    expect(isApiDocsEnabled({ NODE_ENV: 'production' })).toBe(false);
    expect(isApiDocsEnabled({ NODE_ENV: 'production', API_DOCS_ENABLED: 'false' })).toBe(false);
    expect(isApiDocsEnabled({ NODE_ENV: 'production', API_DOCS_ENABLED: 'true' })).toBe(true);
  });
});
