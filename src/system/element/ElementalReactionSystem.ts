/**
 * 元素反应系统 —— 附着的**唯一入口**，以及「施法声明元素 → 命中认领」的载荷登记
 * （`todo §2.2` 附着骨架 + 技能元素载荷通道）。
 *
 * ## 为什么附着必须收口到这一个 `resolve()`
 *
 * `BuffManager.addBuff()` **没有同类去重**（只是 `push`）。任何地方自己
 * `addBuff(new ElementalAuraBuff(...))` 都会让目标身上出现两条 `aura_fire`：
 * 两个图标、元素量各扣各的、`resolve` 查到哪条看遍历顺序 —— 全是静默的不确定。
 * 所以**外部不许直接 new 附着 buff**，一律走 `resolve()`。
 *
 * ## 一轮 `resolve()` 的语义
 *
 *   0. 有效元素盾（技能或结晶）优先提供元素；不与单位附着同时反应。蒸发 / 融化返回盾耗倍率，
 *      不增幅生命伤害。shieldRemaining 由管线预扣本次事件前段，已破盾则跳过此步。
 *
 *   1. 无有效元素盾时，火 / 雷先与冻结自身的冰元素反应，消耗冻结量并缩短控制。
 *   2. 找一个**可反应的**附着：别的元素、`gauge > 0`、且不是**本次派发**自己挂的
 *      （`attachedBy !== dispatch`，防「同一发打出的两种元素互相反应」）。
 *   3. 查表命中 → **消耗附着**（扣到 0 则**同步** `removeBuff`），返回反应定义；
 *      **来袭元素不再附着**（原神口径）。带 `control` 的反应（今天的冻结）
 *      在这一步**顺手把控制效果挂上** —— 冻结时长按刚扣掉的那点元素量算
 *      （`applyFreeze()`）。
 *   4. 无反应 → **附着 / 刷新 / 覆盖**：先移除目标身上全部附着，再挂一条新的
 *      （本轮的简化：**一个单位最多一条非物理附着**；不同元素无反应时直接覆盖，
 *      同元素则是刷新）。受**附着 CD** 门控 —— CD 内既不附着也不消耗。
 *
 * ## 返回的 `kind` 是**反应自己的类别**，不是「来袭那一击怎么算」
 *
 * 冻结返回 `transform`，蒸发/融化返回 `amplify`。而 `transform` 对来袭那一击
 * **零影响** —— 这一层不负责那个决定，管线也不会把 `transform` 透给 `dealRaw`
 * （见 `DamagePipeline_dealElemental` 那一行）。两者混用会静默吃掉整段乘区。
 *
 * ## 两个时钟，别混
 *
 *   - **附着衰减**走 `BuffSystem` 的 0.1s 名义心跳（`ElementalAuraBuff.duration`）。
 *   - **附着 CD / 施法载荷 TTL** 走 `scheduler.elapsedSeconds`（0.05s 心跳）。
 *
 *   两者**是独立的域**，不要求对齐：CD 只管「隔多久能再挂」，不参与衰减。
 */

import {
  ATTACK_TYPE_MAGIC,
  DAMAGE_TYPE_COLD,
  WEAPON_TYPE_WHOKNOWS,
} from "@eiriksgata/wc3ts/*";
import { Actor } from "src/system/actor";
import { BuffManager, BuffTypeId, registerBuffDisplay } from "src/system/buff";
import { scheduler } from "src/system/async";
import { saveDamageContext, restoreDamageContext } from "src/system/combat/DamageContext";
import { gameEvents, UnitDeathEventData } from "src/system/event";
import { ELEMENT_COUNT, ElementId, StatType, elementIndex } from "src/system/stat";
import { ReactionDispatch, ReactionEffects_apply } from "./ReactionEffects";
import { CrystallizeSystem } from "./CrystallizeSystem";
import { QUICKEN_DURATION, QuickenBuff, registerReactionBuffDisplays } from "./ReactionBuffs";
// ⚠️ **type-only import**（`import type`）。`combat/DamageContext` 反过来要 import
// `element/reactionTable`，两边若是运行时互相 import 就成环了；类型 import 编译后
// 整条消失，不留运行时边。`ReactionOutcome` 的定义在 `DamageContext.ts`（见那里的注释）。
import type { ReactionOutcome } from "src/system/combat/DamageContext";
import { createLogger } from "src/utils/logger";
import { ElementalAuraBuff } from "./ElementalAuraBuff";
import type { ReactionKind } from "src/system/combat/DamageContext";
import {
  ATTACH_CD_SECONDS,
  SPELL_ELEMENT_TTL_SECONDS,
  consumeGauge,
  frozenSeconds,
  isAuraElement,
  lookupReaction,
  quickenVuln,
} from "./reactionTable";
import type { ReactionDef } from "./reactionTable";
import { emAmplify } from "./reactionTable";
import { ElementalShieldBuff } from "src/system/buff/ShieldBuff";
import { FreezeBuff } from "src/system/buff/FreezeBuff";
import { FROZEN_SECONDS_PER_GAUGE } from "./reactionTable";

