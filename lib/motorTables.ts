export type FaceGrade =
  | 'VIDRO' | 'HYBRID_VIDRO' | 'KEVLAR_PURE' | 'KEVLAR_CARBON'
  | 'CARBON_3K' | 'CARBON_3K_METAL' | 'CARBON_6K' | 'CARBON_6K_15K' | 'CARBON_24K' | 'CARBON_18K'

export type CoreClass = 'SUPERSOFT' | 'SOFT' | 'MEDIUM' | 'HARD'

export const FACE_POWER: Record<FaceGrade, number> = {
  VIDRO: 4, HYBRID_VIDRO: 4,
  KEVLAR_PURE: 5, CARBON_3K: 5,
  KEVLAR_CARBON: 6, CARBON_3K_METAL: 6, CARBON_6K: 6,
  CARBON_6K_15K: 7,
  CARBON_24K: 8, CARBON_18K: 8,
}

export const CORE_POWER: Record<CoreClass, number> = { SUPERSOFT: -1, SOFT: -1, MEDIUM: 0, HARD: +1 }

export const CORE_CTRL: Record<CoreClass, number> = { SUPERSOFT: +2, SOFT: +1, MEDIUM: 0, HARD: -1 }
export const FACE_CTRL: Partial<Record<FaceGrade, number>> = {
  CARBON_3K: +1,
  VIDRO: +1, HYBRID_VIDRO: +1, KEVLAR_PURE: +1, KEVLAR_CARBON: +1,
  // 6K/12K/15K/16K/18K/24K/METAL: 0 (rígidos → potência, não controle)
}

export const FACE_STAB: Partial<Record<FaceGrade, number>> = {
  VIDRO: -1, HYBRID_VIDRO: -1,
  KEVLAR_PURE: -1, KEVLAR_CARBON: 0,
  CARBON_3K: 0, CARBON_3K_METAL: 1,
  CARBON_6K: 1, CARBON_6K_15K: 1,
  CARBON_18K: 1, CARBON_24K: 1,
}

// VIDRO +2 (era +3): fibra de vidro é forgiving mas não ao ponto de dominar o ranking de iniciante
// HYBRID_VIDRO +1 (era +2): mantém gradiente abaixo do vidro puro
export const FACE_FORG: Record<FaceGrade, number> = {
  VIDRO: +2, HYBRID_VIDRO: +1, KEVLAR_PURE: +1, KEVLAR_CARBON: 0,
  CARBON_3K: 0, CARBON_3K_METAL: 0, CARBON_6K: 0, CARBON_6K_15K: 0,
  CARBON_24K: -1, CARBON_18K: -1,
}
export const CORE_FORG: Record<CoreClass, number> = { SUPERSOFT: +2, SOFT: +1, MEDIUM: 0, HARD: -1 }

export const CORE_COMFORT: Record<CoreClass, number> = { SUPERSOFT: +1, SOFT: +1, MEDIUM: 0, HARD: -2 }
export const FACE_COMFORT: Partial<Record<FaceGrade, number>> = {
  VIDRO: +1, HYBRID_VIDRO: +1, KEVLAR_PURE: +1, KEVLAR_CARBON: +1,
  CARBON_6K_15K: -1, CARBON_18K: -1, CARBON_24K: -1,
}
