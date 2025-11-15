import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Buscar curral por ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('currais')
      .select('*')
      .eq('id', params.id)
      .eq('cliente_id', user.id)
      .single()

    if (error) throw error

    return NextResponse.json({ curral: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Atualizar curral
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { nome, linha, area_m2, capacidade_animais } = body

    const updateData: any = {}
    if (nome !== undefined) updateData.nome = nome
    if (linha !== undefined) updateData.linha = linha || null
    if (area_m2 !== undefined) updateData.area_m2 = parseFloat(area_m2)
    if (capacidade_animais !== undefined) {
      updateData.capacidade_animais = capacidade_animais ? parseInt(capacidade_animais) : null
    }

    const { data, error } = await supabase
      .from('currais')
      .update(updateData)
      .eq('id', params.id)
      .eq('cliente_id', user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ 
      message: 'Curral atualizado com sucesso!',
      curral: data 
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Excluir curral
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { error } = await supabase
      .from('currais')
      .delete()
      .eq('id', params.id)
      .eq('cliente_id', user.id)

    if (error) throw error

    return NextResponse.json({ message: 'Curral excluído com sucesso!' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
