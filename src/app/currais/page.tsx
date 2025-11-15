'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Curral } from '@/types/database'
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
import { Plus, Pencil, Trash2, Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Skeleton } from "@/components/ui/skeleton"

export default function CurraisPage() {
  const [currais, setCurrais] = useState<Curral[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingCurral, setEditingCurral] = useState<Curral | null>(null)
  const [deletingCurral, setDeletingCurral] = useState<Curral | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Search
  const [searchTerm, setSearchTerm] = useState('')

  // Form state - Individual
  const [nome, setNome] = useState('')
  const [linha, setLinha] = useState('')
  const [areaM2, setAreaM2] = useState('')
  const [capacidadeAnimais, setCapacidadeAnimais] = useState('')

  // Form state - Em lote
  const [prefixo, setPrefixo] = useState('Curral')
  const [quantidade, setQuantidade] = useState('10')
  const [linhaLote, setLinhaLote] = useState('')
  const [areaM2Lote, setAreaM2Lote] = useState('')
  const [capacidadeAnimaisLote, setCapacidadeAnimaisLote] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadCurrais()
  }, [])

  async function loadCurrais() {
    try {
      const startTime = performance.now()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('currais')
        .select('*')
        .eq('cliente_id', user.id)
        .order('nome')

      const endTime = performance.now()
      console.log(`⏱️ Load Currais: ${(endTime - startTime).toFixed(2)}ms`)
      
      if (error) throw error
      setCurrais(data || [])
    } catch (error: any) {
      toast.error("Erro ao carregar currais", {
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitIndividual(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: cliente } = await supabase
        .from('clientes')
        .select('empresa_id')
        .eq('id', user.id)
        .single()

      if (!cliente) throw new Error('Cliente não encontrado')

      const curralData = {
        nome,
        linha: linha || null,
        area_m2: parseFloat(areaM2),
        capacidade_animais: capacidadeAnimais ? parseInt(capacidadeAnimais) : null,
        cliente_id: user.id,
        empresa_id: cliente.empresa_id,
      }

      if (editingCurral) {
        const { error } = await supabase
          .from('currais')
          .update(curralData)
          .eq('id', editingCurral.id)

        if (error) throw error
        toast.success("Curral atualizado com sucesso!")
      } else {
        const { error } = await supabase
          .from('currais')
          .insert(curralData)

        if (error) throw error
        toast.success("Curral criado com sucesso!")
      }

      setOpen(false)
      resetForm()
      loadCurrais()
    } catch (error: any) {
      toast.error("Erro ao salvar curral", {
        description: error.message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmitLote(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: cliente } = await supabase
        .from('clientes')
        .select('empresa_id')
        .eq('id', user.id)
        .single()

      if (!cliente) throw new Error('Cliente não encontrado')

      const qtd = parseInt(quantidade)
      const curraisData = []

      for (let i = 1; i <= qtd; i++) {
        curraisData.push({
          nome: `${prefixo} ${i}`,
          linha: linhaLote || null,
          area_m2: parseFloat(areaM2Lote),
          capacidade_animais: capacidadeAnimaisLote ? parseInt(capacidadeAnimaisLote) : null,
          cliente_id: user.id,
          empresa_id: cliente.empresa_id,
        })
      }

      const { error } = await supabase
        .from('currais')
        .insert(curraisData)

      if (error) throw error

      toast.success(`${qtd} currais criados com sucesso!`)
      setOpen(false)
      resetForm()
      loadCurrais()
    } catch (error: any) {
      toast.error("Erro ao criar currais", {
        description: error.message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  function openDeleteDialog(curral: Curral) {
    setDeletingCurral(curral)
    setDeleteOpen(true)
  }

  async function handleDelete() {
    if (!deletingCurral) return
    setDeleting(true)

    try {
      const { error } = await supabase
        .from('currais')
        .delete()
        .eq('id', deletingCurral.id)

      if (error) throw error

      toast.success("Curral excluído com sucesso!")

      setDeleteOpen(false)
      setDeletingCurral(null)
      loadCurrais()
    } catch (error: any) {
      toast.error("Erro ao excluir curral", {
        description: error.message,
      })
    } finally {
      setDeleting(false)
    }
  }

  function handleEdit(curral: Curral) {
    setEditingCurral(curral)
    setNome(curral.nome)
    setLinha(curral.linha || '')
    setAreaM2(curral.area_m2.toString())
    setCapacidadeAnimais(curral.capacidade_animais?.toString() || '')
    setOpen(true)
  }

  function resetForm() {
    setEditingCurral(null)
    setNome('')
    setLinha('')
    setAreaM2('')
    setCapacidadeAnimais('')
    setPrefixo('Curral')
    setQuantidade('10')
    setLinhaLote('')
    setAreaM2Lote('')
    setCapacidadeAnimaisLote('')
  }

  function handleOpenChange(open: boolean) {
    setOpen(open)
    if (!open) {
      resetForm()
    }
  }

  const linhaOptions = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))

  // Filtrar currais pela pesquisa
  const filteredCurrais = currais.filter((curral) => {
    const search = searchTerm.toLowerCase()
    return (
      curral.nome.toLowerCase().includes(search) ||
      (curral.linha && curral.linha.toLowerCase().includes(search))
    )
  })

  // Calcular paginação
  const totalPages = Math.ceil(filteredCurrais.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentCurrais = filteredCurrais.slice(startIndex, endIndex)

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

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
                  <BreadcrumbPage>Currais</BreadcrumbPage>
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
                <h1 className="text-xl font-semibold">Currais</h1>
                <p className="text-xs text-muted-foreground">
                  Gerencie os currais da sua fazenda
                </p>
              </div>
            </div>

            {/* Barra de pesquisa */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou linha..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button 
                onClick={() => {
                  setEditingCurral(null)
                  setOpen(true)
                }}
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Curral
              </Button>
            </div>

            <Dialog open={open} onOpenChange={handleOpenChange}>
              <DialogTrigger asChild>
                <span className="hidden" />
              </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="text-base">
                      {editingCurral ? 'Editar Curral' : 'Novo Curral'}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      {editingCurral ? 'Edite os dados do curral' : 'Cadastre um ou vários currais de uma vez'}
                    </DialogDescription>
                  </DialogHeader>

                  {editingCurral ? (
                    <form onSubmit={handleSubmitIndividual}>
                      <div className="grid gap-3 py-4">
                        <div className="grid gap-1.5">
                          <Label htmlFor="nome" className="text-xs">Nome *</Label>
                          <Input
                            id="nome"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            placeholder="Ex: Curral 1"
                            className="h-9 text-sm"
                            required
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor="linha" className="text-xs">Linha</Label>
                          <Select value={linha} onValueChange={setLinha}>
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Selecione a linha" />
                            </SelectTrigger>
                            <SelectContent>
                              {linhaOptions.map((l) => (
                                <SelectItem key={l} value={l} className="text-sm">
                                  Linha {l}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor="area" className="text-xs">Área (m²) *</Label>
                          <Input
                            id="area"
                            type="number"
                            step="0.01"
                            value={areaM2}
                            onChange={(e) => setAreaM2(e.target.value)}
                            placeholder="Ex: 1000.50"
                            className="h-9 text-sm"
                            required
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor="capacidade" className="text-xs">Capacidade de Animais</Label>
                          <Input
                            id="capacidade"
                            type="number"
                            value={capacidadeAnimais}
                            onChange={(e) => setCapacidadeAnimais(e.target.value)}
                            placeholder="Ex: 100"
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" disabled={submitting}>
                          {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                          Salvar
                        </Button>
                      </DialogFooter>
                    </form>
                  ) : (
                    <Tabs defaultValue="individual" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="individual" className="text-xs">Individual</TabsTrigger>
                        <TabsTrigger value="lote" className="text-xs">Em Lote</TabsTrigger>
                      </TabsList>

                      <TabsContent value="individual">
                        <form onSubmit={handleSubmitIndividual}>
                          <div className="grid gap-3 py-4">
                            <div className="grid gap-1.5">
                              <Label htmlFor="nome" className="text-xs">Nome *</Label>
                              <Input
                                id="nome"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                placeholder="Ex: Curral 1"
                                className="h-9 text-sm"
                                required
                              />
                            </div>
                            <div className="grid gap-1.5">
                              <Label htmlFor="linha" className="text-xs">Linha</Label>
                              <Select value={linha} onValueChange={setLinha}>
                                <SelectTrigger className="h-9 text-sm">
                                  <SelectValue placeholder="Selecione a linha" />
                                </SelectTrigger>
                                <SelectContent>
                                  {linhaOptions.map((l) => (
                                    <SelectItem key={l} value={l} className="text-sm">
                                      Linha {l}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid gap-1.5">
                              <Label htmlFor="area" className="text-xs">Área (m²) *</Label>
                              <Input
                                id="area"
                                type="number"
                                step="0.01"
                                value={areaM2}
                                onChange={(e) => setAreaM2(e.target.value)}
                                placeholder="Ex: 1000.50"
                                className="h-9 text-sm"
                                required
                              />
                            </div>
                            <div className="grid gap-1.5">
                              <Label htmlFor="capacidade" className="text-xs">Capacidade de Animais</Label>
                              <Input
                                id="capacidade"
                                type="number"
                                value={capacidadeAnimais}
                                onChange={(e) => setCapacidadeAnimais(e.target.value)}
                                placeholder="Ex: 100"
                                className="h-9 text-sm"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="submit" size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" disabled={submitting}>
                              {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                              Criar
                            </Button>
                          </DialogFooter>
                        </form>
                      </TabsContent>

                      <TabsContent value="lote">
                        <form onSubmit={handleSubmitLote}>
                          <div className="grid gap-3 py-4">
                            <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
                              <AlertDescription className="text-xs text-orange-900 dark:text-orange-200">
                                <strong>Dica:</strong> Crie currais do mesmo tamanho e mesma linha de uma vez. 
                                Ex: Linha A (Curral 1, 2, 3...), depois Linha B (Curral 1, 2, 3...).
                              </AlertDescription>
                            </Alert>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="grid gap-1.5">
                                <Label htmlFor="prefixo" className="text-xs">Prefixo *</Label>
                                <Input
                                  id="prefixo"
                                  value={prefixo}
                                  onChange={(e) => setPrefixo(e.target.value)}
                                  placeholder="Ex: Curral"
                                  className="h-9 text-sm"
                                  required
                                />
                              </div>
                              <div className="grid gap-1.5">
                                <Label htmlFor="quantidade" className="text-xs">Quantidade *</Label>
                                <Input
                                  id="quantidade"
                                  type="number"
                                  min="1"
                                  max="100"
                                  value={quantidade}
                                  onChange={(e) => setQuantidade(e.target.value)}
                                  placeholder="Ex: 30"
                                  className="h-9 text-sm"
                                  required
                                />
                              </div>
                            </div>

                            <div className="grid gap-1.5">
                              <Label htmlFor="linhaLote" className="text-xs">Linha</Label>
                              <Select value={linhaLote} onValueChange={setLinhaLote}>
                                <SelectTrigger className="h-9 text-sm">
                                  <SelectValue placeholder="Selecione a linha" />
                                </SelectTrigger>
                                <SelectContent>
                                  {linhaOptions.map((l) => (
                                    <SelectItem key={l} value={l} className="text-sm">
                                      Linha {l}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid gap-1.5">
                              <Label htmlFor="areaLote" className="text-xs">Área (m²) *</Label>
                              <Input
                                id="areaLote"
                                type="number"
                                step="0.01"
                                value={areaM2Lote}
                                onChange={(e) => setAreaM2Lote(e.target.value)}
                                placeholder="Ex: 1000.50"
                                className="h-9 text-sm"
                                required
                              />
                            </div>

                            <div className="grid gap-1.5">
                              <Label htmlFor="capacidadeLote" className="text-xs">Capacidade de Animais</Label>
                              <Input
                                id="capacidadeLote"
                                type="number"
                                value={capacidadeAnimaisLote}
                                onChange={(e) => setCapacidadeAnimaisLote(e.target.value)}
                                placeholder="Ex: 100"
                                className="h-9 text-sm"
                              />
                            </div>

                            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                              Serão criados: <strong>{prefixo} 1</strong>, <strong>{prefixo} 2</strong>... até <strong>{prefixo} {quantidade}</strong>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="submit" size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" disabled={submitting}>
                              {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                              Criar {quantidade} Currais
                            </Button>
                          </DialogFooter>
                        </form>
                      </TabsContent>
                    </Tabs>
                  )}
                </DialogContent>
              </Dialog>

            {loading ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Linha</TableHead>
                      <TableHead>Área (m²)</TableHead>
                      <TableHead>Capacidade</TableHead>
                      <TableHead>Densidade</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
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
            ) : currais.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Nenhum curral cadastrado</EmptyTitle>
                  <EmptyDescription>
                    Comece criando seu primeiro curral
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button size="sm" onClick={() => setOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Plus className="mr-2 h-3 w-3" />
                    Criar Curral
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Linha</TableHead>
                      <TableHead>Área (m²)</TableHead>
                      <TableHead>Capacidade</TableHead>
                      <TableHead>Densidade</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentCurrais.map((curral) => (
                      <TableRow key={curral.id}>
                        <TableCell className="font-medium">{curral.nome}</TableCell>
                        <TableCell>{curral.linha || '-'}</TableCell>
                        <TableCell>{curral.area_m2.toLocaleString('pt-BR')} m²</TableCell>
                        <TableCell>{curral.capacidade_animais || '-'}</TableCell>
                        <TableCell>
                          {curral.capacidade_animais && curral.area_m2 
                            ? `${(curral.area_m2 / curral.capacidade_animais).toFixed(2)} m²/cab`
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(curral)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(curral)}
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
            {!loading && currais.length > itemsPerPage && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Mostrar apenas algumas páginas
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )
                    }
                    return null
                  })}

                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </div>

        {/* Dialog de Confirmação de Exclusão */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-base">Excluir Curral</DialogTitle>
              <DialogDescription className="text-xs">
                Tem certeza que deseja excluir o curral <strong>{deletingCurral?.nome}</strong>? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleDelete}
                className="bg-red-500 hover:bg-red-600 text-white"
                disabled={deleting}
              >
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