const log = createLogger("ElemReaction");

/**
 * `refreshAura()` 挂附着时用的身份 token（`ElementalAuraBuff.attachedBy`）。
 *
 * 存在的意义只有一个：让「刷新出来的这条附着」在 `findReactiveAura()` 眼里是
 * **别人的**附着（`attachedBy !== dispatch`），于是它**能**被后续的元素攻击反应掉 ——
 * 感电期间目标被冰打中触发超导，是要的。
 *
 * 用固定单例而不是每次 `{}`：刷新是单点行为，不需要按派发去重；
 * 而且固定 token 让「这条附着是不是刷出来的」在日志里可判。
 */
const REFRESH_AURA_TOKEN: object = {};

/** 施法时声明、由随后的伤害事件认领的元素载荷 */
export interface PendingSpellElement {
  /** 施法者 id */
  sourceId: number;
  /** 目标单位 id；`0` = 任意目标（无目标 / 范围技能） */
  targetId: number;
  element: ElementId;
  /** 本次附着的元素量（U） */
  gauge: number;
  /**
   * 这一段元素伤害的**基数**（乘区之前）。
   *
   * ⚠️ **必须由技能自己声明，不能拿引擎算出来的值。** 实测（2026-10-07）：
   * 同一发声明 100 的火弹，引擎交给管线时打**英雄护甲**是 50、打**步兵（大型护甲）**
   * 是 200 —— 魔兽那张攻/防类型表（magic 攻击：vs 英雄 ×0.5、vs 大型 ×2.0）插在中间。
   * 按 `todo §2.2.3` 第 1 条，元素伤害要自成一套、不与原生护甲规则混算，
   * 所以基数只能以这里声明的为准（管线那一侧见
   * `DamagePipeline_addNonPhysicalNative`）。
   */
  base: number;
  /**
   * 这一段伤害的**性质**，透传给 `DamagePipeline` 决定结算方式。
   *
   * - `"none"`（缺省）—— 普通元素段：吃元素加成、可暴击、吃擢升。
   *   火弹/水弹/冰弹、遗物追加的元素伤害、碎冰的冰爆都是这一档。
   * - `"transform"` —— **剧变反应自己造的那一段**（`ReactionEffects.ts` 派发）：
   *   只吃 `emTransform(EM)`、目标抗性与全局免伤，**不吃元素加成 / 暴击 / 擢升**。
   *   基数由反应自己按 `transformBase(等级) × transformCoeff` 算好（见 `reactionTable`）。
   *
   * ⚠️ **`"amplify"` 不会出现在这里。** 那个值说的是「**来袭那一击**触发了增幅反应」，
   * 由管线在结算途中自己判出来；技能在登记载荷时无从预知，也不该预知。
   * 三个值的分工见 `reactionTable` 文件头那张表。
   */
  kind?: ReactionKind;
  /** 到期时刻（`scheduler.elapsedSeconds`），过时不候 */
  expiresAt: number;
}

export class ElementalReactionSystem implements ReactionDispatch {
  private static instance: ElementalReactionSystem | undefined;

  /** 附着 CD：key = `sourceId × ELEMENT_COUNT + elementIndex` → 到期时刻（scheduler 秒） */
  private cdMap = new Map<number, number>();

  /** 施法元素载荷（FIFO，TTL 兜底）。密集数组，`push` 生成 */
  private pending: PendingSpellElement[] = [];

  private bound = false;

  public static getInstance(): ElementalReactionSystem {
    if (ElementalReactionSystem.instance === undefined) {
      ElementalReactionSystem.instance = new ElementalReactionSystem();
    }
    return ElementalReactionSystem.instance;
  }

  /** 接线：注册附着展示、订阅死亡清理。**幂等**（热重载会重复调 `initialize()`） */
  public init(): void {
    if (this.bound) {
      return;
    }
    this.bound = true;
    registerAuraDisplays();
    // 超导 / 感电 / 激化三条反应 buff 的图标与文案。放在这里而不是各 buff 类的模块顶层：
    // 那是**加载期副作用**，模块被 require 的顺序一变就注册不上了，而且热重载会重复跑。
    registerReactionBuffDisplays();
    CrystallizeSystem.getInstance().initialize();
    gameEvents.onUnitDeath((data: UnitDeathEventData) => this.onUnitDeath(data));
    log.info("元素反应系统已接线");
  }

