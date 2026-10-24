export interface SampleDocument {
  id: string;
  title: string;
  description: string;
  pages: {
    pageNumber: number;
    text: string;
    isScanned?: boolean;
    ocrNoise?: boolean;
  }[];
}

export const SAMPLE_DOCUMENTS: SampleDocument[] = [
  {
    id: 'rsvp-guide',
    title: 'Guia de Leitura Dinâmica & Acessibilidade',
    description: 'Apresentação dos conceitos de RSVP, fixação ocular ORP e benefícios cognitivos.',
    pages: [
      {
        pageNumber: 1,
        text: `Bem-vindo ao LeitorDinamico! Este software foi projetado para revolucionar a sua velocidade de leitura através da tecnologia RSVP (Rapid Serial Visual Presentation) e oferecer acessibilidade irrestrita para pessoas com deficiência visual ou dificuldades de foco. Ao concentrar sua visão na letra vermelha central — o Ponto de Reconhecimento Ótimo (ORP) —, seu cérebro elimina os movimentos sacádicos dos olhos. O movimento ocular consome até 80% do tempo gasto durante a leitura tradicional. Com a apresentação em série rápida, você consegue absorver de 300 a mais de 800 palavras por minuto com retenção e compreensão aprimoradas.`,
      },
      {
        pageNumber: 2,
        text: `Recursos de Acessibilidade: O leitor possui modo de alto contraste para pessoas com baixa visão, controle milimétrico de tamanho de fonte e leitor de tela integrado por síntese de voz (TTS). Quando ativado, o sintetizador lê o texto em sincronia com o ritmo selecionado. Além disso, você pode carregar qualquer documento PDF, aplicar OCR em páginas escaneadas e recorrer à Inteligência Artificial do Google Gemini para eliminar falhas de digitalização e reestruturar o conteúdo em formato Markdown elegante.`,
      },
    ],
  },
  {
    id: 'ocr-noise',
    title: 'Documento Digitalizado com Ruídos de OCR (Teste IA)',
    description: 'Texto simulando falhas de escaneamento para testar a correção com o Gemini.',
    pages: [
      {
        pageNumber: 1,
        isScanned: true,
        ocrNoise: true,
        text: `RELAT0RIO TÉCN1CO DE DESENV0LV1MENT0 - PÁG 01
---
A leitu-
ra dlnamica e uma tecnlca de apre-
sentacao raplda de infomacoes vi-
suais (RSVP). Quando o scanner digitaIiza
o texto, muitos e-rros ocorrem, tais como
a confvsao entre 'rn' e 'm', letras tro-
cadas por numeros como '0' no lugar de 'O',
e hifenizacoes quebradas ao fim da
linha que prejudicam a cornpreensao auditiva
do leltor de tela.
Pagina 1 de 4 -- Confidencial 2026`,
      },
      {
        pageNumber: 2,
        isScanned: true,
        ocrNoise: true,
        text: `SEÇAO 2: REC0NHEC1MENTO ASS1ST1DO P0R 1NTEL1GENCIA ART1F1C1AL
O modelo Gemini 1.5 Flash do Google AI Studio
processa este tex-
to e remove todas as fa-
lhas de OCR. Ele restabelece a grafia
correta do portugues brasileiro, or-
ganiza subtitulos coerentes e permi-
te que o sintetizador de voz (TTS)
pronuncie as palavras com clareza cristalina.
--- Fim do Relatorio Tecnico ---`,
      },
    ],
  },
  {
    id: 'dom-casmurro',
    title: 'Dom Casmurro - Machado de Assis',
    description: 'Capítulo I: Do título. Clássico da literatura brasileira em ritmo dinâmico.',
    pages: [
      {
        pageNumber: 1,
        text: `Uma noite destas, vindo da cidade para o Engenho Novo, encontrei no trem da Central um rapaz aqui do bairro, que eu conheço de vista e de chapéu. Cumprimentou-me, sentou-se ao pé de mim, falou da lua e dos ministros, e acabou recitando-me versos. A viagem era longa, e a quinta de carruagens quase vazia; os versos eram muitos e a matéria deles era a dor de amor. Comecei por cochilar; a final adormeci de todo. Quando acordei, o rapaz já tinha saído e o trem parava na minha estação.`,
      },
      {
        pageNumber: 2,
        text: `No dia seguinte entraram a chamar-me de Dom Casmurro. Casmurro não está aqui no sentido que lhe dá o vulgo, de homem fechado em si mesmo, mas no de homem quieto e metido consigo. O título foi-me posto pelo rapaz dos versos, que, querendo vingar-se do meu sono da véspera, começou a chamar-me assim pelos jornais e pelas esquinas do bairro. Pegou o nome, e eu não me importei com isso.`,
      },
    ],
  },
];
