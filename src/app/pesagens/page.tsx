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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Scale, Search, Zap, TrendingUp, TrendingDown, Minus, Users } from "lucide-react"
import { toast } from "sonner"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Pesagem {
  id: string
  animal_id: string
  tipo: 'ENTRADA' | 'MANEJO' | 'SAIDA' | 'TECNOLOGIA_PARCEIRA'
  data_pesagem: string
  peso: number
  gmd: number | null
  dias_desde_ultima_pesagem: number | null
  peso_anterior: number | null
  observacoes: string | null
  created_at: string
  animais?: {
    brinco_visual: string | null
    brinco_eletronico: string | null
    racas: { nome: string }
    lotes: { nome: string }
  }
}

export default function PesagensPage() {
  const [pesagens, setPesagens] = useState<Pesagem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 50

  const supabase = createClient()

  useEffect(() => {
    fetchPesagens()
  }, [])

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchPesagens()
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Buscar ao mudar de página
  useEffect(() => {
    fetchPesagens()
  }, [currentPage])

  async function fetchPesagens() {
    try {
      setLoading(true)
      
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      let query = supabase
        .from('pesagens')
        .select(`
          *,
          animais (
            brinco_visual,
            brinco_eletronico,
            racas (nome),
            lotes (nome)
          )
        `, { count: 'exact' })
        .order('data_pesagem', { ascending: false })
        .order('created_at', { ascending: false })

      if (searchTerm) {
        query = query.or(`observacoes.ilike.%${searchTerm}%`)
      }

      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error
      
      setPesagens(data || [])
      setTotalCount(count || 0)
    } catch (error: any) {
      console.error('Erro ao buscar pesagens:', error)
      toast.error('Erro ao carregar pesagens')
    } finally {
      setLoading(false)
    }
  }

  function getTipoLabel(tipo: string) {
    const labels = {
      'ENTRADA': 'Entrada',
      'MANEJO': 'Manejo',
      'SAIDA': 'Saída',
      'TECNOLOGIA_PARCEIRA': 'Tec. Parceira'
    }
    return labels[tipo as keyof typeof labels] || tipo
  }

  function getTipoBadge(tipo: string) {
    const variants: Record<string, string> = {
      'ENTRADA': 'bg-blue-500',
      'MANEJO': 'bg-green-500',
      'SAIDA': 'bg-orange-500',
      'TECNOLOGIA_PARCEIRA': 'bg-purple-500'
    }
    return (
      <Badge className={`${variants[tipo] || 'bg-gray-500'} text-white`}>
        {getTipoLabel(tipo)}
      </Badge>
    )
  }

  function getGMDBadge(gmd: number | null) {
    if (gmd === null || gmd === undefined) return <span className="text-xs text-muted-foreground">-</span>
    
    if (gmd > 1.5) {
      return <Badge className="bg-green-500 text-white text-xs"><TrendingUp className="h-3 w-3 mr-1" /> {gmd.toFixed(3)}</Badge>
    } else if (gmd > 1.0) {
      return <Badge className="bg-blue-500 text-white text-xs"><TrendingUp className="h-3 w-3 mr-1" /> {gmd.toFixed(3)}</Badge>
    } else if (gmd > 0.5) {
      return <Badge className="bg-yellow-500 text-white text-xs"><Minus className="h-3 w-3 mr-1" /> {gmd.toFixed(3)}</Badge>
    } else if (gmd > 0) {
      return <Badge className="bg-orange-500 text-white text-xs"><TrendingDown className="h-3 w-3 mr-1" /> {gmd.toFixed(3)}</Badge>
    } else {
      return <Badge className="bg-red-500 text-white text-xs"><TrendingDown className="h-3 w-3 mr-1" /> {gmd.toFixed(3)}</Badge>
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 justify-between transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger />
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
                  <BreadcrumbPage>Pesagens</BreadcrumbPage>
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
                <h1 className="text-xl font-semibold">
                  Histórico de Pesagens
                  {totalCount > 0 && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({totalCount.toLocaleString('pt-BR')} {totalCount === 1 ? 'pesagem' : 'pesagens'})
                    </span>
                  )}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Todas as pesagens registradas no sistema
                </p>
              </div>
              <div className="flex gap-2">
                <Link href="/pesagens/lote">
                  <Button variant="outline">
                    <Users className="mr-2 h-4 w-4" />
                    Pesagem em Lote
                  </Button>
                </Link>
                <Link href="/pesagens/modo-curral">
                  <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                    <Zap className="mr-2 h-4 w-4" />
                    Modo Curral
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por observações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {loading ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Animal</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Peso</TableHead>
                      <TableHead>GMD</TableHead>
                      <TableHead>Dias</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : pesagens.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Nenhuma pesagem registrada</EmptyTitle>
                  <EmptyDescription>
                    Comece registrando pesagens no Modo Curral
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Link href="/pesagens/modo-curral">
                    <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">
                      <Zap className="mr-2 h-3 w-3" />
                      Modo Curral
                    </Button>
                  </Link>
                </EmptyContent>
              </Empty>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Animal</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Peso</TableHead>
                      <TableHead>GMD (kg/dia)</TableHead>
                      <TableHead>Dias</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pesagens.map((pesagem) => (
                      <TableRow key={pesagem.id}>
                        <TableCell className="font-medium">
                          {format(new Date(pesagem.data_pesagem), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {pesagem.animais?.brinco_visual && (
                              <span className="text-sm font-medium">{pesagem.animais.brinco_visual}</span>
                            )}
                            {pesagem.animais?.brinco_eletronico && (
                              <span className="text-xs text-muted-foreground">
                                RF: {pesagem.animais.brinco_eletronico}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {pesagem.animais?.racas?.nome}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {pesagem.animais?.lotes?.nome || '-'}
                        </TableCell>
                        <TableCell>
                          {getTipoBadge(pesagem.tipo)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-semibold">
                            {pesagem.peso.toFixed(2)} kg
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getGMDBadge(pesagem.gmd)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {pesagem.dias_desde_ultima_pesagem || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Paginação */}
            {!loading && totalCount > 0 && (
              <div className="flex items-center justify-between px-2 py-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount} pesagens
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    Primeira
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <div className="text-sm font-medium">
                    Página {currentPage} de {Math.ceil(totalCount / itemsPerPage)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
                  >
                    Próxima
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.ceil(totalCount / itemsPerPage))}
                    disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
                  >
                    Última
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