  // =========================================================================
  // 核心：判定一次元素施加
  // =========================================================================

  public resolve(
    sourceId: number,
    target: Actor | undefined,
    element: ElementId,
    gauge: number,
    dispatch: object,
    shieldRemaining?: number
  ): ReactionOutcome {
    // 无目标 / 物理 / 非正元素量 → 什么也不做
    if (target === undefined || !isAuraElement(element) || gauge <= 0) {
      return { kind: "none" };
    }

    const bm = target.buffManager;

    // 元素盾优先于单位附着。盾值提供持续的元素来源，不另造会衰减的附着 Buff。
    const shield = bm.getShieldBuffs().find(sh => sh instanceof ElementalShieldBuff &&
      !sh.isDepleted() && !sh.isExpired());
    if (shield instanceof ElementalShieldBuff && (shieldRemaining ?? shield.current) > 0) {
      const def = lookupReaction(shield.element, element);
      if (def === undefined) {
        // 同元素及无反应组合仍被护盾拦住，不刷新单位的附着。
        return { kind: "none", shieldReaction: { shieldId: shield.id } };
      }
      const source = Actor.getById(sourceId);
      const mastery = source?.hasStatSheet() ? source.statSheet.getFinal(StatType.ELEMENTAL_MASTERY) : 0;
      const consumptionMultiplier = def.kind === "amplify"
        ? (def.ratio ?? 1) * emAmplify(mastery) : undefined;
      // 冻结等控制效果按本次来袭元素量计算；不会扣减单位已有附着。
      this.applyReactionEffect(def, sourceId, target, gauge * def.consumeRatio, dispatch);
      return { kind: def.kind, id: def.id,
        shieldReaction: { shieldId: shield.id, consumptionMultiplier } };
    }

    // 护盾之后优先判冻结自身的冰元素，火 / 雷分别触发融化 / 超导。
    // 本阶段只开放这两组冻结联动，水 / 冰不与冻结自身再次互相冻结。
    if (element === "fire" || element === "thunder") {
      const frozen = bm.getBuffsByType(BuffTypeId.FREEZE).find(buff =>
        buff instanceof FreezeBuff && buff.attachedBy !== dispatch && buff.gauge > 0);
      const def = lookupReaction("ice", element);
      if (frozen instanceof FreezeBuff && def !== undefined) {
        const consumed = consumeGauge(frozen.gauge, gauge, def.consumeRatio);
        bm.consumeFreezeGauge(frozen, consumed);
        // 耗尽时先移除控制，再派发额外伤害，避免嵌套伤害重复碎同一份冰。
        this.applyReactionEffect(def, sourceId, target, consumed, dispatch);
        return { kind: def.kind, id: def.id, consumed };
      }
    }

    // 1. 找一个可反应的附着（别的元素、未过期、非本次派发所挂）
    const hit = this.findReactiveAura(bm, element, dispatch);

    // 2. 查表
    if (hit !== undefined) {
      const def = lookupReaction(hit.element, element);
      if (def !== undefined) {
        const consumed = consumeGauge(hit.gauge, gauge, def.consumeRatio);
        hit.consume(consumed);
        // ⚠️ 扣空**同步**移除，不等 0.1s 的 BuffSystem.tick —— 否则同一发里
        // 后续的段会再查到这条 gauge<=0 的附着，重复判定反应。
        if (hit.isExpired()) {
          bm.removeBuff(hit);
        }

        // 反应**自带的落地效果**。必须排在扣完附着**之后** ——
        // 冻结时长就是按刚扣掉的那点元素量算的（`frozenSeconds(consumed)`）。
        //
        // ⚠️ 需要**造伤害**的反应（超载 / 超导 / 感电）不走这个字段的直接分支，
        // 它们由 `ReactionEffects` 派发（那一步在伤害管线里另起一段 `transform`）。
        this.applyReactionEffect(def, sourceId, target, consumed, dispatch);

        // `kind` 取自 `def` 而不是写死 —— 冻结是 `transform`，蒸发/融化是 `amplify`。
        // ⚠️ 这一个字决定了**来袭那一击**在管线里怎么算，所以管线那一侧会把它
        // 降成 `amplify | none` 再喂给 `dealRaw`（见 `DamagePipeline_dealElemental`）。
        //
        // ⚠️ 把 `consumed` 一起带回给调用方 —— 它唯一的用途是打日志
        //（`todo §2.2.3` 要求战斗日志写明「消耗元素量」），**不参与结算**。
        return { kind: def.kind, id: def.id, consumed: consumed };
      }
    }

    // 3. 无反应 → 附着 / 刷新 / 覆盖（CD 门控）
    if (this.isOnCooldown(sourceId, element)) {
      return { kind: "none" };
    }
    this.recordCooldown(sourceId, element);
    this.replaceAura(bm, element, gauge, sourceId, dispatch);
    return { kind: "none" };
  }

