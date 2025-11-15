import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(
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

    const body = await request.json()
    const { nome, capacidade, ativo } = body

    const { data: vagao, error } = await supabase
      .from('vagoes')
      .update({ nome, capacidade: Number(capacidade), ativo })
      .eq('id', id)
      .eq('cliente_id', user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      message: 'Vagão atualizado com sucesso!',
      vagao,
    })
  } catch (error: any) {
    console.error('Erro ao atualizar vagão:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

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

    const { count } = await supabase
      .from('batidas')
      .select('*', { count: 'exact', head: true })
      .eq('vagao_id', id)

    if ((count || 0) > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir vagão usado em batidas. Desative-o ao invés de excluir.' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('vagoes')
      .delete()
      .eq('id', id)
      .eq('cliente_id', user.id)

    if (error) throw error

    return NextResponse.json({
      message: 'Vagão excluído com sucesso!',
    })
  } catch (error: any) {
    console.error('Erro ao excluir vagão:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
