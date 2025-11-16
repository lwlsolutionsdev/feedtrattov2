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
import { Card } from "@/components/ui/card"
import { ArrowLeft, Loader2, Users } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface Lote {
  id: string
  nome: string
  total_animais: number
}

export default function PesagemLotePage() {
  const [lotes, setLotes] = useState<Lote[]>([])
  const [loteId, setLoteId] = useState('')
  const [loteInfo, setLoteInfo] = useState<Lote | null>(null)
  const [tipo, setTipo] = useState<'MANEJO' | 'SAIDA'>('MANEJO')
  const [pesoMedio, setPesoMedio] = useState('')
  const [dataPesagem, setDataPesagem] = useState(new Date().toISOString().split('T')[0])
  const [motivo, setMotivo] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchLotes()
  }, [])

  useEffect(() => {
    if (loteId) {
      const lote = lotes.find(l => l.id === loteId)
      setLoteInfo(lote || null)
    } else {
      setLoteInfo(null)
    }
  }, [loteId, lotes])

  async function fetchLotes() {
    try {
      const { data, error } = await supabase
        .from('lotes_com_totais')
        .select('id, nome, data_entrada, total_animais, total_animais_individuais, total_animais_lote')
        .eq('status', 'ATIVO')
        .order('nome')

      if (error) throw error

      // Mostrar todos os lotes que têm animais (individuais OU em lote)
      const lotesComTotal = data
        ?.filter(lote => (lote.total_animais || 0) > 0)
        .map(lote => ({
          id: lote.id,
          nome: lote.nome,
          total_animais: lote.total_animais || 0
        })) || []

      setLotes(lotesComTotal)
    } catch (error: any) {
      console.error('Erro ao buscar lotes:', error)
      toast.error('Erro ao carregar lotes')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!loteId) {
      toast.error('Selecione um lote')
      return
    }

    if (!pesoMedio || parseFloat(pesoMedio) <= 0) {
      toast.error('Informe um peso médio válido')
      return
    }

    if (!motivo.trim()) {
      toast.error('Informe o motivo da pesagem')
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

      let totalPesados = 0

      // 1. Buscar animais INDIVIDUAIS do lote
      const { data: animaisIndividuais, error: animaisError } = await supabase
        .from('animais')
        .select('id')
        .eq('lote_id', loteId)
        .eq('status', 'ATIVO')

      if (animaisError) throw animaisError

      // 2. Buscar lotes de animais (entrada em lote) deste lote de confinamento
      const { data: lotesAnimais, error: lotesError } = await supabase
        .from('lotes_animais')
        .select('id, quantidade')
        .eq('lote_confinamento_id', loteId)
        .eq('status', 'ATIVO')

      if (lotesError) throw lotesError

      // 3. Criar pesagens para animais individuais
      if (animaisIndividuais && animaisIndividuais.length > 0) {
        const pesagensIndividuais = animaisIndividuais.map(animal => ({
          animal_id: animal.id,
          tipo: tipo,
          data_pesagem: dataPesagem,
          peso: parseFloat(pesoMedio),
          observacoes: `${motivo}${observacoes ? ` - ${observacoes}` : ''}`,
          cliente_id: user.id,
          empresa_id: cliente?.empresa_id || null,
          created_by: user.id,
        }))

        const { error: pesagensError } = await supabase
          .from('pesagens')
          .insert(pesagensIndividuais)

        if (pesagensError) throw pesagensError
        totalPesados += animaisIndividuais.length
      }

      // 4. Criar pesagens para lotes de animais (entrada em lote)
      if (lotesAnimais && lotesAnimais.length > 0) {
        const pesagensLotes = lotesAnimais.map(loteAnimais => ({
          lote_animais_id: loteAnimais.id,
          tipo: tipo,
          data_pesagem: dataPesagem,
          peso_medio: parseFloat(pesoMedio),
          observacoes: `${motivo}${observacoes ? ` - ${observacoes}` : ''}`,
          cliente_id: user.id,
          empresa_id: cliente?.empresa_id || null,
        }))

        const { error: pesagensLotesError } = await supabase
          .from('pesagens_lotes')
          .insert(pesagensLotes)

        if (pesagensLotesError) throw pesagensLotesError
        
        // Somar quantidade de animais dos lotes
        totalPesados += lotesAnimais.reduce((sum, l) => sum + l.quantidade, 0)
      }

      if (totalPesados === 0) {
        toast.error('Nenhum animal encontrado neste lote')
        return
      }

      toast.success(`Pesagem registrada para ${totalPesados} animais!`)

      // Resetar formulário
      setLoteId('')
      setLoteInfo(null)
      setPesoMedio('')
      setMotivo('')
      setObservacoes('')
    } catch (error: any) {
      console.error('Erro ao salvar pesagens:', error)
      toast.error('Erro ao salvar pesagens: ' + error.message)
    } finally {
      setSubmitting(false)
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
                  <BreadcrumbLink href="/pesagens">Pesagens</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Pesagem em Lote</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="px-4">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="max-w-2xl mx-auto w-full space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold">Pesagem em Lote</h1>
                <p className="text-xs text-muted-foreground">
                  Registre peso médio para todos os animais de um lote
                </p>
              </div>
              <Link href="/pesagens">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              </Link>
            </div>

            <Card className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Seleção de Lote */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">1. Selecione o Lote *</Label>
                  <Select value={loteId} onValueChange={setLoteId} required>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Escolha um lote" />
                    </SelectTrigger>
                    <SelectContent>
                      {lotes.map((lote) => (
                        <SelectItem key={lote.id} value={lote.id}>
                          {lote.nome} ({lote.total_animais} animais)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {loteInfo && (
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                      <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {loteInfo.total_animais} animais serão pesados
                      </p>
                    </div>
                  )}
                </div>

                {loteInfo && (
                  <>
                    {/* Tipo de Pesagem */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">2. Tipo de Pesagem *</Label>
                      <Select value={tipo} onValueChange={(v) => setTipo(v as any)} required>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MANEJO">Manejo (Pesagem Intermediária)</SelectItem>
                          <SelectItem value="SAIDA">Saída (Pesagem Final)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Peso Médio */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">3. Peso Médio (kg) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={pesoMedio}
                        onChange={(e) => setPesoMedio(e.target.value)}
                        placeholder="Ex: 420.50"
                        required
                        className="h-16 text-3xl text-center font-bold"
                      />
                      <p className="text-xs text-muted-foreground">
                        Este peso será aplicado a todos os {loteInfo.total_animais} animais do lote
                      </p>
                    </div>

                    {/* Data */}
                    <div className="space-y-2">
                      <Label className="text-sm">Data da Pesagem</Label>
                      <Input
                        type="date"
                        value={dataPesagem}
                        onChange={(e) => setDataPesagem(e.target.value)}
                        className="h-10"
                      />
                    </div>

                    {/* Motivo */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Motivo *</Label>
                      <Input
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder="Ex: Pesagem de manejo mensal, Pesagem pré-abate..."
                        className="h-10"
                        required
                      />
                    </div>

                    {/* Observações */}
                    <div className="space-y-2">
                      <Label className="text-sm">Observações</Label>
                      <Textarea
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        placeholder="Informações adicionais sobre a pesagem..."
                        rows={3}
                      />
                    </div>

                    {/* Botão Salvar */}
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-12 text-base bg-green-500 hover:bg-green-600 text-white"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Salvando pesagens...
                        </>
                      ) : (
                        <>
                          <Users className="mr-2 h-5 w-5" />
                          Registrar Pesagem para {loteInfo.total_animais} Animais
                        </>
                      )}
                    </Button>
                  </>
                )}
              </form>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
