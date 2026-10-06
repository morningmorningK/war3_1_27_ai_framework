/**
 * 攻速写回探针（**一次性**，验完即删）。
 *
 * ## 它要推翻/证实什么
 *
 * 之前 `StatSheet` / `types.ts` 里都写着「攻速读得到、**写不回去**」，依据是
 * 「KKWE 的 Dz / EX 两套 API 里没有任何设置单位攻速的接口」。**那个依据是错的**
 * —— 漏查了 `ConvertUnitState` 这一套：
 *
 *   - `ydwe/define.txt:791-796` 起是一批 `unitstate` / `unitstatesec` 预设，
 *     取值来自 `japi/define.txt` 的 `[TriggerParams]`；
 *   - 其中 `UnitStateAttackSpeed` / `...Sec` = `ConvertUnitState(0x51)`，
 *     名字就叫「攻击速度 [JAPI]」；
 *   - `ydwe/action.txt:3756` 的动作 `[SetUnitState]`（「设置单位属性 [R]」）
 *     参数类型是 `unitstatesec` —— **它生成的 JASS 就是**
 *     `call SetUnitState(u, ConvertUnitState(0x51), v)`。
 *
 * 写回通道用的是**标准函数名** `SetUnitState`，JAPI 把它的槽位表扩展到了 0x51
 * 这些额外索引上。常量一直都在（`constants/game/units.ts`），只是我们以为它只能读。
 *
 * ## 但它仍然只是「很可能能写」，不是「已经能写」
 *
 * 触发器编辑器里能选，说明 KKWE 的作者认为它能用 —— 不等于运行时一定生效。
 * 所以先跑探针，**不要**直接去接 `StatSheet.writeNative`：通道没打通的话，
 * 表现是「面板上的攻速涨了、实际出手频率没变」，也就是面板撒谎，比不显示更糟。
 *
 * ## 已确认（2026-10-06 第一轮）
 *
 * | 单位 | `0x51` | `0x25` |
 * |---|---|---|
 * | 步兵 `hfoo`（6 个读数全同） | **1.000** | 1.350 |
 * | 圣骑士 `Hpal` | **1.260** | 2.200 |
 *
 * 步兵攻击间隔 1.350s ⇒ 若 `0x51` 是「次/秒」应读 0.74，实测却是 **1.000 整**
 * —— 那是「没有任何加速」的出厂倍率。圣骑士 `1 + 13 × 0.02 = 1.260`
 * （初始敏捷 13，每点敏捷 +2% 攻速）也对得上。
 *
 * **结论：`0x51` = 攻速倍率（1.0 = 100%），`0x25` = 基础攻击间隔（秒，静态）。**
 * 实际频率 = `0x51 / 0x25`。此前 `constants/game/units.ts` 注释里写的
 * 「每秒攻击次数」是错的。
 *
 * 写入通道也确认可用：写 `2.520` 读回 `2.520`，撑过 6 秒没被冲，还原也成功，
 * 游戏里出手肉眼可见变快。
 *
 * ## 还没确认的那一条（本轮要问的）
 *
 * `0x51` 既然是**倍率**，它多半是引擎在属性重算时**自己会写**的字段。那么英雄
 * 一升级、一加敏捷，引擎就可能把它重算回 `1 + 敏捷 × 0.02` —— **我们的写回被冲掉**。
 * 而 `StatSheet.flush()` 只在 `final !== lastSynced` 时才写，被冲掉之后**不会补写**，
 * 表现是「攻速 buff 生效几秒后无声失效」。
 *
 * 所以第三段扰动一次敏捷（`SetHeroAgi`，非永久），看写进去的值会不会被引擎接管。
 * 这一条直接决定 `ATTACK_SPEED` 能不能安全接进 `StatSheet`。
 *
 * ## 三段
 *
 *   - **第一段（只读）**：扫场上每个单位的 `0x51` / `0x25`，英雄多打一列敏捷。
 *   - **第二段（写一次）**：挑一个 `0x51` 读数 > 0 的单位，写 `读数 ×2`，
 *     写完立刻读、6 秒后再读。
 *   - **第三段（只对英雄）**：敏捷 +10 → 读 `0x51` → 还原敏捷。
 *
 * 第二段只在第一段挑得出人时才跑。**挑不出就不写** —— 基线读数 0 的单位既没法算
 * `×2`，还原成 0 还可能让它彻底不能攻击，宁可什么都不做。
 *
 * ⚠️ 探针**不看动画**（这只有你能看）：跑完那 6 秒里盯一眼被测单位。
 * 攻速真的翻倍的话，出手动画会明显变快 —— 第一轮就是靠这个佐证的倍率语义。
 */

