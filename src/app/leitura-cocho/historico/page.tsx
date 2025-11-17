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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { History, Loader2, Search, Moon, Sun, ClipboardList } from "lucide-react"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface LeituraSimples {
  id: string
  data_leitura: string
  hora_leitura: string
  escore: number
  comportamento: string | null
  currais?: { nome: string }
}

interface LeituraInteligente {
  id: string
  data_referencia: string
  fase_dieta: string | null
  dias_de_cocho: number | null
  leitura_noturna: string | null
  leitura_noturna_em: string | null
  comportamento_manha: string | null
  situacao_cocho_manha: string | null
  leitura_manha_em: string | null
  lotes?: { nome: string }
}

export default function HistoricoLeituras() {
  const [leiturasSimples, setLeiturasSimples] = useState<LeituraSimples[]>([])
  const [leiturasInteligentes, setLeiturasInteligentes] = useState<LeituraInteligente[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroData, setFiltroData] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todas')

  const supabase = createClient()

  useEffect(() => {
    fetchLeituras()
  }, [])

  async function fetchLeituras() {
    try {
      setLoading(true)

      // Buscar leituras simples
      const { data: simples, error: erroSimples } = await supabase
        .from('leituras_cocho_simples')
        .select(`
          *,
          lotes (nome)
        `)
        .order('data_leitura', { ascending: false })
        .order('hora_leitura', { ascending: false })
        .limit(100)

      if (erroSimples) throw erroSimples
      setLeiturasSimples(simples || [])

      // Buscar leituras inteligentes
      const { data: inteligentes, error: erroInteligentes } = await supabase
        .from('leituras_cocho_inteligente')
        .select(`
          *,
          lotes (nome)
        `)
        .order('data_referencia', { ascending: false })
        .limit(100)

      if (erroInteligentes) throw erroInteligentes
      setLeiturasInteligentes(inteligentes || [])

    } catch (error: any) {
      console.error('Erro ao buscar leituras:', error)
      toast.error('Erro ao carregar histórico')
    } finally {
      setLoading(false)
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

  function getSituacaoBadge(situacao: string) {
    const situacoes = {
      'vazio': { label: 'Vazio', color: 'bg-red-500' },
      'normal': { label: 'Normal', color: 'bg-green-500' },
      'cheio': { label: 'Cheio', color: 'bg-blue-500' },
    }
    const config = situacoes[situacao as keyof typeof situacoes]
    if (!config) return <Badge variant="outline" className="text-xs">{situacao}</Badge>
    return <Badge className={`${config.color} text-white text-xs`}>{config.label}</Badge>
  }

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

  const leiturasSimplesFiltradas = leiturasSimples.filter(l => {
    if (filtroData && l.data_leitura !== filtroData) return false
    return true
  })

  const leiturasInteligentesFiltradas = leiturasInteligentes.filter(l => {
    if (filtroData && l.data_referencia !== filtroData) return false
    return true
  })

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
                  <BreadcrumbPage>Histórico de Leituras</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="px-4">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="max-w-7xl mx-auto w-full space-y-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <History className="h-6 w-6" />
                Histórico de Leituras
              </h1>
              <p className="text-sm text-muted-foreground">
                Consulte todas as leituras de cocho registradas
              </p>
            </div>

            {/* Filtros */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label className="text-xs">Data</Label>
                    <Input
                      type="date"
                      value={filtroData}
                      onChange={(e) => setFiltroData(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => setFiltroData('')}
                      className="h-9"
                    >
                      Limpar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">Carregando histórico...</p>
              </div>
            ) : (
              <Tabs defaultValue="simples" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="simples">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Simples ({leiturasSimplesFiltradas.length})
                  </TabsTrigger>
                  <TabsTrigger value="noturna">
                    <Moon className="h-4 w-4 mr-2" />
                    Noturna ({leiturasInteligentesFiltradas.filter(l => l.leitura_noturna).length})
                  </TabsTrigger>
                  <TabsTrigger value="diurna">
                    <Sun className="h-4 w-4 mr-2" />
                    Manhã ({leiturasInteligentesFiltradas.filter(l => l.comportamento_manha).length})
                  </TabsTrigger>
                </TabsList>

                {/* Leituras Simples */}
                <TabsContent value="simples">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Leituras Simples</CardTitle>
                      <CardDescription>Últimas 100 leituras simples</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {leiturasSimplesFiltradas.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Nenhuma leitura simples encontrada</p>
                        </div>
                      ) : (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data/Hora</TableHead>
                                <TableHead>Curral</TableHead>
                                <TableHead>Escore</TableHead>
                                <TableHead>Comportamento</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {leiturasSimplesFiltradas.map((leitura) => (
                                <TableRow key={leitura.id}>
                                  <TableCell className="text-xs">
                                    {new Date(leitura.data_leitura).toLocaleDateString('pt-BR')} {leitura.hora_leitura}
                                  </TableCell>
                                  <TableCell className="font-medium text-xs">{leitura.currais?.nome}</TableCell>
                                  <TableCell>{getEscoreBadge(leitura.escore)}</TableCell>
                                  <TableCell className="text-xs max-w-xs truncate">
                                    {leitura.comportamento || '-'}
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

                {/* Leituras Noturnas */}
                <TabsContent value="noturna">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Leituras Noturnas</CardTitle>
                      <CardDescription>Últimas 100 leituras noturnas</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {leiturasInteligentesFiltradas.filter(l => l.leitura_noturna).length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Moon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Nenhuma leitura noturna encontrada</p>
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
                              {leiturasInteligentesFiltradas
                                .filter(l => l.leitura_noturna)
                                .map((leitura) => (
                                  <TableRow key={leitura.id}>
                                    <TableCell className="text-xs">
                                      {new Date(leitura.data_referencia).toLocaleDateString('pt-BR')}
                                    </TableCell>
                                    <TableCell className="font-medium text-xs">{leitura.lotes?.nome}</TableCell>
                                    <TableCell>{getSituacaoBadge(leitura.leitura_noturna!)}</TableCell>
                                    <TableCell className="text-xs">
                                      {leitura.leitura_noturna_em ? new Date(leitura.leitura_noturna_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}
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

                {/* Leituras da Manhã */}
                <TabsContent value="diurna">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Leituras da Manhã</CardTitle>
                      <CardDescription>Últimas 100 leituras da manhã</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {leiturasInteligentesFiltradas.filter(l => l.comportamento_manha).length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Sun className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Nenhuma leitura da manhã encontrada</p>
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
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {leiturasInteligentesFiltradas
                                .filter(l => l.comportamento_manha)
                                .map((leitura) => (
                                  <TableRow key={leitura.id}>
                                    <TableCell className="text-xs">
                                      {new Date(leitura.data_referencia).toLocaleDateString('pt-BR')}
                                    </TableCell>
                                    <TableCell className="font-medium text-xs">{leitura.lotes?.nome}</TableCell>
                                    <TableCell className="text-xs">
                                      <Badge variant="outline" className="text-xs">
                                        {leitura.fase_dieta === 'adaptacao_crescimento' ? 'Adaptação' : 'Terminação'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs">{leitura.dias_de_cocho}</TableCell>
                                    <TableCell className="text-xs max-w-xs truncate">
                                      {leitura.comportamento_manha ? formatComportamento(leitura.comportamento_manha) : '-'}
                                    </TableCell>
                                    <TableCell className="text-xs max-w-xs truncate">
                                      {leitura.situacao_cocho_manha ? formatSituacaoCocho(leitura.situacao_cocho_manha) : '-'}
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
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
