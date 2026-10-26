import { z } from 'zod';

const required = z.string().trim().min(1);

const EnvSchema = z.object({
  DATABASE_URL: required,
  JWT_SECRET: required,
  JWT_EXPIRES_IN: required,
  OPENAI_API_KEY: required,
  PORT: z
    .string()
    .trim()
    .regex(/^\d+$/)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export type Env = z.infer<typeof EnvSchema>;

export type EnvValidationResult =
  | { success: true; env: Env }
  | { success: false; missing: string[]; invalid: string[] };

type EnvSource = Record<string, string | undefined>;

/**
 * Valida as variáveis de ambiente sem efeitos colaterais.
 * Devolve só os NOMES das variáveis com problema — nunca os valores.
 */
export function validateEnv(source: EnvSource): EnvValidationResult {
  const parsed = EnvSchema.safeParse(source);
  if (parsed.success) return { success: true, env: parsed.data };

  const missing = new Set<string>();
  const invalid = new Set<string>();
  for (const issue of parsed.error.issues) {
    const name = String(issue.path[0]);
    const value = source[name];
    if (value === undefined || value.trim() === '') missing.add(name);
    else invalid.add(name);
  }
  return { success: false, missing: [...missing], invalid: [...invalid] };
}

/**
 * Valida o process.env no boot. Se faltar algo, loga quais variáveis e encerra com código 1.
 */
export function loadEnvOrExit(source: EnvSource = process.env): Env {
  const result = validateEnv(source);
  if (result.success) return result.env;

  if (result.missing.length) {
    console.error(`[config] Variáveis de ambiente obrigatórias ausentes: ${result.missing.join(', ')}`);
  }
  if (result.invalid.length) {
    console.error(`[config] Variáveis de ambiente com valor inválido: ${result.invalid.join(', ')}`);
  }
  console.error('[config] Defina-as (veja backend/.env.example) e reinicie o servidor.');
  process.exit(1);
}
