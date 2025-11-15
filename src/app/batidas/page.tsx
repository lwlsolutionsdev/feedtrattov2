'use client'

import { useEffect, useState } from 'react'
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
import { Plus, Loader2, Search, Soup, Trash2, CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

export default function BatidasPage() {
  const [batidas, setBatidas] = useState<any[]>([])
  const [dietas, setDietas] = useState<any[]>([])
  const [vagoes, setVagoes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingBatida, setDeletingBatida] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Form state
  const [vagaoId, setVagaoId] = useState('')
  const [dietaId, setDietaId] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [dataHora, setDataHora] = useState('')
  const [observacoes, setObservacoes] = useState('')

  useEffect(() => {
    loadBatidas()
    loadDietas()
    loadVagoes()
  }, [])

  const loadBatidas = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/batidas')
      const data = await response.json()
      
      if (data.error) throw new Error(data.error)
      
      setBatidas(data.batidas || [])
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar batidas')
    } finally {
      setLoading(false)
    }
  }

  const loadDietas = async () => {
    try {
      const response = await fetch('/api/dietas?ativas=true')
      const data = await response.json()
      
      if (data.error) throw new Error(data.error)
      
      setDietas(data.dietas || [])
    } catch (error: any) {
      console.error('Erro ao carregar dietas:', error)
    }
  }

  const loadVagoes = async () => {
    try {
      const response = await fetch('/api/vagoes?ativas=true')
      const data = await response.json()
      
      if (data.error) throw new Error(data.error)
      
      setVagoes(data.vagoes || [])
    } catch (error: any) {
      console.error('Erro ao carregar vagões:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!dietaId || !quantidade || !dataHora) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    try {
      setSubmitting(true)

      const response = await fetch('/api/batidas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vagao_id: vagaoId || null,
          dieta_id: dietaId,
          quantidade: Number(quantidade),
          data_hora: dataHora,
          observacoes: observacoes || null,
        }),
      })

      const data = await response.json()

      if (data.error) throw new Error(data.error)

      toast.success(data.message)
      setOpen(false)
      resetForm()
      loadBatidas()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar batida')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAprovar = async (batida: any) => {
    if (!confirm(`Aprovar batida ${batida.codigo}? Isso irá gerar saídas de estoque automaticamente.`)) {
      return
    }

    try {
      setSubmitting(true)

      const response = await fetch(`/api/batidas/${batida.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CONCLUIDA' }),
      })

      const data = await response.json()

      if (data.error) throw new Error(data.error)

      toast.success(data.message)
      loadBatidas()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao aprovar batida')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelar = async (batida: any) => {
    if (!confirm(`Cancelar batida ${batida.codigo}?`)) {
      return
    }

    try {
      setSubmitting(true)

      const response = await fetch(`/api/batidas/${batida.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELADA' }),
      })

      const data = await response.json()

      if (data.error) throw new Error(data.error)

      toast.success(data.message)
      loadBatidas()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cancelar batida')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingBatida) return

    try {
      setSubmitting(true)

      const response = await fetch(`/api/batidas/${deletingBatida.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.error) throw new Error(data.error)

      toast.success(data.message)
      setDeleteOpen(false)
      setDeletingBatida(null)
      loadBatidas()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir batida')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setVagaoId('')
    setDietaId('')
    setQuantidade('')
    setDataHora('')
    setObservacoes('')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PREPARANDO':
        return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">Preparando</Badge>
      case 'CONCLUIDA':
        return <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400">Concluída</Badge>
      case 'CANCELADA':
        return <Badge variant="destructive">Cancelada</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const filteredBatidas = batidas.filter(b =>
    b.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.dieta_nome?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
                  <BreadcrumbPage>Batidas</BreadcrumbPage>
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
            {/* Header com busca e ações */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar batidas..."
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
                Nova Batida
              </Button>
            </div>

            {/* Tabela */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[12%]">Código</TableHead>
                    <TableHead className="w-[15%]">Data/Hora</TableHead>
                    <TableHead className="w-[15%]">Vagão</TableHead>
                    <TableHead className="w-[20%]">Dieta</TableHead>
                    <TableHead className="w-[12%] text-right">Quantidade (kg)</TableHead>
                    <TableHead className="w-[10%] text-center">Status</TableHead>
                    <TableHead className="w-[16%] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredBatidas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <Empty>
                          <EmptyHeader>
                            <Soup className="h-12 w-12" />
                          </EmptyHeader>
                          <EmptyContent>
                            <EmptyTitle>Nenhuma batida encontrada</EmptyTitle>
                            <EmptyDescription>
                              {searchTerm ? 'Tente ajustar sua busca' : 'Comece criando sua primeira batida'}
                            </EmptyDescription>
                          </EmptyContent>
                        </Empty>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBatidas.map((batida) => (
                      <TableRow key={batida.id}>
                        <TableCell className="font-medium font-mono">{batida.codigo}</TableCell>
                        <TableCell>
                          {new Date(batida.data_hora).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>{batida.vagao_nome || '-'}</TableCell>
                        <TableCell>{batida.dieta_nome}</TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(batida.quantidade).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(batida.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {batida.status === 'PREPARANDO' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleAprovar(batida)}
                                  disabled={submitting}
                                  title="Aprovar"
                                >
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleCancelar(batida)}
                                  disabled={submitting}
                                  title="Cancelar"
                                >
                                  <XCircle className="h-4 w-4 text-orange-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setDeletingBatida(batida)
                                    setDeleteOpen(true)
                                  }}
                                  disabled={submitting}
                                  title="Excluir"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
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

        {/* Dialog Criar */}
        <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm() }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Nova Batida</DialogTitle>
              <DialogDescription>
                Crie uma nova batida de ração
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="vagao">Vagão</Label>
                  <Select value={vagaoId} onValueChange={setVagaoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o vagão (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {vagoes.map((vagao) => (
                        <SelectItem key={vagao.id} value={vagao.id}>
                          {vagao.nome} ({vagao.capacidade.toFixed(0)} kg)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="dieta">Dieta *</Label>
                  <Select value={dietaId} onValueChange={setDietaId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a dieta" />
                    </SelectTrigger>
                    <SelectContent>
                      {dietas.map((dieta) => (
                        <SelectItem key={dieta.id} value={dieta.id}>
                          {dieta.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="quantidade">Quantidade em KG *</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    step="0.01"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="dataHora">Data e Hora *</Label>
                  <Input
                    id="dataHora"
                    type="datetime-local"
                    value={dataHora}
                    onChange={(e) => setDataHora(e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Informações adicionais..."
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar Batida
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
                Tem certeza que deseja excluir a batida <strong>{deletingBatida?.codigo}</strong>?
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
