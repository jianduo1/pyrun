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

## 🖼️ 使用场景

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

## 📚 开源与贡献
本插件开源，欢迎 Issue、PR 与建议！

## 📝 许可证
本插件遵循 MIT 许可证，详情请查看 [LICENSE](LICENSE) 文件。