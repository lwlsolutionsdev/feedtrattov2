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

interface Raca {
  id: string
  nome: string
  ativo: boolean
  created_at: string
}

const RACAS_PADRAO = [
  'Nelore',
  'Angus',
  'Brahman',
  'Senepol',
  'Canchim',
  'Brangus',
  'Hereford',
  'Simental',
  'Charolês',
  'Cruzado',
]

export default function RacasPage() {
  const [racas, setRacas] = useState<Raca[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [createDefaultOpen, setCreateDefaultOpen] = useState(false)
  const [editingRaca, setEditingRaca] = useState<Raca | null>(null)
  const [deletingRaca, setDeletingRaca] = useState<Raca | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [nome, setNome] = useState('')
  const [ativo, setAtivo] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchRacas()
  }, [])

  async function fetchRacas() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('racas')
        .select('*')
        .order('nome')

      if (error) throw error
      setRacas(data || [])
    } catch (error: any) {
      console.error('Erro ao buscar raças:', error)
      toast.error('Erro ao carregar raças')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!nome.trim()) {
      toast.error('Nome da raça é obrigatório')
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

      if (editingRaca) {
        // Atualizar
        const { error } = await supabase
          .from('racas')
          .update({
            nome: nome.trim(),
            ativo: ativo,
          })
          .eq('id', editingRaca.id)

        if (error) throw error
        toast.success('Raça atualizada com sucesso!')
      } else {
        // Criar
        const { error } = await supabase
          .from('racas')
          .insert({
            nome: nome.trim(),
            ativo: ativo,
            cliente_id: user.id,
            empresa_id: cliente?.empresa_id || null,
          })

        if (error) throw error
        toast.success('Raça criada com sucesso!')
      }

      setOpen(false)
      setEditingRaca(null)
      setNome('')
      setAtivo(true)
      fetchRacas()
    } catch (error: any) {
      console.error('Erro ao salvar raça:', error)
      toast.error('Erro ao salvar raça: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  function openDeleteDialog(raca: Raca) {
    setDeletingRaca(raca)
    setDeleteOpen(true)
  }

  async function handleDelete() {
    if (!deletingRaca) return

    try {
      setDeleting(true)
      const { error } = await supabase
        .from('racas')
        .delete()
        .eq('id', deletingRaca.id)

      if (error) throw error
      toast.success('Raça excluída com sucesso!')
      setDeleteOpen(false)
      setDeletingRaca(null)
      fetchRacas()
    } catch (error: any) {
      console.error('Erro ao excluir raça:', error)
      toast.error('Erro ao excluir raça: ' + error.message)
    } finally {
      setDeleting(false)
    }
  }

  async function criarRacasPadrao() {
    try {
      setSubmitting(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data: cliente } = await supabase
        .from('clientes')
        .select('empresa_id')
        .eq('id', user.id)
        .single()

      const racasParaInserir = RACAS_PADRAO.map(nome => ({
        nome,
        ativo: true,
        cliente_id: user.id,
        empresa_id: cliente?.empresa_id || null,
      }))

      const { error } = await supabase
        .from('racas')
        .insert(racasParaInserir)

      if (error) throw error
      toast.success('Raças padrão criadas com sucesso!')
      setCreateDefaultOpen(false)
      fetchRacas()
    } catch (error: any) {
      console.error('Erro ao criar raças padrão:', error)
      toast.error('Erro ao criar raças padrão: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleEdit(raca: Raca) {
    setEditingRaca(raca)
    setNome(raca.nome)
    setAtivo(raca.ativo)
    setOpen(true)
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen) {
      setEditingRaca(null)
      setNome('')
      setAtivo(true)
    }
  }

  const filteredRacas = racas.filter(raca =>
    raca.nome.toLowerCase().includes(searchTerm.toLowerCase())
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
                  <BreadcrumbPage>Raças</BreadcrumbPage>
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
                <h1 className="text-xl font-semibold">Raças</h1>
                <p className="text-xs text-muted-foreground">
                  Gerencie as raças do seu rebanho
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
                Criar Raças Padrão
              </Button>
              <Button 
                onClick={() => {
                  setEditingRaca(null)
                  setOpen(true)
                }}
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Raça
              </Button>
            </div>

            <Dialog open={open} onOpenChange={handleOpenChange}>
              <DialogTrigger asChild>
                <span className="hidden" />
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-base">
                    {editingRaca ? 'Editar Raça' : 'Nova Raça'}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    {editingRaca ? 'Edite os dados da raça' : 'Cadastre uma nova raça de animal'}
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
                        placeholder="Ex: Nelore"
                        className="h-9 text-sm"
                        required
                      />
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
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
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
            ) : racas.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Nenhuma raça cadastrada</EmptyTitle>
                  <EmptyDescription>
                    Comece criando sua primeira raça ou use o botão "Criar Raças Padrão"
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button size="sm" onClick={() => setOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Plus className="mr-2 h-3 w-3" />
                    Criar Raça
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRacas.map((raca) => (
                      <TableRow key={raca.id}>
                        <TableCell className="font-medium">{raca.nome}</TableCell>
                        <TableCell>
                          <Badge variant={raca.ativo ? 'default' : 'secondary'}>
                            {raca.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(raca)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(raca)}
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
              <DialogTitle className="text-base">Excluir Raça</DialogTitle>
              <DialogDescription className="text-xs">
                Tem certeza que deseja excluir a raça <strong>{deletingRaca?.nome}</strong>? Esta ação não pode ser desfeita.
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

        {/* Dialog de Confirmação de Criação de Raças Padrão */}
        <Dialog open={createDefaultOpen} onOpenChange={setCreateDefaultOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-base">Criar Raças Padrão</DialogTitle>
              <DialogDescription className="text-xs">
                Deseja criar as 10 raças mais usadas no confinamento? As seguintes raças serão criadas:
                <div className="mt-2 text-xs font-medium">
                  {RACAS_PADRAO.join(', ')}
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
                onClick={criarRacasPadrao}
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={submitting}
              >
                {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Criar Raças
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
