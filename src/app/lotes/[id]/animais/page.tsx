'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, Package } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

interface AnimalIndividual {
  id: string
  brinco_visual: string
  brinco_eletronico: string | null
  peso_entrada: number
  data_entrada: string
  racas?: { nome: string }
  categorias?: { nome: string }
  status: string
}

interface LoteAnimais {
  id: string
  quantidade: number
  peso_medio: number
  data_entrada: string
  racas?: { nome: string }
  categorias?: { nome: string }
  tipo: string
  descricao: string | null
  status: string
}

interface Lote {
  id: string
  nome: string
  status: string
}

export default function LoteAnimaisPage() {
  const params = useParams()
  const router = useRouter()
  const [lote, setLote] = useState<Lote | null>(null)
  const [animaisIndividuais, setAnimaisIndividuais] = useState<AnimalIndividual[]>([])
  const [lotesAnimais, setLotesAnimais] = useState<LoteAnimais[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    if (params.id) {
      fetchData()
    }
  }, [params.id])

  async function fetchData() {
    try {
      setLoading(true)

      // Buscar informações do lote
      const { data: loteData, error: loteError } = await supabase
        .from('lotes')
        .select('id, nome, status')
        .eq('id', params.id)
        .single()

      if (loteError) throw loteError
      setLote(loteData)

      // Buscar animais individuais
      const { data: individuais, error: individuaisError } = await supabase
        .from('animais')
        .select(`
          id,
          brinco_visual,
          brinco_eletronico,
          peso_entrada,
          data_entrada,
          status,
          racas (nome),
          categorias (nome)
        `)
        .eq('lote_id', params.id)
        .order('brinco_visual')

      if (individuaisError) throw individuaisError
      setAnimaisIndividuais(individuais || [])

      // Buscar lotes de animais (entrada em lote)
      const { data: lotes, error: lotesError } = await supabase
        .from('lotes_animais')
        .select(`
          id,
          quantidade,
          peso_medio,
          data_entrada,
          tipo,
          descricao,
          status,
          racas (nome),
          categorias (nome)
        `)
        .eq('lote_confinamento_id', params.id)
        .order('data_entrada', { ascending: false })

      if (lotesError) throw lotesError
      setLotesAnimais(lotes || [])

    } catch (error: any) {
      console.error('Erro ao buscar dados:', error)
      toast.error('Erro ao carregar animais')
    } finally {
      setLoading(false)
    }
  }

  const totalIndividuais = animaisIndividuais.filter(a => a.status === 'ATIVO').length
  const totalLote = lotesAnimais.filter(l => l.status === 'ATIVO').reduce((sum, l) => sum + l.quantidade, 0)
  const totalGeral = totalIndividuais + totalLote

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 justify-between transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <Link href={`/lotes/${params.id}`}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
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
                  <BreadcrumbLink href="/lotes">Lotes</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/lotes/${params.id}`}>
                    {lote?.nome || 'Lote'}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Animais</BreadcrumbPage>
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
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold">Animais do Lote: {lote?.nome}</h1>
              <p className="text-sm text-muted-foreground">
                Total: {totalGeral} animais ({totalIndividuais} individuais + {totalLote} em lote)
              </p>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Animais Individuais</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalIndividuais}</div>
                  <p className="text-xs text-muted-foreground">Com brinco individual</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Animais em Lote</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalLote}</div>
                  <p className="text-xs text-muted-foreground">Entrada em lote</p>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 dark:bg-blue-950">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Geral</CardTitle>
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalGeral}</div>
                  <p className="text-xs text-blue-600 dark:text-blue-400">Todos os animais ativos</p>
                </CardContent>
              </Card>
            </div>

            {/* Animais Individuais */}
            {animaisIndividuais.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Animais Individuais ({totalIndividuais})</CardTitle>
                  <CardDescription>Animais cadastrados com brinco individual</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Brinco Visual</TableHead>
                            <TableHead>Brinco Eletrônico</TableHead>
                            <TableHead>Raça</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead>Peso Entrada</TableHead>
                            <TableHead>Data Entrada</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {animaisIndividuais.map((animal) => (
                            <TableRow key={animal.id}>
                              <TableCell className="font-medium">{animal.brinco_visual}</TableCell>
                              <TableCell>{animal.brinco_eletronico || '-'}</TableCell>
                              <TableCell>{animal.racas?.nome}</TableCell>
                              <TableCell>{animal.categorias?.nome}</TableCell>
                              <TableCell>{animal.peso_entrada.toFixed(2)} kg</TableCell>
                              <TableCell>{new Date(animal.data_entrada).toLocaleDateString('pt-BR')}</TableCell>
                              <TableCell>
                                <Badge variant={animal.status === 'ATIVO' ? 'default' : 'secondary'}>
                                  {animal.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Lotes de Animais (Entrada em Lote) */}
            {lotesAnimais.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Entrada em Lote ({totalLote} animais)</CardTitle>
                  <CardDescription>Animais cadastrados por quantidade (sem brinco individual)</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Quantidade</TableHead>
                            <TableHead>Peso Médio</TableHead>
                            <TableHead>Raça</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Data Entrada</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lotesAnimais.map((loteAnimal) => (
                            <TableRow key={loteAnimal.id}>
                              <TableCell className="font-bold">{loteAnimal.quantidade}</TableCell>
                              <TableCell>{loteAnimal.peso_medio.toFixed(2)} kg</TableCell>
                              <TableCell>{loteAnimal.racas?.nome}</TableCell>
                              <TableCell>{loteAnimal.categorias?.nome}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{loteAnimal.tipo}</Badge>
                              </TableCell>
                              <TableCell>{new Date(loteAnimal.data_entrada).toLocaleDateString('pt-BR')}</TableCell>
                              <TableCell>{loteAnimal.descricao || '-'}</TableCell>
                              <TableCell>
                                <Badge variant={loteAnimal.status === 'ATIVO' ? 'default' : 'secondary'}>
                                  {loteAnimal.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!loading && animaisIndividuais.length === 0 && lotesAnimais.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-semibold">Nenhum animal neste lote</p>
                  <p className="text-sm text-muted-foreground">Adicione animais individuais ou em lote</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