  /** 单位附着与护盾元素共用落地效果；剧变段 gauge=0，不能递归触发反应。 */
  private applyReactionEffect(def: ReactionDef, sourceId: number, target: Actor, consumed: number,
    dispatch?: object): void {
    const bm = target.buffManager;
    if (def.effect === "freeze") {
      this.applyFreeze(bm, consumed, sourceId, dispatch);
    } else if (def.effect === "quicken") {
      this.applyQuicken(bm, sourceId);
    } else if (def.effect === "crystallize" && def.shieldElement !== undefined) {
      CrystallizeSystem.getInstance().spawn(Actor.getById(sourceId), target, def.shieldElement);
    } else if (def.effect !== undefined) {
      ReactionEffects_apply(def, sourceId, Actor.getById(sourceId), target, this, consumed);
    }
  }

  /**
   * 找一条**可反应**的附着：元素不同、还有元素量、且不是本次派发挂的。
   *
   * 最多一条（单附着上限），但写成扫描是为了对「万一有两条」的情况也能确定性地取第一条。
   */
  private findReactiveAura(
    bm: BuffManager,
    element: ElementId,
    dispatch: object
  ): ElementalAuraBuff | undefined {
    const auras = bm.getBuffsByType(BuffTypeId.ELEMENTAL_AURA);
    for (let i = 0; i < auras.length; i++) {
      const b = auras[i];
      if (
        b instanceof ElementalAuraBuff &&
        b.attachedBy !== dispatch &&
        b.element !== element &&
        b.gauge > 0
      ) {
        return b;
      }
    }
    return undefined;
  }

  /**
   * 挂一条新附着：**先移除目标身上全部旧附着**（刷新 / 覆盖二合一），再挂新的。
   *
   * `getBuffsByType()` 返回的是 `filter` 出来的**新数组**，所以边遍历边 `removeBuff`
   * 不会动到正在遍历的那个数组。
   */
  private replaceAura(
    bm: BuffManager,
    element: ElementId,
    gauge: number,
    sourceId: number,
    dispatch: object
  ): void {
    const existing = bm.getBuffsByType(BuffTypeId.ELEMENTAL_AURA);
    for (let i = 0; i < existing.length; i++) {
      const b = existing[i];
      if (b instanceof ElementalAuraBuff) {
        bm.removeBuff(b);
      }
    }
    const aura = new ElementalAuraBuff(element, gauge);
    aura.attachedBy = dispatch;
    aura.sourceId = sourceId;
    bm.addBuff(aura);
  }

  /**
   * 冻结（水 + 冰）：按**这次扣掉的元素量**给目标挂一条 `FreezeBuff`。
   *
   * ## 为什么收口在这里而不是让管线去做
   *
   * `resolve()` 是元素语义的唯一入口，冻结的「冻多久」完全由元素量决定 ——
   * 拆到管线那一侧就得把 `consumed` 再传一遍，而那个数是**这里的局部量**。
   *
   * ## ⚠️ 必须走 `addFreezeBuff`，不能 `addBuff(new FreezeBuff(..))`
   *
   * 它是时长的唯一收口，**韧性在那里生效**（同 `TestSkills_onFreeze` 的注释）。
   * 绕过去的表现是「冻结不吃韧性」，不报错、不复现。
   *
   * ## 单层收口：取较长的那个生效
   *
   * `BuffManager.addBuff()` 只是 `push`，**没有同类去重** —— 冻着的时候再冻一次
   * 会挂出两条 `FREEZE`，而 `FreezeShatterSystem` 是「一次碎掉全部 FREEZE」，
   * 于是两层的时长会一起被清掉、冰爆也只爆一次（它文件头记过这个已知行为）。
   * 所以 `BuffManager.addFreezeBuff` 统一处理直接技能与反应冻结：
   *
   *   - 已有冻结且**剩余更长** → 什么都不做（连 `remove` 都不做：`removeFreeze`
   *     会把 `PauseUnit` 解开再让新的 `onApply` 重新暂停，白白抖一下）；
   *   - 否则 → 清掉旧的，挂新的。
   *
   * ## ⚠️ 它是**同步**调用的（在伤害回调的调用栈里）
   *
   * `addFreezeBuff` 的 `onApply` 会 `IssueImmediateOrder(u, "stop")` + `PauseUnit(u, true)`。
   * 这是本仓第一次在**伤害事件**里（而不是技能事件里）暂停单位。实测没炸，
   * 但它属于「嵌套派发」那一类风险 —— 若将来出现卡死/闪退，第一件事是把这里
   * 改成下一 tick 异步执行（`scheduler`），而不是去查别的。
   */
  private applyFreeze(bm: BuffManager, consumed: number, sourceId: number, dispatch?: object): void {
    const seconds = frozenSeconds(consumed);
    if (seconds <= 0) {
      return;
    }

    // 8 秒上限同时限制冻结量；韧性只缩短时间，不重复削减初始元素量。
    bm.addFreezeBuff(seconds, seconds / FROZEN_SECONDS_PER_GAUGE, sourceId, dispatch);
  }

