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

    // Verificar se a saída está vinculada a uma batida
    const { data: saida } = await supabase
      .from('saidas_estoque')
      .select('batida_id')
      .eq('id', id)
      .eq('cliente_id', user.id)
      .single()

    if (saida?.batida_id) {
      return NextResponse.json(
        { error: 'Não é possível excluir saída vinculada a uma batida' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('saidas_estoque')
      .delete()
      .eq('id', id)
      .eq('cliente_id', user.id)

    if (error) throw error

    return NextResponse.json({
      message: 'Saída de estoque excluída com sucesso!',
    })
  } catch (error: any) {
    console.error('Erro ao excluir saída de estoque:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
