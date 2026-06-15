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
          description: 'Termo parcial de busca por nome de modelo (case-insensitive). Use para resolver raquetes citadas pelo usuário (ex: "rebel" retorna Rebel 24 e Rebel 25). Nunca passe orçamento ou nível ao buscar por nome específico.',
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
          description: 'Piso de preço em BRL. Use 0 para sinalizar "tanto faz" (sem mínimo real, mas confirma que orçamento foi tratado). Use >0 para limitar a raquetes acima desse valor (ex: 2500 para "acima de R$2.500").',
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
          enum: ['recomendacao', 'comparacao'],
          description: "Tipo de saída: 'recomendacao' (padrão, quando o agente escolheu as melhores raquetes pro perfil) ou 'comparacao' (quando o usuário pediu explicitamente a diferença entre modelos).",
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
          description: 'Estilo de jogo predominante',
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
          description: 'Tem dor ou histórico no cotovelo',
        },
        ombro_sensivel: {
          type: 'boolean',
          description: 'Tem dor ou histórico no ombro',
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
