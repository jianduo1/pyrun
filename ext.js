
// VSCode 扩展主入口文件
"use strict";


// 引入 VSCode API 和 path 路径处理模块
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

function getPythonPath(uri, cwd) {

  // 获取工作区根目录（绝对路径）
  let wsRoot = vscode.workspace.workspaceFolders[0].uri.fsPath + path.sep;
  // 获取当前 Python 文件的相对路径
  const filePath = uri
    ? uri.fsPath.replace(wsRoot, "")
    : vscode.window.activeTextEditor.document.fileName.replace(wsRoot, "");

  // 按路径分割
  const splittedPath = filePath.split(path.sep);
  // 检查是否为 Python 文件
  if (splittedPath.length === 0 || !splittedPath[splittedPath.length - 1].endsWith(".py")) {
    return "";
  }
  // 取出文件名
  const fileName = splittedPath.pop();

  // 只保留包层级目录（不包括文件扩展名）
  let pythonPathArr = [fileName.substring(0, fileName.lastIndexOf("."))];
  // 将包层级目录（不包括最后的文件名）加入 pythonPathArr
  while (splittedPath.length > 0) {
    pythonPathArr.unshift(splittedPath.pop());
  }
  // 返回以点分隔的包路径（如 a.b.c）
  return pythonPathArr.join(".");
}

function runPython(uri) {

  // 获取扩展配置
  const config = vscode.workspace.getConfiguration("pyrun");
  // 是否运行前自动保存当前文件
  const saveBeforeRun = config.get("saveBeforeRun", false);
  if (saveBeforeRun && vscode.window.activeTextEditor) {
    vscode.window.activeTextEditor.document.save();
  }

  // 获取或创建 VSCode 终端
  let terminal = vscode.window.activeTerminal || vscode.window.createTerminal();
  terminal.show(true);

  // 获取终端当前工作目录
  let cwd = undefined;
  if (terminal.creationOptions && terminal.creationOptions.cwd) {
    cwd = terminal.creationOptions.cwd;
  } else if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    cwd = vscode.workspace.workspaceFolders[0].uri.fsPath;
  }
  // 保证 cwd 是字符串类型
  if (cwd && typeof cwd !== "string" && cwd.fsPath) {
    cwd = cwd.fsPath;
  }

  // 获取 Python 包路径（如 a.b.c）
  const pythonPath = getPythonPath(uri, cwd);
  // 获取 Python 命令（可自定义配置）
  const pythonCmd = config.get("pythonPath") || "python3";
  // 组装运行命令
  let runCmd = `${pythonCmd} -m ${pythonPath}`;
  // 在终端执行命令
  terminal.sendText(runCmd);
}


// 更新按钮显示状态
function updateButtonVisibility() {
  const config = vscode.workspace.getConfiguration("pyrun");
  // 读取配置项的值
  const enableContextMenu = config.get("enableContextMenu", true);
  const enableEditorButton = config.get("enableEditorButton", true);
  const enableRunMenu = config.get("enableRunMenu", true);
  
  // 在VSCode中，when子句中的config.pyrun.enableXXX会自动读取配置值
  // 所以这里不需要手动设置上下文变量
  // 但我们可以在控制台输出日志，方便调试
  console.log(`PyRun按钮显示状态: 右键菜单=${enableContextMenu}, 编辑器标题=${enableEditorButton}, 运行菜单=${enableRunMenu}`);
}

// VSCode 扩展激活函数
function activate(context) {
  try {
    console.log('PyRun 扩展开始激活...');
    
    // 注册命令 extension.runPython，绑定到 runPython 方法
    let disposable = vscode.commands.registerCommand("extension.runPython", runPython);
    context.subscriptions.push(disposable);


    
    // 初始化按钮显示状态
    updateButtonVisibility();
    
    // 监听配置变化
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(event => {
        try {
          // 检查是否是我们的配置项发生了变化
          if (event.affectsConfiguration("pyrun")) {
            updateButtonVisibility();
          }
        } catch (error) {
          console.error('配置变化处理失败:', error);
        }
      })
    );
    
    // 文件重命名/移动监听功能已迁移到 'Python Auto Update Import' 扩展
    
    console.log('PyRun 扩展已激活 (导入更新功能已迁移到独立扩展)');
    
  } catch (error) {
    console.error('PyRun 扩展激活失败:', error);
    vscode.window.showErrorMessage(`PyRun 扩展激活失败: ${error.message}`);
  }
}


exports.activate = activate;


// 导入更新控制器已迁移到独立扩展

// VSCode 扩展停用函数
function deactivate() {}
exports.deactivate = deactivate;