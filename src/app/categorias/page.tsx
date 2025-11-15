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
import { Plus, Pencil, Trash2, Sparkles, Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

interface Categoria {
  id: string
  nome: string
  sexo: 'MACHO' | 'FEMEA'
  ativo: boolean
  created_at: string
}

const CATEGORIAS_PADRAO = [
  { nome: 'Bezerro', sexo: 'MACHO' as const },
  { nome: 'Bezerra', sexo: 'FEMEA' as const },
  { nome: 'Garrote', sexo: 'MACHO' as const },
  { nome: 'Novilha', sexo: 'FEMEA' as const },
  { nome: 'Boi Magro', sexo: 'MACHO' as const },
  { nome: 'Vaca', sexo: 'FEMEA' as const },
  { nome: 'Touro', sexo: 'MACHO' as const },
  { nome: 'Novilho', sexo: 'MACHO' as const },
  { nome: 'Boi Gordo', sexo: 'MACHO' as const },
  { nome: 'Vaca de Descarte', sexo: 'FEMEA' as const },
]

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [createDefaultOpen, setCreateDefaultOpen] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null)
  const [deletingCategoria, setDeletingCategoria] = useState<Categoria | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [nome, setNome] = useState('')
  const [sexo, setSexo] = useState<'MACHO' | 'FEMEA'>('MACHO')
  const [ativo, setAtivo] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchCategorias()
  }, [])

  async function fetchCategorias() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('nome')

      if (error) throw error
      setCategorias(data || [])
    } catch (error: any) {
      console.error('Erro ao buscar categorias:', error)
      toast.error('Erro ao carregar categorias')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!nome.trim()) {
      toast.error('Nome da categoria é obrigatório')
      return
    }

    if (!sexo) {
      toast.error('Sexo é obrigatório')
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

      if (editingCategoria) {
        // Atualizar
        const { error } = await supabase
          .from('categorias')
          .update({
            nome: nome.trim(),
            sexo: sexo,
            ativo: ativo,
          })
          .eq('id', editingCategoria.id)

        if (error) throw error
        toast.success('Categoria atualizada com sucesso!')
      } else {
        // Criar
        const { error } = await supabase
          .from('categorias')
          .insert({
            nome: nome.trim(),
            sexo: sexo,
            ativo: ativo,
            cliente_id: user.id,
            empresa_id: cliente?.empresa_id || null,
          })

        if (error) throw error
        toast.success('Categoria criada com sucesso!')
      }

      setOpen(false)
      setEditingCategoria(null)
      setNome('')
      setSexo('MACHO')
      setAtivo(true)
      fetchCategorias()
    } catch (error: any) {
      console.error('Erro ao salvar categoria:', error)
      toast.error('Erro ao salvar categoria: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  function openDeleteDialog(categoria: Categoria) {
    setDeletingCategoria(categoria)
    setDeleteOpen(true)
  }

  async function handleDelete() {
    if (!deletingCategoria) return

    try {
      setDeleting(true)
      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', deletingCategoria.id)

      if (error) throw error
      toast.success('Categoria excluída com sucesso!')
      setDeleteOpen(false)
      setDeletingCategoria(null)
      fetchCategorias()
    } catch (error: any) {
      console.error('Erro ao excluir categoria:', error)
      toast.error('Erro ao excluir categoria: ' + error.message)
    } finally {
      setDeleting(false)
    }
  }

  async function criarCategoriasPadrao() {
    try {
      setSubmitting(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data: cliente } = await supabase
        .from('clientes')
        .select('empresa_id')
        .eq('id', user.id)
        .single()

      const categoriasParaInserir = CATEGORIAS_PADRAO.map(cat => ({
        nome: cat.nome,
        sexo: cat.sexo,
        ativo: true,
        cliente_id: user.id,
        empresa_id: cliente?.empresa_id || null,
      }))

      const { error } = await supabase
        .from('categorias')
        .insert(categoriasParaInserir)

      if (error) throw error
      toast.success('Categorias padrão criadas com sucesso!')
      setCreateDefaultOpen(false)
      fetchCategorias()
    } catch (error: any) {
      console.error('Erro ao criar categorias padrão:', error)
      toast.error('Erro ao criar categorias padrão: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleEdit(categoria: Categoria) {
    setEditingCategoria(categoria)
    setNome(categoria.nome)
    setSexo(categoria.sexo)
    setAtivo(categoria.ativo)
    setOpen(true)
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen) {
      setEditingCategoria(null)
      setNome('')
      setSexo('MACHO')
      setAtivo(true)
    }
  }

  const filteredCategorias = categorias.filter(categoria =>
    categoria.nome.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
                  <BreadcrumbPage>Categorias</BreadcrumbPage>
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
                <h1 className="text-xl font-semibold">Categorias</h1>
                <p className="text-xs text-muted-foreground">
                  Gerencie as categorias por sexo e idade
                </p>
              </div>
            </div>

            {/* Barra de pesquisa */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                onClick={() => setCreateDefaultOpen(true)}
                variant="outline"
                size="sm"
                disabled={submitting}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Criar Categorias Padrão
              </Button>
              <Button 
                onClick={() => {
                  setEditingCategoria(null)
                  setOpen(true)
                }}
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Categoria
              </Button>
            </div>

            <Dialog open={open} onOpenChange={handleOpenChange}>
              <DialogTrigger asChild>
                <span className="hidden" />
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-base">
                    {editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    {editingCategoria ? 'Edite os dados da categoria' : 'Cadastre uma nova categoria de animal'}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                  <div className="grid gap-3 py-4">
                    <div className="grid gap-1.5">
                      <Label htmlFor="nome" className="text-xs">Nome *</Label>
                      <Input
                        id="nome"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Ex: Bezerro"
                        className="h-9 text-sm"
                        required
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="sexo" className="text-xs">Sexo *</Label>
                      <Select
                        value={sexo}
                        onValueChange={(value: 'MACHO' | 'FEMEA') => setSexo(value)}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Selecione o sexo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MACHO" className="text-sm">♂ Macho</SelectItem>
                          <SelectItem value="FEMEA" className="text-sm">♀ Fêmea</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="ativo"
                        checked={ativo}
                        onChange={(e) => setAtivo(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="ativo" className="text-xs">Ativo</Label>
                    </div>
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

            {loading ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Sexo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
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
            ) : categorias.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Nenhuma categoria cadastrada</EmptyTitle>
                  <EmptyDescription>
                    Comece criando sua primeira categoria ou use o botão "Criar Categorias Padrão"
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button size="sm" onClick={() => setOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Plus className="mr-2 h-3 w-3" />
                    Criar Categoria
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Sexo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCategorias.map((categoria) => (
                      <TableRow key={categoria.id}>
                        <TableCell className="font-medium">{categoria.nome}</TableCell>
                        <TableCell>
                          <Badge variant={categoria.sexo === 'MACHO' ? 'default' : 'secondary'}>
                            {categoria.sexo === 'MACHO' ? '♂ Macho' : '♀ Fêmea'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={categoria.ativo ? 'default' : 'secondary'}>
                            {categoria.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(categoria)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(categoria)}
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
          </div>
        </div>

        {/* Dialog de Confirmação de Exclusão */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-base">Excluir Categoria</DialogTitle>
              <DialogDescription className="text-xs">
                Tem certeza que deseja excluir a categoria <strong>{deletingCategoria?.nome}</strong>? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
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

        {/* Dialog de Confirmação de Criação de Categorias Padrão */}
        <Dialog open={createDefaultOpen} onOpenChange={setCreateDefaultOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-base">Criar Categorias Padrão</DialogTitle>
              <DialogDescription className="text-xs">
                Deseja criar as 10 categorias mais usadas no confinamento? As seguintes categorias serão criadas:
                <div className="mt-2 text-xs font-medium space-y-1">
                  {CATEGORIAS_PADRAO.map((cat, i) => (
                    <div key={i}>{cat.nome} ({cat.sexo === 'MACHO' ? '♂ Macho' : '♀ Fêmea'})</div>
                  ))}
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateDefaultOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={criarCategoriasPadrao}
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={submitting}
              >
                {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Criar Categorias
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
