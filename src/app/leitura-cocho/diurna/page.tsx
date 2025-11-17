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
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sun, Loader2, Save, AlertCircle, History, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

interface Lote {
  id: string
  nome: string
  status: string
  data_entrada: string
  dias_cocho?: number
  fase_dieta?: string | null
  currais?: { nome: string }
}

interface LeituraDiurna {
  lote_id: string
  dias_de_cocho: string
  comportamento_manha: string
  situacao_cocho_manha: string
}

interface LeituraHistorico {
  id: string
  data_referencia: string
  fase_dieta: string
  dias_de_cocho: number
  comportamento_manha: string
  situacao_cocho_manha: string
  leitura_manha_em: string
  lotes?: { nome: string } | { nome: string }[]
}

export default function LeituraDiurna() {
  const [lotes, setLotes] = useState<Lote[]>([])
  const [leituras, setLeituras] = useState<Record<string, LeituraDiurna>>({})
  const [historico, setHistorico] = useState<LeituraHistorico[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [leituraToDelete, setLeituraToDelete] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchLotes()
  }, [])

  async function fetchHistorico() {
    try {
      setLoadingHistorico(true)
      const { data, error } = await supabase
        .from('leituras_cocho_inteligente')
        .select(`
          id,
          data_referencia,
          fase_dieta,
          dias_de_cocho,
          comportamento_manha,
          situacao_cocho_manha,
          leitura_manha_em,
          lotes (nome)
        `)
        .not('comportamento_manha', 'is', null)
        .order('data_referencia', { ascending: false })
        .order('lotes(nome)')
        .limit(50)

      if (error) throw error
      setHistorico(data || [])
    } catch (error: any) {
      console.error('Erro ao buscar histórico:', error)
      toast.error('Erro ao carregar histórico')
    } finally {
      setLoadingHistorico(false)
    }
  }

  function openDeleteDialog(id: string) {
    setLeituraToDelete(id)
    setDeleteDialogOpen(true)
  }

  async function confirmDeleteLeitura() {
    if (!leituraToDelete) return

    try {
      const { error } = await supabase
        .from('leituras_cocho_inteligente')
        .delete()
        .eq('id', leituraToDelete)

      if (error) throw error

      // Fechar dialog e limpar estado
      setDeleteDialogOpen(false)
      setLeituraToDelete(null)
      
      // Recarregar histórico
      await fetchHistorico()
      
      toast.success('Leitura excluída com sucesso')
    } catch (error: any) {
      console.error('Erro ao excluir leitura:', error)
      toast.error('Erro ao excluir leitura')
    }
  }

  async function fetchLotes() {
    try {
      setLoading(true)
      const hoje = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('lotes')
        .select(`
          id,
          nome,
          status,
          data_entrada,
          currais:curral_id (nome),
          periodos_alimentacao_lote (
            dia_inicial,
            dia_final,
            dietas (fase_dieta)
          )
        `)
        .eq('status', 'ATIVO')
        .order('nome')

      if (error) {
        console.error('Erro detalhado ao buscar lotes:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      
      // Calcular dias de cocho e extrair fase da dieta para cada lote
      const lotesData = (data || [])
        .map(lote => {
          const dataEntrada = new Date(lote.data_entrada)
          const hoje = new Date()
          const diffTime = Math.abs(hoje.getTime() - dataEntrada.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          
          // Extrair fase da dieta do período ativo (filtrar no JS)
          const periodos: any = Array.isArray(lote.periodos_alimentacao_lote) ? lote.periodos_alimentacao_lote : (lote.periodos_alimentacao_lote ? [lote.periodos_alimentacao_lote] : [])
          
          // Filtrar período ativo: dia_inicial <= dias_cocho <= dia_final
          const periodoAtivo = periodos.find((p: any) => {
            return diffDays >= p.dia_inicial && diffDays <= p.dia_final
          })
          
          const dietas: any = Array.isArray(periodoAtivo?.dietas) ? periodoAtivo?.dietas[0] : periodoAtivo?.dietas
          const faseDieta = dietas?.fase_dieta || null
          
          return {
            id: lote.id,
            nome: lote.nome,
            status: lote.status,
            data_entrada: lote.data_entrada,
            dias_cocho: diffDays,
            fase_dieta: faseDieta,
            currais: Array.isArray(lote.currais) ? lote.currais[0] : lote.currais
          }
        })
        .filter(lote => lote.fase_dieta !== null) // Filtrar apenas lotes com fase da dieta
      
      setLotes(lotesData)
      
      // Inicializar leituras vazias com dias_cocho do lote
      const initialLeituras: Record<string, LeituraDiurna> = {}
      lotesData.forEach(lote => {
        initialLeituras[lote.id] = {
          lote_id: lote.id,
          dias_de_cocho: lote.dias_cocho?.toString() || '0',
          comportamento_manha: '',
          situacao_cocho_manha: ''
        }
      })
      setLeituras(initialLeituras)
    } catch (error: any) {
      console.error('Erro ao buscar lotes:', error)
      const errorMessage = error?.message || error?.error_description || JSON.stringify(error)
      
      // Se for erro de relacionamento
      if (errorMessage.includes('relationship') || errorMessage.includes('foreign key')) {
        console.warn('Aviso: Não foi possível buscar períodos de alimentação. Continuando sem fase da dieta.')
        // Tentar buscar apenas os lotes sem os períodos
        try {
          const { data: lotesSimples } = await supabase
            .from('lotes')
            .select('id, nome, status, data_entrada, currais:curral_id(nome)')
            .eq('status', 'ATIVO')
            .order('nome')
          
          const lotesData = (lotesSimples || []).map(lote => {
            const dataEntrada = new Date(lote.data_entrada)
            const hoje = new Date()
            const diffTime = Math.abs(hoje.getTime() - dataEntrada.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            
            return {
              id: lote.id,
              nome: lote.nome,
              status: lote.status,
              data_entrada: lote.data_entrada,
              dias_cocho: diffDays,
              fase_dieta: null,
              currais: Array.isArray(lote.currais) ? lote.currais[0] : lote.currais
            }
          })
          setLotes(lotesData)
          
          const initialLeituras: Record<string, LeituraDiurna> = {}
          lotesData.forEach(lote => {
            initialLeituras[lote.id] = {
              lote_id: lote.id,
              dias_de_cocho: lote.dias_cocho?.toString() || '0',
              comportamento_manha: '',
              situacao_cocho_manha: ''
            }
          })
          setLeituras(initialLeituras)
          return
        } catch (fallbackError) {
          console.error('Erro no fallback:', fallbackError)
        }
      }
      
      toast.error('Erro ao carregar lotes: ' + errorMessage)
    } finally {
      setLoading(false)
    }
  }

  function handleFieldChange(loteId: string, field: keyof LeituraDiurna, value: string) {
    setLeituras(prev => ({
      ...prev,
      [loteId]: {
        ...prev[loteId],
        [field]: value
      }
    }))
  }

  function isLeituraCompleta(leitura: LeituraDiurna): boolean {
    return !!(
      leitura.dias_de_cocho &&
      leitura.comportamento_manha &&
      leitura.situacao_cocho_manha
    )
  }

  async function handleSubmit() {
    // Validar se pelo menos uma leitura foi feita
    const leiturasCompletas = Object.values(leituras).filter(isLeituraCompleta)
    
    if (leiturasCompletas.length === 0) {
      toast.error('Complete pelo menos uma leitura')
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

      const dataReferencia = new Date().toISOString().split('T')[0]
      const horaLeitura = new Date().toISOString()

      // Preparar dados para inserção/atualização
      for (const leitura of leiturasCompletas) {
        // Buscar o lote para pegar a fase da dieta
        const lote = lotes.find(l => l.id === leitura.lote_id)
        
        // Como já filtramos lotes sem fase, isso não deve acontecer
        if (!lote?.fase_dieta) {
          console.warn('Lote sem fase da dieta:', lote?.nome)
          continue
        }
        
        // Buscar se já existe leitura noturna para este lote hoje
        const { data: leituraExistente } = await supabase
          .from('leituras_cocho_inteligente')
          .select('id')
          .eq('lote_id', leitura.lote_id)
          .eq('data_referencia', dataReferencia)
          .maybeSingle()

        const leituraData = {
          lote_id: leitura.lote_id,
          data_referencia: dataReferencia,
          fase_dieta: lote.fase_dieta,
          dias_de_cocho: parseInt(leitura.dias_de_cocho),
          comportamento_manha: leitura.comportamento_manha,
          situacao_cocho_manha: leitura.situacao_cocho_manha,
          leitura_manha_em: horaLeitura,
          cliente_id: user.id,
          empresa_id: cliente?.empresa_id || null,
        }

        if (leituraExistente) {
          // Atualizar registro existente
          const { error } = await supabase
            .from('leituras_cocho_inteligente')
            .update(leituraData)
            .eq('id', leituraExistente.id)

          if (error) throw error
        } else {
          // Criar novo registro
          const { error } = await supabase
            .from('leituras_cocho_inteligente')
            .insert(leituraData)

          if (error) throw error
        }
      }

      toast.success(`${leiturasCompletas.length} leitura(s) registrada(s) com sucesso!`)

      // Resetar formulário mantendo dias_cocho do lote
      const resetLeituras: Record<string, LeituraDiurna> = {}
      lotes.forEach(lote => {
        resetLeituras[lote.id] = {
          lote_id: lote.id,
          dias_de_cocho: lote.dias_cocho?.toString() || '0',
          comportamento_manha: '',
          situacao_cocho_manha: ''
        }
      })
      setLeituras(resetLeituras)
    } catch (error: any) {
      console.error('Erro ao salvar leituras:', error)
      toast.error('Erro ao salvar leituras: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const leiturasCompletas = Object.values(leituras).filter(isLeituraCompleta).length

  function formatComportamento(comportamento: string) {
    const labels: Record<string, string> = {
      'maioria_em_pe_muita_fome': 'Maioria em pé, muita fome',
      'alguns_em_pe_fome': 'Alguns em pé, fome',
      'alguns_em_pe': 'Alguns em pé',
      'deitados_calmos': 'Deitados e calmos'
    }
    return labels[comportamento] || comportamento
  }

  function formatSituacaoCocho(situacao: string) {
    const labels: Record<string, string> = {
      'limpo_lambido': 'Limpo e lambido',
      'limpo_sem_lambida': 'Limpo sem lambida',
      'pouca_sobra': 'Pouca sobra',
      'com_sobras': 'Com sobras',
      'muitas_sobras': 'Muitas sobras'
    }
    return labels[situacao] || situacao
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
                  <BreadcrumbPage>Leitura da Manhã</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="px-4">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 overflow-y-auto">
          <div className="max-w-5xl mx-auto w-full space-y-4 pb-8">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Sun className="h-6 w-6" />
                Leitura da Manhã
              </h1>
              <p className="text-sm text-muted-foreground">
                Registre a leitura 1h antes do primeiro trato
              </p>
            </div>

            <Tabs defaultValue="registrar" className="w-full" onValueChange={(value) => {
              if (value === 'historico') fetchHistorico()
            }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="registrar">
                  <Save className="h-4 w-4 mr-2" />
                  Registrar Leitura
                </TabsTrigger>
                <TabsTrigger value="historico">
                  <History className="h-4 w-4 mr-2" />
                  Histórico
                </TabsTrigger>
              </TabsList>

              {/* ABA REGISTRAR */}
              <TabsContent value="registrar" className="space-y-4">
                {leiturasCompletas > 0 && (
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    {leiturasCompletas} leitura(s)
                  </Badge>
                )}

                <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Instruções:</strong> Faça a leitura pela manhã, aproximadamente 1 hora antes do primeiro trato. 
                Registre o comportamento dos animais e a situação do cocho. Estes dados serão usados no planejamento nutricional.
              </AlertDescription>
            </Alert>

            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">Carregando lotes...</p>
              </div>
            ) : lotes.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Sun className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-semibold">Nenhum lote ativo</p>
                  <p className="text-sm text-muted-foreground">Cadastre lotes para fazer leituras</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-4">
                  {lotes.map((lote) => {
                    const leitura = leituras[lote.id]
                    const completa = isLeituraCompleta(leitura)
                    
                    return (
                      <Card key={lote.id} className={completa ? 'border-green-500' : ''}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-base">{lote.nome}</CardTitle>
                              <CardDescription className="text-xs">
                                {lote.currais?.nome || 'Sem curral'}
                              </CardDescription>
                            </div>
                            {completa && (
                              <Badge className="bg-green-500 text-white">Completa</Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="space-y-2">
                              <Label className="text-xs">Dias de Cocho</Label>
                              <Input
                                value={`${lote.dias_cocho || 0} ${lote.dias_cocho === 1 ? 'dia' : 'dias'}`}
                                disabled
                                className="h-9 bg-muted"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">Fase da Dieta</Label>
                              <Input
                                value={lote.fase_dieta ? (lote.fase_dieta === 'adaptacao_crescimento' ? 'Adaptação' : 'Terminação') : 'Sem dieta'}
                                disabled
                                className="h-9 bg-muted"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">Comportamento *</Label>
                              <Select
                                value={leitura?.comportamento_manha || ''}
                                onValueChange={(value) => handleFieldChange(lote.id, 'comportamento_manha', value)}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="maioria_em_pe_muita_fome">Maioria em pé, muita fome</SelectItem>
                                  <SelectItem value="alguns_em_pe_fome">Alguns em pé, com fome</SelectItem>
                                  <SelectItem value="alguns_em_pe">Alguns em pé</SelectItem>
                                  <SelectItem value="deitados_calmos">Deitados e calmos</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">Situação do Cocho *</Label>
                              <Select
                                value={leitura?.situacao_cocho_manha || ''}
                                onValueChange={(value) => handleFieldChange(lote.id, 'situacao_cocho_manha', value)}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="limpo_lambido">Limpo e lambido</SelectItem>
                                  <SelectItem value="limpo_sem_lambida">Limpo sem lambida</SelectItem>
                                  <SelectItem value="pouca_sobra">Pouca sobra</SelectItem>
                                  <SelectItem value="com_sobras">Com sobras</SelectItem>
                                  <SelectItem value="muitas_sobras">Muitas sobras</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || leiturasCompletas === 0}
                  className="w-full h-12 text-base bg-orange-600 hover:bg-orange-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Salvando leituras...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" />
                      Salvar {leiturasCompletas > 0 ? `${leiturasCompletas} Leitura(s)` : 'Leituras'}
                    </>
                  )}
                </Button>
              </>
            )}
              </TabsContent>

              {/* ABA HISTÓRICO */}
              <TabsContent value="historico">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Últimas Leituras da Manhã</CardTitle>
                    <CardDescription>Histórico das 50 últimas leituras</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingHistorico ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                      </div>
                    ) : historico.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Sun className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma leitura da manhã registrada</p>
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Lote</TableHead>
                              <TableHead>Fase</TableHead>
                              <TableHead>Dias</TableHead>
                              <TableHead>Comportamento</TableHead>
                              <TableHead>Situação Cocho</TableHead>
                              <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {historico.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="text-xs">
                                  {new Date(item.data_referencia).toLocaleDateString('pt-BR')}
                                </TableCell>
                                <TableCell className="font-medium text-xs">
                                  {Array.isArray(item.lotes) ? item.lotes[0]?.nome : item.lotes?.nome}
                                </TableCell>
                                <TableCell className="text-xs">
                                  <Badge variant="outline" className="text-xs">
                                    {item.fase_dieta === 'adaptacao_crescimento' ? 'Adaptação' : 'Terminação'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs">{item.dias_de_cocho}</TableCell>
                                <TableCell className="text-xs max-w-xs truncate">
                                  {formatComportamento(item.comportamento_manha)}
                                </TableCell>
                                <TableCell className="text-xs max-w-xs truncate">
                                  {formatSituacaoCocho(item.situacao_cocho_manha)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => openDeleteDialog(item.id)}
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

        {/* Dialog de Confirmação de Exclusão */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir Leitura</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir esta leitura? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteLeitura}
              >
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
