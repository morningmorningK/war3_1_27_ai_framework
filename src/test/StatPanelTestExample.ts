/**
 * 属性面板的自测（阶段 E / Step 3）。
 *
 * ## 它验什么
 *
 * 验的是**面板的渲染路径接对了没有** —— 每一行取的是不是正确的原生状态量、
 * 有没有用错 `UNIT_STATE_*` 常量、取整和拼接的格式对不对。这类错误在游戏里
 * 表现为「护甲那一行显示的是攻击力」，肉眼看得见但很容易忽略。
 *
 * 做法是拿面板**真正在用的** `BASIC_ROWS`（`StatPanelUI` 导出）跑一遍，
 * 再在**这边独立写一遍期望值**去比。两边都读原生，但公式是各写各的 ——
 * 所以能抓到「面板引用了错的常量」这类错。
 *
 * ## ⚠️ 特意挑「没有属性表」的单位来比
 *
 * 有属性表的单位，面板走的是 `getFinal()`，而那个值要等 `StatSystem` 的
 * 0.1s 冲刷拍写回原生之后才和原生读数一致。自测跑在更早的时刻，
 * 拿原生当期望值会**误报**。
 *
 * 没表的单位走的是原生兜底路径（`pick` 的 `native` 分支），两边读的是同一个
 * 引擎状态，比较是确定的。这条也正是最常见的路径 —— 绝大多数普通单位
 * 既没 buff 也没遗物，本来就没有表（见 `StatPanelUI.resolveSheet`）。
 *
 * ## 不做的事
 *
 * 不建面板、不碰 frame。整个自测是纯读 + 比字符串，随时可以调。
 */

import { Actor } from "src/system/actor";
import { ALL_ROWS } from "src/system/ui/component/StatPanelUI";
import { DEFAULT_CRIT_DMG } from "src/system/stat/types";
import {
  UNIT_STATE_ATTACK_BONUS,
  UNIT_STATE_ATTACK_SPEED,
  UNIT_STATE_ATTACK_WHITE,
  UNIT_STATE_DEFEND_WHITE,
  UNIT_STATE_LIFE,
  UNIT_STATE_MANA,
  UNIT_STATE_MAX_LIFE,
  UNIT_STATE_MAX_MANA,
  UNIT_TYPE_HERO,
} from "src/constants/game/units";
import { createLogger } from "src/utils/logger";

const log = createLogger("StatPanelTest");

/** 与面板里同一条规则：没有值就是 `—` */
const DASH = "—";

/** 与面板里同一条规则：取整。`Math.round` 出 Lua 整数，`tostring` 不带 `.0` */
function r(v: number): string {
  return String(Math.round(v));
}

/** 与面板里同一条规则：系数 → `+12.3%`。负值不带 `+` */
function percent(v: number): string {
  return [v >= 0 ? "+" : "", (v * 100).toFixed(1), "%"].join("");
}

/** 一条断言：`label` 这一行，面板渲染出来的和这里算的必须一样 */
interface Case {
  readonly label: string;
  /** 独立算出来的期望串。函数里读的是原生，公式与面板各写各的 */
  readonly expect: string;
}

/**
 * 找被测单位。**只要没有属性表的那些** —— 理由见文件头。
 *
 * ⚠️ **找不到就返回 `undefined` 让自测跳过，不拿有表的凑数**。
 * 有表的单位面板走 `getFinal()`，那个值要等冲刷拍写回原生才和原生读数一致，
 * 拿它做期望值会误报。自测宁可明说跳过，也不要给出不可信的红绿。
 */
function pickTarget(): Actor | undefined {
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
    // 句柄已经指不到活着的单位了就跳过 —— 拿它去读原生会访问违例
    const u = actor.handle;
    if (u === undefined || GetUnitTypeId(u) === 0) {
      continue;
    }
    if (!actor.hasStatSheet()) {
      return actor;
    }
  }

  return undefined;
}

