# VSCode Python -m 极速运行增强插件

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=jack-duo.run-python-m"><img src="https://img.shields.io/visual-studio-marketplace/v/jack-duo.run-python-m?label=VS%20Marketplace" alt="VS Marketplace"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=jack-duo.run-python-m"><img src="https://img.shields.io/visual-studio-marketplace/d/jack-duo.run-python-m.svg?label=Installs" alt="Installs"></a>
  <a href="https://github.com/jianduo1/pyrun"><img src="https://img.shields.io/badge/version-0.1.0-blue.svg" alt="version"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="MIT"></a>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=jack-duo.run-python-m">
    <img src="icon.png" alt="icon" width="120" />
  </a>
</p>

<p align="center">
  <b>让你的 Python 项目在 VSCode 中以最优雅、最专业的方式运行！</b>
</p>

---

## 📦 插件信息

- **市场主页**：[run-python-m on VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=jack-duo.run-python-m)
- **安装命令**：
  ```shell
  ext install jack-duo.run-python-m
  ```
- **开源仓库**：[GitHub](https://github.com/jianduo1/pyrun)
- **协议**：[MIT License](https://opensource.org/licenses/MIT)

---

## 🚀 插件亮点
- **一键以 `python -m` 方式运行当前脚本**，自动识别包路径，彻底解决相对导入、包内模块引用等常见难题。
- **自动加入包层级目录到系统 PATH（多平台支持）**：运行时会自动将所有包层级目录（如 `a`、`a/b`、`a/b/c`）加入到系统 `PATH` 环境变量，已实现对 Windows、Linux、macOS 等多平台的兼容支持，便于多层级脚本查找和调用。
- **完美支持多种运行场景**：右键菜单、快捷键、编辑器按钮，随时随地高效启动。
- **智能兼容子目录**：无论你身处项目的哪个角落，均可一键运行，自动裁剪并推断模块路径。
- **自定义 Python 解释器**：支持通过配置项灵活指定 Python 命令，满足多环境/多版本需求。
- **多种运行方式可开关**：可按需开启/关闭右键菜单、编辑器按钮、顶部运行菜单等入口。
- **运行前自动保存**：可配置是否在运行前自动保存当前文件，避免运行到旧代码。
- **内置调试信息**：遇到路径或包引用问题？调试日志一目了然，助你快速定位。

---

## 🖼️ 场景演示

### 解决 VSCode 中 Python 相对路径引用难题
![](https://raw.githubusercontent.com/jianduo1/pyrun/main/assets/vscode-relative-import-demo.png)

### 多种运行方式，极致便捷
![](https://raw.githubusercontent.com/jianduo1/pyrun/main/assets/vscode-run-methods-demo.png)

---

## ⚙️ 高级功能与配置

| 配置项 | 类型 | 默认值 | 说明 |
| :--- | :---: | :---: | :--- |
| `pyrun.pythonPath` | string | `python3` | 自定义 python 命令路径（如 `python3`、`python`、`/usr/bin/python3` 等），用于运行 `python -m`。|
| `pyrun.saveBeforeRun` | boolean | `false` | 运行前是否自动保存当前文件。|
| `pyrun.enableContextMenu` | boolean | `true` | 是否在右键菜单显示运行按钮。|
| `pyrun.enableEditorButton` | boolean | `true` | 是否在编辑器标题栏显示运行按钮。|
| `pyrun.enableRunMenu` | boolean | `true` | 是否在顶部运行菜单显示运行按钮。|

**配置页面**

![](https://raw.githubusercontent.com/jianduo1/pyrun/main/assets/setting.png)

**配置示例：**
```json
{
  "pyrun.pythonPath": "pwd && python",
  "pyrun.saveBeforeRun": true,
  "pyrun.enableContextMenu": true,
  "pyrun.enableEditorButton": false,
  "pyrun.enableRunMenu": true
}
```
> 该配置将在运行前输出当前目录并自动保存当前文件，只在右键菜单和顶部运行菜单显示按钮。

---

## 💡 适用人群
- 需要频繁在 VSCode 中以包方式运行 Python 脚本的开发者
- 对多包、多目录项目有高效运行需求的工程师
- 希望一键解决相对导入、包引用等 Python 运行痛点的你

---

## 📚 开源与贡献
本插件开源，欢迎 Issue、PR 与建议！

---

让 Python 项目在 VSCode 下的运行体验，前所未有地丝滑与强大！