// ==========================================
// LEITURA INTELIGENTE DE COCHO
// Sistema de cálculo de notas e ajustes baseado no manual
// ==========================================

export type DietPhase = 'adaptacao_crescimento' | 'terminacao'
export type NightReading = 'vazio' | 'normal' | 'cheio'
export type MorningBehavior = 
  | 'maioria_em_pe_muita_fome'
  | 'alguns_em_pe_fome'
  | 'alguns_em_pe'
  | 'deitados_calmos'
export type MorningBunkStatus = 
  | 'limpo_lambido'
  | 'limpo_sem_lambida'
  | 'pouca_sobra'
  | 'com_sobras'
  | 'muitas_sobras'

export interface NotaEAjuste {
  nota: number
  percentual: number
  alertas: string[]
}

/**
 * Calcula a nota de cocho e percentual de ajuste baseado nas leituras
 * Implementa as tabelas do manual de leitura de cocho
 */
export function calcularNotaCocho(
  fase: DietPhase,
  noite: NightReading | null,
  comportamento: MorningBehavior,
  cocho: MorningBunkStatus,
  diasDeCocho: number
): NotaEAjuste {
  const alertas: string[] = []

  // ==========================================
  // ADAPTAÇÃO E CRESCIMENTO
  // ==========================================
  if (fase === 'adaptacao_crescimento') {
    // Nota -2: Situação crítica (cocho limpo lambido + muita fome)
    if (noite === 'vazio' && comportamento === 'maioria_em_pe_muita_fome' && cocho === 'limpo_lambido') {
      alertas.push('⚠️ Situação crítica: animais com muita fome')
      alertas.push('⚠️ Evite nota -2 duas vezes seguidas')
      return { nota: -2, percentual: 15, alertas }
    }

    // Nota -1: Cocho limpo + animais com fome
    if (noite === 'vazio' && comportamento === 'alguns_em_pe_fome' && cocho === 'limpo_lambido') {
      alertas.push('⚠️ Animais com fome, aumentar oferta')
      return { nota: -1, percentual: 10, alertas }
    }

    if (noite === 'vazio' && comportamento === 'alguns_em_pe' && cocho === 'limpo_sem_lambida') {
      alertas.push('⚠️ Cocho vazio, aumentar oferta')
      return { nota: -1, percentual: 10, alertas }
    }

    // Nota 0: Cocho vazio, animais esperando
    if (noite === 'normal' && comportamento === 'alguns_em_pe' && cocho === 'limpo_sem_lambida') {
      return { nota: 0, percentual: 5, alertas }
    }

    // Nota 0,5: Ajuste fino
    if ((noite === 'normal' || noite === 'cheio') && comportamento === 'deitados_calmos' && cocho === 'limpo_sem_lambida') {
      return { nota: 0.5, percentual: 2.5, alertas }
    }

    // Nota 1: Situação ideal (pouca sobra)
    if ((noite === 'normal' || noite === 'cheio') && comportamento === 'deitados_calmos' && cocho === 'pouca_sobra') {
      alertas.push('✅ Situação ideal - manter quantidade')
      return { nota: 1, percentual: 0, alertas }
    }

    // Nota 1,5: Fina camada de sobra
    if (noite === 'cheio' && comportamento === 'deitados_calmos' && cocho === 'pouca_sobra') {
      alertas.push('⚠️ Verificar se sobra é real ou seleção de ingredientes')
      return { nota: 1.5, percentual: -2.5, alertas }
    }

    // Nota 2: Sobra moderada
    if (noite === 'cheio' && comportamento === 'deitados_calmos' && cocho === 'com_sobras') {
      alertas.push('⚠️ Verificar: erro na quantidade, quebra de equipamento, clima')
      alertas.push('⚠️ Verificar qualidade da água e bebedouros')
      return { nota: 2, percentual: -5, alertas }
    }

    // Nota 3: Muita sobra
    if (noite === 'cheio' && comportamento === 'deitados_calmos' && cocho === 'muitas_sobras') {
      alertas.push('🚨 Sobra excessiva - investigar causa')
      alertas.push('⚠️ Verificar: mistura, água, saúde dos animais')
      return { nota: 3, percentual: -10, alertas }
    }
  }

  // ==========================================
  // TERMINAÇÃO
  // ==========================================
  if (fase === 'terminacao') {
    // IMPORTANTE: Terminação NÃO usa notas negativas!
    
    // Nota 0,5: Mínima em terminação (substitui notas negativas)
    if (noite === 'vazio' && comportamento === 'alguns_em_pe_fome' && cocho === 'limpo_lambido') {
      if (diasDeCocho > 30) {
        alertas.push('⚠️ Terminação com >30 dias: evite nota 0, prefira 0,5')
      }
      return { nota: 0.5, percentual: 2.5, alertas }
    }

    if (noite === 'vazio' && comportamento === 'alguns_em_pe' && cocho === 'limpo_sem_lambida') {
      return { nota: 0.5, percentual: 2.5, alertas }
    }

    // Nota 1: Situação ideal em terminação
    if (noite === 'normal' && comportamento === 'alguns_em_pe' && cocho === 'limpo_sem_lambida') {
      alertas.push('✅ Situação ideal para terminação')
      return { nota: 1, percentual: 0, alertas }
    }

    if ((noite === 'normal' || noite === 'cheio') && comportamento === 'deitados_calmos' && cocho === 'limpo_sem_lambida') {
      return { nota: 1, percentual: 0, alertas }
    }

    // Nota 1,5: Sobra leve
    if ((noite === 'normal' || noite === 'cheio') && comportamento === 'deitados_calmos' && cocho === 'pouca_sobra') {
      return { nota: 1.5, percentual: -2.5, alertas }
    }

    if (noite === 'cheio' && comportamento === 'deitados_calmos' && cocho === 'com_sobras') {
      alertas.push('⚠️ Reduzir oferta gradualmente')
      return { nota: 1.5, percentual: -5, alertas }
    }

    // Nota 2: Sobra em terminação (raro)
    if (noite === 'cheio' && comportamento === 'deitados_calmos' && cocho === 'muitas_sobras') {
      alertas.push('🚨 Sobra excessiva em terminação - investigar')
      return { nota: 2, percentual: -5, alertas }
    }
  }

  // Fallback: se não caiu em nenhuma regra, manter
  alertas.push('⚠️ Combinação não prevista nas tabelas - mantendo quantidade')
  return { nota: 1, percentual: 0, alertas }
}

