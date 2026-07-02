export type ArquetipoSlug =
  | 'muralha'
  | 'contra-atacante'
  | 'camaleao'
  | 'dono-da-rede'
  | 'canhao'
  | 'finalizador'

export interface Arquetipo {
  slug: ArquetipoSlug
  nome: string
  equivalente: string
  descricao: string
  pontosFortres: [string, string, string]
}

export const ARQUETIPOS: Record<ArquetipoSlug, Arquetipo> = {
  muralha: {
    slug: 'muralha',
    nome: 'O Muralha',
    equivalente: 'Solid Baseliner',
    descricao:
      'Você é a base que não cede. Bola atrás de bola, sempre de volta, sempre no lugar. Enquanto o rival se desespera, você mantém o plano e deixa o erro vir do outro lado. Paciência é a sua forma de pressão.',
    pontosFortres: [
      'Consistência acima de tudo',
      'Defesa que desgasta o adversário',
      'Cabeça fria nos pontos longos',
    ],
  },
  'contra-atacante': {
    slug: 'contra-atacante',
    nome: 'O Contra-Atacante',
    equivalente: 'Counterpuncher',
    descricao:
      'Você defende com propósito. Absorve a pressão, devolve a bola impossível e, quando o rival se abre, vira o ponto num piscar. Sua defesa não é recuo: é armadilha.',
    pontosFortres: [
      'Leitura rápida do ponto',
      'Transição defesa-ataque',
      'Colocação precisa sob pressão',
    ],
  },
  canhao: {
    slug: 'canhao',
    nome: 'O Canhão',
    equivalente: 'Attacking Baseliner',
    descricao:
      'Você dita o ritmo do fundo da quadra. Potência no golpe, profundidade na bola e o rival sempre correndo atrás. Quando a bola sobe, todo mundo na areia já sabe o que vem.',
    pontosFortres: [
      'Potência de fundo que abre a quadra',
      'Ritmo alto do primeiro ao último ponto',
      'Presença que intimida',
    ],
  },
  'dono-da-rede': {
    slug: 'dono-da-rede',
    nome: 'O Dono da Rede',
    equivalente: 'Serve and Volleyer',
    descricao:
      'Seu jogo acontece perto da rede. Voleio firme, smash pronto e reflexo rápido: você encurta o ponto e sufoca o rival antes que ele arme a jogada. A areia do fundo quase não conhece seus pés.',
    pontosFortres: [
      'Voleio e jogo aéreo dominantes',
      'Reflexos de rede',
      'Pressão constante na subida',
    ],
  },
  finalizador: {
    slug: 'finalizador',
    nome: 'O Finalizador',
    equivalente: 'Big Server',
    descricao:
      'Você joga pra resolver. Saque forte, definição rápida e pontos curtos: quanto menos bolas, melhor. Seu jogo é eficiência pura, e o rival mal tem tempo de entrar no ponto.',
    pontosFortres: [
      'Saque como arma',
      'Definição em poucas bolas',
      'Explosão nos momentos decisivos',
    ],
  },
  camaleao: {
    slug: 'camaleao',
    nome: 'O Camaleão',
    equivalente: 'All-Court Player',
    descricao:
      'Você não tem um jogo só: tem o jogo que o ponto pede. Muda ritmo, altura e posição, lê o parceiro e o rival, e se adapta antes de todo mundo. Sua maior arma é não ter padrão.',
    pontosFortres: [
      'Adaptação total ao jogo',
      'Variação de golpes e ritmo',
      'Visão tática da dupla',
    ],
  },
}

export interface PerguntaOpcao {
  label: string
  primario: ArquetipoSlug
  secundario: ArquetipoSlug
}

export interface Pergunta {
  texto: string
  opcoes: [PerguntaOpcao, PerguntaOpcao, PerguntaOpcao]
}

