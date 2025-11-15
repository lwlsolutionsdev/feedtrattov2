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
import { Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"

export default function CurraisPage() {
  const [currais, setCurrais] = useState<Curral[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingCurral, setEditingCurral] = useState<Curral | null>(null)

  // Form state
  const [nome, setNome] = useState('')
  const [linha, setLinha] = useState('')
  const [areaM2, setAreaM2] = useState('')
  const [capacidadeAnimais, setCapacidadeAnimais] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadCurrais()
  }, [])

  async function loadCurrais() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('currais')
        .select('*')
        .eq('cliente_id', user.id)
        .order('nome')

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Buscar empresa_id do cliente
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
        // Update
        const { error } = await supabase
          .from('currais')
          .update(curralData)
          .eq('id', editingCurral.id)

        if (error) throw error

        toast.success("Curral atualizado com sucesso!")
      } else {
        // Insert
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
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este curral?')) return

    try {
      const { error } = await supabase
        .from('currais')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success("Curral excluído com sucesso!")

      loadCurrais()
    } catch (error: any) {
      toast.error("Erro ao excluir curral", {
        description: error.message,
      })
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
  }

  function handleOpenChange(open: boolean) {
    setOpen(open)
    if (!open) {
      resetForm()
    }
  }

  // Gerar opções de linha A-Z
  const linhaOptions = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))

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
              <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-3 w-3" />
                    Novo Curral
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle className="text-base">
                      {editingCurral ? 'Editar Curral' : 'Novo Curral'}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Preencha os dados do curral
                    </DialogDescription>
                  </DialogHeader>
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
                    <Button type="submit" size="sm">
                      {editingCurral ? 'Salvar' : 'Criar'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

            {loading ? (
              <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
                Carregando...
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
                  <Button size="sm" onClick={() => setOpen(true)}>
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
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currais.map((curral) => (
                      <TableRow key={curral.id}>
                        <TableCell className="font-medium">{curral.nome}</TableCell>
                        <TableCell>{curral.linha || '-'}</TableCell>
                        <TableCell>{curral.area_m2.toLocaleString('pt-BR')} m²</TableCell>
                        <TableCell>{curral.capacidade_animais || '-'}</TableCell>
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
                            onClick={() => handleDelete(curral.id)}
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
      </SidebarInset>
    </SidebarProvider>
  )
}
