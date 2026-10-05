import { Timer } from "@eiriksgata/wc3ts/*";
import { UnitBlood } from "src/system/ui/component/UnitBlood";
import { createLogger } from "src/utils/logger";

const log = createLogger("CameraControl");


/**
 * 镜头控制工具类
 * 提供鼠标滚轮控制镜头距离和宽屏设置功能
 */
export class CameraControl {
  // 初始视野等级
  private static viewLevel: number = 8;
  // 开启重置镜头属性标识
  private static resetCam: boolean = false;
  // 镜头变化平滑度
  private static wheelSpeed: number = 0.1;
  // 是否是宽屏
  private static wideScr: boolean = false;
  // 默认X轴角度
  private static xAngle: number = 306;
  // 视野等级上限
  private static viewLevelMax: number = 30;
  // 视野等级下限
  private static viewLevelMin: number = 4;

  //记录游戏初始化镜头角度
  private static gameStartXAngle: number = GetCameraField(ConvertCameraField(2));

  private static unitBloodScale: number = 1.0;

  /**
   * 「这一格滚轮让给别人」的判定，由 `ChatBoxUI` 在 `create()` 时登记。
   *
   * ⚠️ **不要改回直接 `import { ChatBoxUI }`。** 那条边看着无害，实际是把一个很大的
   * UI 模块拉进了本文件的加载链 —— 代价是实测出来的：加之前 6 次崩溃全在
   * `ChatBoxUI.lua`（最靠后一次是 `:963`），加了之后崩点立刻反向挪到
   * `CameraControl.lua:93`。KKWE 的 Lua 5.3 解析器有一道 200 的
   * C-level 上限（见 memory `wc3-lua53-ccalls-limit`），加载链越长越容易撞上。
   *
   * 反向依赖（`ChatBoxUI` → `CameraControl`）没这个问题：**大的拉小的不加深链路**，
   * 而且这里本来就是个回调，用不着静态引用。
   */
  private static wheelBlocker: (() => boolean) | null = null;

  /**
   * **追加式**登记的滚轮放行判定（`wheelBlocker` 之外的第二类消费者）。
   *
   * 槽位只有一个，而消费者不止一个：`ChatBoxUI` 已经占了 `wheelBlocker`，
   * 属性面板若也用 `setWheelBlocker`，就会**把它整个顶掉** —— 表现是
   * 「在聊天框上滚，镜头又跟着动了」，而且这种回归极难归因（两边代码都没错）。
   *
   * 所以后来的消费者一律走 `addWheelBlocker` 追加，谁都不动谁。
   * 语义是**或**：任何一个判定说「这一格归我」，镜头就不缩放。
   */
  private static extraWheelBlockers: Array<() => boolean> = [];

  /** 登记滚轮放行判定。传 `null` 取消。由 `ChatBoxUI` 调用 */
  public static setWheelBlocker(fn: (() => boolean) | null): void {
    CameraControl.wheelBlocker = fn;
  }

  /**
   * 追加一个滚轮放行判定（**不影响 `wheelBlocker`**）。可多次调用，各自独立。
   * 目前由属性面板登记。
   */
  public static addWheelBlocker(fn: () => boolean): void {
    CameraControl.extraWheelBlockers.push(fn);
  }


  /**
   * 初始化鼠标控制
   * 设置迷雾和镜头截断距离，注册鼠标滚轮事件
   */
  public static initMouseControl(): void {
    // 设置镜头远景截断距离
    SetCameraField(ConvertCameraField(1), 9999999.00, 0);

    // 注册鼠标滚轮事件
    const mouseTrigger = CreateTrigger();

    DzTriggerRegisterMouseWheelEventByCode(mouseTrigger, false, function () {
      CameraControl.onWheel();
    });

    log.info("鼠标控制已初始化");
  }

