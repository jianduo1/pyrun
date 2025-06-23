"use strict";

const vscode = require("vscode");
const path = require("path");

function getPythonPath(uri, cwd) {
    // cwd: 当前终端目录，绝对路径
    let wsRoot = vscode.workspace.workspaceFolders[0].uri.fsPath + path.sep;
    const filePath = uri
        ? uri.fsPath.replace(wsRoot, "")
        : vscode.window.activeTextEditor.document.fileName.replace(wsRoot, "");

    const splittedPath = filePath.split(path.sep);
    if (
        splittedPath.length === 0 ||
        !splittedPath[splittedPath.length - 1].endsWith(".py")
    ) {
        return "";
    }
    const fileName = splittedPath.pop();
    let pythonPathArr = [fileName.substring(0, fileName.lastIndexOf("."))];
    while (splittedPath.length > 0) {
        pythonPathArr.unshift(splittedPath.pop());
    }
    let pythonPath = pythonPathArr.join(".");
    // 直接返回完整包路径（不再裁剪）
    return pythonPath;
}

function runPython(uri) {
    // 运行前自动保存当前文件
    const config = vscode.workspace.getConfiguration('pyrun');
    const saveBeforeRun = config.get('saveBeforeRun', false);
    if (saveBeforeRun && vscode.window.activeTextEditor) {
        vscode.window.activeTextEditor.document.save();
    }
    // 获取当前终端目录
    let terminal = vscode.window.activeTerminal || vscode.window.createTerminal();
    terminal.show(true);
    // 获取终端当前目录（通过 VSCode API）
    let cwd = undefined;
    if (terminal.creationOptions && terminal.creationOptions.cwd) {
        cwd = terminal.creationOptions.cwd;
    } else if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        cwd = vscode.workspace.workspaceFolders[0].uri.fsPath;
    }
    // 保证cwd是字符串
    if (cwd && typeof cwd !== "string" && cwd.fsPath) {
        cwd = cwd.fsPath;
    }
    const pythonPath = getPythonPath(uri, cwd);
    // 获取wsRoot用于PYTHONPATH
    let wsRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const pythonCmd = config.get('pythonPath') || 'python3';
    terminal.sendText('PYTHONPATH="' + wsRoot + '" ' + pythonCmd + ' -m ' + pythonPath);
}

function activate(context) {
    
    let disposable = vscode.commands.registerCommand(
        "extension.runPython",
        runPython
    );
    context.subscriptions.push(disposable);

}

exports.activate = activate;

function deactivate() { }
exports.deactivate = deactivate;
