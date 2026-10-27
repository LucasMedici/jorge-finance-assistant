// Formata um valor em reais no padrão pt-BR (ex.: 1200 -> "R$ 1.200,00").
// Feito à mão para não depender do suporte a Intl do Hermes.
// Com `hideZeroCents`, valores inteiros saem sem centavos (ex.: 1500 -> "R$ 1.500").
export function formatCurrency(value: number, options: { hideZeroCents?: boolean } = {}): string {
  const [integerPart, decimalPart] = Math.abs(value).toFixed(2).split('.');
  const withThousands = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const isNegative = value < 0 && Number(`${integerPart}.${decimalPart}`) !== 0;
  const cents = options.hideZeroCents && decimalPart === '00' ? '' : `,${decimalPart}`;
  return `${isNegative ? '-' : ''}R$ ${withThousands}${cents}`;
}
