'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, TrendingUp, DollarSign, Calendar, Weight, Users, Beef, Plus, Trash2, Utensils } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Lote {
  id: string
  nome: string
  curral_id: string | null
  data_entrada: string
  dias_planejados: number
  quantidade_animais: number
  peso_medio_entrada: number
  gmd_projetado: number
  valor_compra_kg_projetado: number
  custo_fixo_cabeca_dia_projetado: number
  custo_protocolo_sanitario_projetado: number
  rendimento_carcaca_projetado: number
  valor_venda_projetado: number
  status: string
  observacoes: string | null
  currais: {
    nome: string
    area_m2: number
  } | null
}

interface Dieta {
  id: string
  nome: string
  ms_media: number
  custo_mn: number
  custo_ms: number
}

interface PeriodoForm {
  dia_inicial: string
  dia_final: string
  dieta_id: string
  ingestao_ms_kg_pv: string
}

interface Indicadores {
  dias_decorridos: number
  dias_restantes: number
  animais_por_m2: number
  peso_saida_projetado: number
  peso_carcaca_projetado: number
  arrobas_carcaca_projetado: number
  arrobas_produzidas_boi_projetado: number
  arrobas_vivo_entrada: number
  arrobas_vivo_saida: number
  gmd_carcaca_projetado: number
  producao_arroba_mes_projetado: number
  dias_por_arroba_projetado: number
  custo_compra_total_projetado: number
  custo_alimentacao_total_projetado: number
  custo_fixo_total_projetado: number
  custo_protocolo_total_projetado: number
  custo_total_projetado: number
  receita_total_projetada: number
  lucro_bruto_projetado: number
  custo_por_arroba_projetado: number
  lucro_por_cabeca_projetado: number
  margem_percentual_projetada: number
}

