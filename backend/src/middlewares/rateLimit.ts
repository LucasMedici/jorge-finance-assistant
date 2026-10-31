import { NextFunction, Request, Response } from 'express';

export interface RateLimitOptions {
  /** Tamanho da janela em ms. */
  windowMs: number;
  /** Máximo de requisições por IP dentro da janela. */
  max: number;
  /** Mensagem do 429. */
  message?: string;
  /** Chave de contagem; padrão: IP do cliente. */
  keyGenerator?: (req: Request) => string;
  /** Desativado por padrão quando NODE_ENV === 'test' (avaliado na criação). */
  enabled?: boolean;
  /** Relógio injetável (testes). */
  now?: () => number;
}

interface Entry {
  count: number;
  resetAt: number;
}

export type RateLimitMiddleware = ((req: Request, res: Response, next: NextFunction) => void) & {
  /** Quantidade de IPs em memória (para testes/diagnóstico). */
  size: () => number;
};

/**
 * Rate limit simples em memória, janela fixa por IP (ou pela chave de `keyGenerator`).
 * Suficiente para uma única instância (o caso da Railway hoje); com várias réplicas cada uma conta separado.
 */
export function createRateLimiter({
  windowMs,
  max,
  message = 'Muitas tentativas. Tente novamente em alguns minutos.',
  keyGenerator = (req) => req.ip ?? req.socket.remoteAddress ?? 'unknown',
  enabled = process.env.NODE_ENV !== 'test',
  now = Date.now,
}: RateLimitOptions): RateLimitMiddleware {
  const hits = new Map<string, Entry>();
  let nextSweep = now() + windowMs;

  // Remove entradas expiradas no máximo uma vez por janela, para o Map não crescer sem limite.
  function sweep(current: number) {
    if (current < nextSweep) return;
    for (const [key, entry] of hits) {
      if (entry.resetAt <= current) hits.delete(key);
    }
    nextSweep = current + windowMs;
  }

  const middleware = ((req: Request, res: Response, next: NextFunction) => {
    if (!enabled) return next();

    const current = now();
    sweep(current);

    const key = keyGenerator(req);
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= current) {
      entry = { count: 0, resetAt: current + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    if (entry.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - current) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({ error: message });
      return;
    }

    next();
  }) as RateLimitMiddleware;

  middleware.size = () => hits.size;
  return middleware;
}
