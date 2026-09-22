'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Check, X, ArrowRight, ArrowLeft, ArrowCounterClockwise } from '@phosphor-icons/react'
import { PUZZLES, type Puzzle } from './puzzles'
import CourtDiagram from './CourtDiagram'

const CORRECT_REACTIONS = [
  'Boa escolha!',
  'Isso aí, leitura certa.',
  'Mandou bem, era essa mesma.',
  'Exato, é assim que se joga.',
]
const INCORRECT_REACTIONS = [
  'Quase, mas não era essa.',
  'Essa é pegadinha comum, na próxima você pega.',
  'Não dessa vez, mas o raciocínio tá no caminho.',
  'Foi por pouco, olha a explicação.',
]

function PuzzleCard({
  puzzle,
  index,
  total,
  score,
  onAnswer,
  onNext,
}: {
  puzzle: Puzzle
  index: number
  total: number
  score: number
  onAnswer: (correct: boolean) => void
  onNext: () => void
}) {
  const [selected, setSelected] = useState<'A' | 'B' | 'C' | null>(null)
  const answered = selected !== null
  const isCorrect = selected === puzzle.correta
  const selectedOption = puzzle.opcoes.find(o => o.id === selected)
  const reaction = isCorrect
    ? CORRECT_REACTIONS[index % CORRECT_REACTIONS.length]
    : INCORRECT_REACTIONS[index % INCORRECT_REACTIONS.length]

  function handleSelect(id: 'A' | 'B' | 'C') {
    if (answered) return
    setSelected(id)
    onAnswer(id === puzzle.correta)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-tinta/40">
            Tática {index + 1} de {total}
          </p>
          <p className="font-mono text-[10px] font-semibold text-aqua">{score} acertos</p>
        </div>
        <div className="h-1.5 w-full rounded-full bg-tinta/8 overflow-hidden">
          <div
            className="h-full rounded-full bg-aqua transition-[width] duration-300 ease-out"
            style={{ width: `${(index / total) * 100}%` }}
          />
        </div>
        <p className="font-heading font-bold text-tinta text-lg mt-1">{puzzle.titulo}</p>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-card border border-[rgba(14,58,64,0.06)]">
        <div className="max-w-[260px] mx-auto">
          <CourtDiagram
            players={puzzle.players}
            ball={puzzle.ball}
            highlightPlayerIds={answered ? puzzle.resultado.highlightPlayerIds : undefined}
            arrows={answered ? puzzle.resultado.arrows : undefined}
          />
        </div>
      </div>

      <p className="text-tinta/70 text-sm leading-relaxed">{puzzle.situacao}</p>

      <div className="flex flex-col gap-2.5">
        {puzzle.opcoes.map(opt => {
          const isSelected = selected === opt.id
          const isRightAnswer = opt.id === puzzle.correta
          let stateClasses = 'bg-white border-tinta/10 hover:border-aqua/40'
          if (answered && isRightAnswer) stateClasses = 'bg-aqua/10 border-aqua'
          else if (answered && isSelected && !isRightAnswer) stateClasses = 'bg-coral/10 border-coral'
          else if (answered) stateClasses = 'bg-white border-tinta/10 opacity-60'

          return (
            <button
              key={opt.id}
              disabled={answered}
              onClick={() => handleSelect(opt.id)}
              className={`text-left rounded-2xl border-2 px-4 py-3 flex items-start gap-3 transition-colors disabled:cursor-default ${stateClasses}`}
            >
              <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                answered && isRightAnswer ? 'bg-aqua text-white'
                : answered && isSelected ? 'bg-coral text-white'
                : 'bg-tinta/8 text-tinta/60'
              }`}>
                {answered && isRightAnswer ? <Check size={14} weight="bold" /> : answered && isSelected ? <X size={14} weight="bold" /> : opt.id}
              </span>
              <span className="text-sm text-tinta leading-snug pt-0.5">{opt.texto}</span>
            </button>
          )
        })}
      </div>

      {answered && (
        <div className={`rounded-2xl p-4 border ${isCorrect ? 'bg-aqua/10 border-aqua/30' : 'bg-coral/10 border-coral/30'}`}>
          <div className="flex items-start gap-2 mb-3">
            <Image
              src="/tury-explicando.png"
              alt="Tury"
              width={80}
              height={100}
              className="h-9 w-auto object-contain shrink-0"
            />
            <div className="min-w-0 bg-white border border-aqua/25 rounded-xl rounded-bl-sm px-3 py-1.5 shadow-sm">
              <p className="text-[12px] font-semibold text-tinta leading-snug">{reaction}</p>
            </div>
          </div>
          {!isCorrect && selectedOption?.porqueErrada && (
            <div className="mb-3 pb-3 border-b border-coral/20">
              <p className="font-heading font-bold text-coral text-sm mb-1">Por que essa não é a melhor escolha</p>
              <p className="text-tinta/70 text-sm leading-relaxed">{selectedOption.porqueErrada}</p>
            </div>
          )}
          <p className={`font-heading font-bold text-sm mb-1.5 ${isCorrect ? 'text-aqua' : 'text-coral'}`}>
            {isCorrect ? 'Resposta certa.' : `A certa era a ${puzzle.correta}.`}
          </p>
          <p className="text-tinta/70 text-sm leading-relaxed">{puzzle.explicacao}</p>
        </div>
      )}

      {answered && (
        <button
          onClick={onNext}
          className="w-full bg-coral text-white font-semibold text-base py-3.5 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2"
        >
          {index < total - 1 ? 'Próxima tática' : 'Ver resultado final'}
          <ArrowRight size={18} weight="bold" />
        </button>
      )}
    </div>
  )
}

function SummaryScreen({ score, total, onRestart }: { score: number; total: number; onRestart: () => void }) {
  const pct = Math.round((score / total) * 100)
  const message =
    pct >= 85 ? 'Leitura de jogo afiada, você manja mesmo de tática.'
    : pct >= 60 ? 'Boa base tática, com uns pontos pra afinar.'
    : 'Bom começo, vale revisar as táticas com calma e tentar de novo.'

  return (
    <div className="flex flex-col gap-5 items-center text-center">
      <Image
        src="/tury-explicando.png"
        alt="Tury"
        width={80}
        height={100}
        className="h-20 w-auto object-contain"
      />
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-tinta/40">Resultado final</p>
        <p className="font-heading font-extrabold text-tinta text-3xl mt-1">Você acertou {score} de {total}</p>
        <p className="text-tinta/60 text-sm mt-2 max-w-xs">{message}</p>
      </div>
      <button
        onClick={onRestart}
        className="bg-coral text-white font-semibold text-base py-3.5 px-6 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2"
      >
        <ArrowCounterClockwise size={18} weight="bold" />
        Recomeçar
      </button>
    </div>
  )
}

export default function TaticaClient() {
  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const [runId, setRunId] = useState(0)
  const puzzle = PUZZLES[current]

  function handleNext() {
    if (current < PUZZLES.length - 1) {
      setCurrent(c => c + 1)
    } else {
      setFinished(true)
    }
  }

  function handleRestart() {
    setCurrent(0)
    setScore(0)
    setFinished(false)
    setRunId(r => r + 1)
  }

  return (
    <div className="min-h-screen sand-texture">
      <div className="sticky top-0 z-30 bg-[#FBF6EF]/90 backdrop-blur-sm border-b border-[rgba(14,58,64,0.06)]">
        <div className="max-w-sm md:max-w-4xl mx-auto px-5 md:px-8 py-3 flex items-center gap-2">
          <ArrowLeft size={16} weight="regular" className="text-tinta" aria-hidden="true" />
          <Link href="/" className="text-tinta text-sm font-medium hover:text-aqua transition-colors">Início</Link>
          <span className="text-tinta/30 text-sm">·</span>
          <span className="text-tinta/50 text-sm">Táticas (protótipo)</span>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-5 py-8">
        {finished ? (
          <SummaryScreen score={score} total={PUZZLES.length} onRestart={handleRestart} />
        ) : (
          <PuzzleCard
            key={`${runId}-${puzzle.slug}`}
            puzzle={puzzle}
            index={current}
            total={PUZZLES.length}
            score={score}
            onAnswer={correct => setScore(s => (correct ? s + 1 : s))}
            onNext={handleNext}
          />
        )}
      </div>
    </div>
  )
}
