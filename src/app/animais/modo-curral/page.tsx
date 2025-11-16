'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { X, Loader2, CheckCircle2, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Card } from "@/components/ui/card"

interface Raca {
  id: string
  nome: string
}

interface Categoria {
  id: string
  nome: string
  sexo: 'MACHO' | 'FEMEA'
}

interface Lote {
  id: string
  nome: string
  status: string
}

interface LoteSugerido {
  id: string
  nome: string
  peso_medio: number
  total_animais: number
  capacidade: number
  tipo_predominante: string
  diferenca_peso: number
}

interface AnimalCadastrado {
  id: string
  brinco_visual: string | null
  brinco_eletronico: string | null
  peso_entrada: number
  tipo: string
  created_at: string
}

export default function ModoCurralPage() {
  const [racas, setRacas] = useState<Raca[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [animaisCadastrados, setAnimaisCadastrados] = useState<AnimalCadastrado[]>([])
  const [totalProcessados, setTotalProcessados] = useState(0)
  const [sisbovOpen, setSisbovOpen] = useState(false)
  const [ultimoBrincoCadastrado, setUltimoBrincoCadastrado] = useState<'visual' | 'eletronico'>('visual')
  const [lotesSugeridos, setLotesSugeridos] = useState<LoteSugerido[]>([])
  
  // Campos que PERSISTEM (não resetam)
  const [racaId, setRacaId] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [valorCompraKg, setValorCompraKg] = useState('')
  const [propriedadeOrigem, setPropriedadeOrigem] = useState('')
  
  // Campos que RESETAM após cadastro
  const [brincoVisual, setBrincoVisual] = useState('')
  const [brincoEletronico, setBrincoEletronico] = useState('')
  const [pesoEntrada, setPesoEntrada] = useState('')
  const [tipo, setTipo] = useState<'FUNDO' | 'LEVE' | 'MEIO' | 'PESADO'>('MEIO')
  const [loteId, setLoteId] = useState('')
  
  // SISBOV (opcional)
  const [numeroSisbov, setNumeroSisbov] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [observacoesSisbov, setObservacoesSisbov] = useState('')

  const brincoVisualRef = useRef<HTMLInputElement>(null)
  const brincoEletronicoRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchRacas()
    fetchCategorias()
    fetchLotes()
    carregarAnimaisDeHoje()
    // Foco automático no primeiro campo
    brincoVisualRef.current?.focus()
  }, [])

  async function carregarAnimaisDeHoje() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const hoje = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('animais')
        .select('id, brinco_visual, brinco_eletronico, peso_entrada, tipo, created_at')
        .eq('cliente_id', user.id)
        .gte('created_at', `${hoje}T00:00:00`)
        .lte('created_at', `${hoje}T23:59:59`)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      
      setAnimaisCadastrados(data || [])
      setTotalProcessados(data?.length || 0)
    } catch (error: any) {
      console.error('Erro ao carregar animais de hoje:', error)
    }
  }

  // Buscar lotes sugeridos quando o peso mudar
  useEffect(() => {
    const peso = parseFloat(pesoEntrada)
    if (peso > 0) {
      buscarLotesSugeridos(peso)
    } else {
      setLotesSugeridos([])
    }
  }, [pesoEntrada])

  async function fetchRacas() {
    try {
      const { data, error } = await supabase
        .from('racas')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome')

      if (error) throw error
      setRacas(data || [])
    } catch (error: any) {
      console.error('Erro ao buscar raças:', error)
    }
  }

  async function fetchCategorias() {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('id, nome, sexo')
        .eq('ativo', true)
        .order('nome')

      if (error) throw error
      setCategorias(data || [])
    } catch (error: any) {
      console.error('Erro ao buscar categorias:', error)
    }
  }

  async function fetchLotes() {
    try {
      const { data, error } = await supabase
        .from('lotes')
        .select('id, nome, status')
        .in('status', ['ATIVO'])
        .order('nome')

      if (error) throw error
      setLotes(data || [])
    } catch (error: any) {
      console.error('Erro ao buscar lotes:', error)
    }
  }

  async function buscarLotesSugeridos(pesoAtual: number) {
    if (!pesoAtual || pesoAtual <= 0) {
      setLotesSugeridos([])
      return
    }

    try {
      // Buscar lotes ativos com suas estatísticas
      const { data: lotesData, error } = await supabase
        .from('lotes')
        .select(`
          id,
          nome,
          currais!inner(
            capacidade_animais
          )
        `)
        .eq('status', 'ATIVO')

      if (error) throw error

      // Para cada lote, buscar animais e calcular estatísticas
      const lotesComEstatisticas = await Promise.all(
        (lotesData || []).map(async (lote: any) => {
          const { data: animais } = await supabase
            .from('animais')
            .select('peso_entrada, tipo')
            .eq('lote_id', lote.id)
            .eq('status', 'ATIVO')

          if (!animais || animais.length === 0) {
            return null
          }

          const pesoMedio = animais.reduce((sum, a) => sum + a.peso_entrada, 0) / animais.length
          const diferencaPeso = Math.abs(pesoMedio - pesoAtual)

          // Calcular tipo predominante
          const tipoCount: Record<string, number> = {}
          animais.forEach(a => {
            tipoCount[a.tipo] = (tipoCount[a.tipo] || 0) + 1
          })
          const tipoPredominante = Object.entries(tipoCount).sort((a, b) => b[1] - a[1])[0][0]

          return {
            id: lote.id,
            nome: lote.nome,
            peso_medio: pesoMedio,
            total_animais: animais.length,
            capacidade: lote.currais?.capacidade_animais || 0,
            tipo_predominante: tipoPredominante,
            diferenca_peso: diferencaPeso
          }
        })
      )

      // Filtrar nulos e ordenar por diferença de peso
      const lotesFiltrados = lotesComEstatisticas
        .filter((l): l is LoteSugerido => l !== null)
        .sort((a, b) => a.diferenca_peso - b.diferenca_peso)
        .slice(0, 3)

      setLotesSugeridos(lotesFiltrados)
    } catch (error: any) {
      console.error('Erro ao buscar lotes sugeridos:', error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!brincoVisual && !brincoEletronico) {
      toast.error('Preencha pelo menos um brinco')
      brincoVisualRef.current?.focus()
      return
    }

    if (!pesoEntrada || !racaId || !categoriaId || !valorCompraKg) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (!loteId) {
      toast.error('Selecione um lote')
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

      // Buscar o curral_id do lote selecionado
      const { data: loteData, error: loteError } = await supabase
        .from('lotes')
        .select('curral_id')
        .eq('id', loteId)
        .single()

      if (loteError) {
        console.error('Erro ao buscar curral do lote:', loteError)
        throw new Error('Erro ao buscar informações do lote')
      }

      const animalData = {
        brinco_visual: brincoVisual || null,
        brinco_eletronico: brincoEletronico || null,
        numero_sisbov: numeroSisbov || null,
        data_nascimento: dataNascimento || null,
        propriedade_origem: propriedadeOrigem || null,
        observacoes_sisbov: observacoesSisbov || null,
        data_entrada: new Date().toISOString().split('T')[0],
        peso_entrada: parseFloat(pesoEntrada),
        raca_id: racaId,
        categoria_id: categoriaId,
        lote_id: loteId,
        curral_id: loteData?.curral_id || null,
        tipo: tipo,
        valor_compra_kg: parseFloat(valorCompraKg),
        status: 'ATIVO',
        cliente_id: user.id,
        empresa_id: cliente?.empresa_id || null,
      }

      console.log('Dados do animal antes de salvar:', animalData)

      const { data: novoAnimal, error } = await supabase
        .from('animais')
        .insert(animalData)
        .select()
        .single()

      if (error) {
        console.error('Erro ao salvar animal:', error)
        throw error
      }

      console.log('Animal salvo com sucesso:', novoAnimal)

      // Detectar qual brinco foi usado
      const brincoCadastrado = brincoEletronico ? 'eletronico' : 'visual'
      setUltimoBrincoCadastrado(brincoCadastrado)

      // Adicionar à lista de cadastrados (apenas de hoje)
      const hoje = new Date().toISOString().split('T')[0]
      const dataAnimal = novoAnimal.created_at.split('T')[0]
      if (dataAnimal === hoje) {
        setAnimaisCadastrados(prev => [novoAnimal, ...prev].slice(0, 10))
      }
      setTotalProcessados(prev => prev + 1)

      toast.success('Animal cadastrado!')

      // RESETAR campos específicos (incluindo lote agora)
      setBrincoVisual('')
      setBrincoEletronico('')
      setPesoEntrada('')
      setTipo('MEIO')
      setLoteId('')
      setNumeroSisbov('')
      setDataNascimento('')
      setObservacoesSisbov('')

      // Foco automático no campo que foi usado anteriormente
      setTimeout(() => {
        if (brincoCadastrado === 'eletronico') {
          brincoEletronicoRef.current?.focus()
        } else {
          brincoVisualRef.current?.focus()
        }
      }, 100)

    } catch (error: any) {
      console.error('Erro ao salvar animal:', error)
      toast.error('Erro ao salvar: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const getTipoBadge = (tipo: string) => {
    const colors: Record<string, string> = {
      FUNDO: 'bg-blue-500',
      LEVE: 'bg-green-500',
      MEIO: 'bg-yellow-500',
      PESADO: 'bg-orange-500'
    }
    return <Badge className={colors[tipo]}>{tipo}</Badge>
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header fixo */}
      <div className="border-b bg-background">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/animais">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">⚡ Modo Curral</h1>
              <p className="text-xs text-muted-foreground">Cadastro rápido de animais</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Formulário Principal - SEM SCROLL */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className="h-full flex">
            <form onSubmit={handleSubmit} className="flex-1 flex gap-6">
              {/* COLUNA ESQUERDA - Dados PERSISTENTES */}
              <div className="w-[400px] space-y-3">
                <div>
                  <h3 className="text-lg font-bold mb-2 text-blue-500">Dados Persistentes</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Não serão resetados
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Raça *</Label>
                    <Select value={racaId} onValueChange={setRacaId} required>
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {racas.map((raca) => (
                          <SelectItem key={raca.id} value={raca.id}>
                            {raca.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">Categoria *</Label>
                    <Select value={categoriaId} onValueChange={setCategoriaId} required>
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.nome} ({cat.sexo})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">Valor/kg (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={valorCompraKg}
                      onChange={(e) => setValorCompraKg(e.target.value)}
                      placeholder="Ex: 15.50"
                      className="h-10"
                      required
                      autoComplete="off"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">Propriedade de Origem</Label>
                    <Input
                      value={propriedadeOrigem}
                      onChange={(e) => setPropriedadeOrigem(e.target.value)}
                      placeholder="Ex: Fazenda São José"
                      className="h-10"
                      autoComplete="off"
                    />
                  </div>

                  {pesoEntrada && valorCompraKg && (
                    <div className="bg-blue-500/10 border-2 border-blue-500 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Valor Total</p>
                      <p className="text-2xl font-bold text-blue-500">
                        R$ {(parseFloat(pesoEntrada) * parseFloat(valorCompraKg)).toFixed(2)}
                      </p>
                    </div>
                  )}

                  <div className="bg-orange-500/10 border-2 border-orange-500 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Total Processados</p>
                    <p className="text-3xl font-bold text-orange-500">{totalProcessados}</p>
                  </div>

                  {/* Sugestões de Lotes */}
                  {lotesSugeridos.length > 0 && (
                    <div className="space-y-2 pt-4 border-t">
                      <h4 className="text-sm font-bold text-green-600">Lotes Sugeridos</h4>
                      <p className="text-xs text-muted-foreground">Baseado no peso digitado</p>
                      {lotesSugeridos.map((lote) => (
                        <Card
                          key={lote.id}
                          className="p-3 cursor-pointer hover:bg-green-50 hover:border-green-500 transition-all border-2 group"
                          onClick={() => setLoteId(lote.id)}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-sm text-gray-900 dark:text-gray-100 group-hover:!text-gray-900">{lote.nome}</p>
                              <Badge className="bg-green-500 hover:bg-green-500 text-white text-xs">{lote.tipo_predominante}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <p className="text-gray-700 group-hover:!text-gray-800 font-medium">Peso Médio</p>
                                <p className="font-bold text-gray-900 dark:text-gray-100 group-hover:!text-black">{lote.peso_medio.toFixed(1)} kg</p>
                              </div>
                              <div>
                                <p className="text-gray-700 group-hover:!text-gray-800 font-medium">Animais</p>
                                <p className="font-bold text-gray-900 dark:text-gray-100 group-hover:!text-black">{lote.total_animais}/{lote.capacidade}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-green-600 group-hover:!text-green-800 font-bold">
                              <span>Diferença: {lote.diferenca_peso.toFixed(1)} kg</span>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* COLUNA DIREITA - Dados que RESETAM + Botão */}
              <div className="flex-1 flex flex-col">
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold mb-2 text-orange-500">Dados do Animal</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Serão resetados após cadastro
                    </p>
                  </div>

                  {/* Brinco Visual + Botão SISBOV lado a lado */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold">Brinco Visual</Label>
                      <Input
                        ref={brincoVisualRef}
                        value={brincoVisual}
                        onChange={(e) => setBrincoVisual(e.target.value)}
                        className="h-24 px-2 text-center font-black leading-none border-2"
                        style={{ fontSize: '5rem' }}
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold">SISBOV (Opcional)</Label>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSisbovOpen(true)}
                        className="h-24 w-full text-lg font-semibold"
                      >
                        Dados SISBOV
                      </Button>
                    </div>
                  </div>

                  {/* Brinco Eletrônico */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Brinco Eletrônico</Label>
                    <Input
                      ref={brincoEletronicoRef}
                      value={brincoEletronico}
                      onChange={(e) => setBrincoEletronico(e.target.value)}
                      className="h-24 px-2 text-center font-black leading-none border-2"
                      style={{ fontSize: '4rem' }}
                      autoComplete="off"
                    />
                  </div>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    * Pelo menos um brinco é obrigatório
                  </p>

                  {/* Peso - SUPER GIGANTE */}
                  <div className="space-y-2">
                    <Label className="text-lg font-bold">Peso Entrada (kg) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={pesoEntrada}
                      onChange={(e) => setPesoEntrada(e.target.value)}
                      placeholder="000.00"
                      className="h-56 px-4 text-center font-black border-4 border-orange-500 leading-none"
                      style={{ fontSize: '10rem' }}
                      required
                      autoComplete="off"
                    />
                  </div>

                  {/* Tipo */}
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Tipo *</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {['FUNDO', 'LEVE', 'MEIO', 'PESADO'].map((t) => (
                        <Button
                          key={t}
                          type="button"
                          variant={tipo === t ? 'default' : 'outline'}
                          className={`h-14 text-base font-bold ${tipo === t ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                          onClick={() => setTipo(t as any)}
                        >
                          {t}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Lote + Botão Cadastrar lado a lado */}
                <div className="grid grid-cols-[300px_1fr] gap-3 pt-3 items-end">
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Lote *</Label>
                    <Select value={loteId} onValueChange={setLoteId} required>
                      <SelectTrigger className="h-20 w-full text-lg">
                        <SelectValue placeholder="Selecione o lote" />
                      </SelectTrigger>
                      <SelectContent>
                        {lotes.map((lote) => (
                          <SelectItem key={lote.id} value={lote.id}>
                            {lote.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white h-20 text-2xl font-bold"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-3 h-7 w-7 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-3 h-7 w-7" />
                        Cadastrar Animal
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Lista Lateral - 30% */}
        <div className="w-96 border-l bg-muted/30 overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Cadastrados Hoje</h3>
              <p className="text-sm text-muted-foreground">
                {animaisCadastrados.length} animais • {new Date().toLocaleDateString('pt-BR')}
              </p>
            </div>

            {animaisCadastrados.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">Nenhum animal cadastrado hoje</p>
              </div>
            ) : (
              <div className="space-y-3">
                {animaisCadastrados.map((animal, index) => (
                  <Card key={animal.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">#{totalProcessados - index}</span>
                      {getTipoBadge(animal.tipo)}
                    </div>
                    <div className="space-y-1">
                      {animal.brinco_visual && (
                        <p className="font-semibold text-lg">{animal.brinco_visual}</p>
                      )}
                      {animal.brinco_eletronico && (
                        <p className="text-sm text-muted-foreground">
                          📡 {animal.brinco_eletronico}
                        </p>
                      )}
                      <p className="text-sm">
                        <strong>{animal.peso_entrada.toFixed(2)} kg</strong>
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal SISBOV */}
      <Dialog open={sisbovOpen} onOpenChange={setSisbovOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Dados SISBOV</DialogTitle>
            <DialogDescription>
              Informações para rastreabilidade (opcional)
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Número SISBOV</Label>
              <Input
                value={numeroSisbov}
                onChange={(e) => setNumeroSisbov(e.target.value)}
                placeholder="15 dígitos"
                maxLength={15}
              />
            </div>

            <div className="space-y-2">
              <Label>Data de Nascimento</Label>
              <Input
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Observações SISBOV</Label>
              <Input
                value={observacoesSisbov}
                onChange={(e) => setObservacoesSisbov(e.target.value)}
                placeholder="Informações adicionais..."
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setSisbovOpen(false)}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
