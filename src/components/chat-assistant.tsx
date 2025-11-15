"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2, Sparkles, Plus, Paperclip, X, FileText, Image as ImageIcon, Volume2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Message {
  role: "user" | "assistant"
  content: string
  attachments?: Array<{
    type: 'image' | 'pdf' | 'audio'
    name: string
    url: string
    size: number
  }>
}

interface AttachmentFile {
  file: File
  preview: string
  type: 'image' | 'pdf' | 'audio'
}

export function ChatAssistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [userName, setUserName] = useState("Você")
  const [attachments, setAttachments] = useState<AttachmentFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"
    }
  }, [input])

  useEffect(() => {
    async function loadUserName() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: cliente } = await supabase
          .from('clientes')
          .select('nome')
          .eq('id', user.id)
          .single()

        const name = cliente?.nome || user.email?.split('@')[0] || 'Você'
        setUserName(name)
      }
    }

    loadUserName()
  }, [])

  function processFiles(files: FileList | File[]) {
    Array.from(files).forEach(file => {
      const fileType = file.type
      let type: 'image' | 'pdf' | 'audio'
      
      if (fileType.startsWith('image/')) {
        type = 'image'
      } else if (fileType === 'application/pdf') {
        type = 'pdf'
      } else if (fileType.startsWith('audio/')) {
        type = 'audio'
      } else {
        return // Tipo não suportado
      }

      const preview = type === 'image' ? URL.createObjectURL(file) : ''
      
      setAttachments(prev => [...prev, { file, preview, type }])
    })
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return

    processFiles(files)

    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      processFiles(files)
    }
  }

  function removeAttachment(index: number) {
    setAttachments(prev => {
      const newAttachments = [...prev]
      if (newAttachments[index].preview) {
        URL.revokeObjectURL(newAttachments[index].preview)
      }
      newAttachments.splice(index, 1)
      return newAttachments
    })
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, { type: 'audio/webm' })
        
        setAttachments(prev => [...prev, {
          file: audioFile,
          preview: '',
          type: 'audio'
        }])

        // Parar stream
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Erro ao acessar microfone:', error)
      alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.')
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  function toggleRecording() {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  async function sendMessage() {
    if ((!input.trim() && attachments.length === 0) || loading) return

    const userMessage = input.trim()
    const userAttachments = attachments
    
    setInput("")
    setAttachments([])
    
    // Adicionar mensagem do usuário com anexos
    setMessages(prev => [...prev, { 
      role: "user", 
      content: userMessage || "Arquivo(s) enviado(s)",
      attachments: userAttachments.map(att => ({
        type: att.type,
        name: att.file.name,
        url: att.preview || att.file.name,
        size: att.file.size
      }))
    }])
    setLoading(true)

    try {
      let finalMessage = userMessage
      
      // Processar PDFs
      const pdfFiles = userAttachments.filter(att => att.type === 'pdf')
      if (pdfFiles.length > 0) {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: "📄 Extraindo texto do PDF..." }
        ])

        for (const pdfAtt of pdfFiles) {
          const formData = new FormData()
          formData.append('pdf', pdfAtt.file)

          const pdfResponse = await fetch("/api/extract-pdf", {
            method: "POST",
            body: formData,
          })

          if (pdfResponse.ok) {
            const { text } = await pdfResponse.json()
            const pdfText = finalMessage ? `${finalMessage}\n\n${text}` : text
            finalMessage = pdfText
          } else {
            const errorData = await pdfResponse.json()
            throw new Error(errorData.error || "Erro ao processar PDF")
          }
        }

        setMessages(prev => prev.slice(0, -1))
      }

      // Processar áudios com Whisper
      const audioFiles = userAttachments.filter(att => att.type === 'audio')
      if (audioFiles.length > 0) {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: "🎙️ Transcrevendo áudio..." }
        ])

        const formData = new FormData()
        audioFiles.forEach(att => {
          formData.append('audio', att.file)
        })

        const transcriptionResponse = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        })

        setMessages(prev => prev.slice(0, -1))

        if (transcriptionResponse.ok) {
          const { transcription } = await transcriptionResponse.json()
          finalMessage = finalMessage 
            ? `${finalMessage}\n\n[Áudio transcrito]: ${transcription}`
            : transcription
        } else {
          throw new Error("Erro ao transcrever áudio")
        }
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: finalMessage,
          history,
        }),
      })

      if (!response.ok) {
        throw new Error("Erro ao enviar mensagem")
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setMessages(prev => [
        ...prev,
        { role: "assistant", content: data.reply || "Desculpe, não consegui processar sua solicitação." },
      ])
      setHistory(data.history || [])
    } catch (error: any) {
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `Erro: ${error.message}. Por favor, tente novamente.`,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {messages.length === 0 ? (
        // TELA INICIAL - Input centralizado no meio
        <div className="flex flex-col items-center justify-center flex-1 px-4">
          <div className="w-full max-w-3xl space-y-8">
            <div className="text-center space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight">
                Tudo pronto? Então vamos lá!
              </h1>
            </div>

            {/* Preview de anexos na tela inicial */}
            {attachments.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2 justify-center">
                {attachments.map((att, idx) => (
                  <div key={idx} className="relative group">
                    {att.type === 'image' ? (
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden border bg-muted">
                        <img src={att.preview} alt={att.file.name} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeAttachment(idx)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : att.type === 'pdf' ? (
                      <div className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 min-w-[160px]">
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate text-red-900 dark:text-red-100">{att.file.name}</p>
                          <p className="text-xs text-red-600 dark:text-red-400">PDF</p>
                        </div>
                        <button
                          onClick={() => removeAttachment(idx)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      // Preview de áudio estilo WhatsApp
                      <div className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-muted min-w-[180px]">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Volume2 className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <div className="flex-1 h-1 bg-muted-foreground/20 rounded-full"></div>
                          <span className="text-xs text-muted-foreground">Áudio</span>
                        </div>
                        <button
                          onClick={() => removeAttachment(idx)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Input centralizado */}
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,audio/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {/* Botão de anexo à esquerda */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 hover:text-foreground transition-colors disabled:opacity-50"
                title="Anexar arquivo (imagem, PDF ou áudio)"
              >
                <Paperclip className="h-5 w-5 text-muted-foreground" />
              </button>

              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e: any) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte alguma coisa ou arraste arquivos aqui"
                disabled={loading}
                rows={1}
                className="min-h-[44px] max-h-32 w-full resize-none rounded-3xl bg-muted/50 border-0 pl-12 pr-24 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleRecording}
                  className={`h-7 w-7 rounded-full ${isRecording ? 'bg-red-500 text-white hover:bg-red-600' : ''}`}
                  disabled={loading}
                  title={isRecording ? "Parar gravação" : "Gravar áudio"}
                >
                  {isRecording ? (
                    <div className="h-3 w-3 rounded-sm bg-white animate-pulse" />
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </Button>
                <Button
                  onClick={sendMessage}
                  disabled={loading || (!input.trim() && attachments.length === 0)}
                  size="icon"
                  className="h-7 w-7 rounded-full"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              FeedTratto IA pode cometer erros. Considere verificar informações importantes.
            </p>
          </div>
        </div>
      ) : (
        // APÓS PRIMEIRA MENSAGEM - Layout normal
        <>
          {/* Área de mensagens */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto flex flex-col-reverse"
          >
            <div className="w-full max-w-4xl mx-auto px-4 pb-4 pt-8 flex flex-col-reverse gap-6">
              {loading && (
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-500">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-semibold">FeedTratto IA</p>
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.3s]" />
                      <div className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.15s]" />
                      <div className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce" />
                    </div>
                  </div>
                </div>
              )}

              {[...messages].reverse().map((msg, idx) => (
                <div key={idx} className={`flex gap-4 group ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className="flex-shrink-0">
                    {msg.role === "assistant" ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-500">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 overflow-hidden">
                    <p className={`text-sm font-semibold ${msg.role === "user" ? "text-right" : ""}`}>
                      {msg.role === "user" ? userName : "FeedTratto IA"}
                    </p>
                    
                    {/* Anexos */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className={`flex flex-wrap gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                        {msg.attachments.map((att, attIdx) => (
                          <div key={attIdx}>
                            {att.type === 'image' ? (
                              <img 
                                src={att.url} 
                                alt={att.name} 
                                className="max-w-[200px] max-h-[200px] rounded-lg border object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(att.url, '_blank')}
                              />
                            ) : att.type === 'pdf' ? (
                              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 min-w-[200px]">
                                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                  <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-red-900 dark:text-red-100 truncate">
                                    {att.name}
                                  </p>
                                  <p className="text-xs text-red-600 dark:text-red-400">
                                    Documento PDF
                                  </p>
                                </div>
                              </div>
                            ) : (
                              // Player de áudio estilo WhatsApp
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 min-w-[200px]">
                                <button className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
                                  <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"/>
                                  </svg>
                                </button>
                                <div className="flex-1 flex items-center gap-2">
                                  {/* Barra de progresso fictícia */}
                                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full w-0 bg-primary rounded-full"></div>
                                  </div>
                                  <span className="text-xs text-muted-foreground">0:00</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {msg.content && (
                      <div className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "text-right" : ""}`}>
                        {msg.content}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Input fixo embaixo */}
          <div 
            ref={dropZoneRef}
            className="bg-background relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Overlay de drag & drop */}
            {isDragging && (
              <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary z-50 flex items-center justify-center">
                <div className="text-center">
                  <Paperclip className="h-12 w-12 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-semibold text-primary">Solte os arquivos aqui</p>
                  <p className="text-xs text-muted-foreground">Imagens, PDF ou áudio</p>
                </div>
              </div>
            )}

            <div className="w-full max-w-4xl mx-auto px-4 py-3">
              {/* Preview de anexos */}
              {attachments.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="relative group">
                      {att.type === 'image' ? (
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden border bg-muted">
                          <img src={att.preview} alt={att.file.name} className="w-full h-full object-cover" />
                          <button
                            onClick={() => removeAttachment(idx)}
                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : att.type === 'pdf' ? (
                        <div className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 min-w-[160px]">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate text-red-900 dark:text-red-100">{att.file.name}</p>
                            <p className="text-xs text-red-600 dark:text-red-400">PDF</p>
                          </div>
                          <button
                            onClick={() => removeAttachment(idx)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        // Preview de áudio estilo WhatsApp (após mensagens)
                        <div className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-muted min-w-[180px]">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Volume2 className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 flex items-center gap-2">
                            <div className="flex-1 h-1 bg-muted-foreground/20 rounded-full"></div>
                            <span className="text-xs text-muted-foreground">Áudio</span>
                          </div>
                          <button
                            onClick={() => removeAttachment(idx)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf,audio/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {/* Botão de anexo dentro do input à esquerda */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 hover:text-foreground transition-colors disabled:opacity-50"
                  title="Anexar arquivo (imagem, PDF ou áudio)"
                >
                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                </button>

                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e: any) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pergunte alguma coisa ou arraste arquivos aqui"
                  disabled={loading}
                  rows={1}
                  className="min-h-[44px] max-h-32 w-full resize-none rounded-3xl bg-muted/50 border-0 pl-12 pr-24 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                
                {/* Botões à direita dentro do input */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleRecording}
                    className={`h-7 w-7 rounded-full ${isRecording ? 'bg-red-500 text-white hover:bg-red-600' : ''}`}
                    disabled={loading}
                    title={isRecording ? "Parar gravação" : "Gravar áudio"}
                  >
                    {isRecording ? (
                      <div className="h-3 w-3 rounded-sm bg-white animate-pulse" />
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    )}
                  </Button>
                  <Button
                    onClick={sendMessage}
                    disabled={loading || (!input.trim() && attachments.length === 0)}
                    size="icon"
                    className="h-7 w-7 rounded-full"
                  >
                    {loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-2">
                FeedTratto IA pode cometer erros. Considere verificar informações importantes.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
