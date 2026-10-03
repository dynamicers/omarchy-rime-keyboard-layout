# omarchy-rime-keyboard-layout

插件名称、ID、bar 模块名称及 IPC target 均为 `omarchy-rime-keyboard-layout`。
基于 Omarchy 自带键盘布局组件的监视和键盘选择逻辑。

## 显示优先级

| 状态 | 默认显示 |
| --- | --- |
| Fcitx5 激活，当前输入法为 Rime，ASCII 模式关闭 | `中` |
| Fcitx5 激活，当前输入法为 Rime，ASCII 模式开启 | `EN` |
| Fcitx5 激活，当前输入法不是 Rime | 该输入法的原生短标记 |
| Rime 模式接口不可用或查询失败 | Rime 原生短标记（如 `ㄓ`），不猜测中英文 |
| Fcitx5 未激活、未运行或控制器查询失败 | XKB 键盘布局，例如 `EN` |

只有一个 XKB 布局也保持显示。Fcitx5 激活时使用强调色；悬停查看
完整输入法名称、输入法 ID、Rime 模式、键盘布局和操作提示。

Rime 中英文状态通过 fcitx5-rime 专用 D-Bus 接口读取：
`org.fcitx.Fcitx5` → `/rime` → `org.fcitx.Fcitx.Rime1.IsAsciiMode`。
`true` 表示 Rime ASCII 英文模式，`false` 表示非 ASCII 模式（通常为中文）。
它不是 Fcitx5 的激活标志，也不是凭方案名或原生标记推测。

该接口描述 Fcitx5 **最近的输入上下文**。切换应用时会额外刷新；
没有有效输入上下文时，上游接口可能默认返回 false。本插件不能将
非 ASCII 模式泛化为“任何 Rime 方案都是中文”。插件只查询，不更改 Rime 模式。

## 操作

- 左键：Fcitx5 运行时切换激活/未激活状态；未运行时切换 XKB 布局。
- 右键或滚轮：切换监视中的键盘的 XKB 布局，需要配置多个布局。
- 不会因为查询或点击而启动 Fcitx5。

## 设置

在 `~/.config/omarchy/shell.json` 的 bar layout 项中配置：

```json
{
  "id": "omarchy-rime-keyboard-layout",
  "pollInterval": 750,
  "rimeChineseLabel": "中",
  "rimeEnglishLabel": "EN",
  "inputMethodLabels": {
    "rime": "Rime",
    "pinyin": "拼"
  }
}
```

所有字段除 `id` 外均可省略：

- `pollInterval`：轮询间隔，默认 750ms，最小 250ms；窗口焦点改变后
  100ms 再额外刷新一次。Rime Shift 中英文切换由轮询检测。
- `rimeChineseLabel` / `rimeEnglishLabel`：Rime 中英文模式标记。
- `inputMethodLabels`：按输入法 ID 覆盖原生标记。Rime 模式成功查询时，
  模式标记优先；`inputMethodLabels.rime` 仅作为模式不可用时的回退。

## 实现与依赖

- `RimeKeyboardLayout.qml`：bar 组件、Hyprland 事件、焦点变化、有界轮询、
  超时处理及 IPC 诊断。
- `KeyboardLayoutModel.js`：XKB 缩写及键盘选择。排除 Fcitx5 虚拟键盘、
  电源按钮等设备，保留上游多键盘处理逻辑。
- `InputStateModel.js`：显示优先级、Rime 模式与自定义标记。
- `fcitx-state.sh`：只读快照。使用 `busctl --auto-start=no`，每次调用
  限时 1 秒。旧版无 `CurrentInputMethodInfo` 时退回
  `fcitx5-remote --check -n`。只有激活的 Rime 才查询 `IsAsciiMode`。
- 模式未知使用 `asciiMode: null`；不能把查询错误或 false 误判成英文。
- 查询不重叠，QML watchdog 在 3.5 秒后终止卡住的输入法查询。
  控制器和 Rime 接口没有对应变更信号，因此使用轮询。

依赖：Omarchy shell / Quickshell、Hyprland、bash、busctl、jq、timeout。
Fcitx5、fcitx5-rime 可选；`xkbcli` 用于上游布局缩写代码表。

## 验证与诊断

```bash
omarchy plugin validate ~/.config/omarchy/plugins/omarchy-rime-keyboard-layout
node ~/.config/omarchy/plugins/omarchy-rime-keyboard-layout/tests/model.cjs
node ~/.config/omarchy/plugins/omarchy-rime-keyboard-layout/tests/snapshot.cjs
omarchy-shell omarchy-rime-keyboard-layout status
omarchy-shell omarchy-rime-keyboard-layout refresh
```

测试覆盖 Rime 中英文、模式接口缺失/异常、自定义标记、其他输入法、
Fcitx5 激活/未激活/未运行、旧 API 回退及键盘选择。
快照测试使用模拟命令，不更改真实输入法状态。

诊断输出包含 `label`、`fcitx.asciiMode`、`keyboard`、`layout` 等字段。
保存插件代码和 shell.json 后支持热重载；若有旧组件缓存，可执行
`omarchy restart shell`。
