# 技能元素护盾

技能护盾现在可以明确指定 `fire / water / thunder / ice / wind / rock / grass / none`。
元素参数决定承伤、反应与对应淡色外观；附着点仍为 chest，不改变单位模型。

## 使用

```ts
// 基础 300 点火盾，持续 15 秒；在发放时计持盾者护盾强效。
actor.addElementalShield(300, "fire", 15, "skill_fire_shield");
actor.addElementalShield(300, "water", 15);
actor.addElementalShield(300, "thunder", 15);
actor.addElementalShield(300, "ice", 15);
actor.addElementalShield(300, "wind", 15);
actor.addElementalShield(300, "rock", 15);
actor.addElementalShield(300, "grass", 15);
actor.addElementalShield(300, "none", 15);

// 兼容原入口：第五个参数明确实际元素。
actor.addShield(300, 15, "skill_fire_shield", undefined, "fire");

// 原来只传外观参数的调用保持普通承伤。
actor.addShield(300, 15, undefined, "fire");
```

`displayKey` 可通过 `registerBuffDisplay` 注册技能名称、说明及图标。
槽位名称显示技能名和护盾元素；Tooltip 显示来源（技能 / 结晶）、元素、剩余时长、盾值及承伤规则。
没有自定义展示信息时使用通用护盾图标和对应元素技能盾名称。

## 共用规则

- 元素技能盾与结晶盾都是 ElementalShieldBuff，结晶子类保留独立来源并限制四种元素。
- 同元素 2.5 倍吸收效率。无元素盾按 1 倍承伤，不提供反应元素。
- 基础克制保留水克火、火克冰、冰克雷、草克水，每点被挡伤害消耗 2 点盾值。风 / 岩 / 草盾未配置额外克制倍率。
- 反应使用已有方向规则：岩来袭才能结晶，风来袭才能扩散；岩盾 / 风盾不会凭空产生反向结晶 / 扩散。
- 草盾可与火 / 水 / 雷触发燃烧 / 绽放 / 激化；效果复用单位元素反应逻辑。
- 蒸发 / 融化倍率（含攻击者精通）只用于盾耗，替代该次基础克制倍率，生命溢出不增幅。
- 所有护盾共用一个位置：旧盾剩余值与新盾总值择高；相等或更高的新盾换盾并重新计时。
- 括号漂浮字显示实际消耗盾值，生命伤害另行显示。
- 护盾强效只在 BuffManager 发放时乘一次；直接 new Buff 的量按已经计算好的最终盾值处理。

## 已有技能与样本

`TestSkills.ts` 的神圣护盾 handler 已使用新接口。`DIVINE_SHIELD_ELEMENT` 目前为 `none`，
保持原技能承伤，可通过该配置指定七元素。技能发放开关保持用户已有的关闭设置。

`UnitEventExample.ts` 的八个样本定义已使用实际技能护盾接口，银白样本为无元素。
用户当前已注释 `createShieldEffectPreview()`，本次保留关闭状态及已有无敌 / 移动设置。

已通过 `corepack yarn build:dev` 编译打包；未运行游戏，实际承伤、反应及 UI 待验收。
