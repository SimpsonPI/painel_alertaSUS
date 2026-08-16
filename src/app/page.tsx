'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Regulacao {
  id: number
  chat_id?: number
  numero_reg?: string
  nome_paciente?: string
  data_nascimento?: string
  email?: string
  status_anterior?: string
  status?: string
}

export default function Home() {
  const [regulacoes, setRegulacoes] = useState<Regulacao[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  // ESTADOS DE BUSCA E FILTRO (PASSO 1)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'aprovado' | 'negado'>('todos')

  const buscarRegulacoes = async () => {
    try {
      const { data, error } = await supabase
        .from('AlertaSUS_2.0')
        .select('*')

      if (error) {
        console.error('Erro ao buscar dados no Supabase:', error)
      } else if (data) {
        setRegulacoes(data)
      }
    } catch (err) {
      console.error('Erro inesperado:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    buscarRegulacoes()

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'AlertaSUS_2.0' },
        () => {
          buscarRegulacoes()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleAlterarStatus = async (id: number, novoStatus: string) => {
    setUpdatingId(id)

    const { error } = await supabase
      .from('AlertaSUS_2.0')
      .update({ status_anterior: novoStatus })
      .eq('id', id)

    if (error) {
      alert('Erro ao atualizar status: ' + error.message)
    } else {
      await buscarRegulacoes()
    }

    setUpdatingId(null)
  }

  // CÁLCULO DAS MÉTRICAS
  const totalRegulacoes = regulacoes.length
  const totalAprovados = regulacoes.filter(
    (r) => (r.status_anterior || '').toLowerCase() === 'aprovado'
  ).length
  const totalPendentes = regulacoes.filter(
    (r) =>
      !r.status_anterior ||
      (r.status_anterior || '').toLowerCase() === 'pendente'
  ).length
  const totalNegados = regulacoes.filter(
    (r) => (r.status_anterior || '').toLowerCase() === 'negado'
  ).length

  // LÓGICA DE FILTRAGEM (PASSO 1)
  const regulacoesFiltradas = regulacoes.filter((reg) => {
    const termo = busca.toLowerCase()
    const nome = (reg.nome_paciente || '').toLowerCase()
    const numero = (reg.numero_reg || '').toLowerCase()
    const chatId = String(reg.chat_id || '').toLowerCase()

    const atendeBusca = nome.includes(termo) || numero.includes(termo) || chatId.includes(termo)

    const statusAtual = (reg.status_anterior || 'pendente').toLowerCase()
    const atendeStatus =
      filtroStatus === 'todos' ||
      (filtroStatus === 'pendente' && (statusAtual === 'pendente' || !reg.status_anterior)) ||
      statusAtual === filtroStatus

    return atendeBusca && atendeStatus
  })

  return (
    <main className="p-8 min-h-screen bg-slate-900 text-slate-100">
      {/* Cabeçalho */}
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-sky-400">AlertaSUS 2.0 — Painel Admin</h1>
          <p className="text-slate-400">Monitoramento e Gestão de Regulações FMS Teresina</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs text-slate-300 font-medium">Tempo Real Ativo</span>
        </div>
      </header>

      {/* CARDS DE MÉTRICAS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 shadow-md">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total de Regulações</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-100">{totalRegulacoes}</span>
            <span className="text-xs text-sky-400 font-medium bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/50">Registros</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 shadow-md">
          <p className="text-xs font-medium text-amber-400/90 uppercase tracking-wider">Pendentes</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-amber-400">{totalPendentes}</span>
            <span className="text-xs text-amber-400 font-medium bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">Aguardando</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 shadow-md">
          <p className="text-xs font-medium text-emerald-400/90 uppercase tracking-wider">Aprovados</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-emerald-400">{totalAprovados}</span>
            <span className="text-xs text-emerald-400 font-medium bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">Concluídos</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 shadow-md">
          <p className="text-xs font-medium text-rose-400/90 uppercase tracking-wider">Negados</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-rose-400">{totalNegados}</span>
            <span className="text-xs text-rose-400 font-medium bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/50">Recusados</span>
          </div>
        </div>
      </section>

      {/* BARRA DE BUSCA E FILTROS (PASSO 1) */}
      <section className="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700/60">
        <div className="w-full md:w-1/2">
          <input
            type="text"
            placeholder="Buscar por nome, nº regulação ou Chat ID..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFiltroStatus('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filtroStatus === 'todos'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Todos ({totalRegulacoes})
          </button>
          <button
            onClick={() => setFiltroStatus('pendente')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filtroStatus === 'pendente'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Pendentes ({totalPendentes})
          </button>
          <button
            onClick={() => setFiltroStatus('aprovado')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filtroStatus === 'aprovado'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Aprovados ({totalAprovados})
          </button>
          <button
            onClick={() => setFiltroStatus('negado')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filtroStatus === 'negado'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Negados ({totalNegados})
          </button>
        </div>
      </section>

      {/* LISTAGEM DOS CARDS FILTRADOS */}
      {loading ? (
        <p className="text-slate-400">Carregando dados do Supabase...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {regulacoesFiltradas.map((reg) => (
            <div key={reg.id} className="p-5 rounded-lg border border-slate-700 bg-slate-800 shadow flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-semibold text-sky-300">
                  {reg.nome_paciente || 'Paciente sem nome'}
                </h2>
                <p className="text-sm text-slate-300 mt-2">
                  <strong>Nº Regulação:</strong> {reg.numero_reg || 'N/A'}
                </p>
                <p className="text-sm text-slate-300">
                  <strong>Chat ID:</strong> {reg.chat_id || 'N/A'}
                </p>
                <div className="mt-3 p-2 rounded bg-slate-900 border border-slate-700 text-xs text-slate-300">
                  <strong>Status:</strong> <span className="text-sky-400 font-semibold">{reg.status_anterior || 'Pendente'}</span>
                </div>
              </div>

              {/* Botões de Ação Rápida */}
              <div className="mt-4 pt-3 border-t border-slate-700">
                <p className="text-xs text-slate-400 mb-2 font-medium">Alterar Status:</p>
                <div className="flex gap-2">
                  <button
                    disabled={updatingId === reg.id}
                    onClick={() => handleAlterarStatus(reg.id, 'Aprovado')}
                    className="flex-1 py-1 px-2 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded transition"
                  >
                    Aprovar
                  </button>
                  <button
                    disabled={updatingId === reg.id}
                    onClick={() => handleAlterarStatus(reg.id, 'Pendente')}
                    className="flex-1 py-1 px-2 text-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium rounded transition"
                  >
                    Pendente
                  </button>
                  <button
                    disabled={updatingId === reg.id}
                    onClick={() => handleAlterarStatus(reg.id, 'Negado')}
                    className="flex-1 py-1 px-2 text-xs bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-medium rounded transition"
                  >
                    Negar
                  </button>
                </div>
              </div>
            </div>
          ))}

          {regulacoesFiltradas.length === 0 && (
            <p className="text-slate-400 col-span-3">Nenhuma regulação encontrada para o filtro selecionado.</p>
          )}
        </div>
      )}
    </main>
  )
}