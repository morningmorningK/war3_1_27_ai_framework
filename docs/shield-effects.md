# 淡色护盾特效

基于 **Vinz** 制作的 [Sacred Guard Classic](https://www.hiveworkshop.com/threads/sacred-guard.337515/) 生成八个淡色衍生模型，原始四个模型与六个纹理保持不变。
所有模型位于 `maps/resource/war3mapImported/`，已登记在 `maps/table/imp.ini`。

| 外观参数 | 颜色 | 模型 |
| --- | --- | --- |
| fire | 橙红 #FF5938 | Shield Pale Fire.mdx |
| water | 蓝 #2874FF | Shield Pale Water.mdx |
| ice | 冰蓝 #58DFFF | Shield Pale Ice.mdx |
| thunder | 紫 #9F40FF | Shield Pale Thunder.mdx |
| wind | 青绿 #16C6B0 | Shield Pale Wind.mdx |
| rock | 金橙 #FFA52E | Shield Pale Rock.mdx |
| grass | 草绿 #64CF24 | Shield Pale Grass.mdx |
| none | 银白 #D8DFEA | Shield Pale None.mdx |

默认无元素护盾使用银白。`shield_<元素>` 展示键自动选择对应外观；`demo_fire` 使用火，`demo_frost` 使用冰。
旧参数 red / blue / green / gold 分别兼容映射到 fire / water / grass / rock。
这些参数只控制展示，不赋予元素承伤或克制机制。结晶碎片生成与拾取见 `crystallize.md`；
结晶护盾复用这里的火 / 水 / 雷 / 冰外观，并拥有同元素伤害 2.5 倍吸收效率；
受到对应克制元素伤害时每点消耗 2 点基础盾值，具体组合见 `crystallize.md`。
普通技能盾只指定颜色时，承伤规则仍为 1 倍。现在通过 `addElementalShield` 明确指定元素，
可以创建七元素技能盾与无元素技能盾；技能来源与结晶来源独立显示。蒸发 / 融化只增加盾耗，
规则及示例见 `docs/crystallize.md` 和 `docs/skill-elemental-shields.md`。

```ts
actor.addShield(300, 15, undefined, "ice");
actor.buffManager.addShieldBuff(300, 15, undefined, "none");
// 实际冰元素技能盾：颜色自动使用冰色，能够参与元素反应。
actor.addElementalShield(300, "ice", 15, "skill_ice_shield");
```

## 资源调淡方式

`scripts/generate-shield-models.mjs` 从原始金色 Classic 模型生成八个独立模型。
材质静态 Alpha 和 KMTA 动画值（包含插值切线）均乘以 0.45；原有 Additive 材质改为 AddAlpha，让材质透明度参与混合。
光环与射线使用区分度更高的元素色；高光的白色混合比例由 65% 降至 12%，黑色底层保留。
材质系数仍为 0.45，保持柔和的光效强度。
几何、纹理路径、动画时间、KGAO 出生/消失可见性轨道保持原样。
文件格式参照 [mdx-m3-viewer 的材质解析实现](https://github.com/flowtsohg/mdx-m3-viewer/blob/master/src/parsers/mdlx/layer.ts)。

修改脚本中的色板或 `materialAlpha` 后，在项目根目录执行 `node scripts/generate-shield-models.mjs`，再执行 `corepack yarn build:dev`。
0.45 是材质系数，实际游戏亮度还受纹理、叠加层和宿主渲染影响。

## 附着与清理

所有单位统一附着在 `chest`，用 `jass.common.AddSpecialEffectTarget(model, actor.handle, "chest")` 创建独立特效，不再调用 `DzSetEffectVertexAlpha`。
每个单位最多持有一个护盾及一个特效；旧护盾剩余值高于新护盾总值时保留旧盾，否则换新盾并重新计时，外观跟随保留的护盾。
同模型复用，切换模型销毁旧效果；护盾耗尽、到期、驱散或死亡清理时销毁。
创建外观失败不影响护盾数值结算。通用护盾代码不修改单位模型。

测试脚手架里的六个 hfoo 保留原版步兵模型，默认使用无元素银白护盾。
编译和资源生成不等于游戏画面验收；通过 `corepack yarn test:map` 经 KKWE 查看实际颜色、亮度和附着位置。
