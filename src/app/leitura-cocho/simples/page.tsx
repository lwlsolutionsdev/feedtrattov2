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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardList, Loader2, Plus, Trash2, CalendarIcon } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Lote {
  id: string
  nome: string
  curral_nome: string
}

interface Leitura {
  id: string
  lote_id: string
  data_leitura: string
  hora_leitura: string
  escore: number
  comportamento: string | null
  lotes?: { nome: string; currais?: { nome: string } }
}

export default function LeituraSimples() {
  const [lotes, setLotes] = useState<Lote[]>([])
  const [leituras, setLeituras] = useState<Leitura[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Form states
  const [loteId, setLoteId] = useState('')
  const [dataLeitura, setDataLeitura] = useState<Date>(new Date())
  const [horaLeitura, setHoraLeitura] = useState(new Date().toTimeString().slice(0, 5))
  const [escore, setEscore] = useState<string>('')
  const [comportamento, setComportamento] = useState('nenhum')
  
  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingLeitura, setDeletingLeitura] = useState<Leitura | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchLotes()
    fetchLeituras()
  }, [])

  async function fetchLotes() {
    try {
      const { data, error } = await supabase
        .from('lotes')
        .select('id, nome, currais:curral_id(nome)')
        .eq('status', 'ATIVO')
        .not('curral_id', 'is', null)
        .order('nome')

      if (error) {
        console.warn('Aviso ao buscar lotes:', error)
        setLotes([])
        return
      }

      const lotesData = (data || []).map(lote => {
        const currais = lote.currais as any
        const curralNome = Array.isArray(currais) ? currais[0]?.nome : currais?.nome || 'Sem curral'
        return {
          id: lote.id,
          nome: lote.nome,
          curral_nome: curralNome
        }
      })
      
      setLotes(lotesData)
    } catch (error: any) {
      console.warn('Erro ao buscar lotes:', error)
      setLotes([])
    }
  }

  async function fetchLeituras() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('leituras_cocho_simples')
        .select(`
          *,
          lotes (nome)
        `)
        .order('data_leitura', { ascending: false })
        .order('hora_leitura', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Erro detalhado ao buscar leituras:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      
      setLeituras(data || [])
    } catch (error: any) {
      console.error('Erro ao buscar leituras:', error)
      toast.error('Erro ao carregar leituras')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!loteId || escore === '') {
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

      const leituraData = {
        lote_id: loteId,
        data_leitura: format(dataLeitura, 'yyyy-MM-dd'),
        hora_leitura: horaLeitura,
        escore: parseInt(escore),
        comportamento: comportamento && comportamento !== 'nenhum' ? comportamento : null,
        cliente_id: user.id,
        empresa_id: cliente?.empresa_id || null,
        created_by: user.id,
      }

      const { data: insertData, error } = await supabase
        .from('leituras_cocho_simples')
        .insert(leituraData)
        .select()

      if (error) {
        console.error('Erro detalhado:', error)
        throw error
      }

      toast.success('Leitura registrada com sucesso!')

      // Resetar formulário
      setLoteId('')
      setEscore('')
      setComportamento('nenhum')
      setDataLeitura(new Date())
      setHoraLeitura(new Date().toTimeString().slice(0, 5))
      
      fetchLeituras()
    } catch (error: any) {
      console.error('Erro ao salvar leitura:', error)
      const errorMessage = error?.message || error?.error_description || 'Erro desconhecido'
      toast.error('Erro ao salvar leitura: ' + errorMessage)
      
      // Se for erro de tabela não encontrada
      if (errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
        toast.error('A tabela leituras_cocho_simples não existe. Execute a migration 20241116000009_create_leituras_simples.sql')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deletingLeitura) return

    try {
      const { error } = await supabase
        .from('leituras_cocho_simples')
        .delete()
        .eq('id', deletingLeitura.id)

      if (error) throw error

      toast.success('Leitura excluída com sucesso!')
      setDeleteOpen(false)
      setDeletingLeitura(null)
      fetchLeituras()
    } catch (error: any) {
      console.error('Erro ao excluir leitura:', error)
      toast.error('Erro ao excluir leitura')
    }
  }

  function getEscoreBadge(escore: number) {
    const escores = {
      '-1': { label: 'Muito Vazio', color: 'bg-red-500' },
      '0': { label: 'Vazio', color: 'bg-orange-500' },
      '1': { label: 'Pouca Sobra', color: 'bg-green-500' },
      '2': { label: 'Muita Sobra', color: 'bg-blue-500' },
    }
    const config = escores[escore.toString() as keyof typeof escores] || { label: escore.toString(), color: 'bg-gray-500' }
    return <Badge className={`${config.color} text-white text-xs`}>{config.label}</Badge>
  }

  function formatComportamento(comportamento: string | null) {
    if (!comportamento) return '-'
    const labels: Record<string, string> = {
      'maioria_em_pe_muita_fome': 'Maioria em pé, muita fome',
      'alguns_em_pe_fome': 'Alguns em pé, fome',
      'alguns_em_pe': 'Alguns em pé',
      'deitados_calmos': 'Deitados e calmos',
      'agitados': 'Agitados',
      'ruminando': 'Ruminando'
    }
    return labels[comportamento] || comportamento
  }

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
                  <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Leitura Simples de Cocho</BreadcrumbPage>
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
            <div>
              <h1 className="text-2xl font-bold">Leitura Simples de Cocho</h1>
              <p className="text-sm text-muted-foreground">
                Registro rápido de leitura por lote
              </p>
            </div>

            <Tabs defaultValue="registrar" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="registrar">
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Leitura
                </TabsTrigger>
                <TabsTrigger value="historico">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Histórico
                </TabsTrigger>
              </TabsList>

              {/* ABA REGISTRAR */}
              <TabsContent value="registrar">
                <Card>
              <CardHeader>
                <CardTitle className="text-base">Nova Leitura</CardTitle>
                <CardDescription>Registre a leitura do cocho</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Lote *</Label>
                      <Select value={loteId} onValueChange={setLoteId} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o lote" />
                        </SelectTrigger>
                        <SelectContent>
                          {lotes.map((lote) => (
                            <SelectItem key={lote.id} value={lote.id}>
                              {lote.curral_nome} - {lote.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Escore *</Label>
                      <Select value={escore} onValueChange={setEscore} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o escore" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="-1">-1 - Muito Vazio</SelectItem>
                          <SelectItem value="0">0 - Vazio</SelectItem>
                          <SelectItem value="1">1 - Pouca Sobra</SelectItem>
                          <SelectItem value="2">2 - Muita Sobra</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Data</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !dataLeitura && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dataLeitura ? format(dataLeitura, "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={dataLeitura}
                            onSelect={(date) => date && setDataLeitura(date)}
                            initialFocus
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Hora</Label>
                      <Input
                        type="time"
                        value={horaLeitura}
                        onChange={(e) => setHoraLeitura(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Comportamento (opcional)</Label>
                    <Select value={comportamento} onValueChange={setComportamento}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o comportamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nenhum">Nenhum</SelectItem>
                        <SelectItem value="maioria_em_pe_muita_fome">Maioria em pé, muita fome</SelectItem>
                        <SelectItem value="alguns_em_pe_fome">Alguns em pé, com fome</SelectItem>
                        <SelectItem value="alguns_em_pe">Alguns em pé</SelectItem>
                        <SelectItem value="deitados_calmos">Deitados e calmos</SelectItem>
                        <SelectItem value="agitados">Agitados</SelectItem>
                        <SelectItem value="ruminando">Ruminando</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-green-500 hover:bg-green-600"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Registrar Leitura
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
              </TabsContent>

              {/* ABA HISTÓRICO */}
              <TabsContent value="historico">
                <Card>
              <CardHeader>
                <CardTitle className="text-base">Últimas Leituras</CardTitle>
                <CardDescription>Histórico das 50 últimas leituras</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                  </div>
                ) : leituras.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma leitura registrada</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data/Hora</TableHead>
                          <TableHead>Lote/Curral</TableHead>
                          <TableHead>Escore</TableHead>
                          <TableHead>Comportamento</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leituras.map((leitura) => (
                          <TableRow key={leitura.id}>
                            <TableCell>
                              {new Date(leitura.data_leitura).toLocaleDateString('pt-BR')} {leitura.hora_leitura}
                            </TableCell>
                            <TableCell className="font-medium">
                              {leitura.lotes?.currais?.nome} - {leitura.lotes?.nome}
                            </TableCell>
                            <TableCell>{getEscoreBadge(leitura.escore)}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {formatComportamento(leitura.comportamento)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setDeletingLeitura(leitura)
                                  setDeleteOpen(true)
                                }}
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
              </CardContent>
            </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Dialog de Exclusão */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir esta leitura?
                Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
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
