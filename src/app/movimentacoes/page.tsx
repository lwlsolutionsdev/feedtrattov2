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
import { Textarea } from "@/components/ui/textarea"
import { Plus, Loader2, Search, ArrowRightLeft, AlertCircle, Activity } from "lucide-react"
import { toast } from "sonner"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Movimentacao {
  id: string
  animal_id: string
  tipo_destino: 'LOTE' | 'REFUGO' | 'ENFERMARIA'
  data_movimentacao: string
  peso_movimentacao: number | null
  motivo: string | null
  observacoes: string | null
  created_at: string
  animais?: {
    brinco_visual: string | null
    brinco_eletronico: string | null
    racas: { nome: string }
  }
  lote_origem?: { nome: string } | null
  lote_destino?: { nome: string } | null
}

interface Animal {
  id: string
  brinco_visual: string | null
  brinco_eletronico: string | null
  lote_id: string
  curral_id: string | null
  peso_entrada: number
  racas?: { nome: string }
  lotes?: { nome: string; curral_id: string }
}

interface Lote {
  id: string
  nome: string
  curral_id: string
}

interface Curral {
  id: string
  nome: string
  capacidade_animais: number
}

export default function MovimentacoesPage() {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 50
  
  // Form states
  const [brincoSearch, setBrincoSearch] = useState('')
  const [animalSelecionado, setAnimalSelecionado] = useState<Animal | null>(null)
  const [buscandoAnimal, setBuscandoAnimal] = useState(false)
  const [tipoDestino, setTipoDestino] = useState<'LOTE' | 'REFUGO' | 'ENFERMARIA'>('LOTE')
  const [loteDestinoId, setLoteDestinoId] = useState('')
  const [curralDestinoId, setCurralDestinoId] = useState('')
  const [dataMovimentacao, setDataMovimentacao] = useState(new Date().toISOString().split('T')[0])
  const [pesoMovimentacao, setPesoMovimentacao] = useState('')
  const [motivo, setMotivo] = useState('')
  const [observacoes, setObservacoes] = useState('')
  
  const [lotes, setLotes] = useState<Lote[]>([])
  const [currais, setCurrais] = useState<Curral[]>([])

  const supabase = createClient()

  useEffect(() => {
    fetchLotes()
    fetchCurraisDisponiveis()
  }, [])

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchMovimentacoes()
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Buscar ao mudar de página
  useEffect(() => {
    fetchMovimentacoes()
  }, [currentPage])

  async function fetchMovimentacoes() {
    try {
      setLoading(true)
      
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      let query = supabase
        .from('movimentacoes_animais')
        .select(`
          *,
          animais (
            brinco_visual,
            brinco_eletronico,
            racas (nome)
          ),
          lote_origem:lote_origem_id (nome),
          lote_destino:lote_destino_id (nome)
        `, { count: 'exact' })
        .order('data_movimentacao', { ascending: false })
        .order('created_at', { ascending: false })

      if (searchTerm) {
        query = query.or(`motivo.ilike.%${searchTerm}%,observacoes.ilike.%${searchTerm}%`)
      }

      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error
      
      setMovimentacoes(data || [])
      setTotalCount(count || 0)
    } catch (error: any) {
      console.error('Erro ao buscar movimentações:', error)
      toast.error('Erro ao carregar movimentações')
    } finally {
      setLoading(false)
    }
  }

  async function fetchLotes() {
    try {
      const { data, error } = await supabase
        .from('lotes')
        .select('id, nome, curral_id')
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
      // Buscar todos os currais
      const { data: curraisData, error: curraisError } = await supabase
        .from('currais')
        .select('id, nome, capacidade_animais')
        .order('nome')

      if (curraisError) throw curraisError

      // Buscar lotes ativos e seus currais
      const { data: lotesAtivos, error: lotesError } = await supabase
        .from('lotes')
        .select('curral_id')
        .eq('status', 'ATIVO')

      if (lotesError) {
        console.warn('Aviso ao buscar lotes ativos:', lotesError)
        setCurrais(curraisData || [])
        return
      }

      // Filtrar currais que NÃO têm lotes ativos
      const curraisComLoteIds = new Set(lotesAtivos?.map(l => l.curral_id) || [])
      const curraisDisponiveis = curraisData?.filter(c => !curraisComLoteIds.has(c.id)) || []

      setCurrais(curraisDisponiveis)
    } catch (error: any) {
      console.error('Erro ao buscar currais disponíveis:', error)
    }
  }

  async function buscarAnimalPorBrinco() {
    if (!brincoSearch.trim()) {
      toast.error('Digite um brinco para buscar')
      return
    }

    try {
      setBuscandoAnimal(true)
      
      const { data, error } = await supabase
        .from('animais')
        .select(`
          *,
          racas (nome),
          lotes (nome, curral_id)
        `)
        .or(`brinco_visual.eq.${brincoSearch},brinco_eletronico.eq.${brincoSearch}`)
        .eq('status', 'ATIVO')
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          toast.error('Animal não encontrado ou não está ativo')
        } else {
          throw error
        }
        return
      }

      setAnimalSelecionado(data)
      setPesoMovimentacao(data.peso_entrada.toString())
      toast.success('Animal encontrado!')
    } catch (error: any) {
      console.error('Erro ao buscar animal:', error)
      toast.error('Erro ao buscar animal')
    } finally {
      setBuscandoAnimal(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!animalSelecionado) {
      toast.error('Busque um animal primeiro')
      return
    }

    if (tipoDestino === 'LOTE' && !loteDestinoId) {
      toast.error('Selecione um lote de destino')
      return
    }

    if (!motivo.trim()) {
      toast.error('Informe o motivo da movimentação')
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

      // Determinar curral_destino_id baseado no tipo de destino
      let curralFinal = null
      if (tipoDestino === 'LOTE' && loteDestinoId) {
        // Se for LOTE, pegar curral do lote OU o curral selecionado manualmente
        const loteDestino = lotes.find(l => l.id === loteDestinoId)
        curralFinal = curralDestinoId || loteDestino?.curral_id || null
      } else if (tipoDestino === 'REFUGO') {
        // Se for REFUGO, usar curral selecionado (opcional)
        curralFinal = curralDestinoId || null
      } else {
        // ENFERMARIA não tem curral
        curralFinal = null
      }

      const movimentacaoData = {
        animal_id: animalSelecionado.id,
        lote_origem_id: animalSelecionado.lote_id,
        curral_origem_id: animalSelecionado.curral_id,
        tipo_destino: tipoDestino,
        lote_destino_id: tipoDestino === 'LOTE' ? loteDestinoId : null,
        curral_destino_id: curralFinal,
        data_movimentacao: dataMovimentacao,
        peso_movimentacao: pesoMovimentacao ? parseFloat(pesoMovimentacao) : null,
        motivo: motivo,
        observacoes: observacoes || null,
        cliente_id: user.id,
        empresa_id: cliente?.empresa_id || null,
        created_by: user.id,
      }

      const { error } = await supabase
        .from('movimentacoes_animais')
        .insert(movimentacaoData)

      if (error) throw error
      
      toast.success('Movimentação registrada com sucesso!')
      handleCloseDialog()
      fetchMovimentacoes()
    } catch (error: any) {
      console.error('Erro ao salvar movimentação:', error)
      toast.error('Erro ao salvar movimentação: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleCloseDialog() {
    setOpen(false)
    setBrincoSearch('')
    setAnimalSelecionado(null)
    setTipoDestino('LOTE')
    setLoteDestinoId('')
    setCurralDestinoId('')
    setDataMovimentacao(new Date().toISOString().split('T')[0])
    setPesoMovimentacao('')
    setMotivo('')
    setObservacoes('')
  }

  function getTipoDestinoLabel(tipo: string) {
    const labels = {
      'LOTE': 'Lote',
      'REFUGO': 'Refugo',
      'ENFERMARIA': 'Enfermaria'
    }
    return labels[tipo as keyof typeof labels] || tipo
  }

  function getTipoDestinoBadge(tipo: string) {
    const variants: Record<string, { color: string; icon: string }> = {
      'LOTE': { color: 'bg-blue-500', icon: '📦' },
      'REFUGO': { color: 'bg-red-500', icon: '🗑️' },
      'ENFERMARIA': { color: 'bg-yellow-500', icon: '🏥' }
    }
    const variant = variants[tipo] || { color: 'bg-gray-500', icon: '❓' }
    return (
      <Badge className={`${variant.color} text-white`}>
        {variant.icon} {getTipoDestinoLabel(tipo)}
      </Badge>
    )
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
                  <BreadcrumbLink href="/">
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Movimentações</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="px-4">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="max-w-6xl mx-auto w-full space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold">
                  Movimentações de Animais
                  {totalCount > 0 && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({totalCount.toLocaleString('pt-BR')} {totalCount === 1 ? 'movimentação' : 'movimentações'})
                    </span>
                  )}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Registre transferências entre lotes, refugo e enfermaria
                </p>
              </div>
              <Button onClick={() => setOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Nova Movimentação
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por motivo ou observações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {loading ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Animal</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Peso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : movimentacoes.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Nenhuma movimentação registrada</EmptyTitle>
                  <EmptyDescription>
                    Comece registrando a primeira movimentação de animal
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button size="sm" onClick={() => setOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Plus className="mr-2 h-3 w-3" />
                    Nova Movimentação
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Animal</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Peso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentacoes.map((mov) => (
                      <TableRow key={mov.id}>
                        <TableCell className="font-medium">
                          {format(new Date(mov.data_movimentacao), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {mov.animais?.brinco_visual && (
                              <span className="text-sm font-medium">{mov.animais.brinco_visual}</span>
                            )}
                            {mov.animais?.brinco_eletronico && (
                              <span className="text-xs text-muted-foreground">
                                📡 {mov.animais.brinco_eletronico}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {mov.animais?.racas?.nome}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {mov.lote_origem?.nome || '-'}
                        </TableCell>
                        <TableCell>
                          {mov.tipo_destino === 'LOTE' ? mov.lote_destino?.nome : getTipoDestinoLabel(mov.tipo_destino)}
                        </TableCell>
                        <TableCell>
                          {getTipoDestinoBadge(mov.tipo_destino)}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {mov.motivo}
                        </TableCell>
                        <TableCell>
                          {mov.peso_movimentacao ? `${mov.peso_movimentacao.toFixed(2)} kg` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Paginação */}
            {!loading && totalCount > 0 && (
              <div className="flex items-center justify-between px-2 py-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount} movimentações
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    Primeira
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <div className="text-sm font-medium">
                    Página {currentPage} de {Math.ceil(totalCount / itemsPerPage)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
                  >
                    Próxima
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.ceil(totalCount / itemsPerPage))}
                    disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
                  >
                    Última
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dialog de Nova Movimentação */}
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCloseDialog()}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="text-base">Nova Movimentação</DialogTitle>
              <DialogDescription>
                Registre a transferência de um animal entre lotes ou para refugo/enfermaria
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Busca de Animal */}
              <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                <Label className="text-sm font-semibold">1. Buscar Animal</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite o brinco visual ou eletrônico"
                    value={brincoSearch}
                    onChange={(e) => setBrincoSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), buscarAnimalPorBrinco())}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={buscarAnimalPorBrinco}
                    disabled={buscandoAnimal}
                  >
                    {buscandoAnimal ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {animalSelecionado && (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                    <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                      ✓ Animal Encontrado
                    </p>
                    <div className="mt-2 space-y-1 text-sm">
                      {animalSelecionado.brinco_visual && (
                        <p><strong>Brinco Visual:</strong> {animalSelecionado.brinco_visual}</p>
                      )}
                      {animalSelecionado.brinco_eletronico && (
                        <p><strong>Brinco Eletrônico:</strong> {animalSelecionado.brinco_eletronico}</p>
                      )}
                      <p><strong>Raça:</strong> {animalSelecionado.racas?.nome}</p>
                      <p><strong>Lote Atual:</strong> {animalSelecionado.lotes?.nome}</p>
                    </div>
                  </div>
                )}
              </div>

              {animalSelecionado && (
                <>
                  {/* Tipo de Destino */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">2. Tipo de Destino *</Label>
                    <Select value={tipoDestino} onValueChange={(v) => setTipoDestino(v as any)} required>
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOTE">📦 Transferir para outro Lote</SelectItem>
                        <SelectItem value="REFUGO">🗑️ Enviar para Refugo</SelectItem>
                        <SelectItem value="ENFERMARIA">🏥 Enviar para Enfermaria</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lote Destino (só se tipo for LOTE) */}
                  {tipoDestino === 'LOTE' && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">3. Lote de Destino *</Label>
                      <Select value={loteDestinoId} onValueChange={setLoteDestinoId} required>
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue placeholder="Selecione o lote" />
                        </SelectTrigger>
                        <SelectContent>
                          {lotes
                            .filter(l => l.id !== animalSelecionado.lote_id)
                            .map((lote) => (
                              <SelectItem key={lote.id} value={lote.id}>
                                {lote.nome}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Curral Destino (para LOTE e REFUGO - opcional) */}
                  {(tipoDestino === 'LOTE' || tipoDestino === 'REFUGO') && currais.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm">
                        Curral {tipoDestino === 'REFUGO' ? 'de Refugo' : 'Específico'} (Opcional)
                      </Label>
                      <Select value={curralDestinoId} onValueChange={setCurralDestinoId}>
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue placeholder={tipoDestino === 'LOTE' ? "Usar curral do lote" : "Selecione um curral"} />
                        </SelectTrigger>
                        <SelectContent>
                          {currais.map((curral) => (
                            <SelectItem key={curral.id} value={curral.id}>
                              {curral.nome} (Cap: {curral.capacidade_animais})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {tipoDestino === 'REFUGO' 
                          ? 'Currais sem lotes ativos disponíveis para refugo'
                          : 'Deixe vazio para usar o curral do lote selecionado'}
                      </p>
                    </div>
                  )}

                  {/* Data e Peso */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Data da Movimentação *</Label>
                      <Input
                        type="date"
                        value={dataMovimentacao}
                        onChange={(e) => setDataMovimentacao(e.target.value)}
                        className="h-9"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Peso (kg)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={pesoMovimentacao}
                        onChange={(e) => setPesoMovimentacao(e.target.value)}
                        placeholder="Opcional"
                        className="h-9"
                      />
                    </div>
                  </div>

                  {/* Motivo */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Motivo *</Label>
                    <Input
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Ex: Separação por peso, tratamento veterinário..."
                      className="h-9"
                      required
                    />
                  </div>

                  {/* Observações */}
                  <div className="space-y-2">
                    <Label className="text-sm">Observações</Label>
                    <Textarea
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Informações adicionais sobre a movimentação"
                      rows={3}
                    />
                  </div>
                </>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting || !animalSelecionado}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                      Registrar Movimentação
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
