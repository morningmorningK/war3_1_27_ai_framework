/** @noSelfInFile */

import { Dialog } from "../system/ui/component/Dialog";

import { TextColors } from "../system/ui/component/Text";

/**
 * Dialog 组件使用示例
 */
export function runDialogExamples(): void {
  print("=== Dialog Component Examples ===");

  // 测试对话框 - 包含标题栏隐藏功能测试
  testDialogWithTitleToggle();

  // ==================== 示例 1: 基本对话框 ====================
  // example1_BasicDialog();

  // ==================== 示例 2: 确认对话框 ====================
  // example2_ConfirmDialog();

  // ==================== 示例 3: 选择对话框 ====================
  // example3_ChoiceDialog();

  // ==================== 示例 4: 自定义样式对话框 ====================
  // example4_CustomDialog();

  // ==================== 示例 5: 动态添加按钮 ====================
  // example5_DynamicButtons();

  print("=== Dialog Examples Complete ===");
}

/**
 * 示例 1: 基本对话框
 */
/* function example1_BasicDialog(): void {
  print("\n--- Example 1: Basic Dialog ---");

  const dialog = new Dialog("选择难度", 500, 300);
  dialog.create();

  // 添加按钮
  dialog.addButton({
    text: "简单",
    onClick: () => {
      print("选择了简单难度");
      dialog.hide();
    },
    color: TextColors.GREEN
  });

  dialog.addButton({
    text: "普通",
    onClick: () => {
      print("选择了普通难度");
      dialog.hide();
    },
    color: TextColors.YELLOW
  });

  dialog.addButton({
    text: "困难",
    onClick: () => {
      print("选择了困难难度");
      dialog.hide();
    },
    color: TextColors.RED
  });

  // 默认隐藏，等待显示
  dialog.hide();

  print("✓ 创建了基本对话框");
  print("  提示: 调用 dialog.show() 显示对话框");
} */

/**
 * 示例 2: 确认对话框
 */
/* function example2_ConfirmDialog(): void {
  print("\n--- Example 2: Confirm Dialog ---");

  const confirmDialog = Dialog.createConfirm(
    "确认操作",
    "你确定要继续吗？",
    () => {
      print('用户点击了"是"');
      // 执行确认操作
    },
    () => {
      print('用户点击了"否"');
      // 取消操作
    }
  );

  confirmDialog.hide(); // 默认隐藏

  print("✓ 创建了确认对话框");
} */

/**
 * 示例 3: 选择对话框
 */
/* function example3_ChoiceDialog(): void {
  print("\n--- Example 3: Choice Dialog ---");

  const options = ["战士", "法师", "刺客", "牧师", "猎人"];

  const choiceDialog = Dialog.createChoice(
    "选择职业",
    options,
    (index) => {
      print("选择了: " + options[index] + " (索引 " + index + ")");
      // 根据选择执行相应逻辑
    }
  );

  choiceDialog.hide();

  print("✓ 创建了选择对话框，包含 " + options.length + " 个选项");
} */

/**
 * 示例 4: 自定义样式对话框
 */
/* function example4_CustomDialog(): void {
  print("\n--- Example 4: Custom Styled Dialog ---");

  const customDialog = new Dialog("设置", 450, 400);
  customDialog.create();

  // 自定义样式
  customDialog.configure({
    titleColor: TextColors.CYAN,
    background: "UI\\Widgets\\Glues\\GlueScreen-DialogBackground.blp",
    alpha: 250,
    buttonStartY: 60,
    buttonSpacing: 70,
    buttonHeight: 55,
    buttonWidthRatio: 0.7
  });

  // 添加设置项按钮
  customDialog.addButton({
    text: "音效设置",
    onClick: () => {
      print("打开音效设置");
    },
    color: TextColors.WHITE
  });

  customDialog.addButton({
    text: "画面设置",
    onClick: () => {
      print("打开画面设置");
    },
    color: TextColors.WHITE
  });

  customDialog.addButton({
    text: "控制设置",
    onClick: () => {
      print("打开控制设置");
    },
    color: TextColors.WHITE
  });

  customDialog.addButton({
    text: "返回",
    onClick: () => {
      print("关闭设置");
      customDialog.hide();
    },
    color: TextColors.ORANGE
  });

  customDialog.hide();

  print("✓ 创建了自定义样式对话框");
} */