export const PERGUNTAS: Pergunta[] = [
  {
    texto: 'Ponto decisivo e a bola sobe fácil na sua frente. O que você faz?',
    opcoes: [
      { label: 'Smash! Vou definir agora',          primario: 'finalizador',     secundario: 'canhao'           },
      { label: 'Coloco no espaço vazio, sem pressa', primario: 'contra-atacante', secundario: 'camaleao'         },
      { label: 'Garanto no fundo, sem risco',        primario: 'muralha',         secundario: 'contra-atacante'  },
    ],
  },
  {
    texto: 'Seu saque é...',
    opcoes: [
      { label: 'Minha arma: busco o ponto direto',      primario: 'finalizador',  secundario: 'canhao'    },
      { label: 'O passaporte pra rede: saco e subo',    primario: 'dono-da-rede', secundario: 'finalizador' },
      { label: 'Seguro: coloco em jogo e construo',     primario: 'muralha',      secundario: 'camaleao'  },
    ],
  },
  {
    texto: 'O que mais te dá prazer numa partida?',
    opcoes: [
      { label: 'Um winner que ninguém alcança',             primario: 'canhao',         secundario: 'finalizador'   },
      { label: 'Devolver uma bola impossível',              primario: 'contra-atacante', secundario: 'muralha'       },
      { label: 'Um ponto construído, cada bola com intenção', primario: 'camaleao',     secundario: 'dono-da-rede'  },
    ],
  },
  {
    texto: 'Contra alguém mais forte que você, sua arma é...',
    opcoes: [
      { label: 'Potência: bato mais forte',       primario: 'canhao',          secundario: 'finalizador'   },
      { label: 'Consistência: erro menos',        primario: 'muralha',         secundario: 'contra-atacante' },
      { label: 'Variação: mudo ritmo e altura',   primario: 'camaleao',        secundario: 'contra-atacante' },
    ],
  },
  {
    texto: 'Na rede, você se sente...',
    opcoes: [
      { label: 'Em casa. A rede é minha', primario: 'dono-da-rede', secundario: 'finalizador'   },
      { label: 'Vou quando o jogo pede',  primario: 'camaleao',     secundario: 'dono-da-rede'  },
      { label: 'Prefiro o fundo',         primario: 'muralha',      secundario: 'canhao'         },
    ],
  },
  {
    texto: 'Seu parceiro errou três bolas seguidas. Você...',
    opcoes: [
      { label: 'Assumo mais quadra e defino eu',      primario: 'dono-da-rede', secundario: 'canhao'          },
      { label: 'Mantenho meu jogo, uma bola de cada vez', primario: 'muralha', secundario: 'contra-atacante'  },
      { label: 'Converso e ajusto a tática',          primario: 'camaleao',    secundario: 'muralha'          },
    ],
  },
  {
    texto: 'Sua vitória ideal termina...',
    opcoes: [
      { label: '6-1 rápido, pontos curtos',   primario: 'finalizador',     secundario: 'dono-da-rede'   },
      { label: '7-6 numa batalha épica',      primario: 'muralha',         secundario: 'contra-atacante' },
      { label: 'De virada, porque li o jogo', primario: 'contra-atacante', secundario: 'camaleao'       },
    ],
  },
]

// Tiebreaker priority (index 0 = highest)
export const TIEBREAKER_ORDER: ArquetipoSlug[] = [
  'contra-atacante',
  'muralha',
  'camaleao',
  'dono-da-rede',
  'canhao',
  'finalizador',
]

// Answer: index into opcoes (0=a, 1=b, 2=c)
export type Resposta = 0 | 1 | 2

export type ScoreMap = Record<ArquetipoSlug, number>

export function calcularScores(respostas: Resposta[]): ScoreMap {
  const scores: ScoreMap = {
    muralha: 0,
    'contra-atacante': 0,
    camaleao: 0,
    'dono-da-rede': 0,
    canhao: 0,
    finalizador: 0,
  }
  for (let i = 0; i < respostas.length && i < PERGUNTAS.length; i++) {
    const opcao = PERGUNTAS[i].opcoes[respostas[i]]
    scores[opcao.primario]   += 2
    scores[opcao.secundario] += 1
  }
  return scores
}

export function calcularPerfil(respostas: Resposta[]): ArquetipoSlug {
  const scores = calcularScores(respostas)

  const primaryCounts: ScoreMap = {
    muralha: 0, 'contra-atacante': 0, camaleao: 0,
    'dono-da-rede': 0, canhao: 0, finalizador: 0,
  }
  for (let i = 0; i < respostas.length && i < PERGUNTAS.length; i++) {
    const opcao = PERGUNTAS[i].opcoes[respostas[i]]
    primaryCounts[opcao.primario] += 1
  }

  const maxScore = Math.max(...Object.values(scores))
  const tied = (Object.keys(scores) as ArquetipoSlug[]).filter(k => scores[k] === maxScore)

  if (tied.length === 1) return tied[0]

  // Tiebreaker 1: most primary answers
  const maxPrimary = Math.max(...tied.map(k => primaryCounts[k]))
  const stillTied = tied.filter(k => primaryCounts[k] === maxPrimary)

  if (stillTied.length === 1) return stillTied[0]

  // Tiebreaker 2: fixed priority order
  return TIEBREAKER_ORDER.find(k => stillTied.includes(k))!
}

// Radar axis layout (clockwise from top)
export const RADAR_AXIS_ORDER: ArquetipoSlug[] = [
  'muralha',
  'canhao',
  'finalizador',
  'dono-da-rede',
  'contra-atacante',
  'camaleao',
]

export const MAX_SCORE_PER_AXIS = 14 // 7 questions × 2 points
