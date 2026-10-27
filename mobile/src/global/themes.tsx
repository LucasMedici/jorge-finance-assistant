// Tokens visuais do app. As 3 primeiras cores são as da v1 (usadas pelas telas atuais);
// o resto é a base do redesign v2 (referência: doc-images/v2).
export const themas = {
  colors: {
    primary: '#31266C', // roxo de fundo
    secondary: '#8DC63E', // verde
    inputBackgroud: '#F4F4F4',

    // Roxos
    surface: '#43378A', // balões do Jorge, cartões e fundo do avatar sobre o roxo
    tabBar: '#2A205E',

    // Neutros
    white: '#FFFFFF',
    textDark: '#1B1530', // texto sobre branco e sobre o verde
    textMuted: '#5B5670', // texto secundário sobre branco
    controlOff: '#77728C', // trilho do switch desligado, placeholders
    fillLight: '#F2F0F8', // campos, trilho do segmentado e caixas sobre branco
    chipBorder: '#D9D5E6',

    // Estados
    error: '#B42323',
    warning: '#F2B84B', // âmbar de alerta: sempre acompanhado de ícone, nunca só a cor

    // Sobre o fundo roxo
    onPrimaryMuted: 'rgba(255, 255, 255, 0.72)', // texto secundário
    onPrimaryTrack: 'rgba(255, 255, 255, 0.12)', // trilho de barras de progresso
    onPrimaryDivider: 'rgba(255, 255, 255, 0.08)', // bordas e divisórias
    secondarySoft: 'rgba(141, 198, 62, 0.18)', // fundo do ícone da aba selecionada
    secondaryBorder: 'rgba(141, 198, 62, 0.55)', // borda dos atalhos do chat
    onPrimaryBorder: 'rgba(255, 255, 255, 0.28)', // borda de botão secundário (Corrigir)
    onPrimaryFaint: 'rgba(255, 255, 255, 0.3)', // detalhe bem apagado (3º pontinho do "digitando")
    shade: 'rgba(0, 0, 0, 0.12)', // faixa escurecida (resumo do mês no chat)
    shadeStrong: 'rgba(0, 0, 0, 0.2)', // caixa escura dentro de um balão (cartão Confirmar, ícone do recibo)

    overlay: 'rgba(20, 14, 48, 0.62)', // fundo escurecido atrás das folhas
  },

  // Cores das categorias nos gráficos (validadas sobre o fundo roxo); "Outros" fica em cinza
  categoryColors: ['#6FA52C', '#C9548A', '#3F86DB', '#D9702E'],
  categoryOtherColor: 'rgba(255, 255, 255, 0.3)',

  spacing: {
    xxs: 4,
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 28,
  },

  radius: {
    sm: 10, // opção do segmentado
    md: 12, // botões do chat, caixas de aviso
    lg: 14, // botão principal, campos, trilho do segmentado
    xl: 18, // balões
    sheet: 28, // cantos de cima das folhas
    pill: 999,
  },

  // Área mínima de toque (acessibilidade)
  minTouchSize: 44,
};
