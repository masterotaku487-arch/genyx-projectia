'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Plus, MessageSquare, Trash2, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

// ============================================================================
// CONFIGURAÇÃO - SEU HUGGING FACE SPACE
// ============================================================================

const API_ENDPOINT = 'https://masterotakutt-genyx-brain.hf.space/v1/chat/completions'

// ============================================================================
// TIPOS
// ============================================================================

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function GenyxAI() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([
    { id: '1', title: 'Nova Conversa', messages: [], createdAt: new Date() }
  ])
  const [currentSessionId, setCurrentSessionId] = useState('1')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // ============================================================================
  // CHAMADA À API
  // ============================================================================

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return

    setError(null)

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newUserMessage])
    setInput('')
    setIsLoading(true)

    try {
      const apiMessages = [
        {
          role: 'system',
          content: 'Você é GENYX AI, uma assistente inteligente, prestativa e profissional.'
        },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage }
      ]

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_HF_TOKEN || ''}`
        },
        body: JSON.stringify({
          model: 'Qwen/Qwen2.5-7B-Instruct',
          messages: apiMessages,
          max_tokens: 2000,
          temperature: 0.7,
          stream: false
        })
      })

      if (!response.ok) {
        throw new Error(`API retornou ${response.status}`)
      }

      const data = await response.json()
      const aiResponse = data.choices?.[0]?.message?.content || 
                        'Desculpe, não consegui gerar uma resposta.'

      const newAIMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, newAIMessage])

      if (messages.length === 0) {
        const sessionTitle = userMessage.slice(0, 30) + (userMessage.length > 30 ? '...' : '')
        setSessions(prev => prev.map(s => 
          s.id === currentSessionId ? { ...s, title: sessionTitle } : s
        ))
      }

    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ **Erro ao conectar**\n\n${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      setError('Erro na comunicação')
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const createNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'Nova Conversa',
      messages: [],
      createdAt: new Date()
    }
    setSessions(prev => [newSession, ...prev])
    setCurrentSessionId(newSession.id)
    setMessages([])
    setError(null)
  }

  const deleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (sessions.length <= 1) return
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    if (currentSessionId === sessionId) {
      const remaining = sessions.filter(s => s.id !== sessionId)
      setCurrentSessionId(remaining[0].id)
      setMessages(remaining[0].messages)
    }
  }

  // ============================================================================
  // COMPONENTE DE MENSAGEM
  // ============================================================================

  const MessageBubble = ({ message }: { message: Message }) => {
    const isUser = message.role === 'user'

    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`}>
        <div
          className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30'
              : 'bg-gray-800 text-gray-100 border border-gray-700'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              isUser ? 'bg-blue-700' : 'bg-gradient-to-r from-cyan-500 to-blue-500'
            }`}>
              {isUser ? '👤' : '🧠'}
            </div>
            <span className="text-xs font-semibold opacity-80">
              {isUser ? 'Você' : 'GENYX AI'}
            </span>
          </div>

          <div className="prose prose-invert max-w-none">
            <ReactMarkdown
              components={{
                code(props: any) {
                  const { inline, className, children, ...rest } = props
                  const match = /language-(\w+)/.exec(className || '')
                  return !inline && match ? (
                    <SyntaxHighlighter
                      {...rest}
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      className="rounded-lg text-sm"
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code {...rest} className="bg-gray-900 px-1.5 py-0.5 rounded text-sm">
                      {children}
                    </code>
                  )
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          <div className="text-xs opacity-50 mt-2">
            {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    )
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="flex h-screen bg-black text-gray-100 overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-gray-950 border-r border-gray-800 flex flex-col transition-all duration-300 overflow-hidden`}>
        <div className="p-4 border-b border-gray-800">
          <button
            onClick={createNewChat}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg px-4 py-3 font-semibold transition-all shadow-lg shadow-blue-500/30"
          >
            <Plus size={20} />
            Nova Conversa
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sessions.map(session => (
            <div
              key={session.id}
              className={`group relative px-3 py-2 rounded-lg transition-all cursor-pointer ${
                currentSessionId === session.id ? 'bg-blue-600/20 border border-blue-500/50' : 'hover:bg-gray-800'
              }`}
              onClick={() => {
                setCurrentSessionId(session.id)
                setMessages(session.messages)
              }}
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={16} />
                <span className="text-sm truncate flex-1">{session.title}</span>
                {sessions.length > 1 && (
                  <button
                    onClick={(e) => deleteSession(session.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded"
                  >
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-800 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Sparkles size={14} />
            <span>GENYX Brain v2.0</span>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col">
        
        {/* Header */}
        <header className="h-16 bg-gradient-to-r from-gray-950 to-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-800 rounded-lg">
              <MessageSquare size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                GENYX AI
              </h1>
              <p className="text-xs text-gray-500">Intelligent Assistant</p>
            </div>
          </div>

          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
            error ? 'bg-red-500/20 border border-red-500/50' : 'bg-green-500/20 border border-green-500/50'
          }`}>
            <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></div>
            <span className="text-xs">{error ? 'Offline' : 'Online'}</span>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-black to-gray-950">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/50">
                  <Sparkles size={48} className="text-white" />
                </div>
                <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  Olá! Sou GENYX AI
                </h2>
                <p className="text-gray-400 mb-8">Como posso ajudar você hoje?</p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {messages.map(message => (
                <MessageBubble key={message.id} message={message} />
              ))}
              
              {isLoading && (
                <div className="flex justify-start mb-4">
                  <div className="bg-gray-800 border border-gray-700 rounded-2xl px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <span className="ml-2 text-sm text-gray-400">Pensando...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <footer className="bg-gray-950 border-t border-gray-800 p-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="flex items-end gap-3">
              <button type="button" className="p-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-all">
                <Paperclip size={20} />
              </button>

              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua mensagem..."
                rows={1}
                className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-32"
                disabled={isLoading}
              />

              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={`p-3 rounded-xl transition-all ${
                  input.trim() && !isLoading
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg shadow-blue-500/50'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Send size={20} />
              </button>
            </form>
            
            <p className="text-xs text-gray-600 text-center mt-3">
              GENYX AI pode cometer erros. Verifique informações importantes.
            </p>
          </div>
        </footer>
      </main>
    </div>
  )
}
