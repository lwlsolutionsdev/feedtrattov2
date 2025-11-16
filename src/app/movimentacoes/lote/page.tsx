'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Loader2, Users } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface LoteAnimais {
  id: string
  quantidade: number
  lote_confinamento?: { id: string; nome: string }
}

interface Lote {
  id: string
  nome: string
}

interface Curral {
  id: string
  nome: string
}

export default function MovimentacaoLotePage() {
  const [lotesAnimais, setLotesAnimais] = useState<LoteAnimais[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [currais, setCurrais] = useState<Curral[]>([])
  const [loteAnimaisId, setLoteAnimaisId] = useState('')
  const [loteInfo, setLoteInfo] = useState<LoteAnimais | null>(null)
  const [quantidadeMovimentar, setQuantidadeMovimentar] = useState('')
  const [tipoDestino, setTipoDestino] = useState<'LOTE' | 'REFUGO' | 'ENFERMARIA' | 'SAIDA'>('LOTE')
  const [loteDestinoId, setLoteDestinoId] = useState('')
  const [curralDestinoId, setCurralDestinoId] = useState('')
  const [dataMovimentacao, setDataMovimentacao] = useState(new Date().toISOString().split('T')[0])
  const [motivo, setMotivo] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchLotesAnimais()
    fetchLotes()
  }, [])

  useEffect(() => {
    if (loteAnimaisId) {
      const lote = lotesAnimais.find(l => l.id === loteAnimaisId)
      setLoteInfo(lote || null)
      // Preencher com quantidade total por padrão
      if (lote) {
        setQuantidadeMovimentar(lote.quantidade.toString())
      }
    } else {
      setLoteInfo(null)
      setQuantidadeMovimentar('')
    }
  }, [loteAnimaisId, lotesAnimais])

  useEffect(() => {
    if (tipoDestino === 'LOTE' || tipoDestino === 'REFUGO') {
      fetchCurraisDisponiveis()
    }
  }, [tipoDestino])

  async function fetchLotesAnimais() {
    try {
      const { data, error } = await supabase
        .from('lotes_animais')
        .select(`
          id,
          quantidade,
          lote_confinamento:lote_confinamento_id!inner (id, nome)
        `)
        .eq('status', 'ATIVO')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Transformar o retorno para garantir tipo correto
      const lotesFormatados = (data || []).map((item: any) => ({
        id: item.id,
        quantidade: item.quantidade,
        lote_confinamento: Array.isArray(item.lote_confinamento) 
          ? item.lote_confinamento[0] 
          : item.lote_confinamento
      }))
      
      setLotesAnimais(lotesFormatados)
    } catch (error: any) {
      console.error('Erro ao buscar lotes de animais:', error)
      toast.error('Erro ao carregar lotes de animais')
    }
  }

  async function fetchLotes() {
    try {
      const { data, error } = await supabase
        .from('lotes')
        .select('id, nome')
        .eq('status', 'ATIVO')
        .order('nome')

      if (error) throw error
      setLotes(data || [])
    } catch (error: any) {
      console.error('Erro ao buscar lotes:', error)
    }
  }

  async function fetchCurraisDisponiveis() {
    try {
      const { data: curraisData, error: curraisError } = await supabase
        .from('currais')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome')

      if (curraisError) {
        console.warn('Aviso ao buscar currais:', curraisError)
        setCurrais([])
        return
      }

      const { data: lotesData, error: lotesError } = await supabase
        .from('lotes')
        .select('curral_id')
        .eq('status', 'ATIVO')

      if (lotesError) {
        console.warn('Aviso ao buscar lotes:', lotesError)
        setCurrais(curraisData || [])
        return
      }

      const curraisComLoteIds = new Set(lotesData?.map(l => l.curral_id).filter(Boolean) || [])
      const curraisDisponiveis = curraisData?.filter(c => !curraisComLoteIds.has(c.id)) || []

      setCurrais(curraisDisponiveis)
    } catch (error: any) {
      console.warn('Erro ao buscar currais:', error)
      setCurrais([])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!loteAnimaisId) {
      toast.error('Selecione um lote de animais')
      return
    }

    if (!quantidadeMovimentar || parseInt(quantidadeMovimentar) <= 0) {
      toast.error('Informe a quantidade a movimentar')
      return
    }

    if (!motivo.trim()) {
      toast.error('Informe o motivo da movimentação')
      return
    }

    if (tipoDestino === 'LOTE' && !loteDestinoId) {
      toast.error('Selecione o lote de destino')
      return
    }

    try {
      setSubmitting(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data: cliente } = await supabase
        .from('clientes')
        .select('empresa_id')
        .eq('id', user.id)
        .single()

      // Buscar o lote de animais completo
      const { data: loteAnimaisOriginal, error: loteError } = await supabase
        .from('lotes_animais')
        .select('*')
        .eq('id', loteAnimaisId)
        .single()

      if (loteError) throw loteAnimaisOriginal

      const qtdMovimentar = parseInt(quantidadeMovimentar)
      const qtdRestante = loteAnimaisOriginal.quantidade - qtdMovimentar

      if (qtdMovimentar > loteAnimaisOriginal.quantidade) {
        toast.error(`Quantidade máxima: ${loteAnimaisOriginal.quantidade} animais`)
        return
      }

      // Criar movimentação
      const movimentacaoData = {
        lote_animais_id: loteAnimaisId,
        tipo_origem: 'LOTE' as const,
        lote_origem_id: loteAnimaisOriginal.lote_confinamento_id,
        tipo_destino: tipoDestino,
        lote_destino_id: tipoDestino === 'LOTE' ? loteDestinoId : null,
        curral_destino_id: (tipoDestino === 'LOTE' || tipoDestino === 'REFUGO') && curralDestinoId ? curralDestinoId : null,
        data_movimentacao: dataMovimentacao,
        motivo: motivo,
        observacoes: observacoes || null,
        quantidade_animais: qtdMovimentar,
        cliente_id: user.id,
        empresa_id: cliente?.empresa_id || null,
      }

      const { error: movError } = await supabase
        .from('movimentacoes_lotes')
        .insert(movimentacaoData)

      if (movError) throw movError

      // LÓGICA DE MOVIMENTAÇÃO PARCIAL
      if (qtdMovimentar === loteAnimaisOriginal.quantidade) {
        // Movimentar TUDO - atualizar registro existente
        if (tipoDestino === 'LOTE') {
          await supabase
            .from('lotes_animais')
            .update({ lote_confinamento_id: loteDestinoId })
            .eq('id', loteAnimaisId)
        } else if (tipoDestino === 'SAIDA') {
          await supabase
            .from('lotes_animais')
            .update({ status: 'VENDIDO' })
            .eq('id', loteAnimaisId)
        } else if (tipoDestino === 'REFUGO') {
          await supabase
            .from('lotes_animais')
            .update({ status: 'REFUGO' })
            .eq('id', loteAnimaisId)
        } else if (tipoDestino === 'ENFERMARIA') {
          await supabase
            .from('lotes_animais')
            .update({ status: 'ENFERMARIA' })
            .eq('id', loteAnimaisId)
        }
      } else {
        // Movimentar PARCIAL - dividir lote
        // 1. Atualizar quantidade do lote original (fica com o restante)
        await supabase
          .from('lotes_animais')
          .update({ quantidade: qtdRestante })
          .eq('id', loteAnimaisId)

        // 2. Criar novo lote com a quantidade movimentada
        if (tipoDestino === 'LOTE') {
          const novoLoteData = {
            ...loteAnimaisOriginal,
            id: undefined, // Gerar novo ID
            quantidade: qtdMovimentar,
            lote_confinamento_id: loteDestinoId,
            created_at: undefined,
            updated_at: undefined,
          }
          delete novoLoteData.id
          delete novoLoteData.created_at
          delete novoLoteData.updated_at

          await supabase
            .from('lotes_animais')
            .insert(novoLoteData)
        }
        // Para SAIDA, REFUGO, ENFERMARIA parcial: apenas reduz quantidade do original
      }

      toast.success(`Movimentação registrada para ${qtdMovimentar} animais!`)

      // Resetar formulário
      setLoteAnimaisId('')
      setLoteInfo(null)
      setLoteDestinoId('')
      setCurralDestinoId('')
      setMotivo('')
      setObservacoes('')
      fetchLotesAnimais()
    } catch (error: any) {
      console.error('Erro ao salvar movimentação:', error)
      toast.error('Erro ao salvar movimentação: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 justify-between transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/movimentacoes">Movimentações</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Movimentação em Lote</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="px-4">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 overflow-y-auto">
          <div className="max-w-2xl mx-auto w-full space-y-4 pb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold">Movimentação em Lote</h1>
                <p className="text-xs text-muted-foreground">
                  Mover todos os animais de um lote de uma vez
                </p>
              </div>
              <Link href="/movimentacoes">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              </Link>
            </div>

            <Card className="p-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Seleção de Lote de Animais */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">1. Selecione o Lote de Animais *</Label>
                  <Select value={loteAnimaisId} onValueChange={setLoteAnimaisId} required>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Escolha um lote" />
                    </SelectTrigger>
                    <SelectContent>
                      {lotesAnimais.map((lote) => (
                        <SelectItem key={lote.id} value={lote.id}>
                          {lote.lote_confinamento?.nome} - {lote.quantidade} animais
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {loteInfo && (
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Total no lote: <span className="font-semibold">{loteInfo.quantidade} animais</span>
                      </p>
                    </div>
                  )}
                </div>

                {loteInfo && (
                  <>
                    {/* Quantidade a Movimentar */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">2. Quantidade a Movimentar *</Label>
                      <Input
                        type="number"
                        min="1"
                        max={loteInfo.quantidade}
                        value={quantidadeMovimentar}
                        onChange={(e) => setQuantidadeMovimentar(e.target.value)}
                        placeholder={`Máximo: ${loteInfo.quantidade}`}
                        className="h-10"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        {quantidadeMovimentar && parseInt(quantidadeMovimentar) < loteInfo.quantidade
                          ? `${loteInfo.quantidade - parseInt(quantidadeMovimentar)} animais ficarão no lote original`
                          : 'Todos os animais serão movimentados'}
                      </p>
                    </div>

                    {/* Tipo de Destino */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">3. Tipo de Destino *</Label>
                      <Select value={tipoDestino} onValueChange={(v) => setTipoDestino(v as any)} required>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOTE">Outro Lote</SelectItem>
                          <SelectItem value="REFUGO">Refugo</SelectItem>
                          <SelectItem value="ENFERMARIA">Enfermaria</SelectItem>
                          <SelectItem value="SAIDA">Saída (Venda)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Lote de Destino */}
                    {tipoDestino === 'LOTE' && (
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">4. Lote de Destino *</Label>
                        <Select value={loteDestinoId} onValueChange={setLoteDestinoId} required>
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue placeholder="Selecione o lote" />
                          </SelectTrigger>
                          <SelectContent>
                            {lotes.map((lote) => (
                              <SelectItem key={lote.id} value={lote.id}>
                                {lote.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Curral de Destino (opcional para LOTE e REFUGO) */}
                    {(tipoDestino === 'LOTE' || tipoDestino === 'REFUGO') && (
                      <div className="space-y-2">
                        <Label className="text-sm">Curral de Destino (opcional)</Label>
                        <Select value={curralDestinoId} onValueChange={setCurralDestinoId}>
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue placeholder="Selecione um curral (opcional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {currais.map((curral) => (
                              <SelectItem key={curral.id} value={curral.id}>
                                {curral.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Apenas currais sem lotes ativos
                        </p>
                      </div>
                    )}

                    {/* Data */}
                    <div className="space-y-2">
                      <Label className="text-sm">Data da Movimentação</Label>
                      <Input
                        type="date"
                        value={dataMovimentacao}
                        onChange={(e) => setDataMovimentacao(e.target.value)}
                        className="h-10"
                      />
                    </div>

                    {/* Motivo */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Motivo *</Label>
                      <Input
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder="Ex: Mudança de lote, Venda, Tratamento..."
                        className="h-10"
                        required
                      />
                    </div>

                    {/* Observações */}
                    <div className="space-y-2">
                      <Label className="text-sm">Observações</Label>
                      <Textarea
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        placeholder="Informações adicionais..."
                        rows={2}
                        className="text-sm"
                      />
                    </div>

                    {/* Botão Salvar */}
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-11 text-sm bg-green-500 hover:bg-green-600 text-white"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Salvando movimentação...
                        </>
                      ) : (
                        <>
                          <Users className="mr-2 h-5 w-5" />
                          Registrar Movimentação para {quantidadeMovimentar || loteInfo.quantidade} Animais
                        </>
                      )}
                    </Button>
                  </>
                )}
              </form>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
