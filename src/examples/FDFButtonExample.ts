import { Frame, FRAME_ALIGN_CENTER, FRAME_ALIGN_TOP } from "@eiriksgata/wc3ts/*";
import { FDFButtonBuilder, ButtonGroup } from "../system/ui/fdf/FDFButton";


/**
 * FDF按钮使用示例
 */
export class FDFButtonExample {
  private buttonGroup: ButtonGroup = new ButtonGroup();

  /**
   * 创建示例按钮集合
   */
  public createExampleButtons(): void {
    print("Creating FDF button examples...");

    // 示例1: 创建标准按钮
    this.createStandardButton();

    // 示例2: 创建大型按钮
    this.createLargeButton();

    // 示例3: 创建小型按钮
    this.createSmallButton();

    // 示例4: 创建图标按钮
    this.createIconButton();

    // 示例5: 创建按钮组
    this.createButtonArray();

    print("FDF button examples created!");
  }

  /**
   * 示例1: 创建标准按钮
   */
  private createStandardButton(): void {
    const button = FDFButtonBuilder.createButton(
      "StandardButtonExample",
      {
        text: "标准按钮",
        x: 0.4,
        y: 0.5,
        anchor: FRAME_ALIGN_CENTER,
        tooltip: "这是一个标准按钮",
        visible: true,
        enabled: true
      },
      {
        onClick: () => {
          print("标准按钮被点击了!");
          DisplayTimedTextToPlayer(GetLocalPlayer(), 0, 0, 5, "标准按钮被点击!");
        },
        onMouseEnter: () => {
          print("鼠标进入标准按钮");
        },
        onMouseLeave: () => {
          print("鼠标离开标准按钮");
        }
      }
    );

    this.buttonGroup.addButton("standard", button);
  }

  /**
   * 示例2: 创建大型按钮
   */
  private createLargeButton(): void {
    const button = FDFButtonBuilder.createLargeButton(
      "LargeButtonExample",
      {
        text: "大型按钮",
        x: 0.4,
        y: 0.4,
        anchor: FRAME_ALIGN_CENTER,
        tooltip: "这是一个大型按钮",
        hotkey: "Q",
        visible: true,
        enabled: true
      },
      {
        onClick: () => {
          print("大型按钮被点击了!");
          DisplayTimedTextToPlayer(GetLocalPlayer(), 0, 0, 5, "大型按钮被点击!");
        }
      }
    );

    this.buttonGroup.addButton("large", button);
  }

  /**
   * 示例3: 创建小型按钮
   */
  private createSmallButton(): void {
    const button = FDFButtonBuilder.createSmallButton(
      "SmallButtonExample",
      {
        text: "小型按钮",
        x: 0.4,
        y: 0.3,
        anchor: FRAME_ALIGN_CENTER,
        tooltip: "这是一个小型按钮"
      },
      {
        onClick: () => {
          print("小型按钮被点击了!");
          DisplayTimedTextToPlayer(GetLocalPlayer(), 0, 0, 5, "小型按钮被点击!");
        }
      }
    );

    this.buttonGroup.addButton("small", button);
  }

  /**
   * 示例4: 创建图标按钮
   */
  private createIconButton(): void {
    const button = FDFButtonBuilder.createIconButton(
      "IconButtonExample",
      {
        x: 0.5,
        y: 0.5,
        anchor: FRAME_ALIGN_CENTER,
        icon: "ReplaceableTextures\\CommandButtons\\BTNHeroArchMage.blp",
        tooltip: "这是一个图标按钮"
      },
      {
        onClick: () => {
          print("图标按钮被点击了!");
          DisplayTimedTextToPlayer(GetLocalPlayer(), 0, 0, 5, "图标按钮被点击!");
        }
      }
    );

    this.buttonGroup.addButton("icon", button);
  }

  /**
   * 示例5: 创建按钮数组（技能栏样式）
   */
  private createButtonArray(): void {
    const startX = 0.3;
    const startY = 0.2;
    const spacing = 0.04;

    for (let i = 0; i < 6; i++) {
      const button = FDFButtonBuilder.createIconButton(
        `SkillButton${i}`,
        {
          x: startX + (i * spacing),
          y: startY,
          icon: this.getSkillIcon(i),
          tooltip: `技能 ${i + 1}`,
          hotkey: this.getSkillHotkey(i)
        },
        {
          onClick: () => {
            print(`技能按钮 ${i + 1} 被点击!`);
            DisplayTimedTextToPlayer(
              GetLocalPlayer(),
              0,
              0,
              3,
              `使用技能 ${i + 1}`
            );
          }
        }
      );

      this.buttonGroup.addButton(`skill${i}`, button);
    }
  }

