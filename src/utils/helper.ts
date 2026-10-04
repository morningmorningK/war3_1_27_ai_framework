// 基础的id转换 - 热更新测试
export function c2i(char: string) {
  return string.unpack(">I4", char)[0] as number
}

export function i2c(id: number) {
  return string.pack(">I4", id)
}

export function FourCC(id: string) {
  return c2i(id)
}


/**
 * 世界坐标转屏幕坐标的配置选项
 */
export interface WorldToScreenOptions {
  /** 屏幕 X 偏移量（0-1 范围） */
  offsetScreenX?: number;
  /** 屏幕 Y 偏移量（0-1 范围） */
  offsetScreenY?: number;
}



/**
 * 世界坐标转屏幕坐标（基于 Antares 的 FastWorld2ScreenTransform，支持任意宽高比）
 * 
 * 在 worldToScreen 的基础上添加宽高比校正，确保在不同屏幕比例下都能正确工作
 * 
 * @param x 世界坐标 X
 * @param y 世界坐标 Y
 * @param z 世界坐标 Z（垂直高度）
 * @param options 可选的偏移配置
 * @returns 屏幕坐标 { screenX, screenY, onScreen }
 */
export function worldToScreen(
  x: number,
  y: number,
  z: number = 0,
  options: WorldToScreenOptions = {}
): { screenX: number, screenY: number, onScreen: boolean } {
  // 获取相机参数
  const eyeX = GetCameraEyePositionX();
  const eyeY = GetCameraEyePositionY();
  const eyeZ = GetCameraEyePositionZ();
  const angleOfAttack = GetCameraField(ConvertCameraField(2)); // CAMERA_FIELD_ANGLE_OF_ATTACK
  const rotation = GetCameraField(ConvertCameraField(5));      // CAMERA_FIELD_ROTATION
  const fieldOfView = GetCameraField(ConvertCameraField(3));   // CAMERA_FIELD_FIELD_OF_VIEW

  // 预计算三角函数
  const cosAttack = Math.cos(angleOfAttack);
  const sinAttack = Math.sin(angleOfAttack);
  const cosRot = Math.cos(rotation);
  const sinRot = Math.sin(rotation);

  // 经验公式（Antares 校准）
  const yCenterScreenShift = 0.1284 * cosAttack;
  const scaleFactor = 0.0524 * fieldOfView * fieldOfView * fieldOfView
    - 0.0283 * fieldOfView * fieldOfView
    + 1.061 * fieldOfView;

  // 矩阵元素预计算
  const cosAttackCosRot = cosAttack * cosRot;
  const cosAttackSinRot = cosAttack * sinRot;
  const sinAttackCosRot = sinAttack * cosRot;
  const sinAttackSinRot = sinAttack * sinRot;

  // 世界坐标到相机的向量
  const dx = x - eyeX;
  const dy = y - eyeY;
  const dz = z - eyeZ;

  // 核心变换公式
  const xPrime = scaleFactor * (-cosAttackCosRot * dx - cosAttackSinRot * dy - sinAttack * dz);

  // 获取屏幕宽高比并计算校正因子
  const clientWidth = DzGetWindowWidth();
  const clientHeight = DzGetWindowHeight();
  let aspectRatio = 4.0 / 3.0; // 默认 4:3
  if (clientHeight > 0) {
    aspectRatio = clientWidth / clientHeight;
  }

  // 宽高比校正因子（相对于 4:3 基准）
  // 当 aspectRatio = 4/3 时，correction = 1.0（无变化）
  // 当 aspectRatio > 4/3（更宽）时，correction < 1.0（X 轴缩小）
  // 当 aspectRatio < 4/3（更窄）时，correction > 1.0（X 轴放大）
  const baseAspectRatio = 4.0 / 3.0;
  const aspectRatioCorrection = baseAspectRatio / aspectRatio;

  // X 轴应用宽高比校正，Y 轴保持不变
  const screenX = 0.4 + ((cosRot * dy - sinRot * dx) / xPrime) * aspectRatioCorrection;
  const screenY = 0.42625 - yCenterScreenShift + (sinAttackCosRot * dx + sinAttackSinRot * dy - cosAttack * dz) / xPrime;

  // ---------------------------------------------------------------------
  // 非有限值守卫 —— **必须在返回之前拦掉，不能指望调用方的阈值判断**。
  //
  // xPrime 是除数，趋零时 screenX/screenY 会变成 ±Infinity 或 NaN。
  // 而两个调用方（UnitBlood.updatePosition / DamageTexttag.isOffScreen）
  // 判断「是否在屏幕外」用的都是 `screenY >= 上界 || screenY <= 下界 || ...`
  // 这种比较链 —— **NaN 与任何数比较都返回 false**，于是 NaN 会**穿过全部检查**，
  // 直接被塞进 DzFrameSetAbsolutePoint()，把 NaN 坐标交给 Game.dll 的 frame 布局，
  // 主线程访问违例闪退（视角拉得越高越容易踩到）。
  //
  // 返回一个必定被判为「屏幕外」的哨兵值：X/Y 都是 -1，两个调用方的
  // `<= 下界` 分支都能命中，行为等同「这一点投影不出来，别显示」。
  // ---------------------------------------------------------------------
  if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) {
    return { screenX: -1, screenY: -1, onScreen: false };
  }

  // 屏幕可见性判断（边界可能需要根据宽高比调整，但先保持原样）
  const onScreen = xPrime < 0 && screenX > -0.1333 && screenX < 0.9333 && screenY > 0 && screenY < 0.6;

  // 应用偏移量
  const finalScreenX = screenX + (options.offsetScreenX || 0);
  const finalScreenY = screenY + (options.offsetScreenY || 0);

  return { screenX: finalScreenX, screenY: finalScreenY, onScreen };
}
