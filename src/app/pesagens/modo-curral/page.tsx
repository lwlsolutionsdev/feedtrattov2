'use client'

import { useEffect, useState, useRef } from 'react'
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
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2, Scale, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Animal {
  id: string
  brinco_visual: string | null
  brinco_eletronico: string | null
  peso_entrada: number
  data_entrada: string
  racas?: { nome: string }
  lotes?: { nome: string }
}

interface Pesagem {
  id: string
  animal_id: string
  peso: number
  data_pesagem: string
  gmd: number | null
  dias_desde_ultima_pesagem: number | null
  peso_anterior: number | null
  animais?: {
    brinco_visual: string | null
    brinco_eletronico: string | null
    racas: { nome: string }
  }
}

export default function PesagensModoCorralPage() {
  const [brincoSearch, setBrincoSearch] = useState('')
  const [animalEncontrado, setAnimalEncontrado] = useState<Animal | null>(null)
  const [buscandoAnimal, setBuscandoAnimal] = useState(false)
  
  const [peso, setPeso] = useState('')
  const [dataPesagem, setDataPesagem] = useState(new Date().toISOString().split('T')[0])
  const [observacoes, setObservacoes] = useState('')
  
  const [submitting, setSubmitting] = useState(false)
  const [pesagensHoje, setPesagensHoje] = useState<Pesagem[]>([])
  const [totalPesados, setTotalPesados] = useState(0)
  
  const brincoInputRef = useRef<HTMLInputElement>(null)
  const pesoInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  useEffect(() => {
    carregarPesagensDeHoje()
    brincoInputRef.current?.focus()
  }, [])

  async function carregarPesagensDeHoje() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const hoje = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('pesagens')
        .select(`
          *,
          animais (
            brinco_visual,
            brinco_eletronico,
            racas (nome)
          )
        `)
        .eq('cliente_id', user.id)
        .eq('data_pesagem', hoje)
        .eq('tipo', 'MANEJO')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      console.log('Pesagens carregadas:', data)
      setPesagensHoje(data || [])
      setTotalPesados(data?.length || 0)
    } catch (error: any) {
      console.error('Erro ao carregar pesagens de hoje:', error)
    }
  }

  async function buscarAnimalPorBrinco() {
    if (!brincoSearch.trim()) {
      toast.error('Digite um brinco para buscar')
      return
    }

    try {
      setBuscandoAnimal(true)
      
      const { data, error } = await supabase
        .from('animais')
        .select(`
          *,
          racas (nome),
          lotes (nome)
        `)
        .or(`brinco_visual.eq.${brincoSearch},brinco_eletronico.eq.${brincoSearch}`)
        .eq('status', 'ATIVO')
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          toast.error('Animal não encontrado ou não está ativo')
        } else {
          throw error
        }
        setBrincoSearch('')
        brincoInputRef.current?.focus()
        return
      }

      setAnimalEncontrado(data)
      toast.success('Animal encontrado!')
      
      // Focar no campo de peso
      setTimeout(() => {
        pesoInputRef.current?.focus()
      }, 100)
    } catch (error: any) {
      console.error('Erro ao buscar animal:', error)
      toast.error('Erro ao buscar animal')
      setBrincoSearch('')
      brincoInputRef.current?.focus()
    } finally {
      setBuscandoAnimal(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!animalEncontrado) {
      toast.error('Busque um animal primeiro')
      return
    }

    if (!peso || parseFloat(peso) <= 0) {
      toast.error('Informe um peso válido')
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

      const pesagemData = {
        animal_id: animalEncontrado.id,
        tipo: 'MANEJO',
        data_pesagem: dataPesagem,
        peso: parseFloat(peso),
        observacoes: observacoes || null,
        cliente_id: user.id,
        empresa_id: cliente?.empresa_id || null,
        created_by: user.id,
      }

      const { data: novaPesagem, error } = await supabase
        .from('pesagens')
        .insert(pesagemData)
        .select()
        .single()

      if (error) {
        console.error('Erro ao salvar pesagem:', error)
        throw error
      }

      console.log('Pesagem salva com sucesso:', novaPesagem)

      toast.success(`Pesagem registrada! ${novaPesagem.gmd ? `GMD: ${novaPesagem.gmd.toFixed(3)} kg/dia` : ''}`)

      // Resetar formulário
      setAnimalEncontrado(null)
      setBrincoSearch('')
      setPeso('')
      setObservacoes('')
      setTotalPesados(prev => prev + 1)

      // Recarregar lista
      carregarPesagensDeHoje()

      // Focar no campo de brinco
      setTimeout(() => {
        brincoInputRef.current?.focus()
      }, 100)
    } catch (error: any) {
      console.error('Erro ao salvar pesagem:', error)
      toast.error('Erro ao salvar pesagem: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  function getGMDBadge(gmd: number | null) {
    if (!gmd) return null
    
    if (gmd > 1.5) {
      return <Badge className="bg-green-500 text-white"><TrendingUp className="h-3 w-3 mr-1" /> Excelente</Badge>
    } else if (gmd > 1.0) {
      return <Badge className="bg-blue-500 text-white"><TrendingUp className="h-3 w-3 mr-1" /> Bom</Badge>
    } else if (gmd > 0.5) {
      return <Badge className="bg-yellow-500 text-white"><Minus className="h-3 w-3 mr-1" /> Regular</Badge>
    } else if (gmd > 0) {
      return <Badge className="bg-orange-500 text-white"><TrendingDown className="h-3 w-3 mr-1" /> Baixo</Badge>
    } else {
      return <Badge className="bg-red-500 text-white"><TrendingDown className="h-3 w-3 mr-1" /> Negativo</Badge>
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
                  <BreadcrumbPage>⚡ Modo Curral - Pesagens</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="px-4">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          <div className="h-full grid grid-cols-2 gap-4 p-4">
            {/* Coluna Esquerda - Lista de Pesagens */}
            <div className="space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Pesagens de Hoje</h2>
                  <p className="text-xs text-muted-foreground">Últimas 10 pesagens registradas</p>
                </div>
                <Link href="/pesagens">
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Ver Histórico
                  </Button>
                </Link>
              </div>

              <div className="bg-blue-500/10 border-2 border-blue-500 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Total Pesados Hoje</p>
                <p className="text-3xl font-bold text-blue-500">{totalPesados}</p>
              </div>

              <div className="space-y-2">
                {pesagensHoje.map((pesagem) => (
                  <Card key={pesagem.id} className="p-3">
                    <div className="space-y-2">
                      {/* Header com brincos e hora */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {pesagem.animais?.brinco_visual && (
                            <span className="font-semibold text-base">{pesagem.animais.brinco_visual}</span>
                          )}
                          {pesagem.animais?.brinco_eletronico && (
                            <span className="text-xs text-muted-foreground">
                              RF: {pesagem.animais.brinco_eletronico}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(pesagem.data_pesagem), 'HH:mm', { locale: ptBR })}
                        </span>
                      </div>

                      {/* Raça */}
                      <p className="text-xs text-muted-foreground">{pesagem.animais?.racas?.nome}</p>

                      {/* Peso e GMD */}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-semibold">
                          {pesagem.peso.toFixed(2)} kg
                        </Badge>
                        {pesagem.gmd !== null && pesagem.gmd !== undefined && getGMDBadge(pesagem.gmd)}
                      </div>

                      {/* GMD Detalhado */}
                      {pesagem.gmd !== null && pesagem.gmd !== undefined ? (
                        <div className="bg-muted/50 p-2 rounded-md">
                          <p className="text-sm font-bold">
                            GMD: {pesagem.gmd.toFixed(3)} kg/dia
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {pesagem.dias_desde_ultima_pesagem} dias desde última pesagem
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Peso anterior: {pesagem.peso_anterior?.toFixed(2)} kg
                          </p>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-md">
                          <p className="text-xs text-yellow-800 dark:text-yellow-200">
                            ⚠️ GMD não calculado - verifique se há peso de entrada
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Coluna Direita - Formulário de Pesagem */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Registrar Pesagem</h2>
                <p className="text-xs text-muted-foreground">Pesagem de manejo para cálculo de GMD</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Busca de Animal */}
                <div className="space-y-2 p-4 border-2 rounded-lg bg-muted/30">
                  <Label className="text-sm font-semibold">1. Buscar Animal</Label>
                  <div className="flex gap-2">
                    <Input
                      ref={brincoInputRef}
                      placeholder="Digite o brinco e pressione Enter"
                      value={brincoSearch}
                      onChange={(e) => setBrincoSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          buscarAnimalPorBrinco()
                        }
                      }}
                      className="flex-1"
                      style={{ fontSize: '1.5rem', height: '4rem' }}
                      disabled={buscandoAnimal || !!animalEncontrado}
                    />
                  </div>
                  
                  {animalEncontrado && (
                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                      <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                        ✓ Animal Encontrado
                      </p>
                      <div className="mt-2 space-y-1 text-sm">
                        {animalEncontrado.brinco_visual && (
                          <p><strong>Brinco Visual:</strong> {animalEncontrado.brinco_visual}</p>
                        )}
                        {animalEncontrado.brinco_eletronico && (
                          <p><strong>Brinco Eletrônico:</strong> {animalEncontrado.brinco_eletronico}</p>
                        )}
                        <p><strong>Raça:</strong> {animalEncontrado.racas?.nome}</p>
                        <p><strong>Lote:</strong> {animalEncontrado.lotes?.nome}</p>
                        <p><strong>Peso Entrada:</strong> {animalEncontrado.peso_entrada.toFixed(2)} kg</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          setAnimalEncontrado(null)
                          setBrincoSearch('')
                          brincoInputRef.current?.focus()
                        }}
                      >
                        Buscar Outro Animal
                      </Button>
                    </div>
                  )}
                </div>

                {animalEncontrado && (
                  <>
                    {/* Peso */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">2. Peso Atual (kg) *</Label>
                      <Input
                        ref={pesoInputRef}
                        type="number"
                        step="0.01"
                        value={peso}
                        onChange={(e) => setPeso(e.target.value)}
                        placeholder="Digite o peso"
                        required
                        style={{ fontSize: '6rem', height: '10rem', textAlign: 'center' }}
                        className="font-bold"
                      />
                    </div>

                    {/* Data */}
                    <div className="space-y-2">
                      <Label className="text-sm">Data da Pesagem</Label>
                      <Input
                        type="date"
                        value={dataPesagem}
                        onChange={(e) => setDataPesagem(e.target.value)}
                        className="h-9"
                      />
                    </div>

                    {/* Observações */}
                    <div className="space-y-2">
                      <Label className="text-sm">Observações</Label>
                      <Textarea
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        placeholder="Observações sobre a pesagem..."
                        rows={3}
                      />
                    </div>

                    {/* Botão Salvar */}
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-16 text-lg bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Scale className="mr-2 h-5 w-5" />
                          Registrar Pesagem
                        </>
                      )}
                    </Button>
                  </>
                )}
              </form>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