import { MapPlayer, Timer } from "@eiriksgata/wc3ts/*";
import { Actor } from "src/system/actor";
import {
  UNIT_STATE_ATTACK_SPACE,
  UNIT_STATE_ATTACK_SPEED,
  UNIT_TYPE_HERO,
  UNIT_TYPE_STRUCTURE,
} from "src/constants/game/units";
import { createLogger } from "src/utils/logger";

const log = createLogger("AtkSpdProbe");

/** 写回后的观察时长（秒） */
const OBSERVE_SECONDS = 6;

/** 第一段最多打几行。场上单位多，打全了会把日志淹掉 */
const SWEEP_LIMIT = 12;

/**
 * 一个还活着的单位 + 它的 `Actor`（可能没有 —— 场上存在不在 `allActors` 里的单位）。
 * 只有确实要写的时候才需要 `Actor`，第一段扫描用不上。
 */
interface Target {
  readonly u: unit;
  readonly ownerId: number;
  /** 是不是英雄。只有英雄能跑第三段的敏捷扰动 */
  readonly isHero: boolean;
}

/** 悬垂句柄守卫：`allActors` 里留着已死 / 已移除的单位，拿它读原生会访问违例 */
function alive(u: unit | undefined): u is unit {
  return u !== undefined && GetUnitTypeId(u) !== 0;
}

/** 一次读数，两个量一起读，理由见文件头那张表 */
function readBoth(u: unit): string {
  return [
    `0x51=${GetUnitState(u, UNIT_STATE_ATTACK_SPEED).toFixed(3)}`,
    ` 0x25=${GetUnitState(u, UNIT_STATE_ATTACK_SPACE).toFixed(3)}`,
  ].join("");
}

/** 第一段：只读扫描，把场上每个单位的两个读数打出来。顺带把候选挑出来 */
function sweep(): Target | undefined {
  const localId = MapPlayer.fromLocal().id;
  const keys = Object.keys(Actor.allActors);

  log.info(`--- 只读扫描（本地玩家 id=${localId}，最多 ${SWEEP_LIMIT} 行）---`);

  let printed = 0;
  let best: Target | undefined = undefined;

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
    if (!alive(u)) {
      continue;
    }

    const ownerId = actor.owner ? actor.owner.id : -1;
    const speed = GetUnitState(u, UNIT_STATE_ATTACK_SPEED);
    const isHero = IsUnitType(u, UNIT_TYPE_HERO);

    if (printed < SWEEP_LIMIT) {
      // 英雄多打一列敏捷，并把「倍率 = 1 + 敏捷×0.02」这条**猜测**当场算出来对照。
      // 这一步只读，零风险，却是本轮唯一能独立验证倍率语义的旁证。
      const agiPart = isHero
        ? ` 敏捷=${GetHeroAgi(u, false)} 1+敏捷*0.02=${(1 + GetHeroAgi(u, false) * 0.02).toFixed(3)}`
        : "";
      log.info(
        [
          `  [${printed}] 句柄 ${GetHandleId(u)}`,
          ` 类型 ${GetUnitTypeId(u)}`,
          ` 归属 ${ownerId}`,
          actor.hasStatSheet() ? " 有表" : " 无表",
          " ",
          readBoth(u),
          agiPart,
        ].join("")
      );
      printed++;
    }

    // 候选：自己的、`0x51` 读得出正数、非建筑。**英雄优先** —— 第三段的敏捷扰动
    // 只有英雄做得了，而且前两轮的读数都落在英雄身上，挑同一个才好在两轮之间对比。
    // 同档次里**先出现的就定下**，不挑「最好」的：挑来挑去会让下一次跑的结论没法比。
    const eligible =
      ownerId === localId && speed > 0 && !IsUnitType(u, UNIT_TYPE_STRUCTURE);
    if (eligible && (best === undefined || (isHero && !best.isHero))) {
      best = { u, ownerId, isHero };
    }
  }

  if (printed === 0) {
    log.warn("  场上一个活着的单位都没有 —— 探针排在 2.0s 是不是太早了？");
  }
  return best;
}

