// Cookie "pista" de admin, legível por JS (não é prova de nada — só evita que
// visitantes comuns chamem /api/admin/me em toda página). A autorização real
// continua no servidor (auth() em cada rota/página admin).
//
// Setado em AdminTestToggle (layout do /admin, só renderiza com sessão válida).
// Limpo aqui mesmo quando /api/admin/me responde isAdmin=false (logout/expirou).

const COOKIE = 'turaquete_admin'
const MAX_AGE = 60 * 60 * 24 * 30

export function setAdminHint() {
  try { document.cookie = `${COOKIE}=1; path=/; max-age=${MAX_AGE}; samesite=lax` } catch { /* ignore */ }
}

function clearAdminHint() {
  try { document.cookie = `${COOKIE}=; path=/; max-age=0` } catch { /* ignore */ }
}

export function hasAdminHint(): boolean {
  try { return document.cookie.split(';').some(c => c.trim() === `${COOKIE}=1`) } catch { return false }
}

let inflight: Promise<boolean> | null = null

// Uma única chamada por carga de página, compartilhada entre PresenceTracker e
// HomeClient. Sem a pista, nem chega a bater no servidor.
export function fetchIsAdmin(): Promise<boolean> {
  if (!hasAdminHint()) return Promise.resolve(false)
  if (!inflight) {
    inflight = fetch('/api/admin/me')
      .then(r => r.json())
      .then((d: { isAdmin?: boolean }) => {
        const ok = d.isAdmin === true
        if (!ok) clearAdminHint()
        return ok
      })
      .catch(() => false)
  }
  return inflight
}
