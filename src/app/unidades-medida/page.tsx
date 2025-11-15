'use client'

import { useEffect, useState } from 'react'
import { UnidadeMedida } from '@/types/alimentacao'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Loader2, Ruler, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

export default function UnidadesMedidaPage() {
  const [unidades, setUnidades] = useState<UnidadeMedida[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingUnidade, setDeletingUnidade] = useState<UnidadeMedida | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [nome, setNome] = useState('')
  const [sigla, setSigla] = useState('')
  const [fatorConversao, setFatorConversao] = useState('')
  const [ativo, setAtivo] = useState(true)

  useEffect(() => {
    loadUnidades()
  }, [])

  const loadUnidades = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/unidades-medida')
      const data = await response.json()
      
      if (data.error) throw new Error(data.error)
      
      setUnidades(data.unidades || [])
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar unidades de medida')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nome || !sigla || !fatorConversao) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    try {
      setSubmitting(true)

      const response = await fetch('/api/unidades-medida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          sigla: sigla.toUpperCase(),
          fator_conversao: Number(fatorConversao),
          ativo,
        }),
      })

      const data = await response.json()

      if (data.error) throw new Error(data.error)

      toast.success(data.message)
      setOpen(false)
      resetForm()
      loadUnidades()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar unidade de medida')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setNome('')
    setSigla('')
    setFatorConversao('')
    setAtivo(true)
  }

  const handleDelete = async () => {
    if (!deletingUnidade) return

    try {
      setSubmitting(true)

      const response = await fetch(`/api/unidades-medida/${deletingUnidade.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.error) throw new Error(data.error)

      toast.success(data.message)
      setDeleteOpen(false)
      setDeletingUnidade(null)
      loadUnidades()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir unidade de medida')
    } finally {
      setSubmitting(false)
    }
  }

  const criarUnidadesPadrao = async () => {
    const unidadesPadrao = [
      { nome: 'Quilograma', sigla: 'KG', fator_conversao: 1.0 },
      { nome: 'Saca 30kg', sigla: 'SC30', fator_conversao: 30.0 },
      { nome: 'Saca 40kg', sigla: 'SC40', fator_conversao: 40.0 },
      { nome: 'Saca 50kg', sigla: 'SC50', fator_conversao: 50.0 },
      { nome: 'Saca 60kg', sigla: 'SC60', fator_conversao: 60.0 },
      { nome: 'Tonelada', sigla: 'TON', fator_conversao: 1000.0 },
    ]

    try {
      setSubmitting(true)
      
      for (const unidade of unidadesPadrao) {
        await fetch('/api/unidades-medida', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...unidade, ativo: true }),
        })
      }

      toast.success('Unidades padrão criadas com sucesso!')
      loadUnidades()
    } catch (error: any) {
      toast.error('Erro ao criar unidades padrão')
    } finally {
      setSubmitting(false)
    }
  }

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
                  <BreadcrumbPage>Unidades de Medida</BreadcrumbPage>
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
            {/* Header com ações */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {unidades.length} unidade{unidades.length !== 1 ? 's' : ''} cadastrada{unidades.length !== 1 ? 's' : ''}
              </div>
              <div className="flex gap-2">
                {unidades.length === 0 && (
                  <Button 
                    variant="outline"
                    onClick={criarUnidadesPadrao}
                    disabled={submitting}
                  >
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar Unidades Padrão
                  </Button>
                )}
                <Button 
                  onClick={() => { resetForm(); setOpen(true) }}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Unidade
                </Button>
              </div>
            </div>

            {/* Tabela */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Nome</TableHead>
                    <TableHead className="w-[15%]">Sigla</TableHead>
                    <TableHead className="w-[15%] text-right">Fator de Conversão</TableHead>
                    <TableHead className="w-[25%]">Equivalência</TableHead>
                    <TableHead className="w-[10%] text-center">Ativo</TableHead>
                    <TableHead className="w-[5%] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      </TableRow>
                    ))
                  ) : unidades.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <Empty>
                          <EmptyHeader>
                            <Ruler className="h-12 w-12" />
                          </EmptyHeader>
                          <EmptyContent>
                            <EmptyTitle>Nenhuma unidade cadastrada</EmptyTitle>
                            <EmptyDescription>
                              Crie unidades padrão ou adicione manualmente
                            </EmptyDescription>
                          </EmptyContent>
                        </Empty>
                      </TableCell>
                    </TableRow>
                  ) : (
                    unidades.map((unidade) => (
                      <TableRow key={unidade.id}>
                        <TableCell className="font-medium">{unidade.nome}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{unidade.sigla}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">{unidade.fator_conversao.toFixed(2)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          1 {unidade.sigla} = {unidade.fator_conversao.toFixed(2)} KG
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={unidade.ativo ? "default" : "secondary"}>
                            {unidade.ativo ? "Sim" : "Não"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeletingUnidade(unidade)
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Unidade de Medida</DialogTitle>
              <DialogDescription>
                Adicione uma nova unidade de medida para o controle de estoque
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
                    placeholder="Ex: Saca 30kg, Tonelada..."
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sigla">Sigla *</Label>
                  <Input
                    id="sigla"
                    value={sigla}
                    onChange={(e) => setSigla(e.target.value.toUpperCase())}
                    placeholder="Ex: SC30, TON..."
                    maxLength={10}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="fatorConversao">Fator de Conversão (para KG) *</Label>
                  <Input
                    id="fatorConversao"
                    type="number"
                    step="0.01"
                    value={fatorConversao}
                    onChange={(e) => setFatorConversao(e.target.value)}
                    placeholder="Ex: 30.00 (1 unidade = 30 kg)"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Quantos KG equivalem a 1 unidade desta medida
                  </p>
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
                  Criar
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
                Tem certeza que deseja excluir a unidade <strong>{deletingUnidade?.nome}</strong>?
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
