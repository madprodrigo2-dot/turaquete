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
        nivel: {
          type: 'string',
          enum: ['iniciante', 'intermediario', 'avancado'],
          description: 'Nível do jogador',
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
      },
      required: ['raquetes'],
    },
  },
]
