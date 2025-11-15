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
import { Plus, Loader2, Search, Blend, Trash2, X, Eye } from "lucide-react"
import { toast } from "sonner"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface Ingrediente {
  insumo_id: string
  percentual_mistura: number
  percentual_ms: number
  valor_unitario_kg: number
}

export default function PreMisturasPage() {
  const [preMisturas, setPreMisturas] = useState<any[]>([])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [viewingPreMistura, setViewingPreMistura] = useState<any>(null)
  const [editingPreMistura, setEditingPreMistura] = useState<any>(null)
  const [deletingPreMistura, setDeletingPreMistura] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Form state
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([
    { insumo_id: '', percentual_mistura: 0, percentual_ms: 0, valor_unitario_kg: 0 }
  ])

  useEffect(() => {
    loadPreMisturas()
    loadInsumos()
  }, [])

  const loadPreMisturas = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/pre-misturas')
      const data = await response.json()
      
      if (data.error) throw new Error(data.error)
      
      setPreMisturas(data.pre_misturas || [])
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar pré-misturas')
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
    
    if (!nome) {
      toast.error('Preencha o nome da pré-mistura')
      return
    }

    const validIngredientes = ingredientes.filter(i => i.insumo_id && i.percentual_mistura > 0)
    
    if (validIngredientes.length < 2 || validIngredientes.length > 4) {
      toast.error('A pré-mistura deve ter entre 2 e 4 ingredientes')
      return
    }

    const totalPercentual = validIngredientes.reduce((sum, i) => sum + Number(i.percentual_mistura), 0)
    if (Math.abs(totalPercentual - 100) > 0.01) {
      toast.error('A soma dos percentuais deve ser 100%')
      return
    }

    try {
      setSubmitting(true)

      const url = editingPreMistura 
        ? `/api/pre-misturas/${editingPreMistura.id}`
        : '/api/pre-misturas'
      
      const method = editingPreMistura ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          descricao: descricao || null,
          ativo,
          ingredientes: validIngredientes,
        }),
      })

      const data = await response.json()

      if (data.error) throw new Error(data.error)

      toast.success(data.message)
      setOpen(false)
      resetForm()
      loadPreMisturas()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar pré-mistura')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingPreMistura) return

    try {
      setSubmitting(true)

      const response = await fetch(`/api/pre-misturas/${deletingPreMistura.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.error) throw new Error(data.error)

      toast.success(data.message)
      setDeleteOpen(false)
      setDeletingPreMistura(null)
      loadPreMisturas()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir pré-mistura')
    } finally {
      setSubmitting(false)
    }
  }

  const openEditDialog = async (preMistura: any) => {
    try {
      const response = await fetch(`/api/pre-misturas/${preMistura.id}`)
      const data = await response.json()
      
      if (data.error) throw new Error(data.error)
      
      setEditingPreMistura(data.pre_mistura)
      setNome(data.pre_mistura.nome)
      setDescricao(data.pre_mistura.descricao || '')
      setAtivo(data.pre_mistura.ativo)
      setIngredientes(data.pre_mistura.ingredientes.map((ing: any) => ({
        insumo_id: ing.insumo_id,
        percentual_mistura: ing.percentual_mistura,
        percentual_ms: ing.percentual_ms,
        valor_unitario_kg: ing.valor_unitario_kg,
      })))
      setOpen(true)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar pré-mistura')
    }
  }

  const openViewDialog = async (preMistura: any) => {
    try {
      const response = await fetch(`/api/pre-misturas/${preMistura.id}`)
      const data = await response.json()
      
      if (data.error) throw new Error(data.error)
      
      setViewingPreMistura(data.pre_mistura)
      setViewOpen(true)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar pré-mistura')
    }
  }

  const resetForm = () => {
    setNome('')
    setDescricao('')
    setAtivo(true)
    setIngredientes([{ insumo_id: '', percentual_mistura: 0, percentual_ms: 0, valor_unitario_kg: 0 }])
    setEditingPreMistura(null)
  }

  const addIngrediente = () => {
    if (ingredientes.length < 4) {
      setIngredientes([...ingredientes, { insumo_id: '', percentual_mistura: 0, percentual_ms: 0, valor_unitario_kg: 0 }])
    }
  }

  const removeIngrediente = (index: number) => {
    if (ingredientes.length > 1) {
      setIngredientes(ingredientes.filter((_, i) => i !== index))
    }
  }

  const updateIngrediente = (index: number, field: keyof Ingrediente, value: any) => {
    const newIngredientes = [...ingredientes]
    newIngredientes[index] = { ...newIngredientes[index], [field]: value }
    setIngredientes(newIngredientes)
  }

  const totalPercentual = ingredientes.reduce((sum, i) => sum + Number(i.percentual_mistura || 0), 0)

  const filteredPreMisturas = preMisturas.filter(pm =>
    pm.nome?.toLowerCase().includes(searchTerm.toLowerCase())
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
                  <BreadcrumbPage>Pré-Misturas</BreadcrumbPage>
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
                    placeholder="Buscar pré-misturas..."
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
                Nova Pré-Mistura
              </Button>
            </div>

            {/* Tabela */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Nome</TableHead>
                    <TableHead className="w-[15%] text-center">Ingredientes</TableHead>
                    <TableHead className="w-[15%] text-right">% MS Total</TableHead>
                    <TableHead className="w-[15%] text-right">Custo/kg</TableHead>
                    <TableHead className="w-[10%] text-center">Ativo</TableHead>
                    <TableHead className="w-[15%] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredPreMisturas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <Empty>
                          <EmptyHeader>
                            <Blend className="h-12 w-12" />
                          </EmptyHeader>
                          <EmptyContent>
                            <EmptyTitle>Nenhuma pré-mistura encontrada</EmptyTitle>
                            <EmptyDescription>
                              {searchTerm ? 'Tente ajustar sua busca' : 'Comece criando sua primeira pré-mistura'}
                            </EmptyDescription>
                          </EmptyContent>
                        </Empty>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPreMisturas.map((pm) => (
                      <TableRow key={pm.id}>
                        <TableCell className="font-medium">{pm.nome}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{pm.total_ingredientes}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(pm.percentual_ms_total).toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pm.custo_kg)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={pm.ativo ? "default" : "secondary"}>
                            {pm.ativo ? "Sim" : "Não"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openViewDialog(pm)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(pm)}
                            >
                              <Blend className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeletingPreMistura(pm)
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
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPreMistura ? 'Editar Pré-Mistura' : 'Nova Pré-Mistura'}</DialogTitle>
              <DialogDescription>
                {editingPreMistura ? 'Atualize os dados da pré-mistura' : 'Crie uma pré-mistura com 2 a 4 ingredientes'}
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
                    placeholder="Ex: Pré-Mistura Proteica"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Informações adicionais..."
                    rows={2}
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

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">Ingredientes (2 a 4)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addIngrediente}
                      disabled={ingredientes.length >= 4}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>

                  {ingredientes.map((ing, index) => (
                    <div key={index} className="grid gap-3 p-4 border rounded-lg relative">
                      {ingredientes.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6"
                          onClick={() => removeIngrediente(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}

                      <div className="grid gap-2">
                        <Label>Insumo *</Label>
                        <Select
                          value={ing.insumo_id}
                          onValueChange={(value) => updateIngrediente(index, 'insumo_id', value)}
                          required
                        >
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

                      <div className="grid grid-cols-3 gap-3">
                        <div className="grid gap-2">
                          <Label>% Mistura *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={ing.percentual_mistura || ''}
                            onChange={(e) => updateIngrediente(index, 'percentual_mistura', Number(e.target.value))}
                            placeholder="0.00"
                            required
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label>% MS *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={ing.percentual_ms || ''}
                            onChange={(e) => updateIngrediente(index, 'percentual_ms', Number(e.target.value))}
                            placeholder="0.00"
                            required
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label>R$/kg *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={ing.valor_unitario_kg || ''}
                            onChange={(e) => updateIngrediente(index, 'valor_unitario_kg', Number(e.target.value))}
                            placeholder="0.00"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total: {totalPercentual.toFixed(2)}%</span>
                      <span className={totalPercentual === 100 ? 'text-green-600' : 'text-destructive'}>
                        {totalPercentual === 100 ? '✓ Correto' : '✗ Deve ser 100%'}
                      </span>
                    </div>
                    <Progress value={Math.min(totalPercentual, 100)} className="h-2" />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting || totalPercentual !== 100}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingPreMistura ? 'Atualizar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog Visualizar */}
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{viewingPreMistura?.nome}</DialogTitle>
              <DialogDescription>
                Detalhes da pré-mistura
              </DialogDescription>
            </DialogHeader>
            {viewingPreMistura && (
              <div className="space-y-4">
                {viewingPreMistura.descricao && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Descrição</Label>
                    <p className="text-sm">{viewingPreMistura.descricao}</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">% MS Total</Label>
                    <p className="text-lg font-semibold">{Number(viewingPreMistura.percentual_ms_total).toFixed(2)}%</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Custo/kg</Label>
                    <p className="text-lg font-semibold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(viewingPreMistura.custo_kg)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Status</Label>
                    <p className="text-lg font-semibold">{viewingPreMistura.ativo ? 'Ativo' : 'Inativo'}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-base mb-3 block">Ingredientes</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Insumo</TableHead>
                        <TableHead className="text-right">% Mistura</TableHead>
                        <TableHead className="text-right">% MS</TableHead>
                        <TableHead className="text-right">R$/kg</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingPreMistura.ingredientes?.map((ing: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{ing.insumo_nome}</TableCell>
                          <TableCell className="text-right font-mono">{Number(ing.percentual_mistura).toFixed(2)}%</TableCell>
                          <TableCell className="text-right font-mono">{Number(ing.percentual_ms).toFixed(2)}%</TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ing.valor_unitario_kg)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog Excluir */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir a pré-mistura <strong>{deletingPreMistura?.nome}</strong>?
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
