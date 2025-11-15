// Ferramentas (Tools) do módulo de Alimentação para OpenAI Function Calling

export const alimentacaoTools = [
  // Unidades de Medida
  {
    type: "function" as const,
    function: {
      name: "listar_unidades_medida",
      description: "Lista todas as unidades de medida cadastradas (KG, Saca, Tonelada, etc.)",
      parameters: {
        type: "object",
        properties: {
          ativas: {
            type: "boolean",
            description: "Filtrar apenas unidades ativas (opcional)",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "criar_unidade_medida",
      description: "Cria uma nova unidade de medida. O fator de conversão indica quantos KG equivalem a 1 unidade.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome da unidade (ex: 'Saca 30kg')" },
          sigla: { type: "string", description: "Sigla da unidade (ex: 'SC30')" },
          fator_conversao: { type: "number", description: "Fator de conversão para KG (ex: 30.0)" },
          ativo: { type: "boolean", description: "Se a unidade está ativa (padrão: true)" },
        },
        required: ["nome", "sigla", "fator_conversao"],
      },
    },
  },

  // Insumos
  {
    type: "function" as const,
    function: {
      name: "listar_insumos",
      description: "Lista todos os insumos com informações de estoque (saldo atual, preço médio, valor imobilizado, status).",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Buscar por nome do insumo (opcional)" },
          ativas: { type: "boolean", description: "Filtrar apenas insumos ativos (opcional)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "criar_insumo",
      description: "Cria um novo insumo no sistema. Aceita nome da unidade de medida.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome do insumo (ex: 'Milho Grão', 'Silagem de Capim')" },
          unidade_base_nome: { type: "string", description: "Nome ou sigla da unidade base (ex: 'KG', 'Quilograma', 'Tonelada')" },
          estoque_minimo: { type: "number", description: "Estoque mínimo em KG" },
          ativo: { type: "boolean", description: "Se o insumo está ativo (padrão: true)" },
        },
        required: ["nome", "unidade_base_nome", "estoque_minimo"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "editar_insumo",
      description: "Edita um insumo existente. Busca pelo nome do insumo.",
      parameters: {
        type: "object",
        properties: {
          nome_atual: { type: "string", description: "Nome atual do insumo a ser editado" },
          nome_novo: { type: "string", description: "Novo nome do insumo (opcional)" },
          unidade_base_nome: { type: "string", description: "Nova unidade base (opcional)" },
          estoque_minimo: { type: "number", description: "Novo estoque mínimo em KG (opcional)" },
          ativo: { type: "boolean", description: "Se o insumo está ativo (opcional)" },
        },
        required: ["nome_atual"],
      },
    },
  },

  // Entradas de Estoque
  {
    type: "function" as const,
    function: {
      name: "listar_entradas_estoque",
      description: "Lista todas as entradas de estoque registradas.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Buscar por nome do insumo (opcional)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "registrar_entrada_estoque",
      description: "Registra uma nova entrada de insumo no estoque. Aceita nome do insumo e da unidade. Se o valor total for informado ao invés do unitário, calcule o unitário dividindo pelo quantidade. Atualiza automaticamente o saldo e preço médio. IMPORTANTE: Aceita variações de unidades - KG/Quilograma/Quilo são a mesma coisa, Tonelada/TON/T são a mesma coisa, Saca/SC são a mesma coisa.",
      parameters: {
        type: "object",
        properties: {
          insumo_nome: { type: "string", description: "Nome do insumo (ex: 'Milho Grão', 'Farelo de Soja')" },
          data_entrada: { type: "string", description: "Data da entrada (YYYY-MM-DD ou 'hoje')" },
          unidade_nome: { type: "string", description: "Nome ou sigla da unidade. Aceita variações: KG/Quilograma/Quilo, Tonelada/TON/T, Saca/SC, Litro/LT/L" },
          quantidade: { type: "number", description: "Quantidade na unidade especificada" },
          valor_unitario: { type: "number", description: "Valor unitário em R$ por unidade (se não souber, calcule dividindo o valor total pela quantidade)" },
          observacoes: { type: "string", description: "Observações (opcional)" },
        },
        required: ["insumo_nome", "data_entrada", "unidade_nome", "quantidade", "valor_unitario"],
      },
    },
  },

  // Saídas de Estoque
  {
    type: "function" as const,
    function: {
      name: "listar_saidas_estoque",
      description: "Lista todas as saídas de estoque (manuais e automáticas de batidas).",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Buscar por nome do insumo (opcional)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "registrar_saida_estoque",
      description: "Registra uma saída manual de insumo do estoque. Aceita nome do insumo. Valida se há estoque suficiente.",
      parameters: {
        type: "object",
        properties: {
          insumo_nome: { type: "string", description: "Nome do insumo (ex: 'Milho Grão', 'Farelo de Soja')" },
          data_hora: { type: "string", description: "Data e hora da saída (YYYY-MM-DDTHH:mm ou 'agora')" },
          quantidade: { type: "number", description: "Quantidade em KG" },
          observacoes: { type: "string", description: "Observações (opcional)" },
        },
        required: ["insumo_nome", "data_hora", "quantidade"],
      },
    },
  },

  // Pré-Misturas
  {
    type: "function" as const,
    function: {
      name: "listar_pre_misturas",
      description: "Lista todas as pré-misturas com informações de ingredientes, % MS total e custo/kg.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Buscar por nome (opcional)" },
          ativas: { type: "boolean", description: "Filtrar apenas ativas (opcional)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "criar_pre_mistura",
      description: "Cria uma nova pré-mistura com 2 a 4 ingredientes. A soma dos percentuais deve ser 100%.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome da pré-mistura" },
          descricao: { type: "string", description: "Descrição (opcional)" },
          ativo: { type: "boolean", description: "Se está ativa (padrão: true)" },
          ingredientes: {
            type: "array",
            description: "Array de ingredientes (2 a 4)",
            items: {
              type: "object",
              properties: {
                insumo_id: { type: "string", description: "ID do insumo (UUID)" },
                percentual_mistura: { type: "number", description: "% na mistura (0-100)" },
                percentual_ms: { type: "number", description: "% de matéria seca (0-100)" },
                valor_unitario_kg: { type: "number", description: "Valor por KG (R$)" },
              },
              required: ["insumo_id", "percentual_mistura", "percentual_ms", "valor_unitario_kg"],
            },
          },
        },
        required: ["nome", "ingredientes"],
      },
    },
  },

  // Dietas
  {
    type: "function" as const,
    function: {
      name: "listar_dietas",
      description: "Lista todas as dietas com informações de ingredientes, % MS total e custo/kg.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Buscar por nome (opcional)" },
          ativas: { type: "boolean", description: "Filtrar apenas ativas (opcional)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "criar_dieta",
      description: "Cria uma nova dieta com ingredientes (insumos e/ou pré-misturas). A soma dos percentuais deve ser 100%.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome da dieta" },
          descricao: { type: "string", description: "Descrição (opcional)" },
          ativo: { type: "boolean", description: "Se está ativa (padrão: true)" },
          ingredientes: {
            type: "array",
            description: "Array de ingredientes (mínimo 1)",
            items: {
              type: "object",
              properties: {
                tipo: { type: "string", enum: ["insumo", "pre_mistura"], description: "Tipo do ingrediente" },
                insumo_id: { type: "string", description: "ID do insumo (se tipo=insumo)" },
                pre_mistura_id: { type: "string", description: "ID da pré-mistura (se tipo=pre_mistura)" },
                percentual_mistura: { type: "number", description: "% na mistura (0-100)" },
                percentual_ms: { type: "number", description: "% de matéria seca (0-100)" },
                valor_unitario_kg: { type: "number", description: "Valor por KG (R$)" },
              },
              required: ["tipo", "percentual_mistura", "percentual_ms", "valor_unitario_kg"],
            },
          },
        },
        required: ["nome", "ingredientes"],
      },
    },
  },

  // Batidas
  {
    type: "function" as const,
    function: {
      name: "listar_batidas",
      description: "Lista todas as batidas com informações de código, dieta, quantidade, status (PREPARANDO/CONCLUIDA/CANCELADA).",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Buscar por código ou dieta (opcional)" },
          status: { type: "string", enum: ["PREPARANDO", "CONCLUIDA", "CANCELADA"], description: "Filtrar por status (opcional)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "criar_batida",
      description: "Cria uma nova batida de ração. A batida inicia com status PREPARANDO.",
      parameters: {
        type: "object",
        properties: {
          vagao_id: { type: "string", description: "ID do vagão (UUID, opcional)" },
          dieta_id: { type: "string", description: "ID da dieta (UUID)" },
          quantidade: { type: "number", description: "Quantidade em KG" },
          data_hora: { type: "string", description: "Data e hora (YYYY-MM-DDTHH:mm)" },
          observacoes: { type: "string", description: "Observações (opcional)" },
        },
        required: ["dieta_id", "quantidade", "data_hora"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "aprovar_batida",
      description: "Aprova uma batida (muda status para CONCLUIDA). Gera automaticamente saídas de estoque para todos os ingredientes da dieta. Valida se há estoque suficiente.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID da batida (UUID)" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "cancelar_batida",
      description: "Cancela uma batida (muda status para CANCELADA).",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID da batida (UUID)" },
        },
        required: ["id"],
      },
    },
  },

  // ==================== LEITURA INTELIGENTE DE COCHO ====================
  {
    type: "function" as const,
    function: {
      name: "registrar_leitura_inteligente_noturna",
      description: "Registra leitura NOTURNA do cocho (2-3h após último trato). Apenas registra, não calcula ajuste.",
      parameters: {
        type: "object",
        properties: {
          lote_nome: { type: "string", description: "Nome do lote" },
          data: { type: "string", description: "Data da leitura (YYYY-MM-DD ou 'hoje')" },
          leitura: { 
            type: "string", 
            description: "Situação do cocho à noite",
            enum: ["vazio", "normal", "cheio"]
          },
          observacoes: { type: "string", description: "Observações adicionais (opcional)" },
        },
        required: ["lote_nome", "data", "leitura"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "registrar_leitura_inteligente_diurna",
      description: "Registra leitura DIURNA/MANHÃ (1h antes do trato). Calcula nota, ajuste e CRIA PLANEJAMENTO DE TRATO AUTOMÁTICO.",
      parameters: {
        type: "object",
        properties: {
          lote_nome: { type: "string", description: "Nome do lote" },
          data: { type: "string", description: "Data da leitura (YYYY-MM-DD ou 'hoje')" },
          fase_dieta: { 
            type: "string", 
            description: "Fase da dieta do lote",
            enum: ["adaptacao_crescimento", "terminacao"]
          },
          dias_de_cocho: { type: "number", description: "Quantos dias o lote está no cocho" },
          comportamento: { 
            type: "string", 
            description: "Comportamento dos animais pela manhã",
            enum: ["maioria_em_pe_muita_fome", "alguns_em_pe_fome", "alguns_em_pe", "deitados_calmos"]
          },
          situacao_cocho: { 
            type: "string", 
            description: "Situação do cocho pela manhã",
            enum: ["limpo_lambido", "limpo_sem_lambida", "pouca_sobra", "com_sobras", "muitas_sobras"]
          },
          kg_anterior_por_cabeca: { type: "number", description: "Consumo anterior em kg/cabeça" },
          observacoes: { type: "string", description: "Observações adicionais (opcional)" },
        },
        required: ["lote_nome", "data", "fase_dieta", "dias_de_cocho", "comportamento", "situacao_cocho", "kg_anterior_por_cabeca"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "listar_leituras_inteligentes",
      description: "Lista histórico de leituras inteligentes de cocho com notas e ajustes.",
      parameters: {
        type: "object",
        properties: {
          lote_nome: { type: "string", description: "Filtrar por nome do lote (opcional)" },
          data_inicio: { type: "string", description: "Data inicial (YYYY-MM-DD, opcional)" },
          data_fim: { type: "string", description: "Data final (YYYY-MM-DD, opcional)" },
        },
      },
    },
  },
];
