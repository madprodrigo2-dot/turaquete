import Anthropic from '@anthropic-ai/sdk'

export const agentTools: Anthropic.Tool[] = [
  {
    name: 'buscar_raquetas',
    description:
      'Busca raquetes na base de dados com base no perfil do usuário. ' +
      'Retorna raquetes com specs objetivos (peso, balance, core, face_material, model_year, specs_extra) ' +
      'e análise especializada (potência, controle, conforto, etc.). ' +
      'specs_extra pode conter atleta firmante, número de furos, saida_de_bola (fácil/média/exigente) e outros dados técnicos. ' +
      'Candidatas já vêm ordenadas por match_score (0–10) calculado pelo perfil — apresente nessa ordem e explique o porquê. ' +
      'Use esta ferramenta antes de recomendar qualquer raquete.',
    input_schema: {
      type: 'object' as const,
      properties: {
        nome: {
          type: 'string',
          description: 'Termo parcial de busca por nome de modelo (case-insensitive). Se o usuário mencionou um ano específico, inclua-o no termo (ex: "ison 2024" se disse "ison 2024", "rebel 25" se disse "rebel 25"). O código extrai o ano automaticamente e verifica a disponibilidade. Nunca passe orçamento ou nível ao buscar por nome específico.',
        },
        atleta: {
          type: 'string',
          description: 'Termo parcial de busca por nome de atleta firmante (case-insensitive, match flexível). Use quando o usuário mencionar uma raquete pelo atleta ("a de Gigio Cariani", "a do Russo", "a da Eva Fernandez"). Exemplos: "gigio", "cariani", "hugo russo", "eva", "bazzi". NÃO use o campo nome para isso — o nome do atleta não aparece no nome do modelo.',
        },
        nivel: {
          type: 'string',
          enum: ['iniciante', 'intermediario', 'avancado'],
          description: 'Nível do jogador — ajusta os pesos do scorer (não filtra candidatas; raquetes tolerantes são válidas para todos os níveis, especialmente em casos de lesão)',
        },
        presupuesto_min: {
          type: 'number',
          description: 'Piso de preço em BRL. Só passe após o usuário responder à pergunta de faixa de preço: use 0 quando o usuário respondeu "Tanto faz", use >0 para limitar a raquetes acima desse valor (ex: 2500 para "Acima de R$2.500"). NÃO passe este campo antes do usuário responder — aguarde a resposta real.',
        },
        presupuesto_max: {
          type: 'number',
          description: 'Orçamento máximo em BRL',
        },
        prioridade: {
          type: 'string',
          enum: ['potencia', 'controle', 'equilibrio', 'defesa'],
          description: 'O que o jogador busca principalmente',
        },
        cotovelo_sensivel: {
          type: 'boolean',
          description: 'Jogador tem dor ou histórico de problema no cotovelo',
        },
        ombro_sensivel: {
          type: 'boolean',
          description: 'Jogador tem dor ou histórico de problema no ombro',
        },
        frequencia_alta: {
          type: 'boolean',
          description: 'Joga 4+ vezes por semana — sobe conforto uma prioridade',
        },
        contexto_vento: {
          type: 'boolean',
          description: 'Joga na praia ou ao ar livre com vento — favorece furos altos e estabilidade',
        },
      },
      required: [],
    },
  },
  {
    name: 'detalle_raqueta',
    description: 'Obtém todos os detalhes de uma raquete específica pelo ID. Use para aprofundar uma comparação.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'number',
          description: 'ID da raquete na base de dados',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'recomendar_raquetas',
    description:
      'Registra as raquetes escolhidas para recomendação final. ' +
      'Use SOMENTE com IDs que vieram de buscar_raquetas nesta conversa. Máximo 3 raquetes.',
    input_schema: {
      type: 'object' as const,
      properties: {
        raquetes: {
          type: 'array',
          description: 'Lista de raquetes escolhidas, máximo 3',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'number',
                description: 'ID da raquete (deve ter vindo de buscar_raquetas)',
              },
              razao: {
                type: 'string',
                description: 'Por que essa raquete combina com o jogador — 1 frase curta e específica',
              },
            },
            required: ['id', 'razao'],
          },
          maxItems: 3,
        },
        tipo: {
          type: 'string',
          enum: ['recomendacao', 'comparacao', 'compra_direta'],
          description: "Tipo de saída: 'recomendacao' (padrão, quando o agente escolheu as melhores raquetes pro perfil), 'comparacao' (quando o usuário pediu explicitamente a diferença entre modelos), ou 'compra_direta' (usuário já escolheu a raquete e quer comprá-la — mostra a card com o link direto, sem questionário de perfil).",
        },
      },
      required: ['raquetes'],
    },
  },
  {
    name: 'diagnosticar_perfil',
    description:
      'Calcula a faixa de peso e balance ideal para a pessoa antes de buscar raquetes. ' +
      'Chame quando tiver o essencial: nível e/ou estilo de jogo. ' +
      'Sinais pessoais (idade, porte, força) são opcionais — passe APENAS o que a pessoa mencionou espontaneamente, nunca pergunte.',
    input_schema: {
      type: 'object' as const,
      properties: {
        nivel: {
          type: 'string',
          enum: ['iniciante', 'intermediario', 'avancado'],
          description: 'Nível do jogador',
        },
        estilo: {
          type: 'string',
          enum: ['ofensivo', 'defensivo', 'misto'],
          description: 'Estilo de jogo predominante. SOMENTE se o usuário declarou explicitamente ("jogo no ataque", "gosto de defender", ou respondeu um chip de estilo). PROIBIDO inferir a partir da raquete atual, da queja ("solta a bola" não é estilo) ou de qualquer outro contexto. Se não foi declarado, omita este campo.',
        },
        idade: {
          type: 'number',
          description: 'Idade, apenas se a pessoa mencionou espontaneamente',
        },
        porte: {
          type: 'string',
          enum: ['menudo', 'normal', 'grande'],
          description: 'Porte físico, apenas se a pessoa mencionou',
        },
        forca_declarada: {
          type: 'string',
          enum: ['fraca', 'forte'],
          description: 'Força ou potência de swing, apenas se a pessoa mencionou',
        },
        jogo_aereo_predominante: {
          type: 'boolean',
          description: 'Joga muito na rede ou no jogo aéreo',
        },
        cotovelo_sensivel: {
          type: 'boolean',
          description: 'Tem dor ou histórico no cotovelo. SOMENTE se o usuário confirmou cotovelo via chip de localização ou frase explícita ("dói no cotovelo", "epicondilite"). "Dor no braço" sem localizar NÃO mapeia aqui — espere a resposta ao chip de localização.',
        },
        ombro_sensivel: {
          type: 'boolean',
          description: 'Tem dor ou histórico no ombro. SOMENTE se confirmado via chip "Sim, ombro" ou declaração explícita de ombro. "Dor no braço" genérico NÃO mapeia aqui.',
        },
        punho_sensivel: {
          type: 'boolean',
          description: 'Tem dor no punho ou outro local do braço que não seja cotovelo nem ombro. Passe `true` quando o usuário escolher o chip "Punho ou outro lugar" ou declarar dor no punho/pulso. Ativa o mesmo filtro de proteção que cotovelo e ombro.',
        },
        sem_lesao: {
          type: 'boolean',
          description: 'Usuário confirmou explicitamente NÃO ter dor (chip "Não tenho dor" ou equivalente). Isso marca a pergunta de lesão como respondida. Inclui ausência de dor em cotovelo, ombro e punho.',
        },
        genero_organico: {
          type: 'string',
          enum: ['masculino', 'feminino'],
          description: 'Gênero, apenas se a pessoa revelou organicamente (gramática como "cansado/cansada", contexto como "jogo com meus amigos"). NUNCA pergunte. Homens têm piso de 320g na faixa calculada.',
        },
      },
      required: [],
    },
  },
  {
    name: 'registrar_intencao',
    description:
      'Classifica a intenção detectada na PRIMEIRA mensagem do usuário. ' +
      'Chame EXATAMENTE UMA VEZ, na primeira mensagem (quando não há nenhuma mensagem de usuário anterior no histórico), ' +
      'ANTES de qualquer outra ferramenta ou resposta de texto.',
    input_schema: {
      type: 'object' as const,
      properties: {
        intencao: {
          type: 'string',
          enum: [
            'primeira_raquete',
            'troca',
            'ajuste_da_atual',
            'lesao_dor',
            'comparacao',
            'compra_direta',
            'presente',
            'preco_orcamento',
            'curiosidade',
            'outra',
          ],
          description: 'Classificação da intenção principal da pessoa nesta primeira mensagem.',
        },
      },
      required: ['intencao'],
    },
  },
  {
    name: 'sugerir_opcoes',
    description:
      'Apresenta chips tocáveis para o usuário escolher entre opções fixas e enumeráveis. ' +
      'Para desambiguar versões de um modelo: PRIMEIRO chame buscar_raquetas com o nome parcial; ' +
      'se retornar 2+ raquetes com o mesmo nome base, ENTÃO chame sugerir_opcoes com as versões ' +
      'concretas que vieram do resultado — nunca ofereça versões fora do catálogo publicado. ' +
      'Também use para outras escolhas fechadas: faixa de preço, nível de jogo. Máximo 4 opções.',
    input_schema: {
      type: 'object' as const,
      properties: {
        opcoes: {
          type: 'array',
          description: 'Lista de opções tocáveis, máximo 4',
          items: { type: 'string' },
          maxItems: 4,
        },
      },
      required: ['opcoes'],
    },
  },
]