/**
 * 面板自测入口。在 `main.ts` 的 debug 分支里调用。
 *
 * 建议**晚于 0.5s** 调 —— 太早的话 `seedBuffBarDemo` 那批单位还没建出来，
 * 会发现一个可测单位都没有。
 */
export function statPanelSelfTest(): void {
  const actor = pickTarget();
  if (actor === undefined) {
    log.warn("=== 属性面板自测：跳过（场上没有「无属性表」的单位可测）===");
    return;
  }

  const u = actor.handle;
  if (u === undefined) {
    log.warn("=== 属性面板自测：跳过（目标没有原生句柄）===");
    return;
  }

  const hero = IsUnitType(u, UNIT_TYPE_HERO);
  // 走到这里就一定是 `null`（`pickTarget` 只挑没表的）—— 写成这样是为了
  // 让「面板此刻走的是哪条分支」在代码里显式可见，而不是靠调用方记着。
  const sheet = actor.hasStatSheet() ? actor.statSheet : null;

  const cases: Case[] = [
    { label: "等级", expect: hero ? r(GetUnitLevel(u)) : DASH },
    // 经验两条（Step 4）。**非英雄必须是 `—`** —— 这是 Step 4 的通过标准之一。
    // 期望值这边独立算一遍，公式与面板的 `xpToLevelText` 各写各的。
    { label: "经验", expect: hero ? r(GetHeroXP(u)) : DASH },
    { label: "升级还需", expect: expectedRemaining(u, hero) },
    { label: "生命", expect: [r(GetUnitState(u, UNIT_STATE_LIFE)), " / ", r(GetUnitState(u, UNIT_STATE_MAX_LIFE))].join("") },
    { label: "魔法", expect: [r(GetUnitState(u, UNIT_STATE_MANA)), " / ", r(GetUnitState(u, UNIT_STATE_MAX_MANA))].join("") },
    { label: "力量", expect: hero ? r(GetHeroStr(u, false)) : DASH },
    { label: "敏捷", expect: hero ? r(GetHeroAgi(u, false)) : DASH },
    { label: "智力", expect: hero ? r(GetHeroInt(u, false)) : DASH },
    { label: "基础攻击", expect: r(GetUnitState(u, UNIT_STATE_ATTACK_WHITE)) },
    { label: "附加攻击", expect: r(GetUnitState(u, UNIT_STATE_ATTACK_BONUS)) },
    { label: "护甲", expect: r(GetUnitState(u, UNIT_STATE_DEFEND_WHITE)) },
    { label: "移动速度", expect: r(GetUnitMoveSpeed(u)) },

    // ---- 攻速：**倍率**，任何单位都直读 JAPI 原生（绕开属性表）----
    // 原先是 `—`。2026-10-06 实测 `0x51` 是**倍率**（1.0 = 100%，步兵 1.000、
    // 圣骑士 1.260 = 1 + 13 敏捷 × 0.02），不是「每秒攻击次数」——
    // 所以显示成 `x1.26`（照 `critDamageText` 的 `x1.50` 那套写法）。
    // 期望值这边独立再读一次原生，和面板的 `attackSpeedText` 各写各的。
    { label: "攻击速度", expect: ["x", GetUnitState(u, UNIT_STATE_ATTACK_SPEED).toFixed(2)].join("") },

    // ---- 每秒回复两项：**任何单位都直读 JAPI 原生**（绕开属性表）----
    // 2026-10-06 之前这里也期望 `—`（当时以为没有原生读法），后来又一度走 `pick`
    // （有表就用表的值）。现在固定直读原生 —— 原生读的是**总回复**（物品 / 能力
    // 加的那份也累加在同一个字段里），而表的 base 是建表时的冻结快照。
    // 期望值这边独立再调一次原生，和面板的 `regenText` 各写各的。
    { label: "生命回复", expect: DzGetUnitLifeRegen(u).toFixed(2) },
    { label: "魔法回复", expect: DzGetUnitManaRegen(u).toFixed(2) },

    // ---- 页面②③ 的系数类：**没表时显示 `+0.0%`，不是 `—`** ----
    // 理由见 `sheetNumber` 那段：这些属性引擎压根不认识，没表 ⟺ 一条来源都没有 ⟺ 确实是 0。
    // 下面期望值统一写成「0 转百分比」，和面板的 `percentText` 各写各的。
    { label: "物理伤害加成", expect: percent(0) },
    { label: "火元素伤害加成", expect: percent(0) },
    { label: "草元素抗性", expect: percent(0) },
    { label: "暴击率", expect: percent(0) },
    { label: "吸血", expect: percent(0) },
    { label: "护甲穿透", expect: percent(0) },
    { label: "护盾强效", expect: percent(0) },
    { label: "冷却缩减", expect: percent(0) },
    { label: "韧性", expect: percent(0) },
    { label: "免伤", expect: percent(0) },

    // 元素精通是平面数字，不是系数，所以没有 `%`
    { label: "元素精通", expect: r(0) },

    // 暴击伤害单独渲染成总倍率，而且**没表时也报真值** ——
    // 0.5 这个 base 是所有单位的出厂值，不来自原生快照（见 `critDamageText`）。
    { label: "暴击伤害", expect: ["x", (1 + DEFAULT_CRIT_DMG).toFixed(2)].join("") },
  ];

  const view = { unit: u, sheet };

  let pass = 0;
  let fail = 0;

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    if (c === undefined) {
      continue;
    }

    const row = findRow(c.label);
    if (row === undefined) {
      log.error(`[失败] ${c.label}：面板里根本没有这一行`);
      fail++;
      continue;
    }

    const actual = row.render(view);
    if (actual === c.expect) {
      pass++;
      continue;
    }

    fail++;
    log.error(
      [
        "[失败] ",
        c.label,
        "：期望 ",
        c.expect,
        "，面板给的是 ",
        actual,
      ].join("")
    );
  }

  log.info(
    [
      `被测单位：句柄 ${GetHandleId(u)}，`,
      hero ? "英雄" : "普通单位",
      `，属性表 ${sheet === null ? "无（走原生兜底）" : "有"}`,
    ].join("")
  );
  log.info(`=== 属性面板自测结束：通过 ${pass}，失败 ${fail} ===`);
}

