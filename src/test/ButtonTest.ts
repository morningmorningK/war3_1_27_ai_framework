/** @noSelfInFile */

import { Button } from "../system/ui/component/Button";
import { ScreenCoordinates } from "../system/ui/ScreenCoordinates";
import { UILayout } from "../system/ui/UILayout";

export function testButton(): void {
  print("=== Button Component Test ===");

  // 测试 1: 基本按钮创建
  const basicButton = new Button(
    "Basic Button",
    100,
    100,
    120,
    40,
    ScreenCoordinates.ORIGIN_TOP_LEFT
  );

  

  print(`Basic Button: Position(${basicButton.getPosition().x}, ${basicButton.getPosition().y}), Size(${basicButton.getSize().width}, ${basicButton.getSize().height})`);

  // 测试 2: 使用默认参数创建按钮
  const simpleButton = new Button("Simple Button", 200, 200);
  print(`Simple Button: Position(${simpleButton.getPosition().x}, ${simpleButton.getPosition().y})`);

  const customButton = new Button("Custom Button", 200, 250, 150, 50);
  print(`Custom Button: Position(${customButton.getPosition().x}, ${customButton.getPosition().y})`);

  // 测试 3: 坐标转换验证
  const centerButton = new Button(
    "Center Button",
    960,  // 屏幕中心X (1920/2)
    540,  // 屏幕中心Y (1080/2)
    160,
    50,
    ScreenCoordinates.ORIGIN_CENTER
  );

  const centerPos = centerButton.getPosition();
  const wc3Pos = ScreenCoordinates.pixelToWC3(centerPos.x, centerPos.y, ScreenCoordinates.ORIGIN_CENTER);
  print(`Center Button: Pixel(${centerPos.x}, ${centerPos.y}) -> WC3(${wc3Pos.x.toFixed(3)}, ${wc3Pos.y.toFixed(3)})`);

  // 测试 4: 位置和大小修改
  const dynamicButton = new Button("Dynamic Button", 400, 100);
  dynamicButton.setPosition(500, 200);
  dynamicButton.setSize(180, 60);
  
  const newPos = dynamicButton.getPosition();
  const newSize = dynamicButton.getSize();
  print(`Dynamic Button after changes: Position(${newPos.x}, ${newPos.y}), Size(${newSize.width}, ${newSize.height})`);

  // 测试 5: 使用预设尺寸创建按钮
  const presetButtons: Button[] = [];
  
  let offsetY = 300;
  Object.entries(UILayout.BUTTON_SIZES).forEach(([sizeName, size]) => {
    const button = new Button(
      `${sizeName} Button`,
      50,
      offsetY,
      size.width,
      size.height,
      ScreenCoordinates.ORIGIN_TOP_LEFT
    );
    presetButtons.push(button);
    print(`${sizeName} Button: Size(${size.width}x${size.height})`);
    offsetY += size.height + 10;
  });

  // 测试 6: 多个按钮的网格排列
  const gridButtons: Button[] = [];
  const startX = 50;
  const startY = 350;
  const buttonWidth = 100;
  const buttonHeight = 35;
  const spacing = 20;

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const x = startX + col * (buttonWidth + spacing);
      const y = startY + row * (buttonHeight + spacing);
      
      const button = new Button(
        `Grid ${row * 3 + col + 1}`,
        x,
        y,
        buttonWidth,
        buttonHeight,
        ScreenCoordinates.ORIGIN_TOP_LEFT
      );
      
      gridButtons.push(button);
      print(`Grid Button ${row * 3 + col + 1}: Position(${x}, ${y})`);
    }
  }

  print("=== Button Test Complete ===");
}