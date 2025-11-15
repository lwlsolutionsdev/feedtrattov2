// Handlers para executar as ferramentas de Alimentação
import { SupabaseClient } from '@supabase/supabase-js'
import { formatBR, formatCurrency, formatQuantity } from './format-br'
import { 
  calcularNotaCocho, 
  validarLeitura, 
  calcularNovoConsumo,
  type DietPhase,
  type NightReading,
  type MorningBehavior,
  type MorningBunkStatus
} from './leitura-cocho-inteligente'

export async function executeAlimentacaoTool(
  name: string,
  args: any,
  supabase: SupabaseClient,
  userId: string
): Promise<any> {
  switch (name) {
    // ==================== UNIDADES DE MEDIDA ====================
    case "listar_unidades_medida": {
      const { ativas } = args
      let query = supabase
        .from('unidades_medida')
        .select('*')
        .eq('cliente_id', userId)
        .order('nome')

      if (ativas) {
        query = query.eq('ativo', true)
      }

      const { data, error } = await query
      if (error) throw error

      return { unidades: data, total: data.length }
    }

    case "criar_unidade_medida": {
      const { nome, sigla, fator_conversao, ativo = true } = args

      const { data: cliente } = await supabase
        .from('clientes')
        .select('empresa_id')
        .eq('id', userId)
        .single()

      const { data, error } = await supabase
        .from('unidades_medida')
        .insert({
          nome,
          sigla,
          fator_conversao,
          ativo,
          cliente_id: userId,
          empresa_id: cliente?.empresa_id || null,
        })
        .select()
        .single()

      if (error) throw error

      return { unidade: data, mensagem: `Unidade "${nome}" criada com sucesso!` }
    }

    // ==================== INSUMOS ====================
    case "listar_insumos": {
      const { search, ativas } = args
      let query = supabase
        .from('insumos')
        .select(`
          *,
          unidade_base:unidades_medida!insumos_unidade_base_id_fkey(nome, sigla)
        `)
        .eq('cliente_id', userId)
        .order('nome')

      if (search) {
        query = query.ilike('nome', `%${search}%`)
      }

      if (ativas) {
        query = query.eq('ativo', true)
      }

      const { data, error } = await query
      if (error) throw error

      // Calcular saldo atual para cada insumo e formatar
      const insumosFormatados = await Promise.all(data?.map(async (insumo) => {
        // Calcular saldo atual
        const { data: entradas } = await supabase
          .from('entradas_estoque')
          .select('quantidade_kg')
          .eq('insumo_id', insumo.id)

        const { data: saidas } = await supabase
          .from('saidas_estoque')
          .select('quantidade')
          .eq('insumo_id', insumo.id)

        const totalEntradas = entradas?.reduce((sum, e) => sum + Number(e.quantidade_kg), 0) || 0
        const totalSaidas = saidas?.reduce((sum, s) => sum + Number(s.quantidade), 0) || 0
        const saldoAtual = totalEntradas - totalSaidas

        return {
          ...insumo,
          saldo_atual: saldoAtual,
          saldo_atual_formatado: formatBR(saldoAtual, 2) + ' kg',
          estoque_minimo_formatado: insumo.estoque_minimo 
            ? formatBR(Number(insumo.estoque_minimo), 2) + ' kg'
            : 'Não definido'
        }
      }) || [])

      return { insumos: insumosFormatados, total: insumosFormatados.length }
    }

    case "criar_insumo": {
      const { nome, unidade_base_nome, estoque_minimo, ativo = true } = args

      // Validar parâmetros obrigatórios
      if (!nome || !unidade_base_nome || !estoque_minimo) {
        throw new Error('Dados incompletos! Preciso de: nome do insumo, unidade de medida e estoque mínimo.')
      }

      // Buscar unidade pelo nome (mesma lógica de entrada de estoque)
      const variacoesUnidades: Record<string, string[]> = {
        'kg': ['kg', 'kilo', 'quilograma', 'quilogramas', 'quilo'],
        'ton': ['ton', 'tonelada', 'toneladas', 't'],
        'sc': ['sc', 'saca', 'sacas', 'saco', 'sacos'],
        'lt': ['lt', 'litro', 'litros', 'l'],
      }

      const unidadeNormalizada = unidade_base_nome.toLowerCase().trim()
      let termoBusca = unidadeNormalizada

      for (const [chave, variacoes] of Object.entries(variacoesUnidades)) {
        if (variacoes.some(v => unidadeNormalizada.includes(v))) {
          termoBusca = chave
          break
        }
      }

      const { data: unidades, error: errorUnidade } = await supabase
        .from('unidades_medida')
        .select('id, nome, sigla')
        .eq('cliente_id', userId)
        .or(`nome.ilike.%${termoBusca}%,sigla.ilike.%${termoBusca}%`)

      if (errorUnidade || !unidades || unidades.length === 0) {
        throw new Error(`Unidade "${unidade_base_nome}" não encontrada. Cadastre a unidade primeiro.`)
      }

      const unidade = unidades[0]

      const { data: cliente } = await supabase
        .from('clientes')
        .select('empresa_id')
        .eq('id', userId)
        .single()

      const { data, error } = await supabase
        .from('insumos')
        .insert({
          nome,
          unidade_base_id: unidade.id,
          estoque_minimo,
          ativo,
          cliente_id: userId,
          empresa_id: cliente?.empresa_id || null,
        })
        .select()
        .single()

      if (error) throw error

      return { 
        insumo: data, 
        mensagem: `Insumo "${nome}" criado com sucesso! Unidade base: ${unidade.sigla}. Estoque mínimo: ${formatBR(estoque_minimo, 2)} kg` 
      }
    }

    case "editar_insumo": {
      const { nome_atual, nome_novo, unidade_base_nome, estoque_minimo, ativo } = args

      // Buscar insumo pelo nome atual
      const { data: insumos, error: errorBusca } = await supabase
        .from('insumos')
        .select('id, nome')
        .eq('cliente_id', userId)
        .ilike('nome', `%${nome_atual}%`)

      if (errorBusca || !insumos || insumos.length === 0) {
        throw new Error(`Insumo "${nome_atual}" não encontrado.`)
      }

      const insumo = insumos[0]
      const updates: any = {}

      // Atualizar nome se fornecido
      if (nome_novo) {
        updates.nome = nome_novo
      }

      // Atualizar unidade se fornecida
      if (unidade_base_nome) {
        const variacoesUnidades: Record<string, string[]> = {
          'kg': ['kg', 'kilo', 'quilograma', 'quilogramas', 'quilo'],
          'ton': ['ton', 'tonelada', 'toneladas', 't'],
          'sc': ['sc', 'saca', 'sacas', 'saco', 'sacos'],
          'lt': ['lt', 'litro', 'litros', 'l'],
        }

        const unidadeNormalizada = unidade_base_nome.toLowerCase().trim()
        let termoBusca = unidadeNormalizada

        for (const [chave, variacoes] of Object.entries(variacoesUnidades)) {
          if (variacoes.some(v => unidadeNormalizada.includes(v))) {
            termoBusca = chave
            break
          }
        }

        const { data: unidades } = await supabase
          .from('unidades_medida')
          .select('id, sigla')
          .eq('cliente_id', userId)
          .or(`nome.ilike.%${termoBusca}%,sigla.ilike.%${termoBusca}%`)

        if (unidades && unidades.length > 0) {
          updates.unidade_base_id = unidades[0].id
        }
      }

      // Atualizar estoque mínimo se fornecido
      if (estoque_minimo !== undefined) {
        updates.estoque_minimo = estoque_minimo
      }

      // Atualizar status ativo se fornecido
      if (ativo !== undefined) {
        updates.ativo = ativo
      }

      // Verificar se há algo para atualizar
      if (Object.keys(updates).length === 0) {
        throw new Error('Nenhuma alteração foi especificada.')
      }

      const { data, error } = await supabase
        .from('insumos')
        .update(updates)
        .eq('id', insumo.id)
        .select()
        .single()

      if (error) throw error

      return { 
        insumo: data, 
        mensagem: `Insumo "${insumo.nome}" atualizado com sucesso!` 
      }
    }

    // ==================== ENTRADAS DE ESTOQUE ====================
    case "listar_entradas_estoque": {
      const { search } = args
      let query = supabase
        .from('entradas_estoque')
        .select(`
          *,
          insumo:insumos(nome),
          unidade_entrada:unidades_medida(sigla)
        `)
        .eq('cliente_id', userId)
        .order('data_entrada', { ascending: false })

      if (search) {
        query = query.ilike('insumos.nome', `%${search}%`)
      }

      const { data, error } = await query
      if (error) throw error

      // Formatar valores no padrão brasileiro
      const entradasFormatadas = data?.map(entrada => ({
        ...entrada,
        quantidade_formatada: formatBR(Number(entrada.quantidade), 2),
        quantidade_kg_formatada: formatBR(Number(entrada.quantidade_kg), 2),
        valor_unitario_formatado: formatBR(Number(entrada.valor_unitario), 2),
        valor_total_formatado: formatBR(Number(entrada.valor_total), 2),
        data_entrada_formatada: new Date(entrada.data_entrada).toLocaleDateString('pt-BR')
      })) || []

      return { entradas: entradasFormatadas, total: entradasFormatadas.length }
    }

    case "registrar_entrada_estoque": {
      console.log('📥 REGISTRANDO ENTRADA:', args)
      let { insumo_nome, data_entrada, unidade_nome, quantidade, valor_unitario, observacoes } = args

      // Converter "hoje" para data atual (timezone local do Brasil)
      if (data_entrada.toLowerCase() === 'hoje') {
        const agora = new Date()
        // Ajustar para timezone do Brasil (UTC-3)
        const brasilOffset = -3 * 60 // -3 horas em minutos
        const localTime = new Date(agora.getTime() + (brasilOffset * 60 * 1000))
        data_entrada = localTime.toISOString().split('T')[0] // YYYY-MM-DD
      }

      console.log('📅 Data convertida:', data_entrada)
      console.log('🔍 Buscando insumo:', { 
        original: insumo_nome, 
        tipo: typeof insumo_nome,
        length: insumo_nome?.length 
      })

      // Buscar insumo pelo nome - BUSCA MUITO FLEXÍVEL
      // Remove acentos, espaços extras, e faz busca parcial
      const nomeLimpo = insumo_nome.toLowerCase().trim()
      console.log('🔍 Nome limpo:', nomeLimpo)
      
      // Primeiro tenta busca exata
      let { data: insumos } = await supabase
        .from('insumos')
        .select('id, nome')
        .eq('cliente_id', userId)
        .ilike('nome', nomeLimpo)
      
      console.log('🔍 Busca exata:', { encontrados: insumos?.length || 0, query: nomeLimpo })
      
      // Se não encontrou, tenta busca parcial
      if (!insumos || insumos.length === 0) {
        const resultado = await supabase
          .from('insumos')
          .select('id, nome')
          .eq('cliente_id', userId)
          .ilike('nome', `%${nomeLimpo}%`)
        insumos = resultado.data
        console.log('🔍 Busca parcial:', { encontrados: insumos?.length || 0, query: `%${nomeLimpo}%` })
      }
      
      // Se ainda não encontrou, tenta buscar cada palavra separadamente
      if (!insumos || insumos.length === 0) {
        const palavras = nomeLimpo.split(' ')
        console.log('🔍 Buscando por palavras:', palavras)
        for (const palavra of palavras) {
          if (palavra.length >= 3) { // Ignora palavras muito curtas
            const resultado = await supabase
              .from('insumos')
              .select('id, nome')
              .eq('cliente_id', userId)
              .ilike('nome', `%${palavra}%`)
            console.log(`🔍 Busca palavra "${palavra}":`, { encontrados: resultado.data?.length || 0 })
            if (resultado.data && resultado.data.length > 0) {
              insumos = resultado.data
              break
            }
          }
        }
      }

      if (!insumos || insumos.length === 0) {
        // Listar TODOS os insumos disponíveis para sugerir
        const { data: todosInsumos } = await supabase
          .from('insumos')
          .select('nome')
          .eq('cliente_id', userId)
          .order('nome')
        
        const sugestoes = todosInsumos?.map(i => i.nome).join(', ') || 'nenhum'
        throw new Error(`Insumo "${insumo_nome}" não encontrado. Insumos cadastrados: ${sugestoes}. Use um desses nomes EXATAMENTE como está escrito.`)
      }

      const insumo = insumos[0] // Pegar o primeiro encontrado
      console.log(`✅ Insumo encontrado: "${insumo.nome}" (buscou por: "${insumo_nome}")`)

      // Mapear variações comuns de unidades
      const variacoesUnidades: Record<string, string[]> = {
        'kg': ['kg', 'kilo', 'quilograma', 'quilogramas', 'quilo'],
        'ton': ['ton', 'tonelada', 'toneladas', 't'],
        'sc': ['sc', 'saca', 'sacas', 'saco', 'sacos'],
        'lt': ['lt', 'litro', 'litros', 'l'],
      }

      // Normalizar nome da unidade
      const unidadeNormalizada = unidade_nome.toLowerCase().trim()
      let termoBusca = unidadeNormalizada

      // Verificar se é uma variação conhecida
      for (const [chave, variacoes] of Object.entries(variacoesUnidades)) {
        if (variacoes.some(v => unidadeNormalizada.includes(v))) {
          termoBusca = chave
          break
        }
      }

      // Buscar unidade pelo nome ou sigla (com variações)
      const { data: unidades, error: errorUnidade } = await supabase
        .from('unidades_medida')
        .select('id, nome, sigla, fator_conversao')
        .eq('cliente_id', userId)
        .or(`nome.ilike.%${termoBusca}%,sigla.ilike.%${termoBusca}%`)

      if (errorUnidade || !unidades || unidades.length === 0) {
        throw new Error(`Unidade "${unidade_nome}" não encontrada. Cadastre a unidade primeiro. Variações aceitas: KG, Quilograma, Tonelada, Saca, Litro.`)
      }

      const unidade = unidades[0] // Pegar a primeira encontrada

      // Calcular quantidade em KG e valor total
      const quantidade_kg = Number(quantidade) * Number(unidade.fator_conversao)
      const valor_total = Number(quantidade) * Number(valor_unitario)

      // Buscar empresa_id da tabela clientes
      const { data: cliente } = await supabase
        .from('clientes')
        .select('empresa_id')
        .eq('id', userId)
        .single()

      console.log('👤 Cliente empresa_id:', cliente?.empresa_id)

      const { data, error } = await supabase
        .from('entradas_estoque')
        .insert({
          insumo_id: insumo.id,
          data_entrada,
          unidade_entrada_id: unidade.id,
          quantidade: Number(quantidade),
          quantidade_kg,
          valor_unitario: Number(valor_unitario),
          valor_total,
          observacoes: observacoes || null,
          cliente_id: userId,
          empresa_id: cliente?.empresa_id || null,
        })
        .select()
        .single()

      if (error) throw error

      // Formatar números no padrão brasileiro
      const quantidadeFormatada = formatBR(Number(quantidade), 0)
      const quantidadeKgFormatada = formatBR(quantidade_kg, 2)
      const valorTotalFormatado = formatBR(valor_total, 2)
      const valorUnitarioFormatado = formatBR(Number(valor_unitario), 2)

      return { 
        entrada: data, 
        mensagem: `Entrada registrada com sucesso! ${quantidadeFormatada} ${unidade.sigla} de ${insumo.nome} = ${quantidadeKgFormatada} kg adicionados ao estoque. Valor unitário: R$ ${valorUnitarioFormatado}. Valor total: R$ ${valorTotalFormatado}` 
      }
    }

    // ==================== SAÍDAS DE ESTOQUE ====================
    case "listar_saidas_estoque": {
      const { search } = args
      let query = supabase
        .from('saidas_estoque')
        .select(`
          *,
          insumo:insumos(nome),
          batida:batidas(codigo)
        `)
        .eq('cliente_id', userId)
        .order('data_hora', { ascending: false })

      if (search) {
        query = query.ilike('insumos.nome', `%${search}%`)
      }

      const { data, error } = await query
      if (error) throw error

      // Formatar valores no padrão brasileiro
      const saidasFormatadas = data?.map(saida => ({
        ...saida,
        quantidade_formatada: formatBR(Number(saida.quantidade), 2),
        valor_estimado_formatado: saida.valor_estimado 
          ? formatBR(Number(saida.valor_estimado), 2)
          : '0,00',
        saldo_apos_saida_formatado: formatBR(Number(saida.saldo_apos_saida), 2),
        data_hora_formatada: new Date(saida.data_hora).toLocaleString('pt-BR')
      })) || []

      return { saidas: saidasFormatadas, total: saidasFormatadas.length }
    }

    case "registrar_saida_estoque": {
      let { insumo_nome, data_hora, quantidade, observacoes } = args

      // Converter "agora" para data/hora atual (timezone local do Brasil)
      if (data_hora.toLowerCase() === 'agora') {
        const agora = new Date()
        // Ajustar para timezone do Brasil (UTC-3)
        const brasilOffset = -3 * 60 // -3 horas em minutos
        const localTime = new Date(agora.getTime() + (brasilOffset * 60 * 1000))
        data_hora = localTime.toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm
      }

      console.log('📅 Data/hora convertida:', data_hora)

      // Buscar insumo pelo nome
      const { data: insumo, error: errorInsumo } = await supabase
        .from('insumos')
        .select('id, nome')
        .eq('cliente_id', userId)
        .ilike('nome', `%${insumo_nome}%`)
        .single()

      if (errorInsumo || !insumo) {
        throw new Error(`Insumo "${insumo_nome}" não encontrado. Verifique o nome.`)
      }

      // Calcular saldo atual do insumo
      const { data: entradas } = await supabase
        .from('entradas_estoque')
        .select('quantidade_kg')
        .eq('insumo_id', insumo.id)

      const { data: saidas } = await supabase
        .from('saidas_estoque')
        .select('quantidade')
        .eq('insumo_id', insumo.id)

      const totalEntradas = entradas?.reduce((sum, e) => sum + Number(e.quantidade_kg), 0) || 0
      const totalSaidas = saidas?.reduce((sum, s) => sum + Number(s.quantidade), 0) || 0
      const saldoAtual = totalEntradas - totalSaidas

      // Verificar se há estoque suficiente
      if (saldoAtual < Number(quantidade)) {
        throw new Error(`Estoque insuficiente de ${insumo.nome}. Disponível: ${saldoAtual.toFixed(2)} kg`)
      }

      // Calcular preço médio para estimar valor
      const { data: entradasComValor } = await supabase
        .from('entradas_estoque')
        .select('quantidade_kg, valor_total')
        .eq('insumo_id', insumo.id)

      const somaValores = entradasComValor?.reduce((sum, e) => sum + Number(e.valor_total), 0) || 0
      const somaKg = entradasComValor?.reduce((sum, e) => sum + Number(e.quantidade_kg), 0) || 0
      const precoMedio = somaKg > 0 ? somaValores / somaKg : 0
      const valor_estimado = Number(quantidade) * precoMedio
      const saldo_apos_saida = saldoAtual - Number(quantidade)

      // Buscar empresa_id
      const { data: cliente } = await supabase
        .from('clientes')
        .select('empresa_id')
        .eq('id', userId)
        .single()

      const { data, error } = await supabase
        .from('saidas_estoque')
        .insert({
          insumo_id: insumo.id,
          data_hora,
          quantidade: Number(quantidade),
          valor_estimado,
          saldo_apos_saida,
          observacoes: observacoes || null,
          cliente_id: userId,
          empresa_id: cliente?.empresa_id || null,
        })
        .select()
        .single()

      if (error) throw error

      // Formatar números no padrão brasileiro
      const quantidadeFormatada = formatBR(Number(quantidade), 2)
      const saldoFormatado = formatBR(saldo_apos_saida, 2)
      const valorEstimadoFormatado = formatBR(valor_estimado, 2)

      return { 
        saida: data, 
        mensagem: `Saída registrada com sucesso! ${quantidadeFormatada} kg de ${insumo.nome} retirados. Valor estimado: R$ ${valorEstimadoFormatado}. Saldo restante: ${saldoFormatado} kg` 
      }
    }

    // ==================== PRÉ-MISTURAS ====================
    case "listar_pre_misturas": {
      const { search, ativas } = args
      let query = supabase
        .from('pre_misturas')
        .select(`
          *,
          ingredientes:ingredientes_pre_mistura(
            *,
            insumo:insumos(nome)
          )
        `)
        .eq('cliente_id', userId)
        .order('nome')

      if (search) {
        query = query.ilike('nome', `%${search}%`)
      }

      if (ativas) {
        query = query.eq('ativo', true)
      }

      const { data, error } = await query
      if (error) throw error

      return { pre_misturas: data, total: data.length }
    }

    case "criar_pre_mistura": {
      const { nome, descricao, ativo = true, ingredientes } = args

      const { data: cliente } = await supabase
        .from('clientes')
        .select('empresa_id')
        .eq('id', userId)
        .single()

      const { data: preMistura, error: errorPM } = await supabase
        .from('pre_misturas')
        .insert({
          nome,
          descricao,
          ativo,
          cliente_id: userId,
          empresa_id: cliente?.empresa_id || null,
        })
        .select()
        .single()

      if (errorPM) throw errorPM

      const ingredientesData = ingredientes.map((ing: any, index: number) => ({
        pre_mistura_id: preMistura.id,
        insumo_id: ing.insumo_id,
        percentual_mistura: ing.percentual_mistura,
        percentual_ms: ing.percentual_ms,
        valor_unitario_kg: ing.valor_unitario_kg,
        ordem: index,
      }))

      const { error: errorIng } = await supabase
        .from('ingredientes_pre_mistura')
        .insert(ingredientesData)

      if (errorIng) throw errorIng

      return { pre_mistura: preMistura, mensagem: `Pré-mistura "${nome}" criada com sucesso!` }
    }

    // ==================== DIETAS ====================
    case "listar_dietas": {
      const { search, ativas } = args
      let query = supabase
        .from('dietas')
        .select(`
          *,
          ingredientes:ingredientes_dieta(
            *,
            insumo:insumos(nome),
            pre_mistura:pre_misturas(nome)
          )
        `)
        .eq('cliente_id', userId)
        .order('nome')

      if (search) {
        query = query.ilike('nome', `%${search}%`)
      }

      if (ativas) {
        query = query.eq('ativo', true)
      }

      const { data, error } = await query
      if (error) throw error

      return { dietas: data, total: data.length }
    }

    case "criar_dieta": {
      const { nome, descricao, ativo = true, ingredientes } = args

      const { data: cliente } = await supabase
        .from('clientes')
        .select('empresa_id')
        .eq('id', userId)
        .single()

      const { data: dieta, error: errorDieta } = await supabase
        .from('dietas')
        .insert({
          nome,
          descricao,
          ativo,
          cliente_id: userId,
          empresa_id: cliente?.empresa_id || null,
        })
        .select()
        .single()

      if (errorDieta) throw errorDieta

      const ingredientesData = ingredientes.map((ing: any, index: number) => ({
        dieta_id: dieta.id,
        tipo: ing.tipo,
        insumo_id: ing.insumo_id || null,
        pre_mistura_id: ing.pre_mistura_id || null,
        percentual_mistura: ing.percentual_mistura,
        percentual_ms: ing.percentual_ms,
        valor_unitario_kg: ing.valor_unitario_kg,
        ordem: index,
      }))

      const { error: errorIng } = await supabase
        .from('ingredientes_dieta')
        .insert(ingredientesData)

      if (errorIng) throw errorIng

      return { dieta, mensagem: `Dieta "${nome}" criada com sucesso!` }
    }

    // ==================== BATIDAS ====================
    case "listar_batidas": {
      const { search, status } = args
      let query = supabase
        .from('batidas')
        .select(`
          *,
          dieta:dietas(nome),
          vagao:vagoes(nome)
        `)
        .eq('cliente_id', userId)
        .order('data_hora', { ascending: false })

      if (search) {
        query = query.or(`codigo.ilike.%${search}%,dietas.nome.ilike.%${search}%`)
      }

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query
      if (error) throw error

      return { batidas: data, total: data.length }
    }

    case "criar_batida": {
      let { vagao_id, dieta_id, quantidade, data_hora, observacoes } = args

      // Converter "agora" para data/hora atual (timezone local do Brasil)
      if (data_hora.toLowerCase() === 'agora') {
        const agora = new Date()
        // Ajustar para timezone do Brasil (UTC-3)
        const brasilOffset = -3 * 60 // -3 horas em minutos
        const localTime = new Date(agora.getTime() + (brasilOffset * 60 * 1000))
        data_hora = localTime.toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm
      }

      const { data: cliente } = await supabase
        .from('clientes')
        .select('empresa_id')
        .eq('id', userId)
        .single()

      const { data, error } = await supabase
        .from('batidas')
        .insert({
          vagao_id: vagao_id || null,
          dieta_id,
          quantidade_kg: quantidade,
          data_hora,
          observacoes,
          status: 'PREPARANDO',
          cliente_id: userId,
          empresa_id: cliente?.empresa_id || null,
        })
        .select()
        .single()

      if (error) throw error

      return { batida: data, mensagem: `Batida ${data.codigo} criada com sucesso! Status: PREPARANDO` }
    }

    case "aprovar_batida": {
      const { id } = args

      const { data, error } = await supabase
        .from('batidas')
        .update({ status: 'CONCLUIDA' })
        .eq('id', id)
        .eq('cliente_id', userId)
        .select()
        .single()

      if (error) throw error

      return { batida: data, mensagem: `Batida ${data.codigo} aprovada! Saídas de estoque geradas automaticamente.` }
    }

    case "cancelar_batida": {
      const { id } = args

      const { data, error } = await supabase
        .from('batidas')
        .update({ status: 'CANCELADA' })
        .eq('id', id)
        .eq('cliente_id', userId)
        .select()
        .single()

      if (error) throw error

      return { batida: data, mensagem: `Batida ${data.codigo} cancelada.` }
    }

    // ==================== LEITURA INTELIGENTE DE COCHO ====================
    case "registrar_leitura_inteligente_noturna": {
      let { lote_nome, data, leitura, observacoes } = args

      // Converter "hoje" para data atual
      if (data.toLowerCase() === 'hoje') {
        const agora = new Date()
        const brasilOffset = -3 * 60
        const localTime = new Date(agora.getTime() + (brasilOffset * 60 * 1000))
        data = localTime.toISOString().slice(0, 10)
      }

      console.log('🌙 REGISTRANDO LEITURA NOTURNA:', { lote_nome, data, leitura })

      // Buscar lote pelo nome
      const { data: lotes } = await supabase
        .from('lotes')
        .select('id, nome, quantidade_animais, status')
        .eq('cliente_id', userId)
        .ilike('nome', `%${lote_nome}%`)
        .eq('status', 'ATIVO')

      if (!lotes || lotes.length === 0) {
        throw new Error(`Lote "${lote_nome}" não encontrado ou não está ativo.`)
      }

      const lote = lotes[0]

      const { data: cliente } = await supabase
        .from('clientes')
        .select('empresa_id')
        .eq('id', userId)
        .single()

      // Verificar se já existe leitura para este lote nesta data
      const { data: leituraExistente } = await supabase
        .from('leituras_cocho_inteligente')
        .select('id, leitura_noturna, observacoes')
        .eq('lote_id', lote.id)
        .eq('data_referencia', data)
        .single()

      if (leituraExistente) {
        // Atualizar leitura noturna existente
        const { error } = await supabase
          .from('leituras_cocho_inteligente')
          .update({
            leitura_noturna: leitura,
            leitura_noturna_em: new Date().toISOString(),
            observacoes: observacoes || (leituraExistente as any).observacoes
          })
          .eq('id', leituraExistente.id)

        if (error) throw error

        return {
          mensagem: `Leitura noturna do lote "${lote.nome}" atualizada! Cocho: ${leitura}. Aguardando leitura da manhã para calcular ajuste.`
        }
      } else {
        // Criar nova leitura (apenas com dados noturnos)
        const { error } = await supabase
          .from('leituras_cocho_inteligente')
          .insert({
            lote_id: lote.id,
            data_referencia: data,
            leitura_noturna: leitura,
            leitura_noturna_em: new Date().toISOString(),
            observacoes: observacoes || null,
            cliente_id: userId,
            empresa_id: cliente?.empresa_id || null,
            // Campos obrigatórios serão preenchidos na leitura da manhã
            fase_dieta: 'adaptacao_crescimento', // temporário
            dias_de_cocho: 0, // temporário
            num_animais: lote.quantidade_animais
          })

        if (error) throw error

        return {
          mensagem: `Leitura noturna do lote "${lote.nome}" registrada! Cocho: ${leitura}. Aguardando leitura da manhã para calcular ajuste.`
        }
      }
    }

    case "registrar_leitura_inteligente_diurna": {
      let { lote_nome, data, fase_dieta, dias_de_cocho, comportamento, situacao_cocho, kg_anterior_por_cabeca, observacoes } = args

      // Converter "hoje" para data atual
      if (data.toLowerCase() === 'hoje') {
        const agora = new Date()
        const brasilOffset = -3 * 60
        const localTime = new Date(agora.getTime() + (brasilOffset * 60 * 1000))
        data = localTime.toISOString().slice(0, 10)
      }

      console.log('☀️ REGISTRANDO LEITURA DIURNA:', { lote_nome, data, fase_dieta, comportamento, situacao_cocho })

      // Buscar lote
      const { data: lotes } = await supabase
        .from('lotes')
        .select('id, nome, quantidade_animais, dieta_id, kg_por_cabeca_atual, status')
        .eq('cliente_id', userId)
        .ilike('nome', `%${lote_nome}%`)
        .eq('status', 'ATIVO')

      if (!lotes || lotes.length === 0) {
        throw new Error(`Lote "${lote_nome}" não encontrado ou não está ativo.`)
      }

      const lote = lotes[0]
      const numAnimais = lote.quantidade_animais

      // Buscar leitura noturna do dia anterior
      const dataAnterior = new Date(data)
      dataAnterior.setDate(dataAnterior.getDate() - 1)
      const dataAnteriorStr = dataAnterior.toISOString().slice(0, 10)

      const { data: leituraNoturna } = await supabase
        .from('leituras_cocho_inteligente')
        .select('leitura_noturna')
        .eq('lote_id', lote.id)
        .eq('data_referencia', dataAnteriorStr)
        .single()

      const leituraNoite = leituraNoturna?.leitura_noturna as NightReading || null

      // CALCULAR NOTA E AJUSTE
      const { nota, percentual, alertas } = calcularNotaCocho(
        fase_dieta as DietPhase,
        leituraNoite,
        comportamento as MorningBehavior,
        situacao_cocho as MorningBunkStatus,
        dias_de_cocho
      )

      console.log('📊 NOTA CALCULADA:', { nota, percentual, alertas })

      // Buscar leitura anterior para validação
      const { data: leituraAnteriorData } = await supabase
        .from('leituras_cocho_inteligente')
        .select('nota_cocho, data_referencia')
        .eq('lote_id', lote.id)
        .lt('data_referencia', data)
        .order('data_referencia', { ascending: false })
        .limit(1)
        .single()

      const leituraAnterior = leituraAnteriorData 
        ? { nota: leituraAnteriorData.nota_cocho, data: leituraAnteriorData.data_referencia }
        : null

      // Validar leitura
      const alertasValidacao = validarLeitura(fase_dieta as DietPhase, nota, leituraAnterior)
      alertas.push(...alertasValidacao)

      // CALCULAR NOVO CONSUMO
      const consumo = calcularNovoConsumo(kg_anterior_por_cabeca, percentual, numAnimais)

      const { data: cliente } = await supabase
        .from('clientes')
        .select('empresa_id')
        .eq('id', userId)
        .single()

      // Verificar se já existe leitura para esta data
      const { data: leituraExistente } = await supabase
        .from('leituras_cocho_inteligente')
        .select('id')
        .eq('lote_id', lote.id)
        .eq('data_referencia', data)
        .single()

      let leituraId: string

      if (leituraExistente) {
        // Atualizar leitura existente
        const { data: updated, error } = await supabase
          .from('leituras_cocho_inteligente')
          .update({
            fase_dieta,
            dias_de_cocho,
            comportamento_manha: comportamento,
            situacao_cocho_manha: situacao_cocho,
            leitura_manha_em: new Date().toISOString(),
            nota_cocho: nota,
            percentual_ajuste: percentual,
            kg_anterior_por_cabeca,
            kg_novo_por_cabeca: consumo.kg_novo_por_cabeca,
            delta_kg_por_cabeca: consumo.delta_kg_por_cabeca,
            num_animais: numAnimais,
            total_kg_anterior: consumo.total_kg_anterior,
            total_kg_novo: consumo.total_kg_novo,
            total_delta_kg: consumo.total_delta_kg,
            alertas: alertas,
            observacoes: observacoes || null
          })
          .eq('id', leituraExistente.id)
          .select()
          .single()

        if (error) throw error
        leituraId = updated.id
      } else {
        // Criar nova leitura
        const { data: inserted, error } = await supabase
          .from('leituras_cocho_inteligente')
          .insert({
            lote_id: lote.id,
            data_referencia: data,
            fase_dieta,
            dias_de_cocho,
            leitura_noturna: leituraNoite,
            comportamento_manha: comportamento,
            situacao_cocho_manha: situacao_cocho,
            leitura_manha_em: new Date().toISOString(),
            nota_cocho: nota,
            percentual_ajuste: percentual,
            kg_anterior_por_cabeca,
            kg_novo_por_cabeca: consumo.kg_novo_por_cabeca,
            delta_kg_por_cabeca: consumo.delta_kg_por_cabeca,
            num_animais: numAnimais,
            total_kg_anterior: consumo.total_kg_anterior,
            total_kg_novo: consumo.total_kg_novo,
            total_delta_kg: consumo.total_delta_kg,
            alertas: alertas,
            observacoes: observacoes || null,
            cliente_id: userId,
            empresa_id: cliente?.empresa_id || null
          })
          .select()
          .single()

        if (error) throw error
        leituraId = inserted.id
      }

      // Atualizar consumo atual do lote
      await supabase
        .from('lotes')
        .update({ kg_por_cabeca_atual: consumo.kg_novo_por_cabeca })
        .eq('id', lote.id)

      // TODO: CRIAR PLANEJAMENTO DE TRATO AUTOMÁTICO
      // Isso será implementado na próxima etapa

      // Formatar resposta
      const sinal = percentual > 0 ? '+' : ''
      const tipoAjuste = percentual > 0 ? '⬆️ AUMENTAR' : percentual < 0 ? '⬇️ REDUZIR' : '➡️ MANTER'

      return {
        leitura_id: leituraId,
        mensagem: `Leitura diurna do lote "${lote.nome}" registrada!\n\n` +
          `📊 RESULTADO:\n` +
          `• Nota de cocho: ${nota}\n` +
          `• Ajuste: ${sinal}${formatBR(percentual, 1)}% (${tipoAjuste})\n` +
          `• Consumo anterior: ${formatBR(kg_anterior_por_cabeca, 2)} kg/cabeça\n` +
          `• Novo consumo: ${formatBR(consumo.kg_novo_por_cabeca, 2)} kg/cabeça\n` +
          `• Variação: ${sinal}${formatBR(consumo.delta_kg_por_cabeca, 2)} kg/cabeça\n\n` +
          `📦 TOTAL DO LOTE (${numAnimais} animais):\n` +
          `• Total anterior: ${formatBR(consumo.total_kg_anterior, 2)} kg\n` +
          `• Total novo: ${formatBR(consumo.total_kg_novo, 2)} kg\n` +
          `• Variação total: ${sinal}${formatBR(consumo.total_delta_kg, 2)} kg\n\n` +
          (alertas.length > 0 ? `⚠️ ALERTAS:\n${alertas.join('\n')}` : '')
      }
    }

    case "listar_leituras_inteligentes": {
      const { lote_nome, data_inicio, data_fim } = args

      let query = supabase
        .from('leituras_cocho_inteligente')
        .select(`
          *,
          lote:lotes(nome, quantidade_animais)
        `)
        .eq('cliente_id', userId)
        .order('data_referencia', { ascending: false })

      if (lote_nome) {
        const { data: lotes } = await supabase
          .from('lotes')
          .select('id')
          .eq('cliente_id', userId)
          .ilike('nome', `%${lote_nome}%`)

        if (lotes && lotes.length > 0) {
          query = query.in('lote_id', lotes.map(l => l.id))
        }
      }

      if (data_inicio) {
        query = query.gte('data_referencia', data_inicio)
      }

      if (data_fim) {
        query = query.lte('data_referencia', data_fim)
      }

      const { data, error } = await query

      if (error) throw error

      // Formatar leituras
      const leiturasFormatadas = data?.map(leitura => ({
        ...leitura,
        data_referencia_formatada: new Date(leitura.data_referencia).toLocaleDateString('pt-BR'),
        nota_cocho_formatada: formatBR(leitura.nota_cocho, 1),
        percentual_ajuste_formatado: (leitura.percentual_ajuste > 0 ? '+' : '') + formatBR(leitura.percentual_ajuste, 1) + '%',
        kg_anterior_formatado: formatBR(leitura.kg_anterior_por_cabeca, 2) + ' kg/cab',
        kg_novo_formatado: formatBR(leitura.kg_novo_por_cabeca, 2) + ' kg/cab',
        total_novo_formatado: formatBR(leitura.total_kg_novo, 2) + ' kg'
      })) || []

      return { leituras: leiturasFormatadas, total: leiturasFormatadas.length }
    }

    default:
      throw new Error(`Ferramenta de alimentação desconhecida: ${name}`)
  }
}