  /**
   * 激化（草 + 雷）：给目标挂一条 `QuickenBuff` —— 受到的**雷 / 草**伤害
   * ×(1 + vuln)，持续 `QUICKEN_DURATION` 秒。
   *
   * ## 为什么收口在这里、且**不走** `ReactionEffects`
   *
   * `ReactionEffects.ts` 是「**派发剧变伤害**」的模块 —— 它每个分支都以
   * `dispatch.dealTransformSegment()` 结尾。而激化**一点伤害都不造**，
   * 塞进去只会多一个「其实不打人」的分支，还得在那里再判一次。
   * 所以照 `applyFreeze` 的先例：**不造伤害的反应直接在 `resolve()` 里挂**。
   *
   * ## ⚠️ 幅度读的是**触发者**的元素精通，不是目标的
   *
   * 与原神口径一致，也与 `ReactionEffects`（读施法者**等级**）/ `FreezeShatterSystem`
   * （读攻击者 EM）一致。取不到触发者（句柄已回收 / 从没注册成 `Actor`）就按 0 精通算
   * —— 挂一条保底 15% 的增伤，总比整个反应静默失效强。
   *
   * ## 单层收口：**覆盖**（先摘旧的，再挂新的）
   *
   * 同 `applyFreeze` / `ReactionEffects_attachSuperconduct`：`BuffManager.addBuff()`
   * 只是 `push`、**没有同类去重**，连触发两次会挂出两条 `QUICKEN`，
   * 属性乘区变成两条来源相加（`0.15 + 0.15 = 0.30`）而不是取一条。
   * 这里选「覆盖」而不是「取更强的那个」：激化是纯粹的输出窗口，刷新成满时长
   * 更符合直觉；「两个不同精通的人连着触发该用谁的」不值得为它加一层比较。
   */
  private applyQuicken(bm: BuffManager, sourceId: number): void {
    const existing = bm.getBuffsByType(BuffTypeId.QUICKEN);
    for (let i = 0; i < existing.length; i++) {
      const b = existing[i];
      if (b !== undefined) {
        bm.removeBuff(b);
      }
    }

    // ⚠️ 先问 `hasStatSheet()` 再取 `statSheet` —— 那个 getter 是**惰性建表**的，
    // 直接取等于在（可能已经 `detach` 的）句柄上重建一张表
    //（`DamagePipeline_sheetOf` 记过这条，全仓读取方都这么办）。
    // 「没有属性表 = 没有任何属性修正 = 精通 0」与那边「没有表 = 恒等」是同一个口径。
    const source = Actor.getById(sourceId);
    let mastery = 0;
    if (source !== undefined && source.hasStatSheet()) {
      mastery = source.statSheet.getFinal(StatType.ELEMENTAL_MASTERY);
    }

    bm.addBuff(new QuickenBuff(QUICKEN_DURATION, quickenVuln(mastery)));
  }

  // =========================================================================
  // 附着 CD
  // =========================================================================

  private isOnCooldown(sourceId: number, element: ElementId): boolean {
    const key = sourceId * ELEMENT_COUNT + elementIndex(element);
    const exp = this.cdMap.get(key);
    if (exp === undefined) {
      return false;
    }
    return exp > scheduler.elapsedSeconds;
  }

  private recordCooldown(sourceId: number, element: ElementId): void {
    this.sweepCooldown();
    const key = sourceId * ELEMENT_COUNT + elementIndex(element);
    this.cdMap.set(key, scheduler.elapsedSeconds + ATTACH_CD_SECONDS);
  }