/**
 * Valida se a leitura é consistente com as regras do manual
 */
export function validarLeitura(
  fase: DietPhase,
  nota: number,
  leituraAnterior: { nota: number; data: string } | null
): string[] {
  const alertas: string[] = []

  // Regra 1: Terminação não deve ter notas negativas
  if (fase === 'terminacao' && nota < 0) {
    alertas.push('🚨 ERRO: Terminação não permite notas negativas!')
  }

  // Regra 2: Evitar nota -2 duas vezes seguidas
  if (nota === -2 && leituraAnterior?.nota === -2) {
    alertas.push('🚨 ALERTA: Nota -2 duas vezes seguidas! Investigar causa.')
  }

  // Regra 3: Aumentos > 10% devem ser raros
  if (nota <= -1) {
    alertas.push('⚠️ Aumento > 10%: usar com cuidado, principalmente após adaptação')
  }

  return alertas
}

/**
 * Calcula o novo consumo baseado no ajuste
 */
export function calcularNovoConsumo(
  kgAnteriorPorCabeca: number,
  percentualAjuste: number,
  numAnimais: number
) {
  const fator = 1 + (percentualAjuste / 100)
  const kgNovoPorCabeca = Number((kgAnteriorPorCabeca * fator).toFixed(3))
  const deltaPorCabeca = Number((kgNovoPorCabeca - kgAnteriorPorCabeca).toFixed(3))
  
  const totalAnterior = Number((kgAnteriorPorCabeca * numAnimais).toFixed(2))
  const totalNovo = Number((kgNovoPorCabeca * numAnimais).toFixed(2))
  const totalDelta = Number((totalNovo - totalAnterior).toFixed(2))

  return {
    kg_novo_por_cabeca: kgNovoPorCabeca,
    delta_kg_por_cabeca: deltaPorCabeca,
    total_kg_anterior: totalAnterior,
    total_kg_novo: totalNovo,
    total_delta_kg: totalDelta
  }
}
