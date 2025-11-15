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

    let query = supabase
      .from('saidas_estoque')
      .select(`
        *,
        insumo:insumos!saidas_estoque_insumo_id_fkey(id, nome),
        batida:batidas!saidas_estoque_batida_id_fkey(id, codigo)
      `)
      .eq('cliente_id', user.id)
      .order('data_hora', { ascending: false })

    if (search) {
      query = query.or(`insumo.nome.ilike.%${search}%`)
    }

    const { data: saidas, error } = await query

    if (error) throw error

    const saidasFormatadas = (saidas || []).map(saida => ({
      ...saida,
      insumo_nome: saida.insumo?.nome,
      batida_codigo: saida.batida?.codigo,
    }))

    return NextResponse.json({ saidas: saidasFormatadas })
  } catch (error: any) {
    console.error('Erro ao buscar saídas de estoque:', error)
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
    const { insumo_id, batida_id, data_hora, quantidade, observacoes } = body

    if (!insumo_id || !data_hora || !quantidade) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: insumo, data/hora e quantidade' },
        { status: 400 }
      )
    }

    // Calcular saldo atual do insumo
    const { data: entradas } = await supabase
      .from('entradas_estoque')
      .select('quantidade_kg')
      .eq('insumo_id', insumo_id)

    const { data: saidas } = await supabase
      .from('saidas_estoque')
      .select('quantidade')
      .eq('insumo_id', insumo_id)

    const totalEntradas = entradas?.reduce((sum, e) => sum + Number(e.quantidade_kg), 0) || 0
    const totalSaidas = saidas?.reduce((sum, s) => sum + Number(s.quantidade), 0) || 0
    const saldoAtual = totalEntradas - totalSaidas

    // Verificar se há estoque suficiente
    if (saldoAtual < Number(quantidade)) {
      return NextResponse.json(
        { error: `Estoque insuficiente. Disponível: ${saldoAtual.toFixed(2)} kg` },
        { status: 400 }
      )
    }

    // Calcular preço médio para estimar valor
    const { data: entradasComValor } = await supabase
      .from('entradas_estoque')
      .select('quantidade_kg, valor_total')
      .eq('insumo_id', insumo_id)

    const somaValores = entradasComValor?.reduce((sum, e) => sum + Number(e.valor_total), 0) || 0
    const somaKg = entradasComValor?.reduce((sum, e) => sum + Number(e.quantidade_kg), 0) || 0
    const precoMedio = somaKg > 0 ? somaValores / somaKg : 0
    const valor_estimado = Number(quantidade) * precoMedio
    const saldo_apos_saida = saldoAtual - Number(quantidade)

    const { data: profile } = await supabase
      .from('profiles')
      .select('empresa_id')
      .eq('id', user.id)
      .single()

    const { data: saida, error } = await supabase
      .from('saidas_estoque')
      .insert({
        insumo_id,
        batida_id: batida_id || null,
        data_hora,
        quantidade: Number(quantidade),
        valor_estimado,
        saldo_apos_saida,
        observacoes: observacoes || null,
        cliente_id: user.id,
        empresa_id: profile?.empresa_id || null,
      })
      .select(`
        *,
        insumo:insumos!saidas_estoque_insumo_id_fkey(id, nome),
        batida:batidas!saidas_estoque_batida_id_fkey(id, codigo)
      `)
      .single()

    if (error) throw error

    return NextResponse.json({
      message: 'Saída de estoque registrada com sucesso!',
      saida: {
        ...saida,
        insumo_nome: saida.insumo?.nome,
        batida_codigo: saida.batida?.codigo,
      },
    })
  } catch (error: any) {
    console.error('Erro ao criar saída de estoque:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
