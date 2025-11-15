import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    
    if (!audioFile) {
      return NextResponse.json({ error: 'Nenhum arquivo de áudio enviado' }, { status: 400 })
    }

    // Transcrever áudio usando Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'pt', // Português
      response_format: 'text',
    })

    return NextResponse.json({ 
      transcription: transcription,
      success: true 
    })

  } catch (error: any) {
    console.error('Erro ao transcrever áudio:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao transcrever áudio' },
      { status: 500 }
    )
  }
}