  /**
   * 鼠标滚轮变化时调用
   */
  private static onWheel(): void {
    // 滚轮变化量
    const delta = DzGetWheelDelta();

    // 如果鼠标不在游戏内，就不响应鼠标滚轮
    if (!DzIsMouseOverUI()) return;

    // ⚠️ 光标停在**聊天面板**上时让路：这一格滚轮归聊天面板翻消息，镜头别跟着动。
    // 用户报的「在这个面板上滚滑轮，视野也在变动」就是这个 —— 聊天框那条全局滚轮
    // 触发器（`ChatBoxUI.onGlobalMouseWheel`）和这里是**两个独立的全局触发器**，
    // 同一次滚动两边都会响。
    //
    // 判定是「光标压在哪根 frame 上」再往上走祖先链，不是自己算矩形 ——
    // 理由与失败方向见 `ChatBoxUI.isMouseOverPanel()` 的说明。
    // 判定体本身不在这里，是 `ChatBoxUI.create()` 通过 `setWheelBlocker()` 登记的
    // （为什么用回调而不是直接 import，见字段上那段）。
    //
    // 只加这一道，上面那行的行为**一个字都没动** —— 别的地方滚轮该不该缩放镜头
    // 不是这次要改的问题（顺带一提：那个条件和它上面那句注释说的是反的，
    // 但那是另一件事，没实测过就先不动）。
    if (CameraControl.wheelBlocker !== null && CameraControl.wheelBlocker()) return;

    // 追加登记的判定（属性面板等）。**或**关系，任一为真即放行。
    // 用 `push` 填的普通数组，`.length` 可靠（见记忆 `wc3-tstl-sparse-array-length`）。
    for (let i = 0; i < CameraControl.extraWheelBlockers.length; i++) {
      const blocker = CameraControl.extraWheelBlockers[i];
      if (blocker !== undefined && blocker()) return;
    }

    // 标记需要重置镜头属性
    this.resetCam = true;

    //获取视角角度
    log.info(`视角角度: ${GetCameraField(ConvertCameraField(2))}`);

    if (delta < 0) {
      // 滚轮下滑 - 拉远镜头
      if (this.viewLevel < this.viewLevelMax) {
        this.viewLevel += 1;
      }
    } else {
      // 滚轮上滑 - 拉近镜头
      if (this.viewLevel > this.viewLevelMin) {
        this.viewLevel -= 1;
      }
    }


    // 记录滚动前的镜头角度
    //this.xAngle = this.rad2Deg(GetCameraField(ConvertCameraField(1))); // CAMERA_FIELD_ANGLE_OF_ATTACK = 1

    //并且修改镜头角度

  }

  /**
   * 每帧渲染时调用
   */
  public static update(): void {
    if (this.resetCam) {
      // 重设镜头角度和高度
      SetCameraField(ConvertCameraField(1), 9999999, 0); // CAMERA_FIELD_ANGLE_OF_ATTACK
      SetCameraField(ConvertCameraField(2), 305, 0);
      SetCameraField(ConvertCameraField(0), this.viewLevel * 200, this.wheelSpeed); // CAMERA_FIELD_TARGET_DISTANCE = 0
      this.resetCam = false;
    }

    

  }



  /**
   * 设置宽屏
   * @returns 返回当前宽屏状态
   */
  public static setWideScreen(): boolean {
    this.wideScr = !this.wideScr;
    DzEnableWideScreen(this.wideScr);
    log.info(`宽屏模式${this.wideScr ? '开启' : '关闭'}`);
    return this.wideScr;
  }

  /**
   * 弧度转角度
   */
  private static rad2Deg(rad: number): number {
    return rad * 180 / Math.PI;
  }

  /**
   * 角度转弧度
   */
  private static degToRad(deg: number): number {
    return deg * Math.PI / 180;
  }

  /**
   * 获取当前视野等级
   */
  public static getViewLevel(): number {
    return this.viewLevel;
  }

  /**
   * 设置视野等级
   * @param level 视野等级 (4-13)
   */
  public static setViewLevel(level: number): void {
    if (level >= this.viewLevelMin && level <= this.viewLevelMax) {
      this.viewLevel = level;
      this.resetCam = true;
      log.info(`视野等级设置为 ${level}`);
    } else {
      log.warn(`视野等级必须在 ${this.viewLevelMin}-${this.viewLevelMax} 之间`);
    }
  }

  /**
   * 获取宽屏状态
   */
  public static isWideScreen(): boolean {
    return this.wideScr;
  }

  /**
   * 重置镜头到默认设置
   */
  public static resetCamera(): void {
    this.viewLevel = 8;
    this.xAngle = 306;
    this.resetCam = true;
    log.info("镜头已重置到默认设置");
  }

  /**
   * 设置镜头平滑度
   * @param speed 平滑度 (0-1)
   */
  public static setWheelSpeed(speed: number): void {
    if (speed >= 0 && speed <= 1) {
      this.wheelSpeed = speed;
      log.info(`镜头平滑度设置为 ${speed}`);
    } else {
      log.warn("镜头平滑度必须在 0-1 之间");
    }
  }

  /**
   * 获取当前镜头高度（Z坐标）
   * @returns 镜头高度
   */
  public static getCameraHeight(): number {
    return GetCameraEyePositionZ();
  }

  /**
   * 获取当前镜头位置
   * @returns 镜头位置 {x, y, z}
   */
  public static getCameraPosition(): { x: number, y: number, z: number } {
    return {
      x: GetCameraEyePositionX(),
      y: GetCameraEyePositionY(),
      z: GetCameraEyePositionZ()
    };
  }

  /**
   * 获取当前镜头目标位置
   * @returns 镜头目标位置 {x, y, z}
   */
  public static getCameraTargetPosition(): { x: number, y: number, z: number } {
    return {
      x: GetCameraTargetPositionX(),
      y: GetCameraTargetPositionY(),
      z: GetCameraTargetPositionZ()
    };
  }
}