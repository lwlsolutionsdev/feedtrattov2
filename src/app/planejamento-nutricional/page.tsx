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
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Loader2, Save, AlertCircle, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Lote {
  id: string
  nome: string
  status: string
  data_entrada: string
  dias_cocho: number
  fase_dieta: string | null
  peso_medio_entrada: number
  gmd_projetado: number
  quantidade_animais: number
  peso_projetado: number
  periodo_ativo?: {
    id: string
    ingestao_ms_kg_pv: number
    dieta_id: string
    dieta_nome: string
    dieta_ms_media: number
  }
  currais?: { nome: string }
}

interface Planejamento {
  lote_id: string
  tipo_leitura: 'inteligente' | 'simples'
  vagao_id: string
  quantidade_base_kg: number
  quantidade_ajustada_kg: number
  numero_tratos: number
  nota_cocho?: number
  ajuste_percentual?: number
  leitura_cocho_id?: string
  tratos: {
    ordem: number
    horario: string
    percentual: number
    quantidade_kg: number
  }[]
}

interface Vagao {
  id: string
  nome: string
  capacidade_kg: number
}

export default function PlanejamentoNutricional() {
  const [lotes, setLotes] = useState<Lote[]>([])
  const [vagoes, setVagoes] = useState<Vagao[]>([])
  const [planejamentos, setPlanejamentos] = useState<Record<string, Planejamento>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dataPlanejamento, setDataPlanejamento] = useState(new Date().toISOString().split('T')[0])

  const supabase = createClient()

  useEffect(() => {
    fetchVagoes()
    fetchLotes()
  }, [dataPlanejamento])

  async function fetchVagoes() {
    try {
      const { data, error } = await supabase
        .from('vagoes')
        .select('id, nome, capacidade_kg')
        .eq('ativo', true)
        .order('nome')

      if (error) {
        console.error('Erro detalhado ao buscar vagões:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        
        // Se a tabela não existe, mostrar mensagem específica
        if (error.code === '42P01') {
          toast.error('Tabela de vagões não encontrada. Execute a migration 20241116000013_create_vagoes.sql')
        } else {
          toast.error('Erro ao carregar vagões')
        }
        return
      }
      
      setVagoes(data || [])
      
      // Se não houver vagões, avisar o usuário
      if (!data || data.length === 0) {
        toast.info('Nenhum vagão cadastrado. Cadastre vagões para criar planejamentos.')
      }
    } catch (error: any) {
      console.error('Erro ao buscar vagões:', error)
      toast.error('Erro ao carregar vagões')
    }
  }

  async function fetchLotes() {
    try {
      setLoading(true)
      
      // Buscar lotes ativos com períodos de alimentação
      const { data, error } = await supabase
        .from('lotes')
        .select(`
          id,
          nome,
          status,
          data_entrada,
          peso_medio_entrada,
          gmd_projetado,
          quantidade_animais,
          currais:curral_id (nome),
          periodos_alimentacao_lote (
            id,
            dia_inicial,
            dia_final,
            ingestao_ms_kg_pv,
            dieta_id,
            dietas (
              id,
              nome,
              ms_media,
              fase_dieta
            )
          )
        `)
        .eq('status', 'ATIVO')
        .order('nome')

      if (error) throw error
      
      // Processar lotes e calcular dados
      const lotesProcessados = (data || [])
        .map(lote => {
          // Calcular dias de cocho
          const dataEntrada = new Date(lote.data_entrada)
          const hoje = new Date()
          const diffTime = Math.abs(hoje.getTime() - dataEntrada.getTime())
          const diasCocho = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          
          // Encontrar período ativo
          const periodos: any = Array.isArray(lote.periodos_alimentacao_lote) 
            ? lote.periodos_alimentacao_lote 
            : (lote.periodos_alimentacao_lote ? [lote.periodos_alimentacao_lote] : [])
          
          const periodoAtivo = periodos.find((p: any) => {
            return diasCocho >= p.dia_inicial && diasCocho <= p.dia_final
          })
          
          if (!periodoAtivo) return null
          
          const dieta: any = Array.isArray(periodoAtivo.dietas) 
            ? periodoAtivo.dietas[0] 
            : periodoAtivo.dietas
          
          if (!dieta) return null
          
          // Calcular peso projetado
          const pesoProjetado = lote.peso_medio_entrada + (lote.gmd_projetado * diasCocho)
          
          return {
            id: lote.id,
            nome: lote.nome,
            status: lote.status,
            data_entrada: lote.data_entrada,
            dias_cocho: diasCocho,
            fase_dieta: dieta.fase_dieta,
            peso_medio_entrada: lote.peso_medio_entrada,
            gmd_projetado: lote.gmd_projetado,
            quantidade_animais: lote.quantidade_animais,
            peso_projetado: pesoProjetado,
            periodo_ativo: {
              id: periodoAtivo.id,
              ingestao_ms_kg_pv: periodoAtivo.ingestao_ms_kg_pv,
              dieta_id: dieta.id,
              dieta_nome: dieta.nome,
              dieta_ms_media: dieta.ms_media
            },
            currais: Array.isArray(lote.currais) ? lote.currais[0] : lote.currais
          }
        })
        .filter(lote => lote !== null) as Lote[]
      
      setLotes(lotesProcessados)
      
      // Buscar planejamento do dia anterior para copiar configurações
      await buscarPlanejamentoDiaAnterior(lotesProcessados)
      
    } catch (error: any) {
      console.error('Erro ao buscar lotes:', error)
      toast.error('Erro ao carregar lotes')
    } finally {
      setLoading(false)
    }
  }

  async function buscarPlanejamentoDiaAnterior(lotesAtivos: Lote[]) {
    try {
      const dataAnterior = new Date(dataPlanejamento)
      dataAnterior.setDate(dataAnterior.getDate() - 1)
      const dataAnteriorStr = dataAnterior.toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('planejamentos_trato')
        .select(`
          *,
          tratos_planejados (*)
        `)
        .eq('data_planejamento', dataAnteriorStr)
        .in('lote_id', lotesAtivos.map(l => l.id))
      
      if (error) throw error
      
      // Inicializar planejamentos
      const initialPlanejamentos: Record<string, Planejamento> = {}
      
      lotesAtivos.forEach(lote => {
        // Buscar planejamento anterior deste lote
        const planAnterior = data?.find(p => p.lote_id === lote.id)
        
        // Calcular quantidade base
        const quantidadeBase = calcularQuantidadeBase(lote)
        
        if (planAnterior) {
          // Copiar configuração do dia anterior
          const tratos = (planAnterior.tratos_planejados || [])
            .sort((a: any, b: any) => a.ordem - b.ordem)
            .map((t: any) => ({
              ordem: t.ordem,
              horario: t.horario,
              percentual: t.percentual,
              quantidade_kg: (quantidadeBase * t.percentual) / 100
            }))
          
          initialPlanejamentos[lote.id] = {
            lote_id: lote.id,
            tipo_leitura: planAnterior.tipo_leitura,
            vagao_id: planAnterior.vagao_id,
            quantidade_base_kg: quantidadeBase,
            quantidade_ajustada_kg: quantidadeBase,
            numero_tratos: planAnterior.numero_tratos,
            tratos
          }
        } else {
          // Usar configuração padrão
          initialPlanejamentos[lote.id] = {
            lote_id: lote.id,
            tipo_leitura: 'inteligente',
            vagao_id: '',
            quantidade_base_kg: quantidadeBase,
            quantidade_ajustada_kg: quantidadeBase,
            numero_tratos: 3,
            tratos: [
              { ordem: 1, horario: '07:00', percentual: 33.33, quantidade_kg: (quantidadeBase * 33.33) / 100 },
              { ordem: 2, horario: '12:00', percentual: 33.33, quantidade_kg: (quantidadeBase * 33.33) / 100 },
              { ordem: 3, horario: '17:00', percentual: 33.34, quantidade_kg: (quantidadeBase * 33.34) / 100 },
            ]
          }
        }
      })
      
      setPlanejamentos(initialPlanejamentos)
      
      // Buscar leituras inteligentes do dia para ajuste automático
      await buscarLeiturasInteligentes(lotesAtivos)
      
    } catch (error: any) {
      console.error('Erro ao buscar planejamento anterior:', error)
    }
  }

  async function buscarLeiturasInteligentes(lotesAtivos: Lote[]) {
    try {
      const { data, error } = await supabase
        .from('leituras_cocho_inteligente')
        .select('*')
        .eq('data_referencia', dataPlanejamento)
        .in('lote_id', lotesAtivos.map(l => l.id))
      
      if (error) throw error
      
      // Aplicar ajustes automáticos para leituras inteligentes
      setPlanejamentos(prev => {
        const updated = { ...prev }
        
        data?.forEach(leitura => {
          if (updated[leitura.lote_id] && updated[leitura.lote_id].tipo_leitura === 'inteligente') {
            const quantidadeBase = updated[leitura.lote_id].quantidade_base_kg
            const ajuste = leitura.percentual_ajuste || 0
            const quantidadeAjustada = quantidadeBase * (1 + ajuste / 100)
            
            updated[leitura.lote_id] = {
              ...updated[leitura.lote_id],
              nota_cocho: leitura.nota_cocho,
              ajuste_percentual: ajuste,
              leitura_cocho_id: leitura.id,
              quantidade_ajustada_kg: quantidadeAjustada,
              tratos: updated[leitura.lote_id].tratos.map(t => ({
                ...t,
                quantidade_kg: (quantidadeAjustada * t.percentual) / 100
              }))
            }
          }
        })
        
        return updated
      })
      
    } catch (error: any) {
      console.error('Erro ao buscar leituras inteligentes:', error)
    }
  }

  function calcularQuantidadeBase(lote: Lote): number {
    if (!lote.periodo_ativo) return 0
    
    // 1. Peso projetado (já calculado)
    const pesoProjetado = lote.peso_projetado
    
    // 2. Consumo de MS por animal (kg)
    const consumoMSPorAnimal = pesoProjetado * (lote.periodo_ativo.ingestao_ms_kg_pv / 100)
    
    // 3. Conversão para MN (Matéria Natural)
    const consumoMNPorAnimal = consumoMSPorAnimal / (lote.periodo_ativo.dieta_ms_media / 100)
    
    // 4. Total do lote
    const quantidadeTotal = consumoMNPorAnimal * lote.quantidade_animais
    
    return Math.round(quantidadeTotal * 100) / 100 // 2 casas decimais
  }

  function handleFieldChange(loteId: string, field: keyof Planejamento, value: any) {
    setPlanejamentos(prev => ({
      ...prev,
      [loteId]: {
        ...prev[loteId],
        [field]: value
      }
    }))
  }

  function handleTratoChange(loteId: string, tratoIndex: number, field: 'horario' | 'percentual', value: string | number) {
    setPlanejamentos(prev => {
      const planejamento = prev[loteId]
      const tratos = [...planejamento.tratos]
      
      if (field === 'horario') {
        tratos[tratoIndex].horario = value as string
      } else if (field === 'percentual') {
        const percentual = parseFloat(value as string) || 0
        tratos[tratoIndex].percentual = percentual
        tratos[tratoIndex].quantidade_kg = (planejamento.quantidade_ajustada_kg * percentual) / 100
      }
      
      return {
        ...prev,
        [loteId]: {
          ...planejamento,
          tratos
        }
      }
    })
  }

  function adicionarTrato(loteId: string) {
    setPlanejamentos(prev => {
      const planejamento = prev[loteId]
      const novaOrdem = planejamento.tratos.length + 1
      const percentualRestante = 100 - planejamento.tratos.reduce((sum, t) => sum + t.percentual, 0)
      const percentual = Math.max(0, percentualRestante)
      
      return {
        ...prev,
        [loteId]: {
          ...planejamento,
          numero_tratos: novaOrdem,
          tratos: [
            ...planejamento.tratos,
            {
              ordem: novaOrdem,
              horario: '12:00',
              percentual,
              quantidade_kg: (planejamento.quantidade_ajustada_kg * percentual) / 100
            }
          ]
        }
      }
    })
  }

  function removerTrato(loteId: string, tratoIndex: number) {
    setPlanejamentos(prev => {
      const planejamento = prev[loteId]
      if (planejamento.tratos.length <= 1) {
        toast.error('Deve haver pelo menos 1 trato')
        return prev
      }
      
      const tratos = planejamento.tratos
        .filter((_, i) => i !== tratoIndex)
        .map((t, i) => ({ ...t, ordem: i + 1 }))
      
      return {
        ...prev,
        [loteId]: {
          ...planejamento,
          numero_tratos: tratos.length,
          tratos
        }
      }
    })
  }

  function calcularSomaPercentuais(tratos: Planejamento['tratos']): number {
    return tratos.reduce((sum, t) => sum + t.percentual, 0)
  }

  function isPlanejamentoCompleto(planejamento: Planejamento): boolean {
    return !!(
      planejamento.vagao_id &&
      planejamento.quantidade_ajustada_kg > 0 &&
      planejamento.numero_tratos > 0
    )
  }

  async function handleSubmit() {
    const planejamentosCompletos = Object.values(planejamentos).filter(isPlanejamentoCompleto)
    
    if (planejamentosCompletos.length === 0) {
      toast.error('Complete pelo menos um planejamento')
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

      // Salvar cada planejamento
      for (const planejamento of planejamentosCompletos) {
        const lote = lotes.find(l => l.id === planejamento.lote_id)
        if (!lote) continue

        // Inserir planejamento
        const { data: planData, error: planError } = await supabase
          .from('planejamentos_trato')
          .insert({
            lote_id: planejamento.lote_id,
            dieta_id: lote.periodo_ativo?.dieta_id,
            vagao_id: planejamento.vagao_id,
            periodo_alimentacao_id: lote.periodo_ativo?.id,
            data_planejamento: dataPlanejamento,
            tipo_leitura: planejamento.tipo_leitura,
            dias_cocho: lote.dias_cocho,
            fase_dieta: lote.fase_dieta,
            peso_medio_projetado: lote.peso_projetado,
            quantidade_base_kg: planejamento.quantidade_base_kg,
            quantidade_ajustada_kg: planejamento.quantidade_ajustada_kg,
            numero_tratos: planejamento.numero_tratos,
            cliente_id: user.id,
            empresa_id: cliente?.empresa_id || null
          })
          .select()
          .single()

        if (planError) throw planError

        // Inserir tratos
        const tratosData = planejamento.tratos.map(trato => ({
          planejamento_id: planData.id,
          ordem: trato.ordem,
          horario: trato.horario,
          percentual: trato.percentual,
          quantidade_planejada_kg: trato.quantidade_kg
        }))

        const { error: tratosError } = await supabase
          .from('tratos_planejados')
          .insert(tratosData)

        if (tratosError) throw tratosError
      }

      toast.success(`${planejamentosCompletos.length} planejamento(s) criado(s) com sucesso!`)
      
      // Recarregar lotes
      fetchLotes()
      
    } catch (error: any) {
      console.error('Erro ao salvar planejamentos:', error)
      toast.error('Erro ao salvar planejamentos')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <div className="flex items-center gap-2 flex-1">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Planejamento Nutricional</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="px-4">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-7xl mx-auto w-full space-y-4 pb-8">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Calendar className="h-6 w-6" />
                Planejamento Nutricional
              </h1>
              <p className="text-sm text-muted-foreground">
                Planeje a alimentação diária de todos os lotes
              </p>
            </div>

            <Tabs defaultValue="planejamento" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="planejamento">
                  <Save className="h-4 w-4 mr-2" />
                  Criar Planejamento
                </TabsTrigger>
                <TabsTrigger value="historico">
                  Histórico
                </TabsTrigger>
              </TabsList>

              <TabsContent value="planejamento" className="space-y-4">
                {/* Data do Planejamento */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Data do Planejamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Input
                      type="date"
                      value={dataPlanejamento}
                      onChange={(e) => setDataPlanejamento(e.target.value)}
                      className="max-w-xs"
                    />
                  </CardContent>
                </Card>

                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                  </div>
                ) : lotes.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Nenhum lote ativo com período de alimentação configurado.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    {/* Lista de Lotes */}
                    <div className="space-y-4">
                      {lotes.map((lote) => {
                        const planejamento = planejamentos[lote.id]
                        if (!planejamento) return null

                        return (
                          <Card key={lote.id}>
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div>
                                  <CardTitle className="text-base">{lote.nome}</CardTitle>
                                  <CardDescription>
                                    {lote.currais?.nome} • {lote.quantidade_animais} animais • {lote.dias_cocho} dias
                                  </CardDescription>
                                </div>
                                <Badge variant="outline">
                                  {lote.fase_dieta === 'adaptacao_crescimento' ? 'Adaptação' : 'Terminação'}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {/* Informações do Lote */}
                              <div className="grid grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Dieta</p>
                                  <p className="font-medium">{lote.periodo_ativo?.dieta_nome}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Peso Projetado</p>
                                  <p className="font-medium">{lote.peso_projetado.toFixed(1)} kg</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Consumo MS</p>
                                  <p className="font-medium">{lote.periodo_ativo?.ingestao_ms_kg_pv}% PV</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">MS Dieta</p>
                                  <p className="font-medium">{lote.periodo_ativo?.dieta_ms_media}%</p>
                                </div>
                              </div>

                              <Separator />

                              {/* Configuração do Planejamento */}
                              <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label>Tipo de Leitura</Label>
                                  <Select
                                    value={planejamento.tipo_leitura}
                                    onValueChange={(value: 'inteligente' | 'simples') =>
                                      handleFieldChange(lote.id, 'tipo_leitura', value)
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="inteligente">Inteligente</SelectItem>
                                      <SelectItem value="simples">Simples</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label>Vagão *</Label>
                                  <Select
                                    value={planejamento.vagao_id}
                                    onValueChange={(value) => handleFieldChange(lote.id, 'vagao_id', value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {vagoes.map(vagao => (
                                        <SelectItem key={vagao.id} value={vagao.id}>
                                          {vagao.nome} ({vagao.capacidade_kg}kg)
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label>Quantidade Total (kg)</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={planejamento.quantidade_ajustada_kg}
                                    onChange={(e) =>
                                      handleFieldChange(lote.id, 'quantidade_ajustada_kg', parseFloat(e.target.value) || 0)
                                    }
                                    disabled={planejamento.tipo_leitura === 'inteligente' && !!planejamento.nota_cocho}
                                  />
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>Base: {planejamento.quantidade_base_kg.toFixed(2)} kg</span>
                                    {planejamento.nota_cocho !== undefined && (
                                      <>
                                        <span>•</span>
                                        <span>Nota: {planejamento.nota_cocho}</span>
                                        <span>•</span>
                                        <span className={planejamento.ajuste_percentual! > 0 ? 'text-green-600' : planejamento.ajuste_percentual! < 0 ? 'text-red-600' : ''}>
                                          Ajuste: {planejamento.ajuste_percentual! > 0 ? '+' : ''}{planejamento.ajuste_percentual}%
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Tratos */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label>Tratos ({planejamento.numero_tratos}x ao dia)</Label>
                                  <div className="flex gap-1">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => adicionarTrato(lote.id)}
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Adicionar
                                    </Button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  {planejamento.tratos.map((trato, index) => {
                                    const somaPercentuais = calcularSomaPercentuais(planejamento.tratos)
                                    const percentualInvalido = Math.abs(somaPercentuais - 100) > 0.01
                                    
                                    return (
                                      <div key={index} className="p-3 border rounded-lg space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm font-medium">Trato {trato.ordem}</span>
                                          <div className="flex items-center gap-1">
                                            <Badge variant="secondary" className="text-xs">
                                              {trato.percentual.toFixed(2)}%
                                            </Badge>
                                            {planejamento.tratos.length > 1 && (
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 text-destructive"
                                                onClick={() => removerTrato(lote.id, index)}
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                        <div className="space-y-1">
                                          <Input
                                            type="time"
                                            value={trato.horario}
                                            onChange={(e) => handleTratoChange(lote.id, index, 'horario', e.target.value)}
                                            className="text-sm"
                                          />
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={trato.percentual}
                                            onChange={(e) => handleTratoChange(lote.id, index, 'percentual', e.target.value)}
                                            className="text-sm"
                                            placeholder="%"
                                          />
                                          <p className="text-xs text-muted-foreground">
                                            {trato.quantidade_kg.toFixed(2)} kg
                                          </p>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                                {Math.abs(calcularSomaPercentuais(planejamento.tratos) - 100) > 0.01 && (
                                  <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                      A soma dos percentuais deve ser 100%. Atual: {calcularSomaPercentuais(planejamento.tratos).toFixed(2)}%
                                    </AlertDescription>
                                  </Alert>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>

                    {/* Botão Salvar */}
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={handleSubmit}
                        disabled={submitting || Object.values(planejamentos).filter(isPlanejamentoCompleto).length === 0}
                        size="lg"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Gerar Planejamento ({Object.values(planejamentos).filter(isPlanejamentoCompleto).length})
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="historico">
                <Card>
                  <CardHeader>
                    <CardTitle>Histórico de Planejamentos</CardTitle>
                    <CardDescription>Em desenvolvimento...</CardDescription>
                  </CardHeader>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
