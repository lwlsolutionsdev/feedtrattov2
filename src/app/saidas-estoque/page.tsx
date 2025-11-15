'use client'

import { useEffect, useState } from 'react'
import { Insumo } from '@/types/alimentacao'
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
import { Plus, Loader2, Search, PackageMinus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

export default function SaidasEstoquePage() {
  const [saidas, setSaidas] = useState<any[]>([])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingSaida, setDeletingSaida] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Form state
  const [insumoId, setInsumoId] = useState('')
  const [dataHora, setDataHora] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [observacoes, setObservacoes] = useState('')

  useEffect(() => {
    loadSaidas()
    loadInsumos()
  }, [])

  const loadSaidas = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/saidas-estoque')
      const data = await response.json()
      
      if (data.error) throw new Error(data.error)
      
      setSaidas(data.saidas || [])
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar saídas')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!insumoId || !dataHora || !quantidade) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    try {
      setSubmitting(true)

      const response = await fetch('/api/saidas-estoque', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insumo_id: insumoId,
          data_hora: dataHora,
          quantidade: Number(quantidade),
          observacoes: observacoes || null,
        }),
      })

      const data = await response.json()

      if (data.error) throw new Error(data.error)

      toast.success(data.message)
      setOpen(false)
      resetForm()
      loadSaidas()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao registrar saída')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingSaida) return

    try {
      setSubmitting(true)

      const response = await fetch(`/api/saidas-estoque/${deletingSaida.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.error) throw new Error(data.error)

      toast.success(data.message)
      setDeleteOpen(false)
      setDeletingSaida(null)
      loadSaidas()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir saída')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setInsumoId('')
    setDataHora('')
    setQuantidade('')
    setObservacoes('')
  }

  const filteredSaidas = saidas.filter(saida =>
    saida.insumo_nome?.toLowerCase().includes(searchTerm.toLowerCase())
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
                  <BreadcrumbPage>Saídas de Estoque</BreadcrumbPage>
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
                Nova Saída
              </Button>
            </div>

            {/* Tabela */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[15%]">Data/Hora</TableHead>
                    <TableHead className="w-[25%]">Insumo</TableHead>
                    <TableHead className="w-[12%] text-right">Quantidade (kg)</TableHead>
                    <TableHead className="w-[15%] text-right">Valor Estimado</TableHead>
                    <TableHead className="w-[12%] text-right">Saldo Após</TableHead>
                    <TableHead className="w-[16%]">Batida</TableHead>
                    <TableHead className="w-[5%] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredSaidas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <Empty>
                          <EmptyHeader>
                            <PackageMinus className="h-12 w-12" />
                          </EmptyHeader>
                          <EmptyContent>
                            <EmptyTitle>Nenhuma saída encontrada</EmptyTitle>
                            <EmptyDescription>
                              {searchTerm ? 'Tente ajustar sua busca' : 'As saídas de estoque aparecerão aqui'}
                            </EmptyDescription>
                          </EmptyContent>
                        </Empty>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSaidas.map((saida) => (
                      <TableRow key={saida.id}>
                        <TableCell>
                          {new Date(saida.data_hora).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="font-medium">{saida.insumo_nome}</TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(saida.quantidade).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saida.valor_estimado)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(saida.saldo_apos_saida).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {saida.batida_codigo ? (
                            <Badge variant="outline">{saida.batida_codigo}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Manual</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!saida.batida_id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeletingSaida(saida)
                                setDeleteOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
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
              <DialogTitle>Nova Saída de Estoque</DialogTitle>
              <DialogDescription>
                Registre uma saída manual de insumo do estoque
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
                      {insumos.filter(i => i.ativo && i.saldo_atual > 0).map((insumo) => (
                        <SelectItem key={insumo.id} value={insumo.id}>
                          {insumo.nome} (Saldo: {insumo.saldo_atual.toFixed(2)} kg)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <p className="text-xs text-muted-foreground">
                    Quantidade a ser retirada do estoque
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Motivo da saída, destino, etc..."
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
                  Registrar Saída
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
                Tem certeza que deseja excluir esta saída de <strong>{deletingSaida?.insumo_nome}</strong>?
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
