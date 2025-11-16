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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Pencil, Trash2, Loader2, Search, Calendar as CalendarIcon, TrendingUp, DollarSign, Eye } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface Lote {
  id: string
  nome: string
  curral_id: string | null
  data_entrada: string
  dias_planejados: number
  data_inicial: string
  data_final_projetada: string | null
  quantidade_animais: number
  peso_medio_entrada: number | null
  gmd_projetado: number | null
  peso_medio_saida_projetado: number | null
  custo_fixo_cabeca_dia_projetado: number | null
  custo_protocolo_sanitario_projetado: number | null
  rendimento_carcaca_projetado: number | null
  valor_venda_projetado: number | null
  kg_por_cabeca_atual: number | null
  status: 'ATIVO' | 'FINALIZADO' | 'CANCELADO'
  observacoes: string | null
  created_at: string
  updated_at: string
  curral?: { nome: string }
  total_animais_individuais?: number
  total_animais_lote?: number
  total_animais?: number
  capacidade_disponivel?: number
  percentual_ocupacao?: number
}

interface Curral {
  id: string
  nome: string
}

export default function LotesPage() {
  const [lotes, setLotes] = useState<Lote[]>([])
  const [currais, setCurrais] = useState<Curral[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingLote, setEditingLote] = useState<Lote | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('TODOS')
  
  // AlertDialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [finalizarDialogOpen, setFinalizarDialogOpen] = useState(false)
  const [loteToDelete, setLoteToDelete] = useState<string | null>(null)
  const [loteToFinalizar, setLoteToFinalizar] = useState<string | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    curral_id: '',
    data_entrada: '',
    dias_planejados: '',
    quantidade_animais: '',
    peso_medio_entrada: '',
    gmd_projetado: '',
    valor_compra_kg_projetado: '',
    custo_fixo_cabeca_dia_projetado: '',
    custo_protocolo_sanitario_projetado: '',
    rendimento_carcaca_projetado: '',
    valor_venda_projetado: '',
    observacoes: ''
  })

  const supabase = createClient()

  useEffect(() => {
    let mounted = true
    
    async function loadData() {
      if (mounted) {
        await fetchLotes()
        await fetchCurrais()
      }
    }
    
    loadData()
    
    return () => {
      mounted = false
    }
  }, [])

  async function fetchLotes() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('lotes_com_totais')
        .select(`
          *,
          curral:curral_id(nome)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLotes(data || [])
    } catch (error: any) {
      toast.error('Erro ao carregar lotes: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchCurrais() {
    try {
      // Buscar currais disponíveis (sem lote ativo ou todos se for para edição)
      const { data, error } = await supabase
        .from('currais')
        .select('id, nome')
        .order('nome')

      if (error) {
        console.error('Erro ao carregar currais:', error)
        console.error('Detalhes do erro:', JSON.stringify(error, null, 2))
        toast.error('Erro ao carregar currais: ' + error.message)
        return
      }
      
      console.log('Currais carregados:', data)
      
      // Remover duplicatas baseado no ID
      const uniqueCurrais = data?.filter((curral, index, self) => 
        index === self.findIndex((c) => c.id === curral.id)
      ) || []
      
      console.log('Currais únicos:', uniqueCurrais)
      setCurrais(uniqueCurrais)
    } catch (error: any) {
      console.error('Erro ao carregar currais:', error)
      toast.error('Erro ao carregar currais: ' + error.message)
    }
  }


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    try {
      // Buscar empresa_id do usuário
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data: cliente } = await supabase
        .from('clientes')
        .select('empresa_id')
        .eq('id', user.id)
        .single()

      const loteData = {
        nome: formData.nome,
        curral_id: formData.curral_id || null,
        data_entrada: formData.data_entrada,
        dias_planejados: parseInt(formData.dias_planejados),
        data_inicial: formData.data_entrada, // data_inicial = data_entrada
        quantidade_animais: parseInt(formData.quantidade_animais),
        peso_medio_entrada: formData.peso_medio_entrada ? parseFloat(formData.peso_medio_entrada) : null,
        gmd_projetado: formData.gmd_projetado ? parseFloat(formData.gmd_projetado) : null,
        valor_compra_kg_projetado: formData.valor_compra_kg_projetado ? parseFloat(formData.valor_compra_kg_projetado) : 0,
        custo_fixo_cabeca_dia_projetado: formData.custo_fixo_cabeca_dia_projetado ? parseFloat(formData.custo_fixo_cabeca_dia_projetado) : 0,
        custo_protocolo_sanitario_projetado: formData.custo_protocolo_sanitario_projetado ? parseFloat(formData.custo_protocolo_sanitario_projetado) : 0,
        rendimento_carcaca_projetado: formData.rendimento_carcaca_projetado ? parseFloat(formData.rendimento_carcaca_projetado) : null,
        valor_venda_projetado: formData.valor_venda_projetado ? parseFloat(formData.valor_venda_projetado) : null,
        observacoes: formData.observacoes || null,
        status: 'ATIVO',
        cliente_id: user.id,
        empresa_id: cliente?.empresa_id || null
      }

      if (editingLote) {
        const { error } = await supabase
          .from('lotes')
          .update(loteData)
          .eq('id', editingLote.id)

        if (error) throw error
        toast.success('Lote atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('lotes')
          .insert([loteData])

        if (error) throw error
        toast.success('Lote criado com sucesso!')
      }

      setDialogOpen(false)
      resetForm()
      fetchLotes()
    } catch (error: any) {
      toast.error('Erro ao salvar lote: ' + error.message)
    }
  }

  function handleEdit(lote: Lote) {
    setEditingLote(lote)
    setFormData({
      nome: lote.nome,
      curral_id: lote.curral_id || '',
      data_entrada: lote.data_entrada,
      dias_planejados: lote.dias_planejados.toString(),
      quantidade_animais: lote.quantidade_animais.toString(),
      peso_medio_entrada: lote.peso_medio_entrada?.toString() || '',
      gmd_projetado: lote.gmd_projetado?.toString() || '',
      valor_compra_kg_projetado: (lote as any).valor_compra_kg_projetado?.toString() || '',
      custo_fixo_cabeca_dia_projetado: lote.custo_fixo_cabeca_dia_projetado?.toString() || '',
      custo_protocolo_sanitario_projetado: lote.custo_protocolo_sanitario_projetado?.toString() || '',
      rendimento_carcaca_projetado: lote.rendimento_carcaca_projetado?.toString() || '',
      valor_venda_projetado: lote.valor_venda_projetado?.toString() || '',
      observacoes: lote.observacoes || ''
    })
    setDialogOpen(true)
  }

  function openDeleteDialog(id: string) {
    setLoteToDelete(id)
    setDeleteDialogOpen(true)
  }

  async function confirmDelete() {
    if (!loteToDelete) return

    try {
      const { error } = await supabase
        .from('lotes')
        .delete()
        .eq('id', loteToDelete)

      if (error) throw error
      toast.success('Lote excluído com sucesso!')
      fetchLotes()
    } catch (error: any) {
      toast.error('Erro ao excluir lote: ' + error.message)
    } finally {
      setDeleteDialogOpen(false)
      setLoteToDelete(null)
    }
  }

  function openFinalizarDialog(id: string) {
    setLoteToFinalizar(id)
    setFinalizarDialogOpen(true)
  }

  async function confirmFinalizar() {
    if (!loteToFinalizar) return

    try {
      const { error } = await supabase
        .from('lotes')
        .update({ status: 'FINALIZADO' })
        .eq('id', loteToFinalizar)

      if (error) throw error
      toast.success('Lote finalizado com sucesso!')
      fetchLotes()
    } catch (error: any) {
      toast.error('Erro ao finalizar lote: ' + error.message)
    } finally {
      setFinalizarDialogOpen(false)
      setLoteToFinalizar(null)
    }
  }

  function resetForm() {
    setEditingLote(null)
    setFormData({
      nome: '',
      curral_id: '',
      data_entrada: '',
      dias_planejados: '',
      quantidade_animais: '',
      peso_medio_entrada: '',
      gmd_projetado: '',
      valor_compra_kg_projetado: '',
      custo_fixo_cabeca_dia_projetado: '',
      custo_protocolo_sanitario_projetado: '',
      rendimento_carcaca_projetado: '',
      valor_venda_projetado: '',
      observacoes: ''
    })
  }

  const filteredLotes = lotes.filter(lote => {
    const matchesSearch = lote.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lote.curral?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'TODOS' || lote.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const lotesAtivos = lotes.filter(l => l.status === 'ATIVO').length
  const totalAnimais = lotes.filter(l => l.status === 'ATIVO').reduce((sum, l) => sum + (l.total_animais || 0), 0)

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 justify-between transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">
                    Feedtratto
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Lotes</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="px-4">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 md:p-8">
          <div className="mx-auto w-full max-w-7xl space-y-4">
          {/* Cards de Resumo */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lotes Ativos</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{lotesAtivos}</div>
                <p className="text-xs text-muted-foreground">
                  {lotes.filter(l => l.status === 'FINALIZADO').length} finalizados
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Animais</CardTitle>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAnimais.toLocaleString('pt-BR')}</div>
                <p className="text-xs text-muted-foreground">
                  Em lotes ativos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Média de Animais/Lote</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {lotesAtivos > 0 ? Math.round(totalAnimais / lotesAtivos) : 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Animais por lote
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filtros e Ações */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar lotes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="ATIVO">Ativos</SelectItem>
                  <SelectItem value="FINALIZADO">Finalizados</SelectItem>
                  <SelectItem value="CANCELADO">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open)
              if (!open) resetForm()
            }}>
              <DialogTrigger asChild>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Lote
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingLote ? 'Editar Lote' : 'Novo Lote'}</DialogTitle>
                  <DialogDescription>
                    Preencha os dados do lote de confinamento
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Identificação */}
                    <div className="col-span-2">
                      <h3 className="font-semibold mb-2">Identificação</h3>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome do Lote *</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        placeholder="Ex: Lote A1"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="curral_id">Curral (opcional)</Label>
                      <Select
                        value={formData.curral_id || undefined}
                        onValueChange={(value) => setFormData({ ...formData, curral_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={currais.length === 0 ? "Nenhum curral cadastrado" : "Selecione um curral"} />
                        </SelectTrigger>
                        <SelectContent>
                          {currais.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                              Nenhum curral cadastrado
                            </div>
                          ) : (
                            currais.map((curral) => (
                              <SelectItem key={curral.id} value={curral.id}>
                                {curral.nome}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Temporal */}
                    <div className="col-span-2 mt-4">
                      <h3 className="font-semibold mb-2">Planejamento Temporal</h3>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="data_entrada">Data de Entrada *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.data_entrada && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.data_entrada ? (
                              format(new Date(formData.data_entrada), "dd/MM/yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione a data</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.data_entrada ? new Date(formData.data_entrada) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                const year = date.getFullYear()
                                const month = String(date.getMonth() + 1).padStart(2, '0')
                                const day = String(date.getDate()).padStart(2, '0')
                                setFormData({ ...formData, data_entrada: `${year}-${month}-${day}` })
                              }
                            }}
                            locale={ptBR}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dias_planejados">Dias Planejados *</Label>
                      <Input
                        id="dias_planejados"
                        type="number"
                        min="1"
                        value={formData.dias_planejados}
                        onChange={(e) => setFormData({ ...formData, dias_planejados: e.target.value })}
                        placeholder="Sugestão: 90"
                        required
                      />
                    </div>

                    {/* Animais */}
                    <div className="col-span-2 mt-4">
                      <h3 className="font-semibold mb-2">Animais</h3>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quantidade_animais">Quantidade de Animais *</Label>
                      <Input
                        id="quantidade_animais"
                        type="number"
                        min="1"
                        value={formData.quantidade_animais}
                        onChange={(e) => setFormData({ ...formData, quantidade_animais: e.target.value })}
                        placeholder="Ex: 100"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="peso_medio_entrada">Peso Médio Entrada (kg)</Label>
                      <Input
                        id="peso_medio_entrada"
                        type="number"
                        step="0.01"
                        value={formData.peso_medio_entrada}
                        onChange={(e) => setFormData({ ...formData, peso_medio_entrada: e.target.value })}
                        placeholder="Ex: 350.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="valor_compra_kg_projetado">Valor Compra/KG (R$)</Label>
                      <Input
                        id="valor_compra_kg_projetado"
                        type="number"
                        step="0.01"
                        value={formData.valor_compra_kg_projetado}
                        onChange={(e) => setFormData({ ...formData, valor_compra_kg_projetado: e.target.value })}
                        placeholder="Ex: 18.50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gmd_projetado">GMD Projetado (kg/dia)</Label>
                      <Input
                        id="gmd_projetado"
                        type="number"
                        step="0.01"
                        value={formData.gmd_projetado}
                        onChange={(e) => setFormData({ ...formData, gmd_projetado: e.target.value })}
                        placeholder="Ex: 1.50"
                      />
                    </div>

                    <div className="space-y-2">
                      {/* Espaço vazio para manter grid */}
                    </div>

                    {/* Custos */}
                    <div className="col-span-2 mt-4">
                      <h3 className="font-semibold mb-2">Custos Projetados</h3>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="custo_fixo_cabeca_dia_projetado">Custo Fixo/Cabeça/Dia (R$)</Label>
                      <Input
                        id="custo_fixo_cabeca_dia_projetado"
                        type="number"
                        step="0.01"
                        value={formData.custo_fixo_cabeca_dia_projetado}
                        onChange={(e) => setFormData({ ...formData, custo_fixo_cabeca_dia_projetado: e.target.value })}
                        placeholder="Sugestão: 2.50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="custo_protocolo_sanitario_projetado">Protoc. Sanitário/Cab (R$)</Label>
                      <Input
                        id="custo_protocolo_sanitario_projetado"
                        type="number"
                        step="0.01"
                        value={formData.custo_protocolo_sanitario_projetado}
                        onChange={(e) => setFormData({ ...formData, custo_protocolo_sanitario_projetado: e.target.value })}
                        placeholder="Sugestão: 15.00"
                      />
                    </div>

                    {/* Saída */}
                    <div className="col-span-2 mt-4">
                      <h3 className="font-semibold mb-2">Projeção de Saída</h3>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rendimento_carcaca_projetado">Rendimento Carcaça (%)</Label>
                      <Input
                        id="rendimento_carcaca_projetado"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.rendimento_carcaca_projetado}
                        onChange={(e) => setFormData({ ...formData, rendimento_carcaca_projetado: e.target.value })}
                        placeholder="Ex: 54.5"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="valor_venda_projetado">Valor Venda Projetado (R$/@)</Label>
                      <Input
                        id="valor_venda_projetado"
                        type="number"
                        step="0.01"
                        value={formData.valor_venda_projetado}
                        onChange={(e) => setFormData({ ...formData, valor_venda_projetado: e.target.value })}
                        placeholder="Ex: 280.00"
                      />
                    </div>

                    {/* Observações */}
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="observacoes">Observações</Label>
                      <Input
                        id="observacoes"
                        value={formData.observacoes}
                        onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                        placeholder="Observações adicionais..."
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white">
                      {editingLote ? 'Atualizar' : 'Criar'} Lote
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Tabela */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Curral</TableHead>
                  <TableHead>Animais</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead>Previsão Saída</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredLotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Nenhum lote encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLotes.map((lote) => (
                    <TableRow key={lote.id}>
                      <TableCell className="font-medium">{lote.nome}</TableCell>
                      <TableCell>{lote.curral?.nome || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold">{lote.total_animais || 0}</span>
                          {(lote.total_animais_individuais || 0) > 0 && (lote.total_animais_lote || 0) > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {lote.total_animais_individuais} ind. + {lote.total_animais_lote} lote
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(lote.data_entrada).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{lote.dias_planejados}</TableCell>
                      <TableCell>
                        {lote.data_final_projetada 
                          ? new Date(lote.data_final_projetada).toLocaleDateString('pt-BR')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          lote.status === 'ATIVO' ? 'default' :
                          lote.status === 'FINALIZADO' ? 'secondary' :
                          'destructive'
                        }>
                          {lote.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/lotes/${lote.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Ver Detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {lote.status === 'ATIVO' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(lote)}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openFinalizarDialog(lote.id)}
                                title="Finalizar"
                              >
                                <CalendarIcon className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(lote.id)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          </div>
        </div>
      </SidebarInset>

      {/* AlertDialog para Excluir */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lote</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lote? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog para Finalizar */}
      <AlertDialog open={finalizarDialogOpen} onOpenChange={setFinalizarDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar Lote</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja finalizar este lote? O status será alterado para FINALIZADO.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmFinalizar} className="bg-orange-500 hover:bg-orange-600">
              Finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}
