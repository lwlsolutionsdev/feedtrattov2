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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Plus, Pencil, Trash2, Loader2, Search, FileText, Zap, CalendarIcon } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface Animal {
  id: string
  brinco_visual: string | null
  brinco_eletronico: string | null
  numero_sisbov: string | null
  data_nascimento: string | null
  propriedade_origem: string | null
  observacoes_sisbov: string | null
  data_entrada: string
  peso_entrada: number
  raca_id: string
  categoria_id: string
  lote_id: string
  tipo: 'FUNDO' | 'LEVE' | 'MEIO' | 'PESADO'
  valor_compra_kg: number
  valor_compra_total: number
  status: 'ATIVO' | 'VENDIDO' | 'ABATIDO' | 'ENFERMARIA' | 'MORTO'
  curral_id: string | null
  observacoes: string | null
  created_at: string
  racas?: { nome: string }
  categorias?: { nome: string }
  lotes?: { nome: string }
  currais?: { nome: string }
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
  status: string
}

export default function AnimaisPage() {
  const [animais, setAnimais] = useState<Animal[]>([])
  const [racas, setRacas] = useState<Raca[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [sisbovOpen, setSisbovOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null)
  const [deletingAnimal, setDeletingAnimal] = useState<Animal | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 50
  
  // Form states
  const [brincoVisual, setBrincoVisual] = useState('')
  const [brincoEletronico, setBrincoEletronico] = useState('')
  const [pesoEntrada, setPesoEntrada] = useState('')
  const [racaId, setRacaId] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [loteId, setLoteId] = useState('')
  const [tipo, setTipo] = useState<'FUNDO' | 'LEVE' | 'MEIO' | 'PESADO'>('MEIO')
  const [valorCompraKg, setValorCompraKg] = useState('')
  const [dataEntrada, setDataEntrada] = useState(new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState<'ATIVO' | 'VENDIDO' | 'ABATIDO' | 'ENFERMARIA' | 'MORTO'>('ATIVO')
  const [observacoes, setObservacoes] = useState('')
  
  // SISBOV states
  const [numeroSisbov, setNumeroSisbov] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [propriedadeOrigem, setPropriedadeOrigem] = useState('')
  const [observacoesSisbov, setObservacoesSisbov] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchRacas()
    fetchCategorias()
    fetchLotes()
  }, [])

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1) // Resetar para primeira página ao buscar
      fetchAnimais()
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Buscar ao mudar de página
  useEffect(() => {
    fetchAnimais()
  }, [currentPage])

  async function fetchAnimais() {
    try {
      setLoading(true)
      
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      // Query base
      let query = supabase
        .from('animais')
        .select(`
          *,
          racas (nome),
          categorias (nome),
          lotes (nome),
          currais (nome)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })

      // Aplicar filtro de busca se houver
      if (searchTerm) {
        query = query.or(`brinco_visual.ilike.%${searchTerm}%,brinco_eletronico.ilike.%${searchTerm}%,numero_sisbov.ilike.%${searchTerm}%`)
      }

      // Aplicar paginação
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error
      
      setAnimais(data || [])
      setTotalCount(count || 0)
    } catch (error: any) {
      console.error('Erro ao buscar animais:', error)
      toast.error('Erro ao carregar animais')
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
        .select('id, nome, status')
        .in('status', ['ATIVO'])
        .order('nome')

      if (error) throw error
      setLotes(data || [])
    } catch (error: any) {
      console.error('Erro ao buscar lotes:', error)
      toast.error('Erro ao carregar lotes')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!brincoVisual && !brincoEletronico) {
      toast.error('Preencha pelo menos um brinco (visual ou eletrônico)')
      return
    }

    if (!pesoEntrada || !racaId || !categoriaId || !loteId || !valorCompraKg) {
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

      const animalData = {
        brinco_visual: brincoVisual || null,
        brinco_eletronico: brincoEletronico || null,
        numero_sisbov: numeroSisbov || null,
        data_nascimento: dataNascimento || null,
        propriedade_origem: propriedadeOrigem || null,
        observacoes_sisbov: observacoesSisbov || null,
        data_entrada: dataEntrada,
        peso_entrada: parseFloat(pesoEntrada),
        raca_id: racaId,
        categoria_id: categoriaId,
        lote_id: loteId,
        tipo: tipo,
        valor_compra_kg: parseFloat(valorCompraKg),
        status: status,
        observacoes: observacoes || null,
        cliente_id: user.id,
        empresa_id: cliente?.empresa_id || null,
      }

      if (editingAnimal) {
        const { error } = await supabase
          .from('animais')
          .update(animalData)
          .eq('id', editingAnimal.id)

        if (error) throw error
        toast.success('Animal atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('animais')
          .insert(animalData)

        if (error) throw error
        toast.success('Animal cadastrado com sucesso!')
      }

      handleCloseDialog()
      fetchAnimais()
    } catch (error: any) {
      console.error('Erro ao salvar animal:', error)
      toast.error('Erro ao salvar animal: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleCloseDialog() {
    setOpen(false)
    setEditingAnimal(null)
    setBrincoVisual('')
    setBrincoEletronico('')
    setPesoEntrada('')
    setRacaId('')
    setCategoriaId('')
    setLoteId('')
    setTipo('MEIO')
    setValorCompraKg('')
    setDataEntrada(new Date().toISOString().split('T')[0])
    setStatus('ATIVO')
    setObservacoes('')
    setNumeroSisbov('')
    setDataNascimento('')
    setPropriedadeOrigem('')
    setObservacoesSisbov('')
  }

  function handleEdit(animal: Animal) {
    setEditingAnimal(animal)
    setBrincoVisual(animal.brinco_visual || '')
    setBrincoEletronico(animal.brinco_eletronico || '')
    setPesoEntrada(animal.peso_entrada.toString())
    setRacaId(animal.raca_id)
    setCategoriaId(animal.categoria_id)
    setLoteId(animal.lote_id)
    setTipo(animal.tipo)
    setValorCompraKg(animal.valor_compra_kg.toString())
    setDataEntrada(animal.data_entrada)
    setStatus(animal.status)
    setObservacoes(animal.observacoes || '')
    setNumeroSisbov(animal.numero_sisbov || '')
    setDataNascimento(animal.data_nascimento || '')
    setPropriedadeOrigem(animal.propriedade_origem || '')
    setObservacoesSisbov(animal.observacoes_sisbov || '')
    setOpen(true)
  }

  function openDeleteDialog(animal: Animal) {
    setDeletingAnimal(animal)
    setDeleteOpen(true)
  }

  async function handleDelete() {
    if (!deletingAnimal) return

    try {
      setDeleting(true)
      const { error } = await supabase
        .from('animais')
        .delete()
        .eq('id', deletingAnimal.id)

      if (error) throw error
      toast.success('Animal excluído com sucesso!')
      setDeleteOpen(false)
      setDeletingAnimal(null)
      fetchAnimais()
    } catch (error: any) {
      console.error('Erro ao excluir animal:', error)
      toast.error('Erro ao excluir animal: ' + error.message)
    } finally {
      setDeleting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      ATIVO: 'default',
      VENDIDO: 'secondary',
      ABATIDO: 'destructive',
      ENFERMARIA: 'outline',
      MORTO: 'destructive'
    }
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>
  }

  const getTipoBadge = (tipo: string) => {
    const colors: Record<string, string> = {
      FUNDO: 'bg-blue-500',
      LEVE: 'bg-green-500',
      MEIO: 'bg-yellow-500',
      PESADO: 'bg-orange-500'
    }
    return <Badge className={colors[tipo]}>{tipo}</Badge>
  }

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
                  <BreadcrumbPage>Animais Individuais</BreadcrumbPage>
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
                  Animais Individuais
                  {totalCount > 0 && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({totalCount.toLocaleString('pt-BR')} {totalCount === 1 ? 'animal' : 'animais'})
                    </span>
                  )}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Gerencie o cadastro individual de animais
                </p>
              </div>
              <Link href="/animais/modo-curral">
                <Button variant="outline" size="sm">
                  <Zap className="h-4 w-4 mr-2" />
                  Modo Curral
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por brinco, SISBOV, raça ou lote..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button 
                onClick={() => setOpen(true)}
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Animal
              </Button>
            </div>

            {loading ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Brinco</TableHead>
                      <TableHead>Raça</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Peso</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : animais.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Nenhum animal cadastrado</EmptyTitle>
                  <EmptyDescription>
                    Comece cadastrando animais individuais
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button size="sm" onClick={() => setOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Plus className="mr-2 h-3 w-3" />
                    Cadastrar Animal
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Brinco</TableHead>
                      <TableHead>Raça</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Peso</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {animais.map((animal) => (
                      <TableRow key={animal.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-1">
                            {animal.brinco_visual && (
                              <span className="text-sm">{animal.brinco_visual}</span>
                            )}
                            {animal.brinco_eletronico && (
                              <span className="text-xs text-muted-foreground">
                                RF: {animal.brinco_eletronico}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{animal.racas?.nome}</TableCell>
                        <TableCell>{animal.categorias?.nome}</TableCell>
                        <TableCell>{animal.lotes?.nome}</TableCell>
                        <TableCell>{getTipoBadge(animal.tipo)}</TableCell>
                        <TableCell>{animal.peso_entrada.toFixed(2)} kg</TableCell>
                        <TableCell>{getStatusBadge(animal.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(animal)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(animal)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
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
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount} animais
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
                {editingAnimal ? 'Editar Animal' : 'Novo Animal'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {editingAnimal ? 'Edite os dados do animal' : 'Cadastre um novo animal individual'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <div className="grid gap-3 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="brincoVisual" className="text-xs">Brinco Visual</Label>
                    <Input
                      id="brincoVisual"
                      value={brincoVisual}
                      onChange={(e) => setBrincoVisual(e.target.value)}
                      placeholder="Ex: 001"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="brincoEletronico" className="text-xs">Brinco Eletrônico</Label>
                    <Input
                      id="brincoEletronico"
                      value={brincoEletronico}
                      onChange={(e) => setBrincoEletronico(e.target.value)}
                      placeholder="Ex: 982000123456789"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground -mt-2">
                  * Pelo menos um brinco é obrigatório
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="pesoEntrada" className="text-xs">Peso Entrada (kg) *</Label>
                    <Input
                      id="pesoEntrada"
                      type="number"
                      step="0.01"
                      value={pesoEntrada}
                      onChange={(e) => setPesoEntrada(e.target.value)}
                      placeholder="Ex: 350.50"
                      className="h-9 text-sm"
                      required
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="valorCompraKg" className="text-xs">Valor/kg (R$) *</Label>
                    <Input
                      id="valorCompraKg"
                      type="number"
                      step="0.01"
                      value={valorCompraKg}
                      onChange={(e) => setValorCompraKg(e.target.value)}
                      placeholder="Ex: 15.50"
                      className="h-9 text-sm"
                      required
                    />
                  </div>
                </div>

                {pesoEntrada && valorCompraKg && (
                  <div className="bg-muted p-2 rounded text-sm">
                    <strong>Valor Total:</strong> R$ {(parseFloat(pesoEntrada) * parseFloat(valorCompraKg)).toFixed(2)}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="racaId" className="text-xs">Raça *</Label>
                    <Select value={racaId} onValueChange={setRacaId} required>
                      <SelectTrigger className="h-9 text-sm w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {racas.map((raca) => (
                          <SelectItem key={raca.id} value={raca.id} className="text-sm">
                            {raca.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="categoriaId" className="text-xs">Categoria *</Label>
                    <Select value={categoriaId} onValueChange={setCategoriaId} required>
                      <SelectTrigger className="h-9 text-sm w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id} className="text-sm">
                            {cat.nome} ({cat.sexo})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="loteId" className="text-xs">Lote *</Label>
                    <Select value={loteId} onValueChange={setLoteId} required>
                      <SelectTrigger className="h-9 text-sm w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {lotes.map((lote) => (
                          <SelectItem key={lote.id} value={lote.id} className="text-sm">
                            {lote.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="tipo" className="text-xs">Tipo *</Label>
                    <Select value={tipo} onValueChange={(v: any) => setTipo(v)} required>
                      <SelectTrigger className="h-9 text-sm w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FUNDO" className="text-sm">Fundo</SelectItem>
                        <SelectItem value="LEVE" className="text-sm">Leve</SelectItem>
                        <SelectItem value="MEIO" className="text-sm">Meio</SelectItem>
                        <SelectItem value="PESADO" className="text-sm">Pesado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Data Entrada *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "h-9 text-sm justify-start text-left font-normal w-full",
                            !dataEntrada && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dataEntrada ? format(new Date(dataEntrada), "PPP", { locale: ptBR }) : "Selecione"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dataEntrada ? new Date(dataEntrada) : undefined}
                          onSelect={(date) => setDataEntrada(date ? format(date, 'yyyy-MM-dd') : '')}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="status" className="text-xs">Status *</Label>
                    <Select value={status} onValueChange={(v: any) => setStatus(v)} required>
                      <SelectTrigger className="h-9 text-sm w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ATIVO" className="text-sm">Ativo</SelectItem>
                        <SelectItem value="VENDIDO" className="text-sm">Vendido</SelectItem>
                        <SelectItem value="ABATIDO" className="text-sm">Abatido</SelectItem>
                        <SelectItem value="ENFERMARIA" className="text-sm">Enfermaria</SelectItem>
                        <SelectItem value="MORTO" className="text-sm">Morto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="observacoes" className="text-xs">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Observações gerais..."
                    className="text-sm min-h-[60px]"
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSisbovOpen(true)}
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Dados SISBOV (Opcional)
                </Button>
              </div>

              <DialogFooter>
                <Button type="submit" size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal SISBOV */}
        <Dialog open={sisbovOpen} onOpenChange={setSisbovOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-base">Dados SISBOV</DialogTitle>
              <DialogDescription className="text-xs">
                Informações para rastreabilidade (opcional)
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-4">
              <div className="grid gap-1.5">
                <Label htmlFor="numeroSisbov" className="text-xs">Número SISBOV</Label>
                <Input
                  id="numeroSisbov"
                  value={numeroSisbov}
                  onChange={(e) => setNumeroSisbov(e.target.value)}
                  placeholder="15 dígitos"
                  maxLength={15}
                  className="h-9 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Código único de 15 dígitos
                </p>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs">Data de Nascimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-9 text-sm justify-start text-left font-normal",
                        !dataNascimento && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataNascimento ? format(new Date(dataNascimento), "PPP", { locale: ptBR }) : "Selecione uma data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dataNascimento ? new Date(dataNascimento) : undefined}
                      onSelect={(date) => setDataNascimento(date ? format(date, 'yyyy-MM-dd') : '')}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="propriedadeOrigem" className="text-xs">Propriedade de Origem</Label>
                <Input
                  id="propriedadeOrigem"
                  value={propriedadeOrigem}
                  onChange={(e) => setPropriedadeOrigem(e.target.value)}
                  placeholder="Ex: Fazenda São José"
                  className="h-9 text-sm"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="observacoesSisbov" className="text-xs">Observações SISBOV</Label>
                <Textarea
                  id="observacoesSisbov"
                  value={observacoesSisbov}
                  onChange={(e) => setObservacoesSisbov(e.target.value)}
                  placeholder="Informações adicionais de rastreabilidade..."
                  className="text-sm min-h-[60px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" size="sm" onClick={() => setSisbovOpen(false)}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Exclusão */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-base">Excluir Animal</DialogTitle>
              <DialogDescription className="text-xs">
                Tem certeza que deseja excluir este animal? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white" disabled={deleting}>
                {deleting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
