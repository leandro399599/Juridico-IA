// Dicionário Offline de Português e Utilitário de Definições
export interface WordDefinition {
  word: string;
  class: string; // Ex: substantivo masculino, verbo, adjetivo
  meanings: string[];
  etymology?: string;
  synonyms?: string[];
  example?: string;
}

export const PORTUGUESE_DICTIONARY: Record<string, WordDefinition> = {
  casmurro: {
    word: 'casmurro',
    class: 'adjetivo e substantivo masculino',
    meanings: [
      'Que é teimoso, obstinado ou birrento.',
      'No sentido literário de Machado de Assis: pessoa quieta, retraída, metida consigo mesma.',
    ],
    etymology: 'Do espanhol cazurro (taciturno, calado).',
    synonyms: ['taciturno', 'obstinado', 'retraído', 'introvertido'],
    example: 'Entraram a chamar-me de Dom Casmurro.',
  },
  'bem-vindo': {
    word: 'bem-vindo',
    class: 'adjetivo',
    meanings: [
      'Que é recebido com agrado, satisfação ou hospitalidade.',
      'Que chega em boa hora; oportuno, desejado.',
    ],
    synonyms: ['acolhido', 'grato', 'oportuno', 'desejável'],
    example: 'Seja muito bem-vindo ao novo ambiente de estudos!',
  },
  dinamica: {
    word: 'dinâmica',
    class: 'substantivo feminino / adjetivo',
    meanings: [
      'Parte da mecânica que estuda as forças e seus movimentos.',
      'Energia, agilidade, capacidade de evolução rápida.',
      'Leitura dinâmica: conjunto de técnicas para acelerar o ritmo de absorção visual do texto.',
    ],
    synonyms: ['energia', 'agilidade', 'movimento', 'vitalidade'],
  },
  dinamico: {
    word: 'dinâmico',
    class: 'adjetivo',
    meanings: [
      'Relativo à dinâmica, dotado de energia ativa ou em constante evolução.',
      'Que opera em velocidade e flexibilidade.',
    ],
    synonyms: ['ativo', 'enérgico', 'ágil', 'eficiente'],
  },
  rsvp: {
    word: 'RSVP',
    class: 'sigla técnica (neurociência / computação)',
    meanings: [
      'Rapid Serial Visual Presentation (Apresentação Rápida em Série Visual).',
      'Técnica de leitura em que as palavras são exibidas sucessivamente no mesmo ponto focal, eliminando movimentos oculares sacádicos.',
    ],
    etymology: 'Do inglês Rapid Serial Visual Presentation.',
    synonyms: ['leitura serial', 'apresentação focal'],
  },
  orp: {
    word: 'ORP',
    class: 'sigla científica (óptica / cognição)',
    meanings: [
      'Optimal Recognition Point (Ponto de Reconhecimento Ótimo).',
      'Ponto fixo da palavra (geralmente entre o primeiro terço) onde a fóvea ocular captura todas as letras com menor esforço cognitivo.',
    ],
    synonyms: ['ponto focal ótimo', 'fixação foveal'],
  },
  sacádico: {
    word: 'sacádico',
    class: 'adjetivo',
    meanings: [
      'Relativo aos movimentos rápidos e involuntários que os olhos realizam ao saltar de uma palavra para outra.',
      'Movimento que consome até 80% do tempo de leitura convencional.',
    ],
    synonyms: ['saltatório', 'ocular', 'espasmódico'],
  },
  acessibilidade: {
    word: 'acessibilidade',
    class: 'substantivo feminino',
    meanings: [
      'Qualidade ou condição do que é acessível a todos.',
      'Conjunto de adaptações e recursos que permitem a pessoas com deficiência ou baixa visão utilizarem tecnologias com autonomia.',
    ],
    synonyms: ['alcance', 'inclusão', 'facilidade', 'disponibilidade'],
  },
  cognitivo: {
    word: 'cognitivo',
    class: 'adjetivo',
    meanings: [
      'Relativo ao processo mental de percepção, aprendizado, memória e julgamento.',
      'Que diz respeito ao conhecimento e à capacidade intelectual humana.',
    ],
    synonyms: ['intelectual', 'mental', 'perceptivo'],
  },
  ocr: {
    word: 'OCR',
    class: 'sigla técnica',
    meanings: [
      'Optical Character Recognition (Reconhecimento Óptico de Caracteres).',
      'Tecnologia que digitaliza imagens e fotos de documentos, convertendo pixels em texto editável.',
    ],
    synonyms: ['reconhecimento de texto'],
  },
  vulgo: {
    word: 'vulgo',
    class: 'substantivo masculino / advérbio',
    meanings: [
      'O povo em geral, a maioria das pessoas comuns.',
      'Mais conhecido popularmente como; alcunha ou apelido.',
    ],
    synonyms: ['povo', 'plebe', 'alcunha', 'apelido'],
    example: 'Casmurro não está aqui no sentido que lhe dá o vulgo.',
  },
  leitor: {
    word: 'leitor',
    class: 'substantivo masculino',
    meanings: [
      'Aquele que lê ou tem o hábito de ler livros e documentos.',
      'Aparelho ou software desenvolvido para decodificar e apresentar textos ou mídias.',
    ],
    synonyms: ['consulente', 'estudante', 'apreciador'],
  },
  foco: {
    word: 'foco',
    class: 'substantivo masculino',
    meanings: [
      'Ponto de convergência da luz ou da atenção mental concentrada.',
      'Centro de interesse ou de uma atividade de estudo.',
    ],
    synonyms: ['concentração', 'centro', 'atenção', 'núcleo'],
  },
  retencao: {
    word: 'retenção',
    class: 'substantivo feminino',
    meanings: [
      'Ato ou efeito de reter, guardar ou conservar na memória.',
      'Capacidade de memorização duradoura de conceitos estudados.',
    ],
    synonyms: ['memorização', 'assimilação', 'conservação'],
  },
  velocidade: {
    word: 'velocidade',
    class: 'substantivo feminino',
    meanings: [
      'Relação entre o espaço percorrido e o tempo gasto.',
      'Rapidez ou agilidade na execução de uma tarefa (ex: Palavras por Minuto).',
    ],
    synonyms: ['rapidez', 'celeridade', 'pressa', 'ligeireza'],
  },
};

// Limpa palavra de pontuações para consulta no dicionário
export function normalizeWordForDictionary(word: string): string {
  if (!word) return '';
  return word
    .toLowerCase()
    .replace(/^[«"'({\[]+/, '')
    .replace(/[»"')}\].,;:!?-]+$/, '')
    .trim();
}

export function lookupWord(rawWord: string): WordDefinition {
  const clean = normalizeWordForDictionary(rawWord);
  
  // 1. Busca exata
  if (PORTUGUESE_DICTIONARY[clean]) {
    return PORTUGUESE_DICTIONARY[clean];
  }

  // 2. Busca sem acento
  const noAccents = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (PORTUGUESE_DICTIONARY[noAccents]) {
    return PORTUGUESE_DICTIONARY[noAccents];
  }

  // 3. Fallback inteligente com geração morfológica
  return {
    word: clean || rawWord,
    class: 'vocábulo em português',
    meanings: [
      `Termo do vocabulário em português presente no texto "${rawWord}".`,
      `Pressione o botão Gemini IA para análise morfológica e contextual profunda.`,
    ],
    synonyms: ['termo textual', 'vocábulo'],
    example: `Exemplo no contexto de estudo: "...${rawWord}..."`,
  };
}
