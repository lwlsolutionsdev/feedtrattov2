// Tipos para o Módulo de Alimentação

// ==================== UNIDADE DE MEDIDA ====================
export interface UnidadeMedida {
  id: string
  nome: string
  sigla: string
  fator_conversao: number // Fator de conversão para KG
  ativo: boolean
  cliente_id: string
  empresa_id: string
  created_at: string
  updated_at: string
}

export interface UnidadeMedidaFormData {
  nome: string
  sigla: string
  fator_conversao: number
  ativo: boolean
}

// ==================== INSUMO ====================
export interface Insumo {
  id: string
  nome: string
  unidade_base_id: string
  unidade_base_nome?: string
  unidade_base_sigla?: string
  estoque_minimo: number
  saldo_atual: number
  preco_medio: number
  valor_imobilizado: number
  dias_para_acabar: number | null
  status_estoque: 'OK' | 'BAIXO' | 'ZERADO'
  ativo: boolean
  cliente_id: string
  empresa_id: string
  created_at: string
  updated_at: string
}

export interface InsumoFormData {
  nome: string
  unidade_base_id: string
  estoque_minimo: number
  ativo: boolean
}

// ==================== ENTRADA DE ESTOQUE ====================
export interface EntradaEstoque {
  id: string
  insumo_id: string
  insumo_nome?: string
  data_entrada: string
  unidade_entrada_id: string
  unidade_entrada_nome?: string
  unidade_entrada_sigla?: string
  quantidade: number
  quantidade_kg: number // Calculado automaticamente
  valor_unitario: number
  valor_total: number // Calculado automaticamente
  observacoes?: string
  cliente_id: string
  empresa_id: string
  created_at: string
  updated_at: string
}

export interface EntradaEstoqueFormData {
  insumo_id: string
  data_entrada: string
  unidade_entrada_id: string
  quantidade: number
  valor_unitario: number
  observacoes?: string
}

// ==================== SAÍDA DE ESTOQUE ====================
export interface SaidaEstoque {
  id: string
  insumo_id: string
  insumo_nome?: string
  batida_id?: string | null
  batida_codigo?: string | null
  data_hora: string
  quantidade: number // Em KG
  valor_estimado: number
  saldo_apos_saida: number
  observacoes?: string
  cliente_id: string
  empresa_id: string
  created_at: string
  updated_at: string
}

export interface SaidaEstoqueFormData {
  insumo_id: string
  batida_id?: string | null
  data_hora: string
  quantidade: number
  observacoes?: string
}

// ==================== PRÉ-MISTURA ====================
export interface IngredientePreMistura {
  id: string
  pre_mistura_id: string
  insumo_id: string
  insumo_nome?: string
  percentual_mistura: number
  percentual_ms: number
  valor_unitario_kg: number
  ordem: number
}

export interface PreMistura {
  id: string
  nome: string
  descricao?: string
  ativo: boolean
  percentual_ms_total: number // Calculado
  custo_kg_total: number // Calculado
  ingredientes: IngredientePreMistura[]
  cliente_id: string
  empresa_id: string
  created_at: string
  updated_at: string
}

export interface IngredientePreMisturaFormData {
  insumo_id: string
  percentual_mistura: number
  percentual_ms: number
  valor_unitario_kg: number
  ordem: number
}

export interface PreMisturaFormData {
  nome: string
  descricao?: string
  ativo: boolean
  ingredientes: IngredientePreMisturaFormData[]
}

// ==================== DIETA ====================
export interface IngredienteDieta {
  id: string
  dieta_id: string
  tipo: 'insumo' | 'pre_mistura'
  insumo_id?: string | null
  insumo_nome?: string
  pre_mistura_id?: string | null
  pre_mistura_nome?: string
  percentual_mistura: number
  percentual_ms: number
  valor_unitario_kg: number
  ordem: number
}

export interface Dieta {
  id: string
  nome: string
  descricao?: string
  ativo: boolean
  percentual_ms_total: number // Calculado
  custo_kg_total: number // Calculado
  ingredientes: IngredienteDieta[]
  cliente_id: string
  empresa_id: string
  created_at: string
  updated_at: string
}

export interface IngredienteDietaFormData {
  tipo: 'insumo' | 'pre_mistura'
  insumo_id?: string | null
  pre_mistura_id?: string | null
  percentual_mistura: number
  percentual_ms: number
  valor_unitario_kg: number
  ordem: number
}

export interface DietaFormData {
  nome: string
  descricao?: string
  ativo: boolean
  ingredientes: IngredienteDietaFormData[]
}

// ==================== VAGÃO ====================
export interface Vagao {
  id: string
  nome: string
  capacidade: number // Capacidade em KG
  ativo: boolean
  cliente_id: string
  empresa_id: string
  created_at: string
  updated_at: string
}

export interface VagaoFormData {
  nome: string
  capacidade: number
  ativo: boolean
}

// ==================== BATIDA ====================
export interface IngredientePersonalizado {
  insumo_id: string
  quantidade_kg: number
}

export interface Batida {
  id: string
  codigo: string // Gerado automaticamente
  vagao_id: string
  vagao_nome?: string
  vagao_capacidade?: number
  dieta_id: string
  dieta_nome?: string
  dieta_ingredientes?: IngredienteDieta[]
  quantidade_kg: number
  data_hora: string
  status: 'PREPARANDO' | 'CONCLUIDA' | 'CANCELADA'
  observacoes?: string
  ingredientes_personalizados?: IngredientePersonalizado[] | null
  cliente_id: string
  empresa_id: string
  created_at: string
  updated_at: string
}

export interface BatidaFormData {
  vagao_id: string
  dieta_id: string
  quantidade_kg: number
  data_hora: string
  observacoes?: string
  ingredientes_personalizados?: IngredientePersonalizado[] | null
}

// ==================== ESTATÍSTICAS ====================
export interface EstatisticasInsumos {
  total_insumos: number
  insumos_ativos: number
  insumos_baixo_estoque: number
  valor_total_imobilizado: number
}

export interface EstatisticasEstoque {
  total_entradas_mes: number
  total_saidas_mes: number
  valor_entradas_mes: number
  valor_saidas_mes: number
}
