/**
 * 每秒回复探针 v2：**只测速率**（一次性，验完即删）。
 *
 * ## v1 已经回答的（2026-10-06）
 *
 * ```
 * 起始：      生命回复=1.350  魔法回复=0.850
 * A 加能力：  生命回复=3.350  魔法回复=1.280   (+2.00 / +0.43)
 * B 拿物品：  生命回复=5.350  魔法回复=1.710   (+2.00 / +0.43)
 * C 写 100：  血 1500 → 1685 / 3 秒（期望 300）
 * ```
 *
 *   - **读法没问题**：`DzGetUnitLifeRegen` 读的是**总回复**，物品 / 能力加的
 *     都算在同一个字段里、**累加**上去（`+2.00` 正是 `Arel` 的 DataA）。
 *     用户看到「拿石头不变」是**面板**的锅 —— 有属性表的单位走
 *     `StatSheet.getFinal()`，而 `base[HP_REGEN]` 是建表时快照一次、之后永不回读。
 *   - **写回真的在回血**：方向没问题。
 *   - 附带发现：`UnitRemoveAbility` 摘掉能力后读数**当场不变**，要等引擎下次重算
 *     才扣掉（v1 的 3 秒窗口里正好掉了 2.00 / 0.43）。
 *
 * ## v2 要问的那一件事
 *
 * **速率对不上**：写 100/秒、观察 3 秒，血只涨了 184.6（期望 300，比值 0.62）。
 * 两种可能，做法完全不同：
 *
 *   1. **启动延迟** —— 写进去之后引擎要过一拍才开始按新速率回血。那么窗口越长比值
 *      越接近 1，长窗口下速率是准的，只是「刚写完那一瞬间不准」。
 *   2. **粒度 / 缩放** —— 引擎按固定节拍结算，或者单位不是「每秒」而是别的口径。
 *      那么比值会稳定停在某个数上，写 100 实际只给 62/秒，**必须写进 `StatSheet`
 *      的注释里**，面板上的数字才不是撒谎。
 *
 * 区分办法就是**每秒采样一次**，把 6 秒的增量逐条列出来：
 *
 *   - 增量前小后均匀（比如 0 / 100 / 100 / 100 / 100 / 100）⟹ 第 1 种，启动延迟。
 *   - 增量稳定但都偏小（比如 62 / 62 / 62 / …）⟹ 第 2 种，有缩放因子。
 *   - 增量是 0 / 0 / 100 / 0 / 0 / 100 ⟹ 引擎按秒跳变结算。
 *
 * ## 为什么这次不拿物品、不挂能力
 *
 * v1 那些操作会**残留**：物品留在背包里、能力摘除的扣减还延迟挂着。带着这些
 * 背景噪音测出来的 184.6 分不清是谁贡献的。这一段要的是**干净的单变量**。
 *
 * 血打半血用 `SetUnitState(LIFE)` —— `LIFE` 不在 `StatSheet.writeNative` 的清单里
 * （见那边的 ⚠️），属性系统的冲刷拍不会把它改回去。
 */

import { MapPlayer, Timer } from "@eiriksgata/wc3ts/*";
import { Actor } from "src/system/actor";
import {
  UNIT_STATE_LIFE,
  UNIT_STATE_MAX_LIFE,
  UNIT_TYPE_HERO,
} from "src/constants/game/units";
import { createLogger } from "src/utils/logger";

const log = createLogger("RegenProbe");

/** 写入的回复速率（血/秒） */
const TEST_REGEN = 100;
/** 逐秒采样几条 */
const SAMPLES = 6;

/** 挑一个本地玩家的英雄。挑不到返回 `undefined` */
function pickHero(): unit | undefined {
  const localId = MapPlayer.fromLocal().id;
  const keys = Object.keys(Actor.allActors);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (key === undefined) {
      continue;
    }
    const actor = Actor.allActors[Number(key)];
    if (actor === undefined) {
      continue;
    }
    const u = actor.handle;
    // 悬垂句柄守卫：`allActors` 里留着已死 / 已移除的单位
    if (u === undefined || GetUnitTypeId(u) === 0) {
      continue;
    }
    if (!IsUnitType(u, UNIT_TYPE_HERO)) {
      continue;
    }
    if (!actor.owner || actor.owner.id !== localId) {
      continue;
    }
    return u;
  }

  return undefined;
}

/**
 * 探针入口。在 `main.ts` 的 debug 分支里调用，排在攻速探针之后。
 */
export function regenProbe(): void {
  const u = pickHero();
  if (u === undefined) {
    log.warn("=== 每秒回复速率探针：跳过（挑不到本地玩家的英雄）===");
    return;
  }

  const oldRegen = DzGetUnitLifeRegen(u);
  const maxLife = GetUnitState(u, UNIT_STATE_MAX_LIFE);
  const startLife = maxLife * 0.5;
  SetUnitState(u, UNIT_STATE_LIFE, startLife);

  log.info(`=== 每秒回复速率探针开始：句柄 ${GetHandleId(u)} ===`);
  log.info(
    `  原生回复基线=${oldRegen.toFixed(3)}，血打到 ${startLife.toFixed(0)}/${maxLife.toFixed(0)}`
  );

  const ok = DzSetUnitLifeRegen(u, TEST_REGEN);
  log.info(`  写入 DzSetUnitLifeRegen(${TEST_REGEN}) 返回 ${ok}，读数=${DzGetUnitLifeRegen(u).toFixed(3)}`);

  // 逐秒采样。每次开一个一次性定时器，避免去碰 Timer 的「停止重复定时器」接口
  // （那是另一个待验证的 API，不该混进这个探针的变量里）。
  //
  // `prev` 在闭包里累加 —— 每秒只报**增量**，那才是速率的直接证据。
  let prev = startLife;
  for (let i = 1; i <= SAMPLES; i++) {
    const second = i;
    Timer.create().start(second, false, () => {
      try {
        if (GetUnitTypeId(u) === 0) {
          log.warn(`  [${second}s] 目标已不存在，探针提前结束`);
          return;
        }
        const life = GetUnitState(u, UNIT_STATE_LIFE);
        const delta = life - prev;
        prev = life;
        log.info(
          `  [${second}s] 血=${life.toFixed(1)}  本秒增量=${delta.toFixed(1)}` +
            `  读数=${DzGetUnitLifeRegen(u).toFixed(3)}`
        );

        // 最后一条：还原回复，并给一句总评
        if (second === SAMPLES) {
          const total = life - startLife;
          const avg = total / SAMPLES;
          log.info(
            `  总计 ${SAMPLES} 秒涨 ${total.toFixed(1)}，平均 ${avg.toFixed(1)}/秒` +
              `（写了 ${TEST_REGEN}）`
          );
          DzSetUnitLifeRegen(u, oldRegen);
          log.info(`  已还原回复为 ${oldRegen.toFixed(3)}`);
          log.info("=== 每秒回复速率探针结束 ===");
        }
      } catch (e) {
        log.error(`  [${second}s] 采样抛出异常：${e}`);
      }
    });
  }
}
