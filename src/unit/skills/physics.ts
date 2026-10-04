/**
 * 单位移动/击飞所需的轻量物理/数学工具。
 */

export function clamp01(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * 抛物线归一化高度（0..1..0）：
 * p(t) = 4t(1-t), t in [0,1]
 */
export function parabolaArc(t: number): number {
  const s = clamp01(t);
  return 4 * s * (1 - s);
}

/**
 * 更平滑的水平插值（用于横向移动），比直线 t 更接近“加速/减速”观感。
 */
export function easeInOutQuad(t: number): number {
  const s = clamp01(t);
  return s < 0.5 ? 2 * s * s : 1 - Math.pow(-2 * s + 2, 2) / 2;
}

export function unitVector2(dx: number, dy: number): {
  nx: number;
  ny: number;
  dist: number;
} {
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1e-6) {
    return { nx: 0, ny: 0, dist };
  }
  return { nx: dx / dist, ny: dy / dist, dist };
}

