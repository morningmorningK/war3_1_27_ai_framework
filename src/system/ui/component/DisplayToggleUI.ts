/**
 * 右上角的「显示」开关列：帧率显示、伤害数字显示。
 *
 * 结构与 `UnitBloodToggleUI` **逐字对齐**（单例 + `created` 守卫 + `TOGGLES` 规格数组 +
 * `Button.createWithPreset` + 文案配色刷新），唯一区别是这些开关不控制 frame 树的增删，
 * 所以点击后**立即**生效，不需要那个 0.01s 的延迟定时器。
 *
 * ## 与 UnitBloodToggleUI 的布局耦合
 *
 * 两个类各自维护一份坐标常量（不改动已验证的 `UnitBloodToggleUI` 是有意为之）。
 * 血条按钮占 x ∈ [1764, 1904]、y = 16 与 56（行高 32、间隔 8），**底边到 y = 88**；
 * 所以本类从 `FIRST_ROW_Y = 96` 起往下排。
 *
 * ⚠️ **改 `UnitBloodToggleUI` 的行数 / 行高 / 间隔时，必须回来看这里的 `FIRST_ROW_Y`**，
 * 否则两组按钮会叠在一起。
 */

import { ScreenCoordinates } from "src/system/ui/ScreenCoordinates";
import { FpsDisplay } from "src/system/ui/FpsDisplay";
import { DamageNumberDisplay } from "src/system/ui/DamageNumberDisplay";
import { createLogger } from "src/utils/logger";
import { Button } from "./Button";

const log = createLogger("DisplayToggleUI");

// ---------------------------------------------------------------------------
// 布局（像素，基准 1920x1080 —— 见 ScreenCoordinates 的约定）
// ---------------------------------------------------------------------------

const BUTTON_WIDTH = 140;
const BUTTON_HEIGHT = 32;
const MARGIN_RIGHT = 16;

/** 屏幕右上角：x 从**左**量起，所以是「屏宽 - 按钮宽 - 右边距」。与 UnitBloodToggleUI 同列 */
const BUTTON_X = 1920 - BUTTON_WIDTH - MARGIN_RIGHT;

/**
 * 本列第一行的 y。
 *
 * 96 = 88（血条两行的底边）+ 8（行间隔）。见文件头「与 UnitBloodToggleUI 的布局耦合」。
 */
const FIRST_ROW_Y = 96;
const ROW_GAP = 8;

/** 与血条开关用的是同一支字体（能渲染中文，且已在游戏里验证过） */
const FONT_PATH = "resource\\Texture\\ui\\hpbar\\ZiTi.TTf";
const FONT_SIZE_PX = 14;

/** 开 / 关两种状态的颜色，`setTextColor` 吃不带 `|cff` 前缀的十六进制串 */
const COLOR_ON = "00FF00";
const COLOR_OFF = "808080";

interface DisplayToggleSpec {
  label: string;
  y: number;
  isOn: () => boolean;
  toggle: () => void;
}

/**
 * 规格表。**顺序即从上到下的排列顺序**，`buttons` 数组与它同序。
 *
 * 加新开关只需要往这里加一条 —— `create()` 与 `refresh()` 都不必改。
 */
const TOGGLES: DisplayToggleSpec[] = [
  {
    label: "帧率显示",
    y: FIRST_ROW_Y,
    isOn: () => FpsDisplay.isEnabled(),
    toggle: () => FpsDisplay.setEnabled(!FpsDisplay.isEnabled()),
  },
  {
    // 第二行。默认**关** —— 开着的话首次点开会延迟 0.01s 建 144 个 frame
    // （见 `DamageNumberDisplay.schedulePool`），不点就一个 frame 都不建。
    label: "伤害数字显示",
    y: FIRST_ROW_Y + ROW_GAP + BUTTON_HEIGHT,
    isOn: () => DamageNumberDisplay.isEnabled(),
    toggle: () => DamageNumberDisplay.setEnabled(!DamageNumberDisplay.isEnabled()),
  },
];

export class DisplayToggleUI {
  private static instance: DisplayToggleUI | undefined;

  /** 与 TOGGLES 同序，下标一一对应 */
  private buttons: Button[] = [];
  private created = false;

  private constructor() {}

  public static getInstance(): DisplayToggleUI {
    if (!DisplayToggleUI.instance) {
      DisplayToggleUI.instance = new DisplayToggleUI();
    }
    return DisplayToggleUI.instance;
  }

  public create(): void {
    // 幂等：热重载或重复调用时会再进来一次，这里挡住，避免建出第二套按钮
    if (this.created) {
      log.warn("已创建过，重复调用被忽略");
      return;
    }
    this.created = true;

    for (let i = 0; i < TOGGLES.length; i++) {
      const spec = TOGGLES[i];
      if (spec === undefined) {
        continue;
      }

      const button = Button.createWithPreset(
        spec.label,
        BUTTON_X,
        spec.y,
        "SMALL",
        ScreenCoordinates.ORIGIN_TOP_LEFT
      );
      // BUTTON_SIZES 里没有 140x32 这个尺寸，建完再改（同 UnitBloodToggleUI）
      button.setSize(BUTTON_WIDTH, BUTTON_HEIGHT);
      button.setTexturePreset("SHUIMO_STYLE_PANEL_BACKGROUND");
      button.setFont(FONT_PATH);
      button.setFontSizePixels(FONT_SIZE_PX);
      button.setOnClick(() => {
        spec.toggle();
        this.refresh();
      });
      this.buttons.push(button);
    }

    this.refresh();
    log.info(`显示开关创建完成，共 ${this.buttons.length} 个`);
  }

  /** 按当前开关状态刷新所有按钮的文案与颜色 */
  private refresh(): void {
    for (let i = 0; i < TOGGLES.length; i++) {
      const spec = TOGGLES[i];
      const button = this.buttons[i];
      if (spec === undefined || button === undefined) {
        continue;
      }
      const on = spec.isOn();
      button.setText(`${spec.label} ${on ? "开" : "关"}`);
      button.setTextColor(on ? COLOR_ON : COLOR_OFF);
    }
  }

  public destroy(): void {
    for (const button of this.buttons) {
      button.destroy();
    }
    this.buttons = [];
    this.created = false;
  }
}
