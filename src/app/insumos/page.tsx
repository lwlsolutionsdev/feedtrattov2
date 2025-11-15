'use client'

import { useEffect, useState } from 'react'
import { Insumo, UnidadeMedida } from '@/types/alimentacao'
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
import { Plus, Pencil, Trash2, Loader2, Search, Package } from "lucide-react"
import { toast } from "sonner"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function InsumosPage() {
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [unidades, setUnidades] = useState<UnidadeMedida[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingInsumo, setEditingInsumo] = useState<Insumo | null>(null)
  const [deletingInsumo, setDeletingInsumo] = useState<Insumo | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Form state
  const [nome, setNome] = useState('')
  const [unidadeBaseId, setUnidadeBaseId] = useState('')
  const [estoqueMinimo, setEstoqueMinimo] = useState('')
  const [ativo, setAtivo] = useState(true)

  useEffect(() => {
    loadInsumos()
    loadUnidades()
  }, [])

  const loadInsumos = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/insumos')
      const data = await response.json()
      
      if (data.error) throw new Error(data.error)
      
      setInsumos(data.insumos || [])
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar insumos')
    } finally {
      setLoading(false)
    }
  }

  const loadUnidades = async () => {
    try {
      const response = await fetch('/api/unidades-medida?ativas=true')
      const data = await response.json()
      
      if (data.error) throw new Error(data.error)
      
      setUnidades(data.unidades || [])
    } catch (error: any) {
      console.error('Erro ao carregar unidades:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nome || !unidadeBaseId) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    try {
      setSubmitting(true)

      const url = editingInsumo ? `/api/insumos/${editingInsumo.id}` : '/api/insumos'
      const method = editingInsumo ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          unidade_base_id: unidadeBaseId,
          estoque_minimo: Number(estoqueMinimo) || 0,
          ativo,
        }),
      })

      const data = await response.json()

      if (data.error) throw new Error(data.error)

      toast.success(data.message)
      setOpen(false)
      resetForm()
      loadInsumos()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar insumo')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingInsumo) return

    try {
      setSubmitting(true)

      const response = await fetch(`/api/insumos/${deletingInsumo.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.error) throw new Error(data.error)

      toast.success(data.message)
      setDeleteOpen(false)
      setDeletingInsumo(null)
      loadInsumos()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir insumo')
    } finally {
      setSubmitting(false)
    }
  }

  const openEditDialog = (insumo: Insumo) => {
    setEditingInsumo(insumo)
    setNome(insumo.nome)
    setUnidadeBaseId(insumo.unidade_base_id)
    setEstoqueMinimo(insumo.estoque_minimo.toString())
    setAtivo(insumo.ativo)
    setOpen(true)
  }

  const resetForm = () => {
    setEditingInsumo(null)
    setNome('')
    setUnidadeBaseId('')
    setEstoqueMinimo('0')
    setAtivo(true)
  }

  const filteredInsumos = insumos.filter(insumo =>
    insumo.nome.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OK':
        return <Badge variant="default">OK</Badge>
      case 'BAIXO':
        return <Badge variant="destructive">Baixo</Badge>
      case 'ZERADO':
        return <Badge variant="destructive">Zerado</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const totalInsumos = insumos.length
  const insumosAtivos = insumos.filter(i => i.ativo).length
  const insumosBaixo = insumos.filter(i => i.status_estoque === 'BAIXO' || i.status_estoque === 'ZERADO').length
  const valorTotalImobilizado = insumos.reduce((acc, i) => acc + Number(i.valor_imobilizado), 0)

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 justify-between transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/">Início</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Insumos</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          </div>
          <div className="flex items-center gap-2 px-4">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl space-y-4">
            {/* Estatísticas */}
            <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Insumos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalInsumos}</div>
                <p className="text-xs text-muted-foreground">{insumosAtivos} ativos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
                <Package className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{insumosBaixo}</div>
                <p className="text-xs text-muted-foreground">Requer atenção</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Imobilizado</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotalImobilizado)}
                </div>
                <p className="text-xs text-muted-foreground">Total em estoque</p>
              </CardContent>
            </Card>
          </div>

          {/* Header com busca e ações */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar insumos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Button 
              onClick={() => { resetForm(); setOpen(true) }}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Insumo
            </Button>
          </div>

          {/* Tabela */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-right">Saldo Atual</TableHead>
                  <TableHead className="text-right">Estoque Mínimo</TableHead>
                  <TableHead className="text-right">Preço Médio</TableHead>
                  <TableHead className="text-right">Valor Imobilizado</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredInsumos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      <Empty>
                        <EmptyHeader>
                          <Package className="h-12 w-12" />
                        </EmptyHeader>
                        <EmptyContent>
                          <EmptyTitle>Nenhum insumo encontrado</EmptyTitle>
                          <EmptyDescription>
                            {searchTerm ? 'Tente ajustar sua busca' : 'Comece criando seu primeiro insumo'}
                          </EmptyDescription>
                        </EmptyContent>
                      </Empty>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInsumos.map((insumo) => (
                    <TableRow key={insumo.id}>
                      <TableCell className="font-medium">{insumo.nome}</TableCell>
                      <TableCell>{insumo.unidade_base_sigla}</TableCell>
                      <TableCell className="text-right">{insumo.saldo_atual.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{insumo.estoque_minimo.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(insumo.preco_medio)}
                      </TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(insumo.valor_imobilizado)}
                      </TableCell>
                      <TableCell>{getStatusBadge(insumo.status_estoque)}</TableCell>
                      <TableCell>
                        <Badge variant={insumo.ativo ? "default" : "secondary"}>
                          {insumo.ativo ? "Sim" : "Não"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(insumo)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeletingInsumo(insumo)
                              setDeleteOpen(true)
                            }}
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

        {/* Dialog Criar/Editar */}
        <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm() }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingInsumo ? 'Editar Insumo' : 'Novo Insumo'}</DialogTitle>
              <DialogDescription>
                {editingInsumo ? 'Atualize as informações do insumo' : 'Adicione um novo insumo ao estoque'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Milho, Farelo de Soja..."
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="unidade">Unidade Base *</Label>
                  <Select value={unidadeBaseId} onValueChange={setUnidadeBaseId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {unidades.map((unidade) => (
                        <SelectItem key={unidade.id} value={unidade.id}>
                          {unidade.nome} ({unidade.sigla})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="estoqueMinimo">Estoque Mínimo</Label>
                  <Input
                    id="estoqueMinimo"
                    type="number"
                    step="0.01"
                    value={estoqueMinimo}
                    onChange={(e) => setEstoqueMinimo(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={ativo}
                    onChange={(e) => setAtivo(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="ativo">Ativo</Label>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingInsumo ? 'Atualizar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog Excluir */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir o insumo <strong>{deletingInsumo?.nome}</strong>?
                Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