/**
 * 「距离升级还差多少经验」的期望值。**独立于面板再写一遍**。
 *
 * ⚠️ 这里写的是**实测出来的**语义（见 `XPNeededProbe` 与
 * `StatPanelUI.xpToLevelText` 的注释）：`DzGetUnitNeededXP` 的参数是
 * **当前等级**，返回值是「离开该等级所需的**累计**经验总量」。
 * 所以差值是相减，不是直接取用 —— 写成 `needed(u, level + 1)` 就错了。
 */
function expectedRemaining(u: unit, hero: boolean): string {
  if (!hero) {
    return DASH;
  }
  const total = DzGetUnitNeededXP(u, GetUnitLevel(u));
  if (total <= 0) {
    return DASH;
  }
  const remain = total - GetHeroXP(u);
  // 满级也是 `—`，不是 `0`：`needed` 在末级**饱和**（一直返回 5400），
  // 所以满级英雄会算出 remain === 0。详见面板里 `xpToLevelText` 的注释。
  return remain <= 0 ? DASH : r(remain);
}

/**
 * 按标签从面板的**全部三页**行表里取一条。找不到返回 `undefined`。
 *
 * ⚠️ 用 `ALL_ROWS` 而不是 `BASIC_ROWS` —— 页面②③ 也有要查的行
 * （「暴击率」「草元素抗性」这些系数类只在页面②③），只查基础页会查不到。
 */
function findRow(label: string): (typeof ALL_ROWS)[number] | undefined {
  for (let i = 0; i < ALL_ROWS.length; i++) {
    const row = ALL_ROWS[i];
    if (row !== undefined && row.label === label) {
      return row;
    }
  }
  return undefined;
}