  /** 清掉已过期的 CD 条目。**先收集再删** —— 别在遍历 Map 时改它 */
  private sweepCooldown(): void {
    const now = scheduler.elapsedSeconds;
    const dead: number[] = [];
    this.cdMap.forEach((exp: number, key: number) => {
      if (exp <= now) {
        dead.push(key);
      }
    });
    for (let i = 0; i < dead.length; i++) {
      this.cdMap.delete(dead[i]);
    }
  }

  /**
   * 单位死亡 → 清掉它作为**攻击者**留下的 CD 条目。
   *
   * ⚠️ **必须清**：`Actor.id` 是句柄 id，引擎会回收复用（`TestSkills.ts` 文件头
   * 记过这个坑）。不复用也就算了，一旦复用，新单位会命中一条**属于前一个单位、
   * 还没到期**的 CD → 附着随机不生效，不报错、不复现。
   */
  private onUnitDeath(data: UnitDeathEventData): void {
    const dead = data.Actor;
    if (dead === undefined) {
      return;
    }
    const id = dead.id;
    const deadKeys: number[] = [];
    this.cdMap.forEach((exp: number, key: number) => {
      if (Math.floor(key / ELEMENT_COUNT) === id) {
        deadKeys.push(key);
      }
    });
    for (let i = 0; i < deadKeys.length; i++) {
      this.cdMap.delete(deadKeys[i]);
    }
  }

  // =========================================================================
  // 施法元素载荷（register → claim）
  // =========================================================================

  /**
   * 技能 handler 在**造伤害之前**登记：本次施法打出的元素、附着量与**伤害基数**。
   *
   * 随后的伤害事件（`UnitDamageTarget` 同步派发）会带着同一个 `(sourceId, targetId)`
   * 来 `claimSpellElement()` 认领 —— 认领到的伤害就被**重新归类**成元素伤害，
   * 基数取这里声明的 `base`（理由见 `PendingSpellElement.base`）。
   *
   * ## `gauge = 0` 是合法的：**只声明元素、不附着**
   *
   * `resolve()` 对 `gauge <= 0` 本来就是「什么也不做」的早退（不附着、不消耗、
   * 不记 CD、不判反应），而管线照样会把这一段归类成该元素、照样让它吃元素加成
   * 与目标抗性。碎冰（`FreezeShatterSystem` 的冰爆）要的正是这个：
   * 「这是冰元素伤害，但冰已经碎了、不再挂附着」。
   *
   * ⚠️ 守卫因此是 `gauge < 0` 而不是 `<= 0` —— 只有负数是真错误。
   *
   * ## `kind = "transform"`（2026-10-07）
   *
   * 剧变反应（超载 / 超导 / 感电）自己造的那一段伤害也走这个入口，只是带上
   * `kind: "transform"`，让管线跳过元素加成 / 暴击 / 擢升。它和碎冰是**同一个套路**
   * （`gauge = 0` 只声明元素、不附着 ⇒ 不会递归触发反应），差别**只在 `kind`**：
   * 碎冰吃元素加成与暴击，剧变不吃。
   */
  public registerSpellElement(
    sourceId: number,
    targetId: number,
    element: ElementId,
    gauge: number,
    base: number,
    kind?: ReactionKind
  ): void {
    if (!isAuraElement(element) || gauge < 0) {
      return;
    }
    this.sweepPending();
    this.pending.push({
      sourceId,
      targetId,
      element,
      gauge,
      base,
      kind,
      expiresAt: scheduler.elapsedSeconds + SPELL_ELEMENT_TTL_SECONDS,
    });
  }

  /**
   * 伤害事件认领一条载荷（FIFO）。命中即移除；没有则返回 `undefined`（= 按原样过）。
   *
   * 匹配 `(sourceId, targetId)`：`targetId === 0` 的载荷对任意目标都算命中。
   */
  public claimSpellElement(sourceId: number, targetId: number): PendingSpellElement | undefined {
    this.sweepPending();
    for (let i = 0; i < this.pending.length; i++) {
      const p = this.pending[i];
      if (p === undefined || p.sourceId !== sourceId) {
        continue;
      }
      if (p.targetId !== 0 && p.targetId !== targetId) {
        continue;
      }
      this.pending.splice(i, 1);
      return p;
    }
    return undefined;
  }

  /** 清掉超时的载荷。**重建数组**，避免遍历时 splice */

  private sweepPending(): void {
    const now = scheduler.elapsedSeconds;
    const keep: PendingSpellElement[] = [];
    for (let i = 0; i < this.pending.length; i++) {
      const p = this.pending[i];
      if (p !== undefined && p.expiresAt > now) {
        keep.push(p);
      }
    }
    this.pending = keep;
  }