/**
 * 示例 5: 动态添加/移除按钮
 */
/* function example5_DynamicButtons(): void {
  print("\n--- Example 5: Dynamic Buttons ---");

  const dynamicDialog = new Dialog("动态按钮", 500, 400);
  dynamicDialog.create();

  let buttonCount = 0;

  // 添加"添加按钮"按钮
  dynamicDialog.addButton({
    text: "添加按钮",
    onClick: () => {
      buttonCount++;
      dynamicDialog.addButton({
        text: "按钮 " + buttonCount,
        onClick: () => {
          print("点击了按钮 " + buttonCount);
        },
        color: TextColors.CYAN
      });
      print("添加了按钮 " + buttonCount);
    },
    color: TextColors.GREEN
  });

  // 添加"移除最后按钮"按钮
  dynamicDialog.addButton({
    text: "移除最后按钮",
    onClick: () => {
      const buttons = dynamicDialog.getButtons();
      if (buttons.length > 2) { // 保留前两个控制按钮
        dynamicDialog.removeButton(buttons.length - 1);
        print("移除了最后一个按钮");
      } else {
        print("没有可移除的按钮");
      }
    },
    color: TextColors.RED
  });

  dynamicDialog.hide();

  print("✓ 创建了动态按钮对话框");
  print("  提示: 可以动态添加和移除按钮");
} */

/**
 * 完整示例：游戏菜单
 */
export function createGameMenuDialog(): Dialog {
  print("\n=== Creating Game Menu Dialog ===");

  const menuDialog = Dialog.createCentered("游戏菜单", 450, 450);

  menuDialog.configure({
    titleColor: TextColors.GOLD,
    alpha: 240,
    buttonSpacing: 65
  });

  // 继续游戏
  menuDialog.addButton({
    text: "继续游戏",
    onClick: () => {
      print("继续游戏");
      menuDialog.hide();
    },
    color: TextColors.GREEN
  });

  // 保存游戏
  menuDialog.addButton({
    text: "保存游戏",
    onClick: () => {
      print("保存游戏");
      // 显示保存对话框
    },
    color: TextColors.CYAN
  });

  // 读取存档
  menuDialog.addButton({
    text: "读取存档",
    onClick: () => {
      print("读取存档");
      // 显示读取对话框
    },
    color: TextColors.CYAN
  });

  // 设置
  menuDialog.addButton({
    text: "设置",
    onClick: () => {
      print("打开设置");
      // 显示设置对话框
    },
    color: TextColors.WHITE
  });

  // 退出游戏
  menuDialog.addButton({
    text: "退出游戏",
    onClick: () => {
      print("退出游戏");
      // 显示退出确认对话框
      const exitConfirm = Dialog.createConfirm(
        "退出确认",
        "确定要退出游戏吗？",
        () => {
          print("退出游戏确认");
          // 执行退出逻辑
        }
      );
      exitConfirm.show();
    },
    color: TextColors.RED
  });

  menuDialog.hide();

  print("✓ 游戏菜单对话框创建完成");

  return menuDialog;
}

/**
 * 快速开始 - 最简单的用法
 */
export function quickStartDialog(): void {
  print("\n=== Quick Start: Dialog ===");

  // 方式 1: 基本对话框
  const dialog1 = new Dialog("标题", 500, 300);
  dialog1.create();
  dialog1.addButton({
    text: "确定",
    onClick: () => dialog1.hide()
  });

  // 方式 2: 确认对话框
  Dialog.createConfirm(
    "确认",
    "确定要执行此操作吗？",
    () => print("确认")
  );

  // 方式 3: 选择对话框
  Dialog.createChoice(
    "选择",
    ["选项1", "选项2", "选项3"],
    (index) => print("选择了选项" + (index + 1))
  );

  print("✓ 快速开始示例完成");
}

