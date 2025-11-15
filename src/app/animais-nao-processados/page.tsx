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
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, Loader2, Search, ArrowUpCircle, ArrowDownCircle, History } from "lucide-react"
import { toast } from "sonner"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

interface AnimalNaoProcessado {
  id: string
  quantidade: number
  peso_medio: number
  origem: string | null
  observacoes: string | null
  curral_id: string
  ativo: boolean
  created_at: string
  currais?: {
    nome: string
    capacidade_animais: number | null
  }
}

interface Curral {
  id: string
  nome: string
  capacidade_animais: number | null
}

interface Movimentacao {
  id: string
  tipo: 'ENTRADA' | 'SAIDA'
  quantidade: number
  peso_medio: number | null
  origem: string | null
  observacoes: string | null
  data_movimentacao: string
}

export default function AnimaisNaoProcessadosPage() {
  const [animais, setAnimais] = useState<AnimalNaoProcessado[]>([])
  const [currais, setCurrais] = useState<Curral[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [movimentacaoOpen, setMovimentacaoOpen] = useState(false)
  const [historicoOpen, setHistoricoOpen] = useState(false)
  const [editingAnimal, setEditingAnimal] = useState<AnimalNaoProcessado | null>(null)
  const [deletingAnimal, setDeletingAnimal] = useState<AnimalNaoProcessado | null>(null)
  const [animalSelecionado, setAnimalSelecionado] = useState<AnimalNaoProcessado | null>(null)
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Form states
  const [quantidade, setQuantidade] = useState('')
  const [pesoMedio, setPesoMedio] = useState('')
  const [origem, setOrigem] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [curralId, setCurralId] = useState('')
  const [ativo, setAtivo] = useState(true)
  
  // Movimentação states
  const [tipoMovimentacao, setTipoMovimentacao] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA')
  const [quantidadeMovimentacao, setQuantidadeMovimentacao] = useState('')
  const [pesoMedioMovimentacao, setPesoMedioMovimentacao] = useState('')
  const [origemMovimentacao, setOrigemMovimentacao] = useState('')
  const [observacoesMovimentacao, setObservacoesMovimentacao] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchAnimais()
    fetchCurraisDisponiveis()
  }, [])

  async function fetchAnimais() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('animais_nao_processados')
        .select(`
          *,
          currais (
            nome
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAnimais(data || [])
    } catch (error: any) {
      console.error('Erro ao buscar animais:', error)
      toast.error('Erro ao carregar animais')
    } finally {
      setLoading(false)
    }
  }

  async function fetchCurraisDisponiveis() {
    try {
      const { data: curraisData, error: curraisError } = await supabase
        .from('currais')
        .select('id, nome, capacidade_animais')
        .order('nome')

      if (curraisError) throw curraisError
      
      // Filtrar currais que não têm lote ativo
      const { data: lotesData, error: lotesError } = await supabase
        .from('lotes')
        .select('curral_id')
        .eq('status', 'ATIVO')

      // Se houver erro ao buscar lotes, retorna todos os currais
      if (lotesError) {
        console.warn('Aviso ao buscar lotes:', lotesError)
        setCurrais(curraisData || [])
        return
      }

      const curraisComLoteIds = new Set(lotesData?.map(l => l.curral_id) || [])
      const curraisDisponiveis = curraisData?.filter(c => !curraisComLoteIds.has(c.id)) || []
      
      setCurrais(curraisDisponiveis)
    } catch (error: any) {
      console.error('Erro ao buscar currais:', error)
      toast.error('Erro ao carregar currais')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!quantidade || !pesoMedio || !curralId) {
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

      if (editingAnimal) {
        const { error } = await supabase
          .from('animais_nao_processados')
          .update({
            peso_medio: parseFloat(pesoMedio),
            origem: origem || null,
            observacoes: observacoes || null,
            curral_id: curralId,
            ativo: ativo,
          })
          .eq('id', editingAnimal.id)

        if (error) throw error
        toast.success('Animal atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('animais_nao_processados')
          .insert({
            quantidade: parseInt(quantidade),
            peso_medio: parseFloat(pesoMedio),
            origem: origem || null,
            observacoes: observacoes || null,
            curral_id: curralId,
            ativo: ativo,
            cliente_id: user.id,
            empresa_id: cliente?.empresa_id || null,
          })

        if (error) throw error
        toast.success('Animal cadastrado com sucesso!')
      }

      handleCloseDialog()
      fetchAnimais()
    } catch (error: any) {
      console.error('Erro ao salvar animal:', error)
      toast.error('Erro ao salvar animal: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleCloseDialog() {
    setOpen(false)
    setEditingAnimal(null)
    setQuantidade('')
    setPesoMedio('')
    setOrigem('')
    setObservacoes('')
    setCurralId('')
    setAtivo(true)
  }

  function handleEdit(animal: AnimalNaoProcessado) {
    setEditingAnimal(animal)
    setQuantidade(animal.quantidade.toString())
    setPesoMedio(animal.peso_medio.toString())
    setOrigem(animal.origem || '')
    setObservacoes(animal.observacoes || '')
    setCurralId(animal.curral_id)
    setAtivo(animal.ativo)
    setOpen(true)
  }

  function openDeleteDialog(animal: AnimalNaoProcessado) {
    setDeletingAnimal(animal)
    setDeleteOpen(true)
  }

  async function handleDelete() {
    if (!deletingAnimal) return

    try {
      setDeleting(true)
      const { error } = await supabase
        .from('animais_nao_processados')
        .delete()
        .eq('id', deletingAnimal.id)

      if (error) throw error
      toast.success('Animal excluído com sucesso!')
      setDeleteOpen(false)
      setDeletingAnimal(null)
      fetchAnimais()
    } catch (error: any) {
      console.error('Erro ao excluir animal:', error)
      toast.error('Erro ao excluir animal: ' + error.message)
    } finally {
      setDeleting(false)
    }
  }

  async function openMovimentacaoDialog(animal: AnimalNaoProcessado) {
    setAnimalSelecionado(animal)
    setTipoMovimentacao('ENTRADA')
    setQuantidadeMovimentacao('')
    setPesoMedioMovimentacao('')
    setOrigemMovimentacao('')
    setObservacoesMovimentacao('')
    setMovimentacaoOpen(true)
  }

  async function handleMovimentacao(e: React.FormEvent) {
    e.preventDefault()
    
    if (!quantidadeMovimentacao || !animalSelecionado) {
      toast.error('Preencha a quantidade')
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

      const { error } = await supabase
        .from('movimentacoes_animais_nao_processados')
        .insert({
          animal_nao_processado_id: animalSelecionado.id,
          tipo: tipoMovimentacao,
          quantidade: parseInt(quantidadeMovimentacao),
          peso_medio: pesoMedioMovimentacao ? parseFloat(pesoMedioMovimentacao) : null,
          origem: origemMovimentacao || null,
          observacoes: observacoesMovimentacao || null,
          cliente_id: user.id,
          empresa_id: cliente?.empresa_id || null,
        })

      if (error) throw error
      toast.success(`${tipoMovimentacao === 'ENTRADA' ? 'Entrada' : 'Saída'} registrada com sucesso!`)
      setMovimentacaoOpen(false)
      fetchAnimais()
    } catch (error: any) {
      console.error('Erro ao registrar movimentação:', error)
      toast.error('Erro ao registrar movimentação: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function openHistoricoDialog(animal: AnimalNaoProcessado) {
    setAnimalSelecionado(animal)
    try {
      const { data, error } = await supabase
        .from('movimentacoes_animais_nao_processados')
        .select('*')
        .eq('animal_nao_processado_id', animal.id)
        .order('data_movimentacao', { ascending: false })

      if (error) throw error
      setMovimentacoes(data || [])
      setHistoricoOpen(true)
    } catch (error: any) {
      console.error('Erro ao buscar histórico:', error)
      toast.error('Erro ao carregar histórico')
    }
  }

  const filteredAnimais = animais.filter(animal =>
    animal.origem?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    animal.currais?.nome.toLowerCase().includes(searchTerm.toLowerCase())
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
                  <BreadcrumbPage>Animais Não Processados</BreadcrumbPage>
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
                <h1 className="text-xl font-semibold">Animais Não Processados</h1>
                <p className="text-xs text-muted-foreground">
                  Gerencie animais em currais provisórios
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por origem ou curral..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button 
                onClick={() => setOpen(true)}
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Animal
              </Button>
            </div>

            {loading ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Peso Médio</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Curral</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : filteredAnimais.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Nenhum animal cadastrado</EmptyTitle>
                  <EmptyDescription>
                    Comece cadastrando animais não processados
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button size="sm" onClick={() => setOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Plus className="mr-2 h-3 w-3" />
                    Cadastrar Animal
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Peso Médio</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Curral</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAnimais.map((animal) => (
                      <TableRow key={animal.id}>
                        <TableCell className="font-medium">{animal.quantidade}</TableCell>
                        <TableCell>{animal.peso_medio.toFixed(2)} kg</TableCell>
                        <TableCell>{animal.origem || '-'}</TableCell>
                        <TableCell>{animal.currais?.nome}</TableCell>
                        <TableCell>
                          <Badge variant={animal.ativo ? 'default' : 'secondary'}>
                            {animal.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openMovimentacaoDialog(animal)}
                            title="Registrar Entrada/Saída"
                          >
                            <ArrowUpCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openHistoricoDialog(animal)}
                            title="Ver Histórico"
                          >
                            <History className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(animal)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(animal)}
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

        {/* Dialog de Cadastro/Edição */}
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCloseDialog()}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-base">
                {editingAnimal ? 'Editar Animal' : 'Novo Animal'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {editingAnimal ? 'Edite os dados do animal' : 'Cadastre um novo animal não processado'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <div className="grid gap-3 py-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="quantidade" className="text-xs">Quantidade *</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    placeholder="Ex: 50"
                    className="h-9 text-sm"
                    disabled={!!editingAnimal}
                    required
                  />
                  {editingAnimal && (
                    <p className="text-xs text-muted-foreground">
                      Use Entradas/Saídas para alterar a quantidade
                    </p>
                  )}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="pesoMedio" className="text-xs">Peso Médio (kg) *</Label>
                  <Input
                    id="pesoMedio"
                    type="number"
                    step="0.01"
                    value={pesoMedio}
                    onChange={(e) => setPesoMedio(e.target.value)}
                    placeholder="Ex: 350.50"
                    className="h-9 text-sm"
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="origem" className="text-xs">Origem/Fornecedor</Label>
                  <Input
                    id="origem"
                    value={origem}
                    onChange={(e) => setOrigem(e.target.value)}
                    placeholder="Ex: Fazenda São José"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="curralId" className="text-xs">Curral Provisório *</Label>
                  <Select value={curralId} onValueChange={setCurralId} required>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecione um curral" />
                    </SelectTrigger>
                    <SelectContent>
                      {currais.length === 0 ? (
                        <SelectItem value="none" disabled className="text-sm">
                          Nenhum curral disponível
                        </SelectItem>
                      ) : (
                        currais.map((curral) => (
                          <SelectItem key={curral.id} value={curral.id} className="text-sm">
                            {curral.nome} {curral.capacidade_animais ? `(Cap: ${curral.capacidade_animais})` : ''}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Apenas currais sem lote ativo
                  </p>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="observacoes" className="text-xs">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Observações adicionais..."
                    className="text-sm min-h-[60px]"
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

        {/* Dialog de Exclusão */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-base">Excluir Animal</DialogTitle>
              <DialogDescription className="text-xs">
                Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white" disabled={deleting}>
                {deleting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Movimentação */}
        <Dialog open={movimentacaoOpen} onOpenChange={setMovimentacaoOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-base">Registrar Movimentação</DialogTitle>
              <DialogDescription className="text-xs">
                Registre uma entrada ou saída de animais
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleMovimentacao}>
              <div className="grid gap-3 py-4">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Tipo *</Label>
                  <Select value={tipoMovimentacao} onValueChange={(v: 'ENTRADA' | 'SAIDA') => setTipoMovimentacao(v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ENTRADA" className="text-sm">
                        <div className="flex items-center gap-2">
                          <ArrowUpCircle className="h-4 w-4 text-green-600" />
                          Entrada
                        </div>
                      </SelectItem>
                      <SelectItem value="SAIDA" className="text-sm">
                        <div className="flex items-center gap-2">
                          <ArrowDownCircle className="h-4 w-4 text-red-600" />
                          Saída
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Quantidade *</Label>
                  <Input
                    type="number"
                    value={quantidadeMovimentacao}
                    onChange={(e) => setQuantidadeMovimentacao(e.target.value)}
                    placeholder="Ex: 10"
                    className="h-9 text-sm"
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Peso Médio (kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pesoMedioMovimentacao}
                    onChange={(e) => setPesoMedioMovimentacao(e.target.value)}
                    placeholder="Ex: 350.50"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">{tipoMovimentacao === 'ENTRADA' ? 'Fornecedor' : 'Destino'}</Label>
                  <Input
                    value={origemMovimentacao}
                    onChange={(e) => setOrigemMovimentacao(e.target.value)}
                    placeholder={tipoMovimentacao === 'ENTRADA' ? 'Ex: Fazenda XYZ' : 'Ex: Lote 123'}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Observações</Label>
                  <Textarea
                    value={observacoesMovimentacao}
                    onChange={(e) => setObservacoesMovimentacao(e.target.value)}
                    placeholder="Observações..."
                    className="text-sm min-h-[60px]"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                  Registrar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog de Histórico */}
        <Dialog open={historicoOpen} onOpenChange={setHistoricoOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="text-base">Histórico de Movimentações</DialogTitle>
              <DialogDescription className="text-xs">
                Entradas e saídas registradas
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[400px] overflow-y-auto">
              {movimentacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma movimentação registrada
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Tipo</TableHead>
                      <TableHead className="text-xs">Qtd</TableHead>
                      <TableHead className="text-xs">Peso</TableHead>
                      <TableHead className="text-xs">Origem/Destino</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentacoes.map((mov) => (
                      <TableRow key={mov.id}>
                        <TableCell className="text-xs">
                          {new Date(mov.data_movimentacao).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={mov.tipo === 'ENTRADA' ? 'default' : 'destructive'} className="text-xs">
                            {mov.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{mov.quantidade}</TableCell>
                        <TableCell className="text-xs">
                          {mov.peso_medio ? `${mov.peso_medio.toFixed(2)} kg` : '-'}
                        </TableCell>
                        <TableCell className="text-xs">{mov.origem || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}