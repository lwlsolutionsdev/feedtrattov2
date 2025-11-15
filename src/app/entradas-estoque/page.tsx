'use client'

import { useEffect, useState } from 'react'
import { EntradaEstoque, Insumo, UnidadeMedida } from '@/types/alimentacao'
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
import { Plus, Loader2, Search, PackagePlus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

export default function EntradasEstoquePage() {
  const [entradas, setEntradas] = useState<any[]>([])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [unidades, setUnidades] = useState<UnidadeMedida[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingEntrada, setDeletingEntrada] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Form state
  const [insumoId, setInsumoId] = useState('')
  const [dataEntrada, setDataEntrada] = useState('')
  const [unidadeEntradaId, setUnidadeEntradaId] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [valorUnitario, setValorUnitario] = useState('')
  const [observacoes, setObservacoes] = useState('')

  useEffect(() => {
    loadEntradas()
    loadInsumos()
    loadUnidades()
  }, [])

  const loadEntradas = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/entradas-estoque')
      const data = await response.json()
      
      if (data.error) throw new Error(data.error)
      
      setEntradas(data.entradas || [])
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar entradas')
    } finally {
      setLoading(false)
    }
  }

  const loadInsumos = async () => {
    try {
      const response = await fetch('/api/insumos')
      const data = await response.json()
      
      if (data.error) throw new Error(data.error)
      
      setInsumos(data.insumos || [])
    } catch (error: any) {
      console.error('Erro ao carregar insumos:', error)
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
    
    if (!insumoId || !dataEntrada || !unidadeEntradaId || !quantidade || !valorUnitario) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    try {
      setSubmitting(true)

      const response = await fetch('/api/entradas-estoque', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insumo_id: insumoId,
          data_entrada: dataEntrada,
          unidade_entrada_id: unidadeEntradaId,
          quantidade: Number(quantidade),
          valor_unitario: Number(valorUnitario),
          observacoes: observacoes || null,
        }),
      })

      const data = await response.json()

      if (data.error) throw new Error(data.error)

      toast.success(data.message)
      setOpen(false)
      resetForm()
      loadEntradas()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao registrar entrada')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingEntrada) return

    try {
      setSubmitting(true)

      const response = await fetch(`/api/entradas-estoque/${deletingEntrada.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.error) throw new Error(data.error)

      toast.success(data.message)
      setDeleteOpen(false)
      setDeletingEntrada(null)
      loadEntradas()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir entrada')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setInsumoId('')
    setDataEntrada('')
    setUnidadeEntradaId('')
    setQuantidade('')
    setValorUnitario('')
    setObservacoes('')
  }

  const filteredEntradas = entradas.filter(entrada =>
    entrada.insumo_nome?.toLowerCase().includes(searchTerm.toLowerCase())
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
                  <BreadcrumbPage>Entradas de Estoque</BreadcrumbPage>
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
                    placeholder="Buscar por insumo..."
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
                Nova Entrada
              </Button>
            </div>

            {/* Tabela */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[15%]">Data</TableHead>
                    <TableHead className="w-[25%]">Insumo</TableHead>
                    <TableHead className="w-[15%] text-right">Quantidade</TableHead>
                    <TableHead className="w-[10%]">Unidade</TableHead>
                    <TableHead className="w-[15%] text-right">Valor Unit.</TableHead>
                    <TableHead className="w-[15%] text-right">Valor Total</TableHead>
                    <TableHead className="w-[5%] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredEntradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <Empty>
                          <EmptyHeader>
                            <PackagePlus className="h-12 w-12" />
                          </EmptyHeader>
                          <EmptyContent>
                            <EmptyTitle>Nenhuma entrada encontrada</EmptyTitle>
                            <EmptyDescription>
                              {searchTerm ? 'Tente ajustar sua busca' : 'Comece registrando sua primeira entrada de estoque'}
                            </EmptyDescription>
                          </EmptyContent>
                        </Empty>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEntradas.map((entrada) => (
                      <TableRow key={entrada.id}>
                        <TableCell>
                          {new Date(entrada.data_entrada).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="font-medium">{entrada.insumo_nome}</TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(entrada.quantidade).toFixed(2)}
                        </TableCell>
                        <TableCell>{entrada.unidade_entrada_sigla}</TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entrada.valor_unitario)}
                        </TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entrada.valor_total)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeletingEntrada(entrada)
                              setDeleteOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
              <DialogTitle>Nova Entrada de Estoque</DialogTitle>
              <DialogDescription>
                Registre uma nova entrada de insumo no estoque
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="insumo">Insumo *</Label>
                  <Select value={insumoId} onValueChange={setInsumoId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o insumo" />
                    </SelectTrigger>
                    <SelectContent>
                      {insumos.filter(i => i.ativo).map((insumo) => (
                        <SelectItem key={insumo.id} value={insumo.id}>
                          {insumo.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="dataEntrada">Data de Entrada *</Label>
                  <Input
                    id="dataEntrada"
                    type="date"
                    value={dataEntrada}
                    onChange={(e) => setDataEntrada(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="quantidade">Quantidade *</Label>
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
                    <Label htmlFor="unidade">Unidade *</Label>
                    <Select value={unidadeEntradaId} onValueChange={setUnidadeEntradaId} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Unidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {unidades.map((unidade) => (
                          <SelectItem key={unidade.id} value={unidade.id}>
                            {unidade.sigla}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="valorUnitario">Valor Unitário (R$) *</Label>
                  <Input
                    id="valorUnitario"
                    type="number"
                    step="0.01"
                    value={valorUnitario}
                    onChange={(e) => setValorUnitario(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Valor por unidade de entrada
                  </p>
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
                  Registrar Entrada
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
                Tem certeza que deseja excluir esta entrada de <strong>{deletingEntrada?.insumo_nome}</strong>?
                Esta ação não pode ser desfeita e afetará o saldo do estoque.
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
