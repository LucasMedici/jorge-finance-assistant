import { formatCurrency } from '../formatCurrency';

describe('formatCurrency', () => {
  it.each([
    [0, 'R$ 0,00'],
    [50, 'R$ 50,00'],
    [1200, 'R$ 1.200,00'],
    [1284.9, 'R$ 1.284,90'],
    [1234567.891, 'R$ 1.234.567,89'],
    [-215.1, '-R$ 215,10'],
    [-0.001, 'R$ 0,00'],
  ])('%p -> %p', (value, expected) => {
    expect(formatCurrency(value)).toBe(expected);
  });

  it('hideZeroCents tira só os centavos zerados', () => {
    expect(formatCurrency(1500, { hideZeroCents: true })).toBe('R$ 1.500');
    expect(formatCurrency(1500.5, { hideZeroCents: true })).toBe('R$ 1.500,50');
  });
});
