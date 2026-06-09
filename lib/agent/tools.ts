import Anthropic from '@anthropic-ai/sdk'

export const agentTools: Anthropic.Tool[] = [
  {
    name: 'buscar_raquetas',
    description:
      'Busca raquetes na base de dados com base no perfil do usuário. ' +
      'Retorna raquetes com specs objetivos e análise especializada (potência, controle, conforto, etc.). ' +
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
]
