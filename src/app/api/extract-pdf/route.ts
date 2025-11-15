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
    const pdfFile = formData.get('pdf') as File
    
    if (!pdfFile) {
      return NextResponse.json({ error: 'Nenhum arquivo PDF enviado' }, { status: 400 })
    }

    // PASSO 1: Fazer upload do PDF para a OpenAI
    const uploaded = await openai.files.create({
      file: pdfFile,
      purpose: "assistants", // ou "user_data"
    })

    // PASSO 2: Usar o file_id na mensagem
    const result = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Extraia TODO o texto deste documento PDF. Retorne apenas o texto extraído, preservando a estrutura, formatação e tabelas. Não adicione comentários ou explicações, apenas o conteúdo do documento." 
            },
            {
              type: "file",
              file: {
                file_id: uploaded.id, // 👈 Usar file_id do arquivo enviado
              }
            } as any,
          ],
        },
      ],
      max_tokens: 4096,
    })

    const extractedText = result.choices[0]?.message?.content?.trim() || ''
    
    if (!extractedText) {
      return NextResponse.json({ 
        error: 'Não foi possível extrair texto do PDF.' 
      }, { status: 400 })
    }

    // Opcional: Deletar o arquivo da OpenAI após uso para economizar storage
    try {
      await openai.files.delete(uploaded.id)
    } catch (e) {
      console.error('Erro ao deletar arquivo:', e)
    }

    return NextResponse.json({ 
      text: extractedText,
      success: true 
    })

  } catch (error: any) {
    console.error('Erro ao processar PDF:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao processar PDF' },
      { status: 500 }
    )
  }
}