  // =========================================================================
  // 剧变反应的落地能力（`ReactionDispatch` 的实现）
  // =========================================================================
  //
  // ⚠️ 这两个方法是**给 `ReactionEffects` 用的**，它们构成的接口之所以在这里实现、
  // 而不是在 `ReactionEffects` 里直接 `import` 本类，是因为那样会造一条
  // `本类 → ReactionEffects → 本类` 的 require 环（tstl 加载期解引用 ⇒ 读到半成品 ⇒
  // `nil` 崩溃）。完整理由见 `ReactionEffects.ts` 文件头。

  /**
   * 派发**一段剧变伤害**。
   *
   * 三步，缺一步都会静默出错：
   *
   *   1. **`gauge = 0`** —— 只声明元素、不附着。这一条同时是两个保证：
   *      剧变伤害不会再挂一层附着，也不会递归触发反应（`resolve()` 对 `gauge <= 0`
   *      第一行就早退）。**递归的终止条件就是它**，没有额外的重入标志位。
   *   2. **`kind = "transform"`** —— 让 `dealRaw` 跳过元素加成 / 暴击 / 擢升。
   *      这是剧变与增幅的分水岭；漏了它这一发会**照常吃火伤加成和暴击**，
   *      不崩不报错，只是数字偏大。
   *   3. **`saveDamageContext()` / `restoreDamageContext()` 包住** —— 本方法是嵌套
   *      派发的唯一出口（`ReactionEffects` 的每一次 `dealTransformSegment` 都走这里），
   *      包在这一处就不会漏。不包的话内层会覆写单槽位的 `lastDamageContext`，
   *      外层那一击的飘字**退化成单色**（碎冰踩过同一个坑）。
   */
  public dealTransformSegment(
    sourceId: number,
    targetUnit: unit,
    element: ElementId,
    base: number
  ): void {
    const source = Actor.getById(sourceId);
    if (source === undefined) {
      return;
    }
    const su = source.handle;
    if (su === undefined || GetUnitTypeId(su) === 0) {
      return;
    }
    if (targetUnit === undefined || GetUnitTypeId(targetUnit) === 0) {
      return;
    }

    // ⚠️ **get-or-create**，不是 `getById` —— 范围枚举出来的单位可能从没被打过、
    // 也就还没有 `Actor`，用 id 反查会漏掉它（「范围内没参战过的野怪打不到」）。
    // `Actor.fromHandle` 顺带把它注册进 `allActors`，下一句的伤害事件本来也会做同一件事。
    const target = Actor.fromHandle(targetUnit);
    if (target === undefined) {
      return;
    }

    // 载荷按 `(sourceId, targetId)` 认领，`targetId` 必须是 `Actor.id` ＝ `GetHandleId`。
    this.registerSpellElement(sourceId, GetHandleId(targetUnit), element, 0, base, "transform");

    const saved = saveDamageContext();
    UnitDamageTarget(
      su,
      targetUnit,
      base,
      true,
      false,
      ATTACK_TYPE_MAGIC(),
      DAMAGE_TYPE_COLD(),
      WEAPON_TYPE_WHOKNOWS()
    );
    restoreDamageContext(saved);
  }

  /**
   * 刷新目标身上的元素附着（覆盖式，**不判反应**）。
   *
   * 走 `replaceAura` —— 它与 `resolve()` 的第 3 步是同一份实现，语义就是
   * 「清掉旧附着、挂上新的」。**刻意不经过 `resolve()`**：那会判一次反应，
   * 于是感电每跳都可能把自己身上的雷和残留的水再反应一次，变成永动机。
   *
   * `attachedBy` 传一个新对象，于是这条附着不会被同一次派发误判成「自己刚挂的」
   * （见 `findReactiveAura`）。这里用固定 token 而不是每次新建：刷新是单点行为，
   * 不需要按派发去重，固定 token 还能让日志里的身份稳定。
   */
  public refreshAura(
    sourceId: number,
    target: Actor,
    element: ElementId,
    gauge: number
  ): void {
    if (!isAuraElement(element) || gauge <= 0) {
      return;
    }
    // 范围枚举可能刚把未参战单位注册为 Actor，它还没有 BuffManager。
    // 由下面的 getter 按需创建；已死亡或被移除的单位不再挂附着。
    const targetUnit = target.handle;
    if (targetUnit === undefined || GetUnitTypeId(targetUnit) === 0 || GetWidgetLife(targetUnit) <= 0.405) {
      return;
    }
    this.replaceAura(target.buffManager, element, gauge, sourceId, REFRESH_AURA_TOKEN);
  }

  // =========================================================================
  // 自测用：只读快照
  // =========================================================================

