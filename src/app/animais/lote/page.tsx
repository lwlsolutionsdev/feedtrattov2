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
import { Plus, Pencil, Trash2, Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface LoteAnimais {
  id: string
  descricao: string | null
  quantidade: number
  data_entrada: string
  peso_medio: number
  peso_total: number
  tipo: 'FUNDO' | 'LEVE' | 'MEIO' | 'PESADO'
  valor_compra_kg: number
  valor_total: number
  status: string
  created_at: string
  racas?: { nome: string }
  categorias?: { nome: string }
  lote_confinamento?: { nome: string }
}

interface Raca {
  id: string
  nome: string
}

interface Categoria {
  id: string
  nome: string
  sexo: 'MACHO' | 'FEMEA'
}

interface Lote {
  id: string
  nome: string
}

export default function AnimaisLotePage() {
  const [lotesAnimais, setLotesAnimais] = useState<LoteAnimais[]>([])
  const [racas, setRacas] = useState<Raca[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingLote, setEditingLote] = useState<LoteAnimais | null>(null)
  const [deletingLote, setDeletingLote] = useState<LoteAnimais | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 50
  
  // Form states
  const [descricao, setDescricao] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [racaId, setRacaId] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [loteId, setLoteId] = useState('')
  const [dataEntrada, setDataEntrada] = useState(new Date().toISOString().split('T')[0])
  const [pesoMedio, setPesoMedio] = useState('')
  const [tipo, setTipo] = useState<'FUNDO' | 'LEVE' | 'MEIO' | 'PESADO'>('MEIO')
  const [valorCompraKg, setValorCompraKg] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchRacas()
    fetchCategorias()
    fetchLotes()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchLotesAnimais()
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    fetchLotesAnimais()
  }, [currentPage])

  async function fetchLotesAnimais() {
    try {
      setLoading(true)
      
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      let query = supabase
        .from('lotes_animais')
        .select(`
          *,
          racas (nome),
          categorias (nome),
          lote_confinamento:lote_confinamento_id (nome)
        `, { count: 'exact' })
        .order('data_entrada', { ascending: false })
        .order('created_at', { ascending: false })

      if (searchTerm) {
        query = query.ilike('descricao', `%${searchTerm}%`)
      }

      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error
      
      setLotesAnimais(data || [])
      setTotalCount(count || 0)
    } catch (error: any) {
      console.error('Erro ao buscar lotes de animais:', error)
      toast.error('Erro ao carregar lotes de animais')
    } finally {
      setLoading(false)
    }
  }

  async function fetchRacas() {
    try {
      const { data, error } = await supabase
        .from('racas')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome')

      if (error) throw error
      setRacas(data || [])
    } catch (error: any) {
      console.error('Erro ao buscar raças:', error)
    }
  }

  async function fetchCategorias() {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('id, nome, sexo')
        .eq('ativo', true)
        .order('nome')

      if (error) throw error
      setCategorias(data || [])
    } catch (error: any) {
      console.error('Erro ao buscar categorias:', error)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!quantidade || !pesoMedio || !racaId || !categoriaId || !loteId || !valorCompraKg) {
      toast.error('Preencha todos os campos obrigatórios')
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

      const loteData = {
        descricao: descricao || null,
        quantidade: parseInt(quantidade),
        raca_id: racaId,
        categoria_id: categoriaId,
        lote_confinamento_id: loteId,
        data_entrada: dataEntrada,
        peso_medio: parseFloat(pesoMedio),
        tipo: tipo,
        valor_compra_kg: parseFloat(valorCompraKg),
        status: 'ATIVO',
        observacoes: observacoes || null,
        cliente_id: user.id,
        empresa_id: cliente?.empresa_id || null,
      }

      if (editingLote) {
        const { error } = await supabase
          .from('lotes_animais')
          .update(loteData)
          .eq('id', editingLote.id)

        if (error) throw error
        toast.success('Lote atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('lotes_animais')
          .insert(loteData)

        if (error) throw error
        toast.success('Lote cadastrado com sucesso!')
      }

      handleCloseDialog()
      fetchLotesAnimais()
    } catch (error: any) {
      console.error('Erro ao salvar lote:', error)
      toast.error('Erro ao salvar lote: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleCloseDialog() {
    setOpen(false)
    setEditingLote(null)
    setDescricao('')
    setQuantidade('')
    setRacaId('')
    setCategoriaId('')
    setLoteId('')
    setDataEntrada(new Date().toISOString().split('T')[0])
    setPesoMedio('')
    setTipo('MEIO')
    setValorCompraKg('')
    setObservacoes('')
  }

  function handleEdit(lote: LoteAnimais) {
    setEditingLote(lote)
    setDescricao(lote.descricao || '')
    setQuantidade(lote.quantidade.toString())
    setRacaId(lote.racas ? '' : '') // Precisa buscar o ID
    setCategoriaId(lote.categorias ? '' : '')
    setLoteId(lote.lote_confinamento ? '' : '')
    setDataEntrada(lote.data_entrada)
    setPesoMedio(lote.peso_medio.toString())
    setTipo(lote.tipo)
    setValorCompraKg(lote.valor_compra_kg.toString())
    setOpen(true)
  }

  async function handleDelete() {
    if (!deletingLote) return

    try {
      setDeleting(true)
      const { error } = await supabase
        .from('lotes_animais')
        .delete()
        .eq('id', deletingLote.id)

      if (error) throw error

      toast.success('Lote excluído com sucesso!')
      setDeleteOpen(false)
      setDeletingLote(null)
      fetchLotesAnimais()
    } catch (error: any) {
      console.error('Erro ao excluir lote:', error)
      toast.error('Erro ao excluir lote')
    } finally {
      setDeleting(false)
    }
  }

  function getTipoBadge(tipo: string) {
    const colors: Record<string, string> = {
      'FUNDO': 'bg-red-500',
      'LEVE': 'bg-yellow-500',
      'MEIO': 'bg-blue-500',
      'PESADO': 'bg-green-500'
    }
    return <Badge className={`${colors[tipo] || 'bg-gray-500'} text-white`}>{tipo}</Badge>
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
                  <BreadcrumbPage>Animais em Lote</BreadcrumbPage>
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
                  Entrada de Animais em Lote
                  {totalCount > 0 && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({totalCount.toLocaleString('pt-BR')} {totalCount === 1 ? 'lote' : 'lotes'})
                    </span>
                  )}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Para quem não usa identificação individual por brinco
                </p>
              </div>
              <Button onClick={() => setOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Novo Lote
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição..."
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
                      <TableHead>Qtd</TableHead>
                      <TableHead>Raça</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Lote Conf.</TableHead>
                      <TableHead>Peso Médio</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : lotesAnimais.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Nenhum lote cadastrado</EmptyTitle>
                  <EmptyDescription>
                    Comece cadastrando o primeiro lote de animais
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button size="sm" onClick={() => setOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Plus className="mr-2 h-3 w-3" />
                    Novo Lote
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Raça</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Lote Conf.</TableHead>
                      <TableHead>Peso Médio</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotesAnimais.map((lote) => (
                      <TableRow key={lote.id}>
                        <TableCell>{format(new Date(lote.data_entrada), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                        <TableCell className="font-bold">{lote.quantidade}</TableCell>
                        <TableCell>{lote.racas?.nome}</TableCell>
                        <TableCell>{lote.categorias?.nome}</TableCell>
                        <TableCell>{lote.lote_confinamento?.nome}</TableCell>
                        <TableCell>{lote.peso_medio.toFixed(2)} kg</TableCell>
                        <TableCell>{getTipoBadge(lote.tipo)}</TableCell>
                        <TableCell className="font-semibold">R$ {lote.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(lote)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeletingLote(lote)
                              setDeleteOpen(true)
                            }}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount} lotes
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

        {/* Dialog de Cadastro/Edição */}
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCloseDialog()}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">
                {editingLote ? 'Editar Lote' : 'Novo Lote de Animais'}
              </DialogTitle>
              <DialogDescription>
                Entrada de animais sem identificação individual
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Quantidade de Animais *</Label>
                <Input
                  type="number"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  placeholder="Ex: 50"
                  className="h-9"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Descrição</Label>
                <Input
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição do lote"
                  className="h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Raça *</Label>
                  <Select value={racaId} onValueChange={setRacaId} required>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {racas.map((raca) => (
                        <SelectItem key={raca.id} value={raca.id}>
                          {raca.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Categoria *</Label>
                  <Select value={categoriaId} onValueChange={setCategoriaId} required>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.nome} ({cat.sexo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Lote de Confinamento *</Label>
                <Select value={loteId} onValueChange={setLoteId} required>
                  <SelectTrigger className="h-9 w-full">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Data de Entrada</Label>
                  <Input
                    type="date"
                    value={dataEntrada}
                    onChange={(e) => setDataEntrada(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Peso Médio (kg) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pesoMedio}
                    onChange={(e) => setPesoMedio(e.target.value)}
                    placeholder="Ex: 350.00"
                    className="h-9"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Tipo *</Label>
                  <Select value={tipo} onValueChange={(v) => setTipo(v as any)} required>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FUNDO">Fundo</SelectItem>
                      <SelectItem value="LEVE">Leve</SelectItem>
                      <SelectItem value="MEIO">Meio</SelectItem>
                      <SelectItem value="PESADO">Pesado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Valor/kg (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={valorCompraKg}
                    onChange={(e) => setValorCompraKg(e.target.value)}
                    placeholder="Ex: 15.50"
                    className="h-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Observações</Label>
                <Textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Observações sobre o lote..."
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting} className="bg-orange-500 hover:bg-orange-600 text-white">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog de Exclusão */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir este lote de {deletingLote?.quantidade} animais?
                Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  'Excluir'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
