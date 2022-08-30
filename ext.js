"use strict";

const vscode = require("vscode");
const path = require("path");

function getPythonPath(uri) {
    let cwd = vscode.workspace.workspaceFolders[0].uri.fsPath+path.sep
    const filePath = uri
        ? uri.fsPath.replace(cwd,"")
        : vscode.window.activeTextEditor.document.fileName.replace(cwd,"");

    const splittedPath = filePath.split(path.sep);
    if (
        splittedPath.length === 0 ||
        !splittedPath[splittedPath.length - 1].endsWith(".py")
    ) {
        return "";
    }
    
    const fileName = splittedPath.pop();
    
    // removing extension
    let pythonPath = [fileName.substring(0, fileName.lastIndexOf("."))]
    
    while (
        splittedPath.length > 0 
    ) {
        pythonPath.unshift(splittedPath.pop());
        // vscode.window.showInformationMessage("splittedPath: "+splittedPath)
        // vscode.window.showInformationMessage("pythonPath: "+pythonPath)
    }

    return pythonPath.join(".");
}

function runPython(uri) {

    const pythonPath = getPythonPath(uri);
    // vscode.window.showInformationMessage("pythonPath: "+pythonPath)
    
    const terminal = vscode.window.activeTerminal || vscode.window.createTerminal();
    terminal.show(true);
    terminal.sendText("python3 -m "+pythonPath);

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
