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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Truck, Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface Vagao {
  id: string
  nome: string
  descricao: string | null
  capacidade_kg: number
  ativo: boolean
  created_at: string
}

export default function VagoesPage() {
  const [vagoes, setVagoes] = useState<Vagao[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVagao, setEditingVagao] = useState<Vagao | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [vagaoToDelete, setVagaoToDelete] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    capacidade_kg: '',
    ativo: true
  })

  const supabase = createClient()

  useEffect(() => {
    fetchVagoes()
  }, [])

  async function fetchVagoes() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('vagoes')
        .select('*')
        .order('nome')

      if (error) throw error
      setVagoes(data || [])
    } catch (error: any) {
      console.error('Erro ao buscar vagões:', error)
      toast.error('Erro ao carregar vagões')
    } finally {
      setLoading(false)
    }
  }

  function openCreateDialog() {
    setEditingVagao(null)
    setFormData({
      nome: '',
      descricao: '',
      capacidade_kg: '',
      ativo: true
    })
    setDialogOpen(true)
  }

  function openEditDialog(vagao: Vagao) {
    setEditingVagao(vagao)
    setFormData({
      nome: vagao.nome,
      descricao: vagao.descricao || '',
      capacidade_kg: vagao.capacidade_kg.toString(),
      ativo: vagao.ativo
    })
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.nome || !formData.capacidade_kg) {
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

      const vagaoData = {
        nome: formData.nome,
        descricao: formData.descricao || null,
        capacidade_kg: parseFloat(formData.capacidade_kg),
        ativo: formData.ativo,
        cliente_id: user.id,
        empresa_id: cliente?.empresa_id || null
      }

      if (editingVagao) {
        const { error } = await supabase
          .from('vagoes')
          .update(vagaoData)
          .eq('id', editingVagao.id)

        if (error) {
          console.error('Erro detalhado ao atualizar vagão:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          throw error
        }
        toast.success('Vagão atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('vagoes')
          .insert(vagaoData)

        if (error) {
          console.error('Erro detalhado ao criar vagão:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            data: vagaoData
          })
          throw error
        }
        toast.success('Vagão criado com sucesso!')
      }

      setDialogOpen(false)
      fetchVagoes()
    } catch (error: any) {
      console.error('Erro ao salvar vagão:', error)
      toast.error(error.message || 'Erro ao salvar vagão')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!vagaoToDelete) return

    try {
      const { error } = await supabase
        .from('vagoes')
        .delete()
        .eq('id', vagaoToDelete)

      if (error) throw error

      toast.success('Vagão excluído com sucesso!')
      setDeleteDialogOpen(false)
      setVagaoToDelete(null)
      fetchVagoes()
    } catch (error: any) {
      console.error('Erro ao excluir vagão:', error)
      toast.error('Erro ao excluir vagão')
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <div className="flex items-center gap-2 flex-1">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Vagões</BreadcrumbPage>
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
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Truck className="h-6 w-6" />
                  Vagões Forrageiros
                </h1>
                <p className="text-sm text-muted-foreground">
                  Gerencie os vagões para distribuição de trato
                </p>
              </div>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Vagão
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Lista de Vagões</CardTitle>
                <CardDescription>
                  {vagoes.length} {vagoes.length === 1 ? 'vagão cadastrado' : 'vagões cadastrados'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                  </div>
                ) : vagoes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Truck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum vagão cadastrado</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Capacidade</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vagoes.map((vagao) => (
                        <TableRow key={vagao.id}>
                          <TableCell className="font-medium">{vagao.nome}</TableCell>
                          <TableCell>{vagao.capacidade_kg} kg</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {vagao.descricao || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={vagao.ativo ? 'default' : 'secondary'}>
                              {vagao.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(vagao)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  setVagaoToDelete(vagao.id)
                                  setDeleteDialogOpen(true)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Dialog Criar/Editar */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingVagao ? 'Editar Vagão' : 'Novo Vagão'}
              </DialogTitle>
              <DialogDescription>
                {editingVagao ? 'Atualize as informações do vagão' : 'Cadastre um novo vagão forrageiro'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Vagão 01"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capacidade_kg">Capacidade (kg) *</Label>
                  <Input
                    id="capacidade_kg"
                    type="number"
                    step="0.01"
                    value={formData.capacidade_kg}
                    onChange={(e) => setFormData({ ...formData, capacidade_kg: e.target.value })}
                    placeholder="Ex: 500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Informações adicionais sobre o vagão"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="ativo">Vagão ativo</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog Confirmar Exclusão */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir este vagão? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
