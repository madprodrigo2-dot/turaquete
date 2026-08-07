const CHIPS = [
  'Sou iniciante',
  'Quero trocar minha raquete',
  'Tenho dor no braço',
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
          className="px-4 py-2 bg-white border border-aqua/35 text-tinta/70 text-sm rounded-full hover:bg-aqua/10 hover:border-aqua/55 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua focus-visible:ring-offset-1 transition-all"
        >
          {chip}
        </button>
      ))}
    </div>
  )
}