  /** 目标身上当前附着的元素（无则 `undefined`）。给自测读，生产别用 */
  public peekAuraElement(target: Actor): ElementId | undefined {
    const auras = target.buffManager.getBuffsByType(BuffTypeId.ELEMENTAL_AURA);
    for (let i = 0; i < auras.length; i++) {
      const b = auras[i];
      if (b instanceof ElementalAuraBuff && b.gauge > 0) {
        return b.element;
      }
    }
    return undefined;
  }

  /** 目标身上当前附着的元素量（无则 0）。给自测读 */
  public peekAuraGauge(target: Actor): number {
    const auras = target.buffManager.getBuffsByType(BuffTypeId.ELEMENTAL_AURA);
    for (let i = 0; i < auras.length; i++) {
      const b = auras[i];
      if (b instanceof ElementalAuraBuff && b.gauge > 0) {
        return b.gauge;
      }
    }
    return 0;
  }

  /** 当前 CD 表条目数。给自测断言「不泄漏」 */
  public cooldownCount(): number {
    return this.cdMap.size;
  }

  /**
   * 清空附着 CD 表。**只给自测用**，生产别调。
   *
   * ## 为什么自测需要它（2026-10-09）
   *
   * CD 按 `(sourceId × 元素)` 记（`ATTACH_CD_SECONDS`，走 `scheduler.elapsedSeconds`），
   * 而自测是**一个函数调用**里跑完全部用例的 —— 全程 `elapsedSeconds` 不变，于是
   * 每个用例记下的 CD 在整轮自测里**都还活着**。
   *
   * 需要**真 `Actor` 当触发者**的用例（剧变 / 草线 / 端到端）只能用 `target.id`
   * 当 `sourceId`（理由见 `ElementAuraTestExample` 的 `testTransformReactions`），
   * 于是会撞上前一个用例留下的同一个 `(target.id, 元素)`，被 `isOnCooldown()` 静默
   * 挡掉 —— 表现是「前置附着挂了、却读不到」，而**生产逻辑一点没错**（真实游戏里
   * 同一个施法者两次附着本来就该隔 0.5 秒）。
   *
   * 每个独立场景开头清一次，用例之间才真的互相独立。这也是本轮自测红了 13 条的原因：
   * 草线那两组复用了 `target.id`，而水 / 火 / 草三个键分别被感电、超载两组先占了。
   *
   * ⚠️ **别在 `testCooldown` 里调** —— 那一条验的正是 CD 本身。
   */
  public clearCooldowns(): void {
    this.cdMap.clear();
  }

  /** 当前待认领的施法载荷数。给自测断言「不泄漏」 */
  public pendingCount(): number {
    return this.pending.length;
  }
}

// ===========================================================================
// 附着展示
// ===========================================================================

/**
 * 七个可附着元素的展示（名字 / 描述 / 图标）。
 *
 * ⚠️ 图标名是从 `dev_lib/.../prebuilt/default/ability.ini` 里**核实过存在**的，
 * 不是随手编的 —— 写一个不存在的路径会在 buff 栏上画一个空白格（护盾图标踩过这个坑）。
 */
const AURA_DISPLAYS: Array<[ElementId, string, string, string]> = [
  ["fire", "火附着", "火元素附着。受到水元素攻击会触发「蒸发」。", "ReplaceableTextures\\CommandButtons\\BTNFireBolt.blp"],
  ["water", "水附着", "水元素附着。受到火元素攻击会触发「蒸发」。", "ReplaceableTextures\\CommandButtons\\BTNCrushingWave.blp"],
  ["thunder", "雷附着", "雷元素附着。", "ReplaceableTextures\\CommandButtons\\BTNChainLightning.blp"],
  ["ice", "冰附着", "冰元素附着。受到火元素攻击会触发「融化」。", "ReplaceableTextures\\CommandButtons\\BTNFrostBolt.blp"],
  ["wind", "风附着", "风元素附着。", "ReplaceableTextures\\CommandButtons\\BTNCyclone.blp"],
  ["rock", "岩附着", "岩元素附着。", "ReplaceableTextures\\CommandButtons\\BTNStoneForm.blp"],
  ["grass", "草附着", "草元素附着。", "ReplaceableTextures\\CommandButtons\\BTNEntanglingRoots.blp"],
];

function registerAuraDisplays(): void {
  for (let i = 0; i < AURA_DISPLAYS.length; i++) {
    const d = AURA_DISPLAYS[i];
    if (d === undefined) {
      continue;
    }
    registerBuffDisplay("aura_" + d[0], {
      name: d[1],
      description: d[2],
      icon: d[3],
    });
  }
}
