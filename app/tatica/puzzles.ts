// Puzzles táticos — protótipo exploratório, dados hardcoded (sem Supabase ainda).
// Coordenadas em % da quadra: x 0–100 (esquerda–direita), y 0–100 (fundo do
// adversário no topo, seu fundo embaixo). Rede sempre em y=50.

export interface CourtPlayer {
  id: string
  team: 'voce' | 'adversario'
  label: string
  x: number
  y: number
}

export interface CourtArrow {
  from: { x: number; y: number }
  to: { x: number; y: number }
  style: 'flat' | 'lob'
}

export interface PuzzleOption {
  id: 'A' | 'B' | 'C'
  texto: string
}

export interface Puzzle {
  slug: string
  titulo: string
  situacao: string
  players: CourtPlayer[]
  ball: { x: number; y: number }
  opcoes: PuzzleOption[]
  correta: 'A' | 'B' | 'C'
  explicacao: string
  resultado: {
    highlightPlayerIds?: string[]
    arrows?: CourtArrow[]
  }
}

export const PUZZLES: Puzzle[] = [
  {
    slug: 'bola-no-meio',
    titulo: 'Bola no meio',
    situacao: 'A bola do adversário cai bem no meio da quadra, entre os dois parceiros, em altura de voleio.',
    players: [
      { id: 'you-fh', team: 'voce', label: 'Forehand', x: 32, y: 62 },
      { id: 'you-bh', team: 'voce', label: 'Backhand', x: 68, y: 62 },
      { id: 'adv-1', team: 'adversario', label: 'Adv. 1', x: 34, y: 20 },
      { id: 'adv-2', team: 'adversario', label: 'Adv. 2', x: 66, y: 20 },
    ],
    ball: { x: 50, y: 60 },
    opcoes: [
      { id: 'A', texto: 'Ambos esperam, pensando que o outro vai pegar' },
      { id: 'B', texto: 'O jogador de forehand daquele lado assume a bola (regra combinada de antemão)' },
      { id: 'C', texto: 'Quem estiver mais perto da rede assume, independente do lado' },
    ],
    correta: 'B',
    explicacao: 'É a regra de ouro pra evitar o "buraco do meio", a causa número 1 de pontos perdidos em duplas iniciantes. Combinar antes quem cobre o meio evita que os dois fiquem esperando um pelo outro.',
    resultado: {
      highlightPlayerIds: ['you-fh'],
      arrows: [{ from: { x: 32, y: 62 }, to: { x: 50, y: 60 }, style: 'flat' }],
    },
  },
  {
    slug: 'atacar-pelo-meio',
    titulo: 'Atacar pelo meio',
    situacao: 'Você está atacando. Os dois adversários estão na rede, mas um pouco separados entre si.',
    players: [
      { id: 'you-hit', team: 'voce', label: 'Você', x: 50, y: 72 },
      { id: 'you-partner', team: 'voce', label: 'Parceiro', x: 22, y: 68 },
      { id: 'adv-1', team: 'adversario', label: 'Adv. 1', x: 28, y: 14 },
      { id: 'adv-2', team: 'adversario', label: 'Adv. 2', x: 72, y: 14 },
    ],
    ball: { x: 50, y: 68 },
    opcoes: [
      { id: 'A', texto: 'Atacar pela linha, o lado mais aberto' },
      { id: 'B', texto: 'Atacar cruzado, na diagonal, pro canto' },
      { id: 'C', texto: 'Atacar pelo meio, entre os dois adversários' },
    ],
    correta: 'C',
    explicacao: 'A bola pelo meio reduz o ângulo de resposta dos dois adversários e explora a falta de comunicação sobre quem deveria pegá-la. Estatisticamente é a jogada com maior chance de ponto contra duplas sem uma regra clara de "bola do meio".',
    resultado: {
      highlightPlayerIds: ['you-hit'],
      arrows: [{ from: { x: 50, y: 68 }, to: { x: 50, y: 10 }, style: 'flat' }],
    },
  },
  {
    slug: 'globo-sob-pressao',
    titulo: 'Globo sob pressão',
    situacao: 'Você está na defesa, longe da rede, recebendo uma bola alta e forte — os dois adversários já estão postados na rede.',
    players: [
      { id: 'you-def', team: 'voce', label: 'Você', x: 50, y: 88 },
      { id: 'you-partner', team: 'voce', label: 'Parceiro', x: 22, y: 84 },
      { id: 'adv-1', team: 'adversario', label: 'Adv. 1', x: 32, y: 12 },
      { id: 'adv-2', team: 'adversario', label: 'Adv. 2', x: 68, y: 12 },
    ],
    ball: { x: 50, y: 85 },
    opcoes: [
      { id: 'A', texto: 'Tentar um passing forte e cruzado, arriscado' },
      { id: 'B', texto: 'Dar um globo alto e profundo, pra ganhar tempo e se reposicionar' },
      { id: 'C', texto: 'Bater uma bola curta e mole, só pra devolver' },
    ],
    correta: 'B',
    explicacao: 'Contra uma dupla bem postada na rede, o globo profundo é a ferramenta mais segura. Força o adversário a recuar ou arriscar um smash difícil, e te dá tempo pra se reposicionar.',
    resultado: {
      highlightPlayerIds: ['you-def'],
      arrows: [{ from: { x: 50, y: 85 }, to: { x: 50, y: 8 }, style: 'lob' }],
    },
  },
  {
    slug: 'cordao-invisivel',
    titulo: 'Cordão invisível',
    situacao: 'Seu parceiro avançou até a rede, você ainda está no meio da quadra.',
    players: [
      { id: 'you-partner', team: 'voce', label: 'Parceiro', x: 25, y: 22 },
      { id: 'you', team: 'voce', label: 'Você', x: 70, y: 55 },
      { id: 'adv-1', team: 'adversario', label: 'Adv. 1', x: 30, y: 12 },
      { id: 'adv-2', team: 'adversario', label: 'Adv. 2', x: 70, y: 12 },
    ],
    ball: { x: 50, y: 25 },
    opcoes: [
      { id: 'A', texto: 'Fica onde está' },
      { id: 'B', texto: 'Avança também, mantendo a mesma distância entre vocês' },
      { id: 'C', texto: 'Recua pro fundo' },
    ],
    correta: 'B',
    explicacao: 'A dupla se move como uma unidade. Se um avança e o outro fica atrás, abre um buraco enorme no meio da quadra.',
    resultado: {
      highlightPlayerIds: ['you'],
      arrows: [{ from: { x: 70, y: 55 }, to: { x: 70, y: 25 }, style: 'flat' }],
    },
  },
  {
    slug: 'depois-de-dar-um-globo',
    titulo: 'Depois de dar um globo',
    situacao: 'Você acabou de dar um globo defensivo por cima do adversário que estava na rede.',
    players: [
      { id: 'you', team: 'voce', label: 'Você', x: 60, y: 62 },
      { id: 'you-partner', team: 'voce', label: 'Parceiro', x: 25, y: 65 },
      { id: 'adv-1', team: 'adversario', label: 'Adv. 1', x: 30, y: 15 },
      { id: 'adv-2', team: 'adversario', label: 'Adv. 2', x: 70, y: 15 },
    ],
    ball: { x: 68, y: 18 },
    opcoes: [
      { id: 'A', texto: 'Avança à rede com seu parceiro' },
      { id: 'B', texto: 'Fica onde está' },
      { id: 'C', texto: 'Recua com seu parceiro pro fundo' },
    ],
    correta: 'C',
    explicacao: 'Depois de lobar, o adversário pode rematar. A dupla precisa de espaço e tempo pra defender, então os dois recuam juntos.',
    resultado: {
      highlightPlayerIds: ['you', 'you-partner'],
      arrows: [
        { from: { x: 60, y: 62 }, to: { x: 60, y: 85 }, style: 'flat' },
        { from: { x: 25, y: 65 }, to: { x: 25, y: 85 }, style: 'flat' },
      ],
    },
  },
  {
    slug: 'terra-de-ninguem',
    titulo: 'Terra de ninguém',
    situacao: 'Você está entre a linha de saque e a rede, nem perto o suficiente pra um voleio forte nem longe o suficiente pra defender bem.',
    players: [
      { id: 'you', team: 'voce', label: 'Você', x: 50, y: 58 },
      { id: 'you-partner', team: 'voce', label: 'Parceiro', x: 25, y: 25 },
      { id: 'adv-1', team: 'adversario', label: 'Adv. 1', x: 30, y: 15 },
      { id: 'adv-2', team: 'adversario', label: 'Adv. 2', x: 70, y: 15 },
    ],
    ball: { x: 70, y: 40 },
    opcoes: [
      { id: 'A', texto: 'Fica ali e reage' },
      { id: 'B', texto: 'Decide: avança com convicção até a rede ou recua até o fundo' },
      { id: 'C', texto: 'Recua só meio metro' },
    ],
    correta: 'B',
    explicacao: 'Essa posição intermediária é a mais fraca da quadra. A regra é sempre escolher um lado: ou fecha a rede com decisão, ou volta pro fundo pra se posicionar bem.',
    resultado: {
      highlightPlayerIds: ['you'],
      arrows: [{ from: { x: 50, y: 58 }, to: { x: 50, y: 22 }, style: 'flat' }],
    },
  },
  {
    slug: 'triangulo-defensivo',
    titulo: 'Triângulo defensivo',
    situacao: 'Seu parceiro subiu à rede sozinho, você ficou no fundo. O adversário devolve um globo alto pro meio.',
    players: [
      { id: 'you-partner', team: 'voce', label: 'Parceiro', x: 30, y: 20 },
      { id: 'you', team: 'voce', label: 'Você', x: 60, y: 85 },
      { id: 'adv-1', team: 'adversario', label: 'Adv. 1', x: 30, y: 12 },
      { id: 'adv-2', team: 'adversario', label: 'Adv. 2', x: 70, y: 12 },
    ],
    ball: { x: 50, y: 45 },
    opcoes: [
      { id: 'A', texto: 'O da rede recua rápido pra pegar' },
      { id: 'B', texto: 'Você, do fundo, assume o globo' },
      { id: 'C', texto: 'Nenhum se move' },
    ],
    correta: 'B',
    explicacao: 'A formação em triângulo existe pra isso. Quem está no fundo tem mais tempo e ângulo pra cobrir o globo, enquanto quem está na rede mantém a pressão.',
    resultado: {
      highlightPlayerIds: ['you'],
      arrows: [{ from: { x: 60, y: 85 }, to: { x: 50, y: 48 }, style: 'flat' }],
    },
  },
  {
    slug: 'cobertura-diagonal-no-saque',
    titulo: 'Cobertura diagonal no saque',
    situacao: 'Você sacou cruzado pro lado mais fraco do adversário, seu parceiro está na rede.',
    players: [
      { id: 'you', team: 'voce', label: 'Você', x: 75, y: 88 },
      { id: 'you-partner', team: 'voce', label: 'Parceiro', x: 25, y: 25 },
      { id: 'adv-1', team: 'adversario', label: 'Adv. 1', x: 25, y: 15 },
      { id: 'adv-2', team: 'adversario', label: 'Adv. 2', x: 70, y: 15 },
    ],
    ball: { x: 30, y: 20 },
    opcoes: [
      { id: 'A', texto: 'Se posiciona no meio, cobrindo os dois lados' },
      { id: 'B', texto: 'Se inclina pra cobrir a diagonal provável da devolução' },
      { id: 'C', texto: 'Corre pra linha lateral oposta' },
    ],
    correta: 'B',
    explicacao: 'A devolução mais provável de um saque cruzado tende a voltar pela mesma diagonal. Cobrir essa diagonal de antemão aumenta a chance de um voleio de ataque.',
    resultado: {
      highlightPlayerIds: ['you-partner'],
      arrows: [{ from: { x: 25, y: 25 }, to: { x: 42, y: 20 }, style: 'flat' }],
    },
  },
  {
    slug: 'parceiro-esticado',
    titulo: 'Parceiro esticado',
    situacao: 'Seu parceiro foi puxado pra fora da quadra buscando uma bola forte, você está do outro lado perto da rede.',
    players: [
      { id: 'you-partner', team: 'voce', label: 'Parceiro', x: 95, y: 70 },
      { id: 'you', team: 'voce', label: 'Você', x: 20, y: 25 },
      { id: 'adv-1', team: 'adversario', label: 'Adv. 1', x: 30, y: 12 },
      { id: 'adv-2', team: 'adversario', label: 'Adv. 2', x: 70, y: 12 },
    ],
    ball: { x: 90, y: 55 },
    opcoes: [
      { id: 'A', texto: 'Você se move pro meio da quadra, deixando seu lado momentaneamente aberto' },
      { id: 'B', texto: 'Mantém a posição exata' },
      { id: 'C', texto: 'Corre pro lado do seu parceiro' },
    ],
    correta: 'A',
    explicacao: 'Quando um parceiro é puxado pra fora, o buraco mais perigoso passa a ser o meio da quadra. Reposicionar pro meio prioriza fechar esse ângulo mais aberto.',
    resultado: {
      highlightPlayerIds: ['you'],
      arrows: [{ from: { x: 20, y: 25 }, to: { x: 45, y: 30 }, style: 'flat' }],
    },
  },
  {
    slug: 'bola-curta-depois-de-bloquear',
    titulo: 'Bola curta depois de bloquear',
    situacao: 'Você bloqueou um smash forte do adversário e a bola voltou curta, perto da rede dele.',
    players: [
      { id: 'you', team: 'voce', label: 'Você', x: 55, y: 80 },
      { id: 'you-partner', team: 'voce', label: 'Parceiro', x: 25, y: 75 },
      { id: 'adv-1', team: 'adversario', label: 'Adv. 1', x: 30, y: 15 },
      { id: 'adv-2', team: 'adversario', label: 'Adv. 2', x: 70, y: 15 },
    ],
    ball: { x: 55, y: 22 },
    opcoes: [
      { id: 'A', texto: 'Avança à rede com seu parceiro' },
      { id: 'B', texto: 'Recua esperando outro ataque' },
      { id: 'C', texto: 'Fica onde está' },
    ],
    correta: 'A',
    explicacao: 'Uma bola curta perto da rede do adversário é a chance de virar o ponto de defesa pra ataque. A dupla avança junto pra pressionar antes que o adversário se recomponha.',
    resultado: {
      highlightPlayerIds: ['you', 'you-partner'],
      arrows: [
        { from: { x: 55, y: 80 }, to: { x: 55, y: 38 }, style: 'flat' },
        { from: { x: 25, y: 75 }, to: { x: 25, y: 35 }, style: 'flat' },
      ],
    },
  },
  {
    slug: 'a-regra-do-let',
    titulo: 'A regra do let',
    situacao: 'Seu saque toca a rede e ainda assim cai dentro da quadra do adversário.',
    players: [
      { id: 'you', team: 'voce', label: 'Você', x: 50, y: 90 },
      { id: 'you-partner', team: 'voce', label: 'Parceiro', x: 25, y: 25 },
      { id: 'adv-1', team: 'adversario', label: 'Adv. 1', x: 45, y: 15 },
      { id: 'adv-2', team: 'adversario', label: 'Adv. 2', x: 75, y: 15 },
    ],
    ball: { x: 50, y: 50 },
    opcoes: [
      { id: 'A', texto: 'Repete o ponto (let), como no tênis' },
      { id: 'B', texto: 'O ponto é válido, segue jogando normal' },
      { id: 'C', texto: 'Perde o ponto automaticamente' },
    ],
    correta: 'B',
    explicacao: 'Em beach tennis não existe a regra do let. Se o saque toca a rede e entra, o ponto segue normal. Se toca a rede e não entra, perde o ponto direto, não tem segundo saque.',
    resultado: {
      arrows: [{ from: { x: 50, y: 50 }, to: { x: 50, y: 20 }, style: 'flat' }],
    },
  },
  {
    slug: 'quando-rematar',
    titulo: 'Quando rematar',
    situacao: 'Chega um globo do adversário, alto e longe do corpo dele.',
    players: [
      { id: 'you', team: 'voce', label: 'Você', x: 55, y: 65 },
      { id: 'you-partner', team: 'voce', label: 'Parceiro', x: 25, y: 70 },
      { id: 'adv-1', team: 'adversario', label: 'Adv. 1', x: 30, y: 15 },
      { id: 'adv-2', team: 'adversario', label: 'Adv. 2', x: 70, y: 15 },
    ],
    ball: { x: 55, y: 55 },
    opcoes: [
      { id: 'A', texto: 'Remata com força' },
      { id: 'B', texto: 'Devolve suave, jogando seguro' },
      { id: 'C', texto: 'Devolve com um globo' },
    ],
    correta: 'A',
    explicacao: 'Essa é a condição ideal pro smash. Desperdiçar essa chance com um golpe suave devolve a iniciativa pro adversário.',
    resultado: {
      highlightPlayerIds: ['you'],
      arrows: [{ from: { x: 55, y: 55 }, to: { x: 50, y: 15 }, style: 'flat' }],
    },
  },
  {
    slug: 'antecipar-o-smash',
    titulo: 'Antecipar o smash',
    situacao: 'O adversário está armando um smash contra você.',
    players: [
      { id: 'adv-1', team: 'adversario', label: 'Adv. 1', x: 55, y: 18 },
      { id: 'adv-2', team: 'adversario', label: 'Adv. 2', x: 25, y: 15 },
      { id: 'you', team: 'voce', label: 'Você', x: 55, y: 75 },
      { id: 'you-partner', team: 'voce', label: 'Parceiro', x: 25, y: 70 },
    ],
    ball: { x: 55, y: 25 },
    opcoes: [
      { id: 'A', texto: 'Fica parado olhando a bola' },
      { id: 'B', texto: 'Se prepara antecipando a direção pela postura/movimento dele' },
      { id: 'C', texto: 'Recua o máximo possível' },
    ],
    correta: 'B',
    explicacao: 'Defender o smash depende de ler a postura e o movimento do adversário antes do golpe. Ficar parado ou só recuar sem ler a jogada reduz muito a chance de defender bem.',
    resultado: {
      highlightPlayerIds: ['you'],
      arrows: [{ from: { x: 55, y: 75 }, to: { x: 50, y: 72 }, style: 'flat' }],
    },
  },
  {
    slug: 'variar-o-saque',
    titulo: 'Variar o saque',
    situacao: 'Você sacou 3 vezes seguidas igual (mesma direção e velocidade) e o adversário já está antecipando.',
    players: [
      { id: 'you', team: 'voce', label: 'Você', x: 50, y: 90 },
      { id: 'you-partner', team: 'voce', label: 'Parceiro', x: 25, y: 25 },
      { id: 'adv-1', team: 'adversario', label: 'Adv. 1', x: 70, y: 15 },
      { id: 'adv-2', team: 'adversario', label: 'Adv. 2', x: 30, y: 15 },
    ],
    ball: { x: 68, y: 20 },
    opcoes: [
      { id: 'A', texto: 'Continua igual, é o que sai melhor' },
      { id: 'B', texto: 'Varia direção e velocidade do próximo saque' },
      { id: 'C', texto: 'Saca o mais forte possível, sem se importar com o lugar' },
    ],
    correta: 'B',
    explicacao: 'Um padrão repetido de saque fica fácil de antecipar. Variar direção e velocidade é uma das táticas mais simples pra desorientar o adversário.',
    resultado: {
      highlightPlayerIds: ['you'],
      arrows: [{ from: { x: 50, y: 90 }, to: { x: 25, y: 15 }, style: 'flat' }],
    },
  },
  {
    slug: 'jogar-nas-pontas-na-areia',
    titulo: 'Jogar nas pontas na areia',
    situacao: 'Você quer cansar o adversário, aproveitando que na areia mudar de direção é mais lento que numa quadra dura.',
    players: [
      { id: 'you', team: 'voce', label: 'Você', x: 50, y: 75 },
      { id: 'you-partner', team: 'voce', label: 'Parceiro', x: 25, y: 70 },
      { id: 'adv-1', team: 'adversario', label: 'Adv. 1', x: 40, y: 18 },
      { id: 'adv-2', team: 'adversario', label: 'Adv. 2', x: 60, y: 15 },
    ],
    ball: { x: 50, y: 60 },
    opcoes: [
      { id: 'A', texto: 'Joga sempre no meio' },
      { id: 'B', texto: 'Joga nas pontas, alternando os lados' },
      { id: 'C', texto: 'Joga sempre no mesmo lugar' },
    ],
    correta: 'B',
    explicacao: 'Na areia, mudar de direção custa mais tempo e esforço do que numa quadra dura. Atacar as pontas alternadamente explora essa dificuldade extra de movimento.',
    resultado: {
      highlightPlayerIds: ['you'],
      arrows: [{ from: { x: 50, y: 60 }, to: { x: 15, y: 15 }, style: 'flat' }],
    },
  },
  {
    slug: 'troca-de-lado-por-vento',
    titulo: 'Troca de lado por vento',
    situacao: 'O vento começou a favorecer bastante a quadra do adversário.',
    players: [
      { id: 'you', team: 'voce', label: 'Você', x: 50, y: 80 },
      { id: 'you-partner', team: 'voce', label: 'Parceiro', x: 25, y: 25 },
      { id: 'adv-1', team: 'adversario', label: 'Adv. 1', x: 30, y: 15 },
      { id: 'adv-2', team: 'adversario', label: 'Adv. 2', x: 70, y: 15 },
    ],
    ball: { x: 50, y: 50 },
    opcoes: [
      { id: 'A', texto: 'Não dá pra fazer nada até o fim do set' },
      { id: 'B', texto: 'A troca de lado acontece automaticamente a cada 6 pontos, então precisa se adaptar tacticamente até lá' },
      { id: 'C', texto: 'Pode pedir a troca em qualquer momento' },
    ],
    correta: 'B',
    explicacao: 'As trocas de lado acontecem a cada 6 pontos, pensadas justamente pra dividir de forma justa a vantagem do vento e do sol. Não tem como pedir a troca fora disso, o jeito é se adaptar enquanto espera.',
    resultado: {},
  },
  {
    slug: 'capitalizar-um-bom-saque',
    titulo: 'Capitalizar um bom saque',
    situacao: 'Você sacou forte e o adversário devolveu uma bola fraca e alta, perto do meio.',
    players: [
      { id: 'you', team: 'voce', label: 'Você', x: 50, y: 70 },
      { id: 'you-partner', team: 'voce', label: 'Parceiro', x: 25, y: 68 },
      { id: 'adv-1', team: 'adversario', label: 'Adv. 1', x: 35, y: 15 },
      { id: 'adv-2', team: 'adversario', label: 'Adv. 2', x: 65, y: 15 },
    ],
    ball: { x: 50, y: 35 },
    opcoes: [
      { id: 'A', texto: 'Remata com força' },
      { id: 'B', texto: 'Devolve suave, "pra não arriscar"' },
      { id: 'C', texto: 'Devolve com um globo profundo' },
    ],
    correta: 'A',
    explicacao: 'Depois de um bom saque que gerou uma devolução fraca, é a hora de aproveitar com um ataque. Jogar seguro nesse momento devolve a vantagem que você já tinha conquistado.',
    resultado: {
      highlightPlayerIds: ['you'],
      arrows: [{ from: { x: 50, y: 70 }, to: { x: 50, y: 15 }, style: 'flat' }],
    },
  },
  {
    slug: 'avisar-o-saque',
    titulo: 'Avisar o saque',
    situacao: 'Você vai sacar. O que seu parceiro precisa saber antes?',
    players: [
      { id: 'you', team: 'voce', label: 'Você', x: 50, y: 90 },
      { id: 'you-partner', team: 'voce', label: 'Parceiro', x: 25, y: 25 },
      { id: 'adv-1', team: 'adversario', label: 'Adv. 1', x: 35, y: 15 },
      { id: 'adv-2', team: 'adversario', label: 'Adv. 2', x: 70, y: 15 },
    ],
    ball: { x: 50, y: 88 },
    opcoes: [
      { id: 'A', texto: 'Não precisa avisar nada, ele se ajusta sozinho' },
      { id: 'B', texto: 'A direção e intenção do saque, pra se posicionar na rede em consequência' },
      { id: 'C', texto: 'Só importa depois que o adversário devolver' },
    ],
    correta: 'B',
    explicacao: 'Quem está na rede precisa saber a direção e intenção do saque antes de acontecer, pra conseguir antecipar a diagonal provável da devolução. Essa comunicação é antes do ponto, não durante.',
    resultado: {
      highlightPlayerIds: ['you-partner'],
      arrows: [{ from: { x: 25, y: 25 }, to: { x: 35, y: 20 }, style: 'flat' }],
    },
  },
  {
    slug: 'bola-dividida-sem-tempo-de-avisar',
    titulo: 'Bola dividida sem tempo de avisar',
    situacao: 'Chega uma bola de altura média, bem no meio, e não dá tempo de gritar nada.',
    players: [
      { id: 'you-fh', team: 'voce', label: 'Forehand', x: 32, y: 62 },
      { id: 'you-bh', team: 'voce', label: 'Backhand', x: 68, y: 62 },
      { id: 'adv-1', team: 'adversario', label: 'Adv. 1', x: 34, y: 20 },
      { id: 'adv-2', team: 'adversario', label: 'Adv. 2', x: 66, y: 20 },
    ],
    ball: { x: 50, y: 58 },
    opcoes: [
      { id: 'A', texto: 'Os dois vão atrás da bola por segurança' },
      { id: 'B', texto: 'Já combinaram antes que a bola do meio é do forehand daquele lado, então cada um já sabe seu papel' },
      { id: 'C', texto: 'Nenhum se move, pra não se chocar' },
    ],
    correta: 'B',
    explicacao: 'Por isso a regra da bola do meio se combina antes da partida, não se decide na hora. Em situações sem tempo de se comunicar, cada um já sabe automaticamente o que fazer.',
    resultado: {
      highlightPlayerIds: ['you-fh'],
      arrows: [{ from: { x: 32, y: 62 }, to: { x: 50, y: 58 }, style: 'flat' }],
    },
  },
  {
    slug: 'fechar-o-ponto-com-vantagem-clara',
    titulo: 'Fechar o ponto com vantagem clara',
    situacao: 'Você está claramente ganhando o ponto (adversário mal posicionado, você no controle), mas o ponto ainda não acabou.',
    players: [
      { id: 'you', team: 'voce', label: 'Você', x: 50, y: 65 },
      { id: 'you-partner', team: 'voce', label: 'Parceiro', x: 25, y: 25 },
      { id: 'adv-1', team: 'adversario', label: 'Adv. 1', x: 15, y: 15 },
      { id: 'adv-2', team: 'adversario', label: 'Adv. 2', x: 45, y: 30 },
    ],
    ball: { x: 50, y: 45 },
    opcoes: [
      { id: 'A', texto: 'Arrisca um golpe espetacular pra terminar rápido' },
      { id: 'B', texto: 'Escolhe o golpe mais seguro que termine o ponto' },
      { id: 'C', texto: 'Devolve suave pra o ponto continuar' },
    ],
    correta: 'B',
    explicacao: 'Com vantagem clara, o objetivo é fechar o ponto da forma mais confiável possível. Arriscar demais quando você já está ganhando a jogada é um erro comum que devolve pontos de graça pro adversário.',
    resultado: {
      highlightPlayerIds: ['you'],
      arrows: [{ from: { x: 50, y: 45 }, to: { x: 75, y: 20 }, style: 'flat' }],
    },
  },
]
