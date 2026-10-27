import {
  CATEGORIES,
  OTHER_CATEGORY,
  getCategories,
  getCategoryKey,
  normalizeCategory,
} from '../categories';

describe('CATEGORIES', () => {
  it('tem a mesma lista fechada do backend', () => {
    expect(CATEGORIES.gasto).toEqual([
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
    ]);
    expect(CATEGORIES.receita).toEqual(['Salário', 'Freela', 'Outros']);
  });

  it('as duas listas terminam em "Outros"', () => {
    expect(getCategories('gasto').at(-1)).toBe(OTHER_CATEGORY);
    expect(getCategories('receita').at(-1)).toBe(OTHER_CATEGORY);
  });
});

describe('getCategoryKey', () => {
  it.each([
    ['Saúde', 'saude'],
    ['  BEBIDA   e  Rolê ', 'bebida e role'],
    ['Família e amigos', 'familia e amigos'],
    ['SALÁRIO', 'salario'],
    ['ação', 'acao'],
  ])('%p -> %p', (text, expected) => {
    expect(getCategoryKey(text)).toBe(expected);
  });
});

describe('normalizeCategory', () => {
  it.each([
    ['gasto', 'Mercado', 'Mercado'],
    ['gasto', 'mercado', 'Mercado'],
    ['gasto', 'saude', 'Saúde'],
    ['gasto', ' comer FORA ', 'Comer fora'],
    ['gasto', 'bebida e role', 'Bebida e rolê'],
    ['gasto', 'outros', 'Outros'],
    ['receita', 'salario', 'Salário'],
    ['receita', 'FREELA', 'Freela'],
  ] as const)('%s / %p -> %p', (type, category, expected) => {
    expect(normalizeCategory(type, category)).toBe(expected);
  });

  it('categoria antiga em texto livre vira "Outros"', () => {
    expect(normalizeCategory('gasto', 'restaurante')).toBe('Outros');
    expect(normalizeCategory('gasto', 'contas da casa')).toBe('Outros');
  });

  it('categoria de outro tipo vira "Outros"', () => {
    expect(normalizeCategory('gasto', 'Salário')).toBe('Outros');
    expect(normalizeCategory('receita', 'Mercado')).toBe('Outros');
  });

  it('vazia ou ausente vira "Outros"', () => {
    expect(normalizeCategory('gasto', '')).toBe('Outros');
    expect(normalizeCategory('gasto', null)).toBe('Outros');
    expect(normalizeCategory('receita', undefined)).toBe('Outros');
  });
});
