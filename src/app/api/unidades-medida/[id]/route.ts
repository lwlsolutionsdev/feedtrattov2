import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se está sendo usada em insumos
    const { count: insumosCount } = await supabase
      .from('insumos')
      .select('*', { count: 'exact', head: true })
      .eq('unidade_base_id', id)

    const { count: entradasCount } = await supabase
      .from('entradas_estoque')
      .select('*', { count: 'exact', head: true })
      .eq('unidade_entrada_id', id)

    if ((insumosCount || 0) > 0 || (entradasCount || 0) > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir unidade de medida em uso. Desative-a ao invés de excluir.' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('unidades_medida')
      .delete()
      .eq('id', id)
      .eq('cliente_id', user.id)

    if (error) throw error

    return NextResponse.json({
      message: 'Unidade de medida excluída com sucesso!',
    })
  } catch (error: any) {
    console.error('Erro ao excluir unidade de medida:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