/**
 * 探针入口。在 `main.ts` 的 debug 分支里调用，**晚于属性面板自测**（2.0s）。
 */
export function attackSpeedProbe(): void {
  log.info("=== 攻速写回探针开始 ===");

  const target = sweep();
  if (target === undefined) {
    log.warn(
      "=== 第一段结束：挑不出「本地玩家 + 非建筑 + 0x51 读数 > 0」的单位，" +
        "第二段（写入）不跑 ===\n" +
        "  ⟹ 上面那几行的 0x51 列说明 `0x51` 这个槽位到底能不能读。" +
        "全 0 的话，读法本身就不可用，得换个思路（比如改用 `0x25` 攻击间隔）。"
    );
    return;
  }

  const u = target.u;
  const before = GetUnitState(u, UNIT_STATE_ATTACK_SPEED);
  const writeTarget = before * 2;

  log.info(`--- 第二段：句柄 ${GetHandleId(u)}，写入 ${writeTarget.toFixed(3)}（基线 ×2）---`);
  log.info(`  写入前：${readBoth(u)}`);

  try {
    SetUnitState(u, UNIT_STATE_ATTACK_SPEED, writeTarget);
  } catch (e) {
    log.error(`  写入抛出异常：${e}`);
    return;
  }

  log.info(`  写完立刻：${readBoth(u)}`);
  log.info("  ⚠️ 接下来 6 秒盯一眼这个单位的出手动画 —— 真的翻倍了吗？");

  Timer.create().start(OBSERVE_SECONDS, false, () => {
    try {
      if (!alive(u)) {
        log.warn("  目标已不存在，探针提前结束，原值未还原");
        return;
      }
      log.info(`  ${OBSERVE_SECONDS} 秒后：${readBoth(u)}`);

      // ---- 第三段：敏捷扰动（只有英雄做得了）----
      //
      // 目的是回答「写进 `0x51` 的值会不会被引擎接管」。做法是改动一个**引擎自己
      // 会拿来回算攻速的输入**（敏捷），再看 `0x51`：
      //
      //   - 若 `0x51` 跳成了 `1 + (敏捷+10) × 0.02` ⟹ 引擎重算时**直接覆盖**，
      //     我们的写回对英雄不持久 —— 接进 `StatSheet` 前必须先解决（比如挂
      //     攻速加成技能，或者让冲刷拍在敏捷变化时也重写一次）。
      //   - 若 `0x51` 纹丝不动（还是 2.520）⟹ 写回是硬覆盖，引擎不碰它。
      //   - 若变成 `2.520 × (1+0.1×0.02)/1` 之类 ⟹ 引擎在写回值上叠加，那也行。
      //
      // 用 `permanent = false`，扰动完立刻改回去，不留痕。
      if (target.isHero) {
        const agi = GetHeroAgi(u, false);
        log.info(`--- 第三段：敏捷扰动 ${agi} → ${agi + 10}（非永久）---`);
        SetHeroAgi(u, agi + 10, false);
        log.info(`  扰动后：${readBoth(u)}  敏捷=${GetHeroAgi(u, false)}`);

        SetHeroAgi(u, agi, false);
        log.info(`  敏捷已还原为 ${agi}，还原后：${readBoth(u)}`);
      } else {
        log.info("--- 第三段跳过：被测单位不是英雄，敏捷扰动做不了 ---");
      }

      if (before > 0) {
        SetUnitState(u, UNIT_STATE_ATTACK_SPEED, before);
        log.info(`  已还原为 ${before.toFixed(3)}，还原后：${readBoth(u)}`);
      } else {
        log.warn(`  基线读数是 ${before.toFixed(3)}，**不还原**（写回 0 可能让它彻底不能攻击）`);
      }
      log.info("=== 攻速写回探针结束 ===");
    } catch (e) {
      log.error(`  收尾抛出异常：${e}`);
    }
  });
}
