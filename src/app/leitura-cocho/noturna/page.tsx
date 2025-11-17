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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Moon, Loader2, Save, History } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  currais?: { nome: string }
}

interface LeituraNoturna {
  lote_id: string
  situacao: 'vazio' | 'normal' | 'cheio' | ''
}

interface LeituraHistorico {
  id: string
  data_referencia: string
  leitura_noturna: string
  leitura_noturna_em: string
  lotes?: { nome: string }
}

export default function LeituraNoturna() {
  const [lotes, setLotes] = useState<Lote[]>([])
  const [leituras, setLeituras] = useState<Record<string, LeituraNoturna>>({})
  const [historico, setHistorico] = useState<LeituraHistorico[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [submitting, setSubmitting] = useState(false)

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
          leitura_noturna,
          leitura_noturna_em,
          lotes (nome)
        `)
        .not('leitura_noturna', 'is', null)
        .order('data_referencia', { ascending: false })
        .order('leitura_noturna_em', { ascending: false })
        .limit(50)

      if (error) throw error
      
      const historicoData = (data || []).map(item => ({
        ...item,
        lotes: Array.isArray(item.lotes) ? item.lotes[0] : item.lotes
      }))
      setHistorico(historicoData)
    } catch (error: any) {
      console.error('Erro ao buscar histórico:', error)
      toast.error('Erro ao carregar histórico')
    } finally {
      setLoadingHistorico(false)
    }
  }

  async function fetchLotes() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('lotes')
        .select(`
          id,
          nome,
          status,
          currais:curral_id (nome)
        `)
        .eq('status', 'ATIVO')
        .order('nome')

      if (error) throw error
      
      const lotesData = (data || []).map(lote => ({
        ...lote,
        currais: Array.isArray(lote.currais) ? lote.currais[0] : lote.currais
      }))
      setLotes(lotesData)
      
      // Inicializar leituras vazias
      const initialLeituras: Record<string, LeituraNoturna> = {}
      lotesData.forEach(lote => {
        initialLeituras[lote.id] = {
          lote_id: lote.id,
          situacao: ''
        }
      })
      setLeituras(initialLeituras)
    } catch (error: any) {
      console.error('Erro ao buscar lotes:', error)
      toast.error('Erro ao carregar lotes')
    } finally {
      setLoading(false)
    }
  }

  function handleSituacaoChange(loteId: string, situacao: 'vazio' | 'normal' | 'cheio') {
    setLeituras(prev => ({
      ...prev,
      [loteId]: {
        ...prev[loteId],
        situacao
      }
    }))
  }

  async function handleSubmit() {
    // Validar se pelo menos uma leitura foi feita
    const leiturasPreenchidas = Object.values(leituras).filter(l => l.situacao !== '')
    
    if (leiturasPreenchidas.length === 0) {
      toast.error('Registre pelo menos uma leitura')
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

      // Preparar dados para inserção
      const leiturasParaInserir = leiturasPreenchidas.map(leitura => ({
        lote_id: leitura.lote_id,
        data_referencia: dataReferencia,
        leitura_noturna: leitura.situacao,
        leitura_noturna_em: horaLeitura,
        cliente_id: user.id,
        empresa_id: cliente?.empresa_id || null,
      }))

      // Inserir leituras
      const { error } = await supabase
        .from('leituras_cocho_inteligente')
        .insert(leiturasParaInserir)

      if (error) throw error

      toast.success(`${leiturasPreenchidas.length} leitura(s) registrada(s) com sucesso!`)

      // Resetar formulário
      const resetLeituras: Record<string, LeituraNoturna> = {}
      lotes.forEach(lote => {
        resetLeituras[lote.id] = {
          lote_id: lote.id,
          situacao: ''
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

  function getSituacaoBadge(situacao: string) {
    const situacoes = {
      'vazio': { label: 'Vazio', color: 'bg-red-500' },
      'normal': { label: 'Normal', color: 'bg-green-500' },
      'cheio': { label: 'Cheio', color: 'bg-blue-500' },
    }
    const config = situacoes[situacao as keyof typeof situacoes]
    if (!config) return null
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>
  }

  const leiturasPreenchidas = Object.values(leituras).filter(l => l.situacao !== '').length

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
                  <BreadcrumbPage>Leitura Noturna</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="px-4">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="max-w-4xl mx-auto w-full space-y-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Moon className="h-6 w-6" />
                Leitura Noturna
              </h1>
              <p className="text-sm text-muted-foreground">
                Registre a situação do cocho 2-3h após o último trato
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
                {leiturasPreenchidas > 0 && (
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    {leiturasPreenchidas} leitura(s)
                  </Badge>
                )}

                <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Instruções:</strong> Faça a leitura 2-3 horas após o último trato do dia. 
                  Classifique cada lote como: <strong>Vazio</strong> (cocho limpo), <strong>Normal</strong> (pouca sobra) ou <strong>Cheio</strong> (muita sobra).
                </p>
              </CardContent>
            </Card>

            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">Carregando lotes...</p>
              </div>
            ) : lotes.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Moon className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-semibold">Nenhum lote ativo</p>
                  <p className="text-sm text-muted-foreground">Cadastre lotes para fazer leituras</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  {lotes.map((lote) => (
                    <Card key={lote.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">{lote.nome}</CardTitle>
                            <CardDescription className="text-xs">
                              {lote.currais?.nome || 'Sem curral'}
                            </CardDescription>
                          </div>
                          {leituras[lote.id]?.situacao && getSituacaoBadge(leituras[lote.id].situacao)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Label className="text-xs">Situação do Cocho</Label>
                          <Select
                            value={leituras[lote.id]?.situacao || ''}
                            onValueChange={(value) => handleSituacaoChange(lote.id, value as any)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a situação" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="vazio">Vazio (cocho limpo)</SelectItem>
                              <SelectItem value="normal">Normal (pouca sobra)</SelectItem>
                              <SelectItem value="cheio">Cheio (muita sobra)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || leiturasPreenchidas === 0}
                  className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Salvando leituras...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" />
                      Salvar {leiturasPreenchidas > 0 ? `${leiturasPreenchidas} Leitura(s)` : 'Leituras'}
                    </>
                  )}
                </Button>
              </div>
            )}
              </TabsContent>

              {/* ABA HISTÓRICO */}
              <TabsContent value="historico">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Últimas Leituras Noturnas</CardTitle>
                    <CardDescription>Histórico das 50 últimas leituras</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingHistorico ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                      </div>
                    ) : historico.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Moon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma leitura noturna registrada</p>
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Lote</TableHead>
                              <TableHead>Situação</TableHead>
                              <TableHead>Hora</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {historico.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="text-sm">
                                  {new Date(item.data_referencia).toLocaleDateString('pt-BR')}
                                </TableCell>
                                <TableCell className="font-medium text-sm">{item.lotes?.nome}</TableCell>
                                <TableCell>{getSituacaoBadge(item.leitura_noturna)}</TableCell>
                                <TableCell className="text-sm">
                                  {new Date(item.leitura_noturna_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
      </SidebarInset>
    </SidebarProvider>
  )
}
