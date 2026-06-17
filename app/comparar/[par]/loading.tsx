const CA = '#FF5E3A'
const CB = '#0CC0BE'
const WIDTHS = [72, 58, 80, 65, 75, 60]

export default function CompararParLoading() {
  return (
    <div className="min-h-screen sand-texture">
      <div className="sticky top-0 z-30 bg-aqua-light/90 backdrop-blur-sm border-b border-aqua/20 px-5 py-3">
        <div className="h-4 w-20 rounded-full bg-tinta/12 animate-pulse" />
      </div>

      <div className="max-w-2xl mx-auto px-5 py-8">
        <div className="flex flex-col gap-7">

          {/* Racket cards */}
          <div className="grid grid-cols-2 gap-3">
            {[CA, CB].map((color, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div
                  className="aspect-[800/1020] rounded-xl animate-pulse"
                  style={{ backgroundColor: `${color}18` }}
                />
                <div className="flex flex-col gap-1 px-0.5">
                  <div className="h-2.5 rounded-full bg-tinta/12 animate-pulse" style={{ width: '80%' }} />
                  <div className="h-2.5 rounded-full animate-pulse" style={{ width: '50%', backgroundColor: `${color}35` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Perfil / hexagon */}
          <div className="bg-white/60 rounded-2xl p-4">
            <div className="h-2.5 w-10 rounded-full bg-tinta/12 animate-pulse mb-3" />
            <div
              className="w-[160px] h-[160px] rounded-full mx-auto animate-pulse"
              style={{ backgroundColor: `${CB}14` }}
            />
          </div>

          {/* Pontuações */}
          <div className="flex flex-col gap-4">
            <div className="h-2.5 w-24 rounded-full bg-tinta/12 animate-pulse" />
            {WIDTHS.map((w, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-28 h-3 rounded-full bg-tinta/10 animate-pulse shrink-0 mt-0.5" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div
                    className="h-2.5 rounded-full animate-pulse"
                    style={{ width: `${w}%`, backgroundColor: `${CA}2A` }}
                  />
                  <div
                    className="h-2.5 rounded-full animate-pulse"
                    style={{ width: `${w - 12}%`, backgroundColor: `${CB}2A` }}
                  />
                </div>
                <div className="w-5 h-2.5 rounded-full bg-tinta/10 animate-pulse shrink-0 mt-0.5" />
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
