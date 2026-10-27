// Lista fechada de categorias, por tipo de transação. É a mesma do backend
// (`CATEGORIAS` em backend/src/services/chatService.ts): ao mudar uma, mude a outra.
// Cor não é amarrada à categoria: os relatórios atribuem as cores por ranking.
export const CATEGORIES = {
  gasto: [
    'Mercado',
    'Mercadinho',
    'Comer fora',
    'Transporte',
    'Saúde',
    'Lazer',
    'Bebida e rolê',
    'Família e amigos',
    'Compras',
    'Cuidados pessoais',
    'Apostas',
    'Outros',
  ],
  receita: ['Salário', 'Freela', 'Outros'],
} as const;

/** Tipos de transação que têm lista de categorias (o "outro" não tem). */
export type CategoryType = keyof typeof CATEGORIES;
export type ExpenseCategory = (typeof CATEGORIES.gasto)[number];
export type IncomeCategory = (typeof CATEGORIES.receita)[number];
export type Category = ExpenseCategory | IncomeCategory;

/** Categoria usada quando a categoria gravada não pertence à lista do tipo. */
export const OTHER_CATEGORY = 'Outros' satisfies Category;

/** Categorias do tipo, na ordem da lista (a ordem dos chips). */
export function getCategories(type: CategoryType): readonly Category[] {
  return CATEGORIES[type];
}

// Tira acentos à mão (sem depender de `String.normalize`/Intl no Hermes)
const ACCENTS: Record<string, string> = {
  á: 'a',
  à: 'a',
  â: 'a',
  ã: 'a',
  ä: 'a',
  é: 'e',
  è: 'e',
  ê: 'e',
  ë: 'e',
  í: 'i',
  ì: 'i',
  î: 'i',
  ï: 'i',
  ó: 'o',
  ò: 'o',
  ô: 'o',
  õ: 'o',
  ö: 'o',
  ú: 'u',
  ù: 'u',
  û: 'u',
  ü: 'u',
  ç: 'c',
  ñ: 'n',
};

/** Chave de comparação: sem caixa, sem acento e com espaços normalizados ("  Saúde " → "saude"). */
export function getCategoryKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[áàâãäéèêëíìîïóòôõöúùûüçñ]/g, (char) => ACCENTS[char] ?? char)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Categoria da lista do tipo que corresponde ao texto (sem caixa/acento: "saude" → "Saúde").
 * Qualquer outra coisa — vazia, antiga em texto livre ou de outro tipo — vira "Outros".
 */
export function normalizeCategory(
  type: CategoryType,
  category: string | null | undefined,
): Category {
  const key = getCategoryKey(category ?? '');
  return getCategories(type).find((item) => getCategoryKey(item) === key) ?? OTHER_CATEGORY;
}
