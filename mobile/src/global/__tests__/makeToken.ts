// Gera um JWT só para teste: header e payload em base64url, assinatura falsa
// (o app apenas decodifica o payload, nunca valida a assinatura).
const base64Url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

export function makeToken(payload: Record<string, unknown>): string {
  return `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url(payload)}.assinatura`;
}

export const nowInSeconds = () => Math.floor(Date.now() / 1000);
