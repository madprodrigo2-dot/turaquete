const CHIPS = [
  'Sou iniciante',
  'Tenho dor no cotovelo',
  'Quero mais potência',
  'Venho do tênis',
  'Jogo mais na defesa',
]

interface Props {
  onSelect: (text: string) => void
}

export default function StartChips({ onSelect }: Props) {
  return (
    <div className="px-4 pb-3 flex flex-wrap gap-2 justify-center">
      {CHIPS.map(chip => (
        <button
          key={chip}
          onClick={() => onSelect(chip)}
          className="px-4 py-2 bg-white border border-emerald-200 text-emerald-700 text-sm rounded-full hover:bg-emerald-50 active:scale-95 transition-all"
        >
          {chip}
        </button>
      ))}
    </div>
  )
}