  /**
   * 获取技能图标路径
   */
  private getSkillIcon(index: number): string {
    const icons = [
      "ReplaceableTextures\\CommandButtons\\BTNHeroArchMage.blp",
      "ReplaceableTextures\\CommandButtons\\BTNHeroPaladin.blp",
      "ReplaceableTextures\\CommandButtons\\BTNHeroMountainKing.blp",
      "ReplaceableTextures\\CommandButtons\\BTNHeroBloodElfPrince.blp",
      "ReplaceableTextures\\CommandButtons\\BTNPeasant.blp",
      "ReplaceableTextures\\CommandButtons\\BTNFootman.blp"
    ];
    return icons[index] || icons[0];
  }

  /**
   * 获取技能热键
   */
  private getSkillHotkey(index: number): string {
    const hotkeys = ["Q", "W", "E", "R", "D", "F"];
    return hotkeys[index] || "";
  }

  /**
   * 显示所有按钮
   */
  public showAllButtons(): void {
    this.buttonGroup.showAll();
    print("All buttons shown");
  }

  /**
   * 隐藏所有按钮
   */
  public hideAllButtons(): void {
    this.buttonGroup.hideAll();
    print("All buttons hidden");
  }

  /**
   * 启用所有按钮
   */
  public enableAllButtons(): void {
    this.buttonGroup.enableAll();
    print("All buttons enabled");
  }

  /**
   * 禁用所有按钮
   */
  public disableAllButtons(): void {
    this.buttonGroup.disableAll();
    print("All buttons disabled");
  }

  /**
   * 清理所有按钮
   */
  public cleanup(): void {
    this.buttonGroup.destroyAll();
    print("All buttons destroyed");
  }
}

/**
 * 高级示例：动态菜单系统
 */
export class DynamicMenuExample {
  private menuButtons: ButtonGroup = new ButtonGroup();
  private currentMenu: string = "main";

  /**
   * 创建主菜单
   */
  public createMainMenu(): void {
    this.clearMenu();

    const menuItems = [
      { text: "开始游戏", action: () => this.startGame() },
      { text: "选项设置", action: () => this.showOptions() },
      { text: "关于", action: () => this.showAbout() },
      { text: "退出", action: () => this.exitGame() }
    ];

    const startY = 0.45;
    const spacing = 0.05;

    menuItems.forEach((item, index) => {
      const button = FDFButtonBuilder.createLargeButton(
        `MainMenu${index}`,
        {
          text: item.text,
          x: 0.4,
          y: startY - (index * spacing),
          anchor: FRAME_ALIGN_CENTER
        },
        {
          onClick: item.action
        }
      );

      this.menuButtons.addButton(`menu${index}`, button);
    });

    this.currentMenu = "main";
  }

  /**
   * 清理菜单
   */
  private clearMenu(): void {
    this.menuButtons.destroyAll();
  }

  /**
   * 开始游戏
   */
  private startGame(): void {
    print("Starting game...");
    DisplayTimedTextToPlayer(GetLocalPlayer(), 0, 0, 3, "游戏开始!");
    this.clearMenu();
  }

  /**
   * 显示选项
   */
  private showOptions(): void {
    print("Showing options...");
    DisplayTimedTextToPlayer(GetLocalPlayer(), 0, 0, 3, "打开选项菜单");
    // 这里可以创建选项子菜单
  }

  /**
   * 显示关于
   */
  private showAbout(): void {
    print("Showing about...");
    DisplayTimedTextToPlayer(GetLocalPlayer(), 0, 0, 3, "关于本游戏");
  }

  /**
   * 退出游戏
   */
  private exitGame(): void {
    print("Exiting game...");
    DisplayTimedTextToPlayer(GetLocalPlayer(), 0, 0, 3, "退出游戏");
  }
}

// 导出实例创建函数
export function createFDFButtonExamples(): FDFButtonExample {
  const example = new FDFButtonExample();
  example.createExampleButtons();
  return example;
}

export function createDynamicMenu(): DynamicMenuExample {
  const menu = new DynamicMenuExample();
  menu.createMainMenu();
  return menu;
}