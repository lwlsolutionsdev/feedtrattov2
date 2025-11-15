import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    // Buscar insumos com dados da unidade base
    let query = supabase
      .from('insumos')
      .select(`
        *,
        unidade_base:unidades_medida!insumos_unidade_base_id_fkey(
          id,
          nome,
          sigla
        )
      `)
      .eq('cliente_id', user.id)
      .order('nome')

    if (search) {
      query = query.ilike('nome', `%${search}%`)
    }

    const { data: insumos, error } = await query

    if (error) throw error

    // Calcular campos derivados para cada insumo
    const insumosComCalculos = await Promise.all(
      (insumos || []).map(async (insumo) => {
        // Calcular saldo atual (entradas - saídas)
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

        // Calcular preço médio
        const { data: entradasComValor } = await supabase
          .from('entradas_estoque')
          .select('quantidade_kg, valor_total')
          .eq('insumo_id', insumo.id)

        const somaValores = entradasComValor?.reduce((sum, e) => sum + Number(e.valor_total), 0) || 0
        const somaKg = entradasComValor?.reduce((sum, e) => sum + Number(e.quantidade_kg), 0) || 0
        const precoMedio = somaKg > 0 ? somaValores / somaKg : 0

        // Calcular valor imobilizado
        const valorImobilizado = saldoAtual * precoMedio

        // Calcular dias para acabar (últimos 30 dias)
        const dataInicio = new Date()
        dataInicio.setDate(dataInicio.getDate() - 30)

        const { data: saidasRecentes } = await supabase
          .from('saidas_estoque')
          .select('quantidade')
          .eq('insumo_id', insumo.id)
          .gte('data_hora', dataInicio.toISOString())

        const totalConsumido = saidasRecentes?.reduce((sum, s) => sum + Number(s.quantidade), 0) || 0
        const consumoMedioDiario = totalConsumido / 30
        const diasParaAcabar = consumoMedioDiario > 0 ? saldoAtual / consumoMedioDiario : null

        // Determinar status do estoque
        let statusEstoque: 'OK' | 'BAIXO' | 'ZERADO' = 'OK'
        if (saldoAtual <= 0) {
          statusEstoque = 'ZERADO'
        } else if (saldoAtual <= Number(insumo.estoque_minimo)) {
          statusEstoque = 'BAIXO'
        }

        return {
          ...insumo,
          unidade_base_nome: insumo.unidade_base?.nome,
          unidade_base_sigla: insumo.unidade_base?.sigla,
          saldo_atual: saldoAtual,
          preco_medio: precoMedio,
          valor_imobilizado: valorImobilizado,
          dias_para_acabar: diasParaAcabar,
          status_estoque: statusEstoque,
        }
      })
    )

    return NextResponse.json({ insumos: insumosComCalculos })
  } catch (error: any) {
    console.error('Erro ao buscar insumos:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { nome, unidade_base_id, estoque_minimo, ativo } = body

    // Validações
    if (!nome || !unidade_base_id) {
      return NextResponse.json(
        { error: 'Nome e unidade base são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar empresa_id do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('empresa_id')
      .eq('id', user.id)
      .single()

    const { data: insumo, error } = await supabase
      .from('insumos')
      .insert({
        nome,
        unidade_base_id,
        estoque_minimo: estoque_minimo || 0,
        ativo: ativo !== undefined ? ativo : true,
        cliente_id: user.id,
        empresa_id: profile?.empresa_id || null,
      })
      .select(`
        *,
        unidade_base:unidades_medida!insumos_unidade_base_id_fkey(
          id,
          nome,
          sigla
        )
      `)
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe um insumo com este nome' },
          { status: 400 }
        )
      }
      throw error
    }

    return NextResponse.json({
      message: 'Insumo criado com sucesso!',
      insumo: {
        ...insumo,
        unidade_base_nome: insumo.unidade_base?.nome,
        unidade_base_sigla: insumo.unidade_base?.sigla,
        saldo_atual: 0,
        preco_medio: 0,
        valor_imobilizado: 0,
        dias_para_acabar: null,
        status_estoque: 'ZERADO' as const,
      },
    })
  } catch (error: any) {
    console.error('Erro ao criar insumo:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