export default function DetalhesLotePage() {
  const params = useParams()
  const router = useRouter()
  const loteId = params.id as string
  
  const [lote, setLote] = useState<Lote | null>(null)
  const [indicadores, setIndicadores] = useState<Indicadores | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Estados para períodos de alimentação
  const [periodosDialogOpen, setPeriodosDialogOpen] = useState(false)
  const [dietas, setDietas] = useState<Dieta[]>([])
  const [periodos, setPeriodos] = useState<PeriodoForm[]>([])
  const [periodoToDelete, setPeriodoToDelete] = useState<number | null>(null)
  const [submittingPeriodos, setSubmittingPeriodos] = useState(false)
  const [hasPeriodosSalvos, setHasPeriodosSalvos] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchLoteDetalhes()
  }, [loteId])

  async function fetchLoteDetalhes() {
    try {
      setLoading(true)

      // Buscar lote
      const { data: loteData, error: loteError } = await supabase
        .from('lotes')
        .select(`
          *,
          currais (
            nome,
            area_m2
          )
        `)
        .eq('id', loteId)
        .single()

      if (loteError) throw loteError
      setLote(loteData)

      // Buscar indicadores
      const { data: indicadoresData, error: indicadoresError } = await supabase
        .from('indicadores_projetados_lote')
        .select('*')
        .eq('lote_id', loteId)
        .single()

      if (indicadoresError && indicadoresError.code !== 'PGRST116') {
        console.error('Erro ao buscar indicadores:', indicadoresError)
      } else {
        setIndicadores(indicadoresData)
      }

      // Verificar se existem períodos salvos
      const { data: periodosData } = await supabase
        .from('periodos_alimentacao_lote')
        .select('id')
        .eq('lote_id', loteId)
        .limit(1)

      setHasPeriodosSalvos(!!(periodosData && periodosData.length > 0))
    } catch (error: any) {
      console.error('Erro ao buscar detalhes:', error)
      toast.error('Erro ao carregar detalhes do lote')
      router.push('/lotes')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return 'R$ 0,00'
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const formatNumber = (value: number | null | undefined, decimals: number = 2) => {
    if (!value) return '0,00'
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-')
    return `${day}/${month}/${year}`
  }

  // Funções para gerenciar períodos de alimentação
  async function loadDietas() {
    try {
      const { data, error } = await supabase
        .from('dietas')
        .select('id, nome, ms_media, custo_mn, custo_ms')
        .order('nome')

      if (error) {
        console.error('Erro ao carregar dietas:', error)
        toast.error('Erro ao carregar dietas: ' + error.message)
        return
      }
      
      console.log('Dietas carregadas:', data)
      setDietas(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar dietas:', error)
      toast.error('Erro ao carregar dietas')
    }
  }

  async function loadPeriodosExistentes() {
    if (!lote) return

    try {
      const { data, error } = await supabase
        .from('periodos_alimentacao_lote')
        .select('*')
        .eq('lote_id', lote.id)
        .order('ordem')

      if (error) {
        console.error('Erro ao carregar períodos:', error)
        return
      }

      if (data && data.length > 0) {
        // Converter períodos do banco para o formato do formulário
        const periodosCarregados = data.map(p => ({
          dia_inicial: p.dia_inicial.toString(),
          dia_final: p.dia_final.toString(),
          dieta_id: p.dieta_id,
          ingestao_ms_kg_pv: p.ingestao_ms_kg_pv.toString(),
        }))
        setPeriodos(periodosCarregados)
        setHasPeriodosSalvos(true)
      } else {
        // Se não tem períodos, limpa o array
        setPeriodos([])
        setHasPeriodosSalvos(false)
      }
    } catch (error: any) {
      console.error('Erro ao carregar períodos:', error)
    }
  }

  async function openPeriodosDialog() {
    await loadDietas()
    await loadPeriodosExistentes()
    setPeriodosDialogOpen(true)
  }

  function addPeriodo() {
    const ultimoPeriodo = periodos[periodos.length - 1]
    const diaInicial = ultimoPeriodo ? parseInt(ultimoPeriodo.dia_final) + 1 : 1
    
    setPeriodos([
      ...periodos,
      {
        dia_inicial: diaInicial.toString(),
        dia_final: lote?.dias_planejados.toString() || diaInicial.toString(),
        dieta_id: '',
        ingestao_ms_kg_pv: '2.5',
      },
    ])
  }

  function updatePeriodo(index: number, field: keyof PeriodoForm, value: string) {
    const newPeriodos = [...periodos]
    newPeriodos[index] = { ...newPeriodos[index], [field]: value }
    setPeriodos(newPeriodos)
  }

  function removePeriodo(index: number) {
    setPeriodoToDelete(index)
  }

  function confirmDeletePeriodo() {
    if (periodoToDelete === null) return
    setPeriodos(periodos.filter((_, i) => i !== periodoToDelete))
    setPeriodoToDelete(null)
  }

  function calcularTotaisPeriodo(periodo: PeriodoForm) {
    if (!lote || !periodo.dieta_id || !periodo.ingestao_ms_kg_pv) {
      return { totalKgMSBoi: 0, totalKgMNBoi: 0, totalKgMNLote: 0 }
    }

    const pesoInicial = lote.peso_medio_entrada
    const gmd = lote.gmd_projetado
    const ingestaoPercent = parseFloat(periodo.ingestao_ms_kg_pv)
    const qtdAnimais = lote.quantidade_animais
    
    const dietaSelecionada = dietas.find(d => d.id === periodo.dieta_id)
    const msMediaDieta = dietaSelecionada ? Number(dietaSelecionada.ms_media) : 0

    if (msMediaDieta === 0) return { totalKgMSBoi: 0, totalKgMNBoi: 0, totalKgMNLote: 0 }

    let totalKgMSBoi = 0
    let totalKgMNBoi = 0

    const diaInicial = parseInt(periodo.dia_inicial)
    const diaFinal = parseInt(periodo.dia_final)
    
    for (let dia = diaInicial; dia <= diaFinal; dia++) {
      const pesoDoDia = pesoInicial + (gmd * (dia - 1))
      const kgMSBoiDia = pesoDoDia * (ingestaoPercent / 100)
      const kgMNBoiDia = kgMSBoiDia / (msMediaDieta / 100)
      
      totalKgMSBoi += kgMSBoiDia
      totalKgMNBoi += kgMNBoiDia
    }

    const totalKgMNLote = totalKgMNBoi * qtdAnimais

    return {
      totalKgMSBoi,
      totalKgMNBoi,
      totalKgMNLote,
    }
  }

  // Gerar dias individuais a partir dos períodos configurados
  function gerarDiasIndividuais() {
    if (!lote) return []

    const pesoInicial = lote.peso_medio_entrada
    const gmd = lote.gmd_projetado
    const diasIndividuais: any[] = []

    periodos.forEach((periodo) => {
      const diaInicial = parseInt(periodo.dia_inicial)
      const diaFinal = parseInt(periodo.dia_final)
      const ingestaoPercent = parseFloat(periodo.ingestao_ms_kg_pv)
      
      const dietaSelecionada = dietas.find(d => d.id === periodo.dieta_id)
      const msMediaDieta = dietaSelecionada ? Number(dietaSelecionada.ms_media) : 0

      for (let dia = diaInicial; dia <= diaFinal; dia++) {
        const pesoDoDia = pesoInicial + (gmd * (dia - 1))
        const kgMSBoiDia = pesoDoDia * (ingestaoPercent / 100)
        const kgMNBoiDia = msMediaDieta > 0 ? kgMSBoiDia / (msMediaDieta / 100) : 0
        const qtdAnimais = lote.quantidade_animais
        const kgMNLoteDia = kgMNBoiDia * qtdAnimais

        diasIndividuais.push({
          dia,
          peso: pesoDoDia,
          dietaNome: dietaSelecionada?.nome || '-',
          ingestao: ingestaoPercent,
          kgMSBoiDia,
          kgMNBoiDia,
          kgMNLoteDia,
        })
      }
    })

    return diasIndividuais
  }

  async function handleSavePeriodos() {
    if (!lote) return

    // Validações
    if (periodos.length === 0) {
      toast.error('Adicione pelo menos um período')
      return
    }

    for (let i = 0; i < periodos.length; i++) {
      const periodo = periodos[i]
      const numeroPerido = i + 1
      
      if (!periodo.dia_inicial || parseInt(periodo.dia_inicial) <= 0) {
        toast.error(`Período ${numeroPerido}: Dia inicial inválido`)
        return
      }
      
      if (!periodo.dia_final || parseInt(periodo.dia_final) <= 0) {
        toast.error(`Período ${numeroPerido}: Dia final inválido`)
        return
      }
      
      if (parseInt(periodo.dia_final) < parseInt(periodo.dia_inicial)) {
        toast.error(`Período ${numeroPerido}: Dia final deve ser maior ou igual ao dia inicial`)
        return
      }
      
      if (!periodo.dieta_id || periodo.dieta_id === '') {
        toast.error(`Período ${numeroPerido}: Selecione uma dieta`)
        return
      }
      
      if (!periodo.ingestao_ms_kg_pv || parseFloat(periodo.ingestao_ms_kg_pv) <= 0) {
        toast.error(`Período ${numeroPerido}: Ingestão MS/kg PV deve ser maior que zero`)
        return
      }
    }

    const totalDias = periodos.reduce((sum, p) => {
      return sum + (parseInt(p.dia_final) - parseInt(p.dia_inicial) + 1)
    }, 0)

    if (totalDias !== lote.dias_planejados) {
      toast.error(
        `Os períodos devem cobrir todos os ${lote.dias_planejados} dias do lote. Atualmente cobrem ${totalDias} dias.`
      )
      return
    }

    try {
      setSubmittingPeriodos(true)

      // Buscar user para pegar cliente_id e empresa_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data: cliente } = await supabase
        .from('clientes')
        .select('empresa_id')
        .eq('id', user.id)
        .single()

      // Deletar períodos antigos do lote
      const { error: deleteError } = await supabase
        .from('periodos_alimentacao_lote')
        .delete()
        .eq('lote_id', lote.id)

      if (deleteError) throw deleteError

      // Inserir novos períodos
      for (const [index, periodo] of periodos.entries()) {
        const { error: insertError } = await supabase
          .from('periodos_alimentacao_lote')
          .insert({
            lote_id: lote.id,
            dia_inicial: parseInt(periodo.dia_inicial),
            dia_final: parseInt(periodo.dia_final),
            dieta_id: periodo.dieta_id,
            ingestao_ms_kg_pv: parseFloat(periodo.ingestao_ms_kg_pv),
            ordem: index,
            cliente_id: user.id,
            empresa_id: cliente?.empresa_id || null,
          })

        if (insertError) throw insertError
      }

      toast.success('Períodos salvos com sucesso!')
      setHasPeriodosSalvos(true)
      setPeriodosDialogOpen(false)
      
      // Recarregar indicadores (que agora incluirão custos de alimentação)
      fetchLoteDetalhes()
    } catch (error: any) {
      console.error('Erro ao salvar períodos:', error)
      toast.error('Erro ao salvar períodos: ' + (error.message || 'Erro desconhecido'))
    } finally {
      setSubmittingPeriodos(false)
    }
  }

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex h-screen items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Carregando...</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  if (!lote) {
    return null
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/lotes">Lotes</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{lote.nome}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        <div className="h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="p-4 md:p-8">
            <div className="mx-auto w-full max-w-7xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link href="/lotes">
                  <Button variant="outline" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold">{lote.nome}</h1>
                  <p className="text-sm text-muted-foreground">
                    {lote.currais?.nome || 'Sem curral'} • {lote.quantidade_animais} animais
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={openPeriodosDialog}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  size="sm"
                >
                  <Utensils className="h-4 w-4 mr-2" />
                  {hasPeriodosSalvos ? 'Editar Períodos de Alimentação' : 'Períodos de Alimentação'}
                </Button>
                <Badge variant={lote.status === 'ATIVO' ? 'default' : 'secondary'}>
                  {lote.status}
                </Badge>
              </div>
            </div>

            {/* Informações Básicas */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Informações do Lote</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Data Entrada</p>
                    <p className="text-sm font-semibold">{formatDate(lote.data_entrada)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Dias Planejados</p>
                    <p className="text-sm font-semibold">{lote.dias_planejados} dias</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Peso Médio Entrada</p>
                    <p className="text-sm font-semibold">{formatNumber(lote.peso_medio_entrada)} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">GMD Projetado</p>
                    <p className="text-sm font-semibold">{formatNumber(lote.gmd_projetado)} kg/dia</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor Compra</p>
                    <p className="text-sm font-semibold">{formatCurrency(lote.valor_compra_kg_projetado)}/kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Rendimento Carcaça</p>
                    <p className="text-sm font-semibold">{formatNumber(lote.rendimento_carcaca_projetado)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor Venda</p>
                    <p className="text-sm font-semibold">{formatCurrency(lote.valor_venda_projetado)}/@</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Área</p>
                    <p className="text-sm font-semibold">{formatNumber(lote.currais?.area_m2 || 0)} m²</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {indicadores && (
              <>
                {/* Indicadores Temporais */}
                <div>
                  <h2 className="text-lg font-semibold mb-3">Indicadores Temporais</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium">Dias Decorridos</CardTitle>
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="pt-1">
                        <div className="text-xl font-bold">{indicadores.dias_decorridos}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">dias desde a entrada</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium">Dias Restantes</CardTitle>
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="pt-1">
                        <div className="text-xl font-bold">{indicadores.dias_restantes}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">até finalização planejada</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium">Animais/m²</CardTitle>
                        <Users className="h-3 w-3 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="pt-1">
                        <div className="text-xl font-bold">{formatNumber(indicadores.animais_por_m2, 4)}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">densidade do lote</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Indicadores Zootécnicos */}
                <div>
                  <h2 className="text-lg font-semibold mb-3">Indicadores Zootécnicos</h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium">Peso Saída</CardTitle>
                        <Weight className="h-3 w-3 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="pt-1">
                        <div className="text-xl font-bold">{formatNumber(indicadores.peso_saida_projetado)}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">kg projetado</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium">Peso Carcaça</CardTitle>
                        <Beef className="h-3 w-3 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="pt-1">
                        <div className="text-xl font-bold">{formatNumber(indicadores.peso_carcaca_projetado)}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">kg projetado</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium">@ Carcaça</CardTitle>
                        <Beef className="h-3 w-3 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="pt-1">
                        <div className="text-xl font-bold">{formatNumber(indicadores.arrobas_carcaca_projetado)}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">@ por animal</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium">@ Produzidas</CardTitle>
                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="pt-1">
                        <div className="text-xl font-bold">{formatNumber(indicadores.arrobas_produzidas_boi_projetado)}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">@ ganho/animal</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium">@ Vivo Entrada</CardTitle>
                        <Weight className="h-3 w-3 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="pt-1">
                        <div className="text-xl font-bold">{formatNumber(indicadores.arrobas_vivo_entrada)}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">@ vivo</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium">@ Vivo Saída</CardTitle>
                        <Weight className="h-3 w-3 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="pt-1">
                        <div className="text-xl font-bold">{formatNumber(indicadores.arrobas_vivo_saida)}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">@ vivo</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium">GMD Carcaça</CardTitle>
                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="pt-1">
                        <div className="text-xl font-bold">{formatNumber(indicadores.gmd_carcaca_projetado)}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">kg/dia</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium">Produção @/Mês</CardTitle>
                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="pt-1">
                        <div className="text-xl font-bold">{formatNumber(indicadores.producao_arroba_mes_projetado)}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">@/mês</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Indicadores Econômicos */}
                <div>
                  <h2 className="text-lg font-semibold mb-3">Indicadores Econômicos</h2>
                  
                  {/* Grid de Custos Detalhados */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium">Custo Compra Total</CardTitle>
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="pt-1">
                        <div className="text-xl font-bold">{formatCurrency(indicadores.custo_compra_total_projetado)}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">investimento inicial</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium">Custo Fixo Total</CardTitle>
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="pt-1">
                        <div className="text-xl font-bold">{formatCurrency(indicadores.custo_fixo_total_projetado)}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">custos fixos</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium">Custo Protocolo</CardTitle>
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="pt-1">
                        <div className="text-xl font-bold">{formatCurrency(indicadores.custo_protocolo_total_projetado)}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">sanitário</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium">Custo Alimentação</CardTitle>
                        <Utensils className="h-3 w-3 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="pt-1">
                        <div className="text-xl font-bold">{formatCurrency(indicadores.custo_alimentacao_total_projetado || 0)}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">dietas e nutrição</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Grid de Totais e Resultados */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium">Custo Total</CardTitle>
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="pt-1">
                        <div className="text-2xl font-bold">{formatCurrency(indicadores.custo_total_projetado)}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">investimento total</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-green-50 dark:bg-green-950">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium">Receita Total</CardTitle>
                        <DollarSign className="h-3 w-3 text-green-600" />
                      </CardHeader>
                      <CardContent className="pt-1">
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(indicadores.receita_total_projetada)}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">receita projetada</p>
                      </CardContent>
                    </Card>

                    <Card className={`${indicadores.lucro_bruto_projetado >= 0 ? 'bg-blue-50 dark:bg-blue-950' : 'bg-red-50 dark:bg-red-950'}`}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium">Lucro Bruto</CardTitle>
                        <TrendingUp className={`h-3 w-3 ${indicadores.lucro_bruto_projetado >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
                      </CardHeader>
                      <CardContent className="pt-1">
                        <div className={`text-2xl font-bold ${indicadores.lucro_bruto_projetado >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {formatCurrency(indicadores.lucro_bruto_projetado)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Margem: {formatNumber(indicadores.margem_percentual_projetada)}%
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium">Custo/@</CardTitle>
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="pt-1">
                        <div className="text-xl font-bold">{formatCurrency(indicadores.custo_por_arroba_projetado)}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">custo de produção</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium">Lucro/Cabeça</CardTitle>
                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="pt-1">
                        <div className="text-xl font-bold">{formatCurrency(indicadores.lucro_por_cabeca_projetado)}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">por animal</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium">Dias/@</CardTitle>
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="pt-1">
                        <div className="text-xl font-bold">{formatNumber(indicadores.dias_por_arroba_projetado)}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">dias por arroba</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            )}

            {lote.observacoes && (
              <Card>
                <CardHeader>
                  <CardTitle>Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{lote.observacoes}</p>
                </CardContent>
              </Card>
            )}
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Modal de Períodos de Alimentação */}
      <Dialog open={periodosDialogOpen} onOpenChange={setPeriodosDialogOpen}>
        <DialogContent className="!max-w-[50vw] !w-[50vw] max-h-[80vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>Períodos de Alimentação</DialogTitle>
            <DialogDescription>
              Configure as dietas e ingestão por período. Os períodos devem cobrir todos os {lote?.dias_planejados} dias do lote.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 px-6 py-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {periodos.length === 0 ? 'Nenhum período adicionado' : `${periodos.length} período(s) configurado(s)`}
              </p>
              <Button
                type="button"
                onClick={addPeriodo}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Período
              </Button>
            </div>

            {periodos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed rounded-lg">
                <Utensils className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-sm mb-4">
                  Nenhum período adicionado
                </p>
                <Button onClick={addPeriodo} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Primeiro Período
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-visible border rounded-lg">
                <Table className="min-w-[1200px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Dia Inicial</TableHead>
                      <TableHead className="text-xs">Dia Final</TableHead>
                      <TableHead className="text-xs">Dieta</TableHead>
                      <TableHead className="text-xs">Ingestão MS/kg PV (%)</TableHead>
                      <TableHead className="text-xs text-right">Total kg MS/boi</TableHead>
                      <TableHead className="text-xs text-right">Total kg MN/boi</TableHead>
                      <TableHead className="text-xs text-right">Total kg MN/lote</TableHead>
                      <TableHead className="text-xs w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periodos.map((periodo, index) => {
                      const totais = calcularTotaisPeriodo(periodo)
                      return (
                        <TableRow key={index}>
                          <TableCell>
                            <Input
                              type="number"
                              value={periodo.dia_inicial}
                              onChange={(e) => updatePeriodo(index, 'dia_inicial', e.target.value)}
                              className="h-8 text-xs"
                              required
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={periodo.dia_final}
                              onChange={(e) => updatePeriodo(index, 'dia_final', e.target.value)}
                              className="h-8 text-xs"
                              required
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={periodo.dieta_id}
                              onValueChange={(value) => updatePeriodo(index, 'dieta_id', value)}
                            >
                              <SelectTrigger className={`h-8 text-xs ${!periodo.dieta_id ? 'border-red-300' : ''}`}>
                                <SelectValue placeholder="Selecione uma dieta" />
                              </SelectTrigger>
                              <SelectContent>
                                {dietas.map((d) => (
                                  <SelectItem key={d.id} value={d.id}>
                                    {d.nome} (MS: {d.ms_media}%)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.1"
                              value={periodo.ingestao_ms_kg_pv}
                              onChange={(e) => updatePeriodo(index, 'ingestao_ms_kg_pv', e.target.value)}
                              className="h-8 text-xs"
                              required
                            />
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatNumber(totais.totalKgMSBoi)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatNumber(totais.totalKgMNBoi)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatNumber(totais.totalKgMNLote)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removePeriodo(index)}
                              className="h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Dias Individuais Gerados */}
            {periodos.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <CardTitle className="text-sm">Dias Configurados</CardTitle>
                      <CardDescription className="text-xs">
                        Visualização dia a dia com peso progressivo
                      </CardDescription>
                    </div>
                    <Badge variant={gerarDiasIndividuais().length === lote?.dias_planejados ? 'default' : 'secondary'}>
                      {gerarDiasIndividuais().length} / {lote?.dias_planejados || 0} dias
                    </Badge>
                  </div>
                  <Progress 
                    value={(gerarDiasIndividuais().length / (lote?.dias_planejados || 1)) * 100} 
                    className="h-2"
                  />
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto max-h-96 overflow-y-auto border rounded-lg">
                    <Table className="min-w-[800px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Dia</TableHead>
                          <TableHead className="text-xs text-right">Peso (kg)</TableHead>
                          <TableHead className="text-xs">Dieta</TableHead>
                          <TableHead className="text-xs text-right">IMS %PV</TableHead>
                          <TableHead className="text-xs text-right">kg MS/dia</TableHead>
                          <TableHead className="text-xs text-right">kg MN/boi/dia</TableHead>
                          <TableHead className="text-xs text-right">kg MN/lote/dia</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gerarDiasIndividuais().map((dia, index) => (
                          <TableRow key={`dia-${dia.dia}-${index}`}>
                            <TableCell className="text-xs font-medium">Dia {dia.dia}</TableCell>
                            <TableCell className="text-xs text-right">{formatNumber(dia.peso)}</TableCell>
                            <TableCell className="text-xs">{dia.dietaNome}</TableCell>
                            <TableCell className="text-xs text-right">{formatNumber(dia.ingestao)}%</TableCell>
                            <TableCell className="text-xs text-right">{formatNumber(dia.kgMSBoiDia)}</TableCell>
                            <TableCell className="text-xs text-right">{formatNumber(dia.kgMNBoiDia)}</TableCell>
                            <TableCell className="text-xs text-right font-medium">{formatNumber(dia.kgMNLoteDia)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPeriodosDialogOpen(false)
                setPeriodos([])
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSavePeriodos}
              disabled={submittingPeriodos || periodos.length === 0}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {submittingPeriodos ? 'Salvando...' : 'Salvar Períodos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog para confirmar exclusão de período */}
      <AlertDialog open={periodoToDelete !== null} onOpenChange={(open) => !open && setPeriodoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Período</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este período? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePeriodo} className="bg-red-600 hover:bg-red-700">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}
