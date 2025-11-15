import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { alimentacaoTools } from './tools-alimentacao'
import { executeAlimentacaoTool } from './handlers-alimentacao'

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

    const body = await request.json()
    const { message, history = [] } = body as {
      message: string
      history?: OpenAI.Chat.ChatCompletionMessageParam[]
    }

    // Data atual para o assistente
    const hoje = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const agora = new Date().toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm

    // Mensagens para o modelo
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content:
          "Você é o FeedTratto IA, assistente especializado em gestão de confinamento de gado. " +
          "Você gerencia CURRAIS e ALIMENTAÇÃO (insumos, estoque, dietas, batidas). " +
          "\n\n⚠️ REGRA CRÍTICA: Você DEVE SEMPRE usar as funções disponíveis para TODAS as operações. " +
          "NUNCA responda ao usuário ANTES de executar a função. " +
          "NUNCA diga 'Vou fazer', 'Vou registrar', 'Agora vou' - apenas EXECUTE a função diretamente. " +
          "NUNCA invente dados ou confirme ações sem usar as ferramentas. " +
          "Se o usuário pedir para listar, criar, registrar ou modificar algo, você DEVE chamar a função apropriada IMEDIATAMENTE. " +
          "\n\n🚫 NUNCA INVENTE DADOS: " +
          "Se faltar informação obrigatória (unidade, quantidade, valor, etc), você DEVE perguntar ao usuário. " +
          "NUNCA assuma valores padrão. NUNCA crie registros com dados inventados. " +
          "Se a função retornar erro de 'Dados incompletos', PERGUNTE as informações faltantes ao usuário. " +
          "\n\n🔍 REGRA DE BUSCA OBRIGATÓRIA: " +
          "Quando o usuário pedir para registrar entrada/saída de estoque: " +
          "1. EXECUTE registrar_entrada_estoque() ou registrar_saida_estoque() IMEDIATAMENTE " +
          "2. A função VAI buscar o insumo automaticamente (busca flexível) " +
          "3. Se não encontrar, a função VAI listar todos os insumos disponíveis " +
          "4. NUNCA diga que o insumo não existe SEM executar a função primeiro " +
          "5. SEMPRE confie no retorno da função " +
          `\n\nDATA/HORA ATUAL: Hoje é ${hoje}. Agora são ${agora}. Use essas datas quando o usuário disser "hoje" ou "agora". ` +
          "\n\nCURRAIS: Calcule densidade (m²/cabeça). Ideal: 8-12 m²/cab. Mínima: 6 m²/cab. Máxima: 15 m²/cab. " +
          "\n\nALIMENTAÇÃO: Gerencie insumos, entradas/saídas de estoque, pré-misturas, dietas e batidas. " +
          "Ao criar pré-misturas e dietas, valide que a soma dos percentuais seja 100%. " +
          "Ao aprovar batidas, informe que saídas de estoque serão geradas automaticamente. " +
          "\n\n📋 FORMATO DE RESPOSTA OBRIGATÓRIO: " +
          "Após executar qualquer operação, SEMPRE apresente um resumo formatado com: " +
          "✅ Confirmação da ação realizada " +
          "📊 Dados principais (quantidade, valores, datas) " +
          "💡 Informações relevantes (saldo atual, alertas, próximos passos) " +
          "Use emojis e formatação clara para facilitar a leitura. " +
          "\n\n💰 FORMATO DE NÚMEROS (PADRÃO BRASIL): " +
          "SEMPRE use formatação brasileira para números: " +
          "- Valores monetários: R$ 1.234,56 (ponto para milhar, vírgula para decimal) " +
          "- Quantidades: 25.000 kg (ponto para milhar) " +
          "- Percentuais: 15,5% (vírgula para decimal) " +
          "NUNCA use formato americano (1,234.56). SEMPRE use formato brasileiro. " +
          "\n\n⚠️ REGRA OBRIGATÓRIA DE FORMATAÇÃO: " +
          "Ao listar dados (entradas, saídas, insumos), você DEVE usar APENAS os campos *_formatado ou *_formatada: " +
          "- Use quantidade_formatada (NÃO quantidade) " +
          "- Use valor_total_formatado (NÃO valor_total) " +
          "- Use valor_unitario_formatado (NÃO valor_unitario) " +
          "- Use data_entrada_formatada (NÃO data_entrada) " +
          "- Use saldo_atual_formatado (NÃO saldo_atual) " +
          "- Use estoque_minimo_formatado (NÃO estoque_minimo) " +
          "NUNCA mostre os campos originais sem formatação. SEMPRE use os campos formatados.",
      },
      ...history,
      { role: "user", content: message },
    ]

    // Primeira chamada: modelo decide se usa tools
    const firstResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0, // Mais determinístico
      tool_choice: message.toLowerCase().includes('registr') || 
                   message.toLowerCase().includes('criar') ||
                   message.toLowerCase().includes('cadastr') ||
                   message.toLowerCase().includes('adicionar') ||
                   message.toLowerCase().includes('inserir') ||
                   message.toLowerCase().includes('novo') ||
                   message.toLowerCase().includes('nova') ||
                   message.toLowerCase().includes('aprovar') ||
                   message.toLowerCase().includes('cancelar') ||
                   message.toLowerCase().includes('editar') ||
                   message.toLowerCase().includes('atualizar') ||
                   message.toLowerCase().includes('modificar') ||
                   message.toLowerCase().includes('deletar') ||
                   message.toLowerCase().includes('remover') ||
                   message.toLowerCase().includes('excluir') ? "required" : "auto",
      tools: [
        {
          type: "function",
          function: {
            name: "listar_currais",
            description: "Lista todos os currais do usuário. Pode filtrar por nome ou linha.",
            parameters: {
              type: "object",
              properties: {
                search: {
                  type: "string",
                  description: "Termo de busca para filtrar por nome ou linha (opcional)",
                },
              },
            },
          },
        },
        {
          type: "function",
          function: {
            name: "criar_curral_individual",
            description: "Cria um único curral com nome, linha, área e capacidade.",
            parameters: {
              type: "object",
              properties: {
                nome: {
                  type: "string",
                  description: "Nome do curral (ex: 'Curral A1')",
                },
                linha: {
                  type: "string",
                  description: "Linha do curral (A-Z, opcional)",
                },
                area_m2: {
                  type: "number",
                  description: "Área em metros quadrados",
                },
                capacidade_animais: {
                  type: "number",
                  description: "Capacidade de animais (opcional)",
                },
              },
              required: ["nome", "area_m2"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "criar_currais_lote",
            description: "Cria múltiplos currais de uma vez, numerados automaticamente.",
            parameters: {
              type: "object",
              properties: {
                prefixo: {
                  type: "string",
                  description: "Prefixo para os nomes (ex: 'Curral')",
                },
                quantidade: {
                  type: "number",
                  description: "Quantidade de currais a criar (1-100)",
                },
                linha: {
                  type: "string",
                  description: "Linha dos currais (A-Z, opcional)",
                },
                area_m2: {
                  type: "number",
                  description: "Área de cada curral em m²",
                },
                capacidade_animais: {
                  type: "number",
                  description: "Capacidade de cada curral (opcional)",
                },
              },
              required: ["prefixo", "quantidade", "area_m2"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "buscar_curral",
            description: "Busca um curral específico pelo ID.",
            parameters: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description: "ID do curral (UUID)",
                },
              },
              required: ["id"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "atualizar_curral",
            description: "Atualiza os dados de um curral existente.",
            parameters: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description: "ID do curral (UUID)",
                },
                nome: {
                  type: "string",
                  description: "Novo nome (opcional)",
                },
                linha: {
                  type: "string",
                  description: "Nova linha (opcional)",
                },
                area_m2: {
                  type: "number",
                  description: "Nova área (opcional)",
                },
                capacidade_animais: {
                  type: "number",
                  description: "Nova capacidade (opcional)",
                },
              },
              required: ["id"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "excluir_curral",
            description: "Exclui um curral permanentemente. Sempre confirme com o usuário antes.",
            parameters: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description: "ID do curral (UUID)",
                },
              },
              required: ["id"],
            },
          },
        },
        // Adicionar ferramentas de Alimentação
        ...alimentacaoTools,
      ],
    })

    const choice = firstResponse.choices[0]

    // Log para debug
    console.log('🤖 Finish reason:', choice.finish_reason)
    console.log('🛠️ Tool calls:', choice.message.tool_calls?.length || 0)

    // Se não pediu tool, responde direto
    if (choice.finish_reason !== "tool_calls" || !choice.message.tool_calls) {
      console.log('⚠️ Assistente respondeu SEM usar ferramentas!')
      return NextResponse.json({
        reply: choice.message.content,
        history: [...history, { role: "user", content: message }, choice.message],
      })
    }

    // Executar tools
    const toolCalls = choice.message.tool_calls
    const toolResults: OpenAI.Chat.ChatCompletionMessageParam[] = []

    for (const toolCall of toolCalls) {
      const { name, arguments: argsJson } = toolCall.function
      const args = JSON.parse(argsJson || "{}")

      let result: any

      try {
        switch (name) {
          case "listar_currais": {
            const { search } = args
            let query = supabase
              .from('currais')
              .select('*')
              .eq('cliente_id', user.id)
              .order('nome')

            if (search) {
              query = query.or(`nome.ilike.%${search}%,linha.ilike.%${search}%`)
            }

            const { data, error } = await query

            if (error) throw error

            // Adicionar densidade
            const curraisComDensidade = data.map((c: any) => ({
              ...c,
              densidade: c.area_m2 && c.capacidade_animais
                ? (c.area_m2 / c.capacidade_animais).toFixed(2)
                : null
            }))

            result = { currais: curraisComDensidade, total: data.length }
            break
          }

          case "criar_curral_individual": {
            const { nome, linha, area_m2, capacidade_animais } = args

            const { data: cliente } = await supabase
              .from('clientes')
              .select('empresa_id')
              .eq('id', user.id)
              .single()

            if (!cliente) throw new Error('Cliente não encontrado')

            const { data, error } = await supabase
              .from('currais')
              .insert({
                nome,
                linha: linha || null,
                area_m2,
                capacidade_animais: capacidade_animais || null,
                cliente_id: user.id,
                empresa_id: cliente.empresa_id,
              })
              .select()
              .single()

            if (error) throw error

            const densidade = data.area_m2 && data.capacidade_animais
              ? (data.area_m2 / data.capacidade_animais).toFixed(2)
              : null

            result = { ...data, densidade }
            break
          }

          case "criar_currais_lote": {
            const { prefixo, quantidade, linha, area_m2, capacidade_animais } = args

            const { data: cliente } = await supabase
              .from('clientes')
              .select('empresa_id')
              .eq('id', user.id)
              .single()

            if (!cliente) throw new Error('Cliente não encontrado')

            const curraisData = []
            for (let i = 1; i <= quantidade; i++) {
              curraisData.push({
                nome: `${prefixo} ${i}`,
                linha: linha || null,
                area_m2,
                capacidade_animais: capacidade_animais || null,
                cliente_id: user.id,
                empresa_id: cliente.empresa_id,
              })
            }

            const { data, error } = await supabase
              .from('currais')
              .insert(curraisData)
              .select()

            if (error) throw error

            const densidade = area_m2 && capacidade_animais
              ? (area_m2 / capacidade_animais).toFixed(2)
              : null

            result = {
              quantidade: data.length,
              densidade_por_curral: densidade,
              currais: data
            }
            break
          }

          case "buscar_curral": {
            const { id } = args

            const { data, error } = await supabase
              .from('currais')
              .select('*')
              .eq('id', id)
              .eq('cliente_id', user.id)
              .single()

            if (error) throw error

            const densidade = data.area_m2 && data.capacidade_animais
              ? (data.area_m2 / data.capacidade_animais).toFixed(2)
              : null

            result = { ...data, densidade }
            break
          }

          case "atualizar_curral": {
            const { id, ...updateData } = args

            const cleanData: any = {}
            if (updateData.nome !== undefined) cleanData.nome = updateData.nome
            if (updateData.linha !== undefined) cleanData.linha = updateData.linha || null
            if (updateData.area_m2 !== undefined) cleanData.area_m2 = updateData.area_m2
            if (updateData.capacidade_animais !== undefined) {
              cleanData.capacidade_animais = updateData.capacidade_animais || null
            }

            const { data, error } = await supabase
              .from('currais')
              .update(cleanData)
              .eq('id', id)
              .eq('cliente_id', user.id)
              .select()
              .single()

            if (error) throw error

            const densidade = data.area_m2 && data.capacidade_animais
              ? (data.area_m2 / data.capacidade_animais).toFixed(2)
              : null

            result = { ...data, densidade }
            break
          }

          case "excluir_curral": {
            const { id } = args

            const { error } = await supabase
              .from('currais')
              .delete()
              .eq('id', id)
              .eq('cliente_id', user.id)

            if (error) throw error

            result = { sucesso: true, id_excluido: id }
            break
          }

          default:
            // Tentar executar como ferramenta de alimentação
            result = await executeAlimentacaoTool(name, args, supabase, user.id)
        }
      } catch (error: any) {
        result = { error: error.message }
      }

      toolResults.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      })
    }

    // Segunda chamada: modelo usa resultados das tools
    const finalMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      ...messages,
      choice.message,
      ...toolResults,
    ]

    const secondResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: finalMessages,
    })

    const finalChoice = secondResponse.choices[0]

    return NextResponse.json({
      reply: finalChoice.message.content,
      history: [
        ...history,
        { role: "user", content: message },
        choice.message,
        ...toolResults,
        finalChoice.message,
      ],
    })
  } catch (error: any) {
    console.error('Erro no chat:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