/**
 * 测试对话框标题栏显示/隐藏功能
 */
function testDialogWithTitleToggle(): void {
  print("\n--- Test: Dialog Title Bar Toggle & Dragging ---");

  // 创建带标题栏的对话框（可拖拽）
  const dialogWithTitle = new Dialog("可拖拽对话框", 450, 400);
  dialogWithTitle
    .setDraggable(true)  // 启用拖拽
    .create();
  
  // 设置拖拽回调
  dialogWithTitle
    .setOnDragStart(() => {
      print("开始拖拽对话框");
    })
    .setOnDragEnd((x, y) => {
      print("拖拽结束，新位置: (" + x + ", " + y + ")");
    })
    .setOnDragging((_x, _y) => {
      // print("拖拽中: (" + _x + ", " + _y + ")");  // 太频繁，注释掉
    });
  
  dialogWithTitle.addButton({
    text: "隐藏标题栏",
    onClick: () => {
      dialogWithTitle.setShowTitleBar(false);
      print("标题栏已隐藏");
    }
  });

  dialogWithTitle.addButton({
    text: "显示标题栏",
    onClick: () => {
      dialogWithTitle.setShowTitleBar(true);
      print("标题栏已显示");
    }
  });

  dialogWithTitle.addButton({
    text: "禁用拖拽",
    onClick: () => {
      dialogWithTitle.setDraggable(false);
      print("拖拽已禁用");
    }
  });

  dialogWithTitle.addButton({
    text: "启用拖拽",
    onClick: () => {
      dialogWithTitle.setDraggable(true);
      print("拖拽已启用");
    }
  });

  dialogWithTitle.addButton({
    text: "隐藏关闭按钮",
    onClick: () => {
      dialogWithTitle.setShowCloseButton(false);
      print("关闭按钮已隐藏");
    }
  });

  dialogWithTitle.addButton({
    text: "显示关闭按钮",
    onClick: () => {
      dialogWithTitle.setShowCloseButton(true);
      print("关闭按钮已显示");
    }
  });

  dialogWithTitle.addButton({
    text: "关闭",
    onClick: () => {
      dialogWithTitle.hide();
    },
    color: TextColors.RED
  });

  dialogWithTitle.show();

  // 创建无标题栏的对话框（不可拖拽）
  const dialogNoTitle = new Dialog("这个标题不会显示", 400, 300);
  dialogNoTitle
    .setShowTitleBar(false)  // 在 create 前设置
    .create();

  dialogNoTitle.setPosition(100, 100);  // 放在左上角

  dialogNoTitle.addButton({
    text: "无标题栏对话框",
    onClick: () => {
      print("这是一个没有标题栏的对话框");
    }
  });

  dialogNoTitle.addButton({
    text: "显示标题栏",
    onClick: () => {
      dialogNoTitle.setShowTitleBar(true);
      print("标题栏已启用");
    }
  });

  dialogNoTitle.addButton({
    text: "启用拖拽",
    onClick: () => {
      dialogNoTitle.setDraggable(true);
      print("拖拽已启用（需要标题栏才能拖拽）");
    }
  });

  dialogNoTitle.addButton({
    text: "关闭",
    onClick: () => {
      dialogNoTitle.hide();
    },
    color: TextColors.RED
  });

  dialogNoTitle.show();

  print("✓ 标题栏切换和拖拽测试对话框创建完成");
  print("  - 中间对话框: 可拖拽，可切换标题栏");
  print("  - 左上角对话框: 初始无标题栏，不可拖拽");
  print("  - 提示: 拖拽对话框需要鼠标在标题栏上按住拖动");
}

