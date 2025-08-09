// Python导入更新功能模块
"use strict";

const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

/**
 * Python 导入语句解析器
 */
class PythonImportParser {
  constructor() {
    // 匹配各种导入语句的正则表达式
    this.importRegexes = [
      // import module
      /^(\s*)import\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*(?:as\s+([a-zA-Z_][a-zA-Z0-9_]*))?\s*$/,
      // from module import item
      /^(\s*)from\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*|\.*[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s+import\s+(.+)$/,
      // from . import item (相对导入)
      /^(\s*)from\s+(\.+)\s+import\s+(.+)$/,
      // from .module import item (相对导入)
      /^(\s*)from\s+(\.+[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s+import\s+(.+)$/
    ];
  }

  /**
   * 解析文件中的所有导入语句
   */
  parseImports(content) {
    const lines = content.split('\n');
    const imports = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // 跳过注释和空行
      if (trimmedLine.startsWith('#') || trimmedLine === '') continue;
      
      for (const regex of this.importRegexes) {
        const match = line.match(regex);
        if (match) {
          imports.push({
            lineNumber: i,
            originalLine: line,
            indentation: match[1] || '',
            type: this.getImportType(match),
            module: match[2],
            items: match[3] || null,
            alias: match[4] || null
          });
          break;
        }
      }
    }
    
    return imports;
  }

  /**
   * 确定导入类型
   */
  getImportType(match) {
    if (match[0].includes('from')) {
      if (match[2].startsWith('.')) {
        return 'relative_from';
      }
      return 'absolute_from';
    }
    return 'absolute_import';
  }
}

/**
 * 路径计算工具类
 */
class PathCalculator {
  /**
   * 将文件路径转换为Python模块路径
   */
  static filePathToModulePath(filePath, workspaceRoot) {
    const relativePath = path.relative(workspaceRoot, filePath);
    const pathWithoutExt = relativePath.replace(/\.py$/, '');
    return pathWithoutExt.split(path.sep).join('.');
  }

  /**
   * 将Python模块路径转换为文件路径
   */
  static modulePathToFilePath(modulePath, workspaceRoot) {
    const filePath = modulePath.split('.').join(path.sep) + '.py';
    return path.join(workspaceRoot, filePath);
  }

  /**
   * 将Python模块路径转换为文件夹路径
   */
  static modulePathToFolderPath(modulePath, workspaceRoot) {
    const folderPath = modulePath.split('.').join(path.sep);
    return path.join(workspaceRoot, folderPath);
  }

  /**
   * 计算相对导入路径（统一处理文件和文件夹路径）
   */
  static calculateRelativeImport(fromFile, toPath, workspaceRoot, isFolder = false) {
    const fromDir = path.dirname(fromFile);
    // 如果不是文件夹，移除.py扩展名；如果是文件夹，保持原样
    const normalizedToPath = isFolder ? 
      path.relative(workspaceRoot, toPath) : 
      path.relative(workspaceRoot, toPath).replace(/\.py$/, '');
    const fromPath = path.relative(workspaceRoot, fromDir);
    
    const fromParts = fromPath === '' ? [] : fromPath.split(path.sep);
    const toParts = normalizedToPath === '' ? [] : normalizedToPath.split(path.sep);
    
    // 计算共同前缀
    let commonLength = 0;
    const minLength = Math.min(fromParts.length, toParts.length);
    for (let i = 0; i < minLength; i++) {
      if (fromParts[i] === toParts[i]) {
        commonLength++;
      } else {
        break;
      }
    }
    
    // 计算需要向上的层数
    const upLevels = fromParts.length - commonLength;
    
    // 构建相对路径
    let relativePath = '.'.repeat(upLevels + 1);
    const remainingParts = toParts.slice(commonLength);
    
    if (remainingParts.length > 0) {
      relativePath += remainingParts.join('.');
    }
    
    return relativePath;
  }

  /**
   * 更新导入语句
   */
  static updateImportStatement(importInfo, oldModulePath, newModulePath, fromFile, workspaceRoot) {
    const { type, module, items, indentation, alias } = importInfo;
    
    // 检查是否需要更新这个导入
    if (type === 'absolute_import' || type === 'absolute_from') {
      if (module === oldModulePath || module.startsWith(oldModulePath + '.')) {
        const updatedModule = module.replace(oldModulePath, newModulePath);
        
        if (type === 'absolute_import') {
          return `${indentation}import ${updatedModule}${alias ? ` as ${alias}` : ''}`;
        } else {
          return `${indentation}from ${updatedModule} import ${items}`;
        }
      }
    } else if (type === 'relative_from') {
      // 对于相对导入，需要重新计算路径
      // 这里简化处理，实际可能需要更复杂的逻辑
      const newRelativePath = PathCalculator.calculateRelativeImport(
        fromFile,
        PathCalculator.modulePathToFilePath(newModulePath, workspaceRoot),
        workspaceRoot
      );
      return `${indentation}from ${newRelativePath} import ${items}`;
    }
    
    return null; // 不需要更新
  }

  /**
   * 更新文件内部的相对导入语句（当文件本身位置改变时）
   */
  static updateRelativeImportsForMovedFile(importInfo, oldFilePath, newFilePath, workspaceRoot) {
    const { type, module, items, indentation } = importInfo;
    
    // 只处理相对导入
    if (type !== 'relative_from') {
      return null;
    }
    
    // 解析相对导入的目标
    const currentDir = path.dirname(oldFilePath);
    const relativePath = module;
    
    // 计算相对导入指向的实际目标路径
    let targetPath = currentDir;
    let dotCount = 0;
    
    // 计算点的数量
    for (let i = 0; i < relativePath.length && relativePath[i] === '.'; i++) {
      dotCount++;
    }
    
    // 向上移动对应的层级
    for (let i = 1; i < dotCount; i++) {
      targetPath = path.dirname(targetPath);
    }
    
    // 添加剩余的路径部分
    const remainingPath = relativePath.substring(dotCount);
    if (remainingPath) {
      targetPath = path.join(targetPath, remainingPath.split('.').join(path.sep));
    }
    
    // 添加.py扩展名来构成完整的目标文件路径
    const targetFilePath = targetPath + '.py';
    
    // 从新文件位置重新计算相对导入路径
    const newRelativePath = PathCalculator.calculateRelativeImport(
      newFilePath,
      targetFilePath,
      workspaceRoot
    );
    
    return `${indentation}from ${newRelativePath} import ${items}`;
  }
}

/**
 * 文件扫描器
 */
class FileScanner {
  /**
   * 检查路径是否为目录
   */
  async isDirectory(path) {
    try {
      const stat = await fs.promises.stat(path);
      return stat.isDirectory();
    } catch (error) {
      return false;
    }
  }

  /**
   * 扫描指定目录中的所有Python文件
   */
  async scanPythonFilesInDirectory(dirPath) {
    console.log(`扫描目录中的Python文件: ${dirPath}`);
    const pythonFiles = [];
    
    const scanDirectory = async (dir, depth = 0) => {
      // 限制扫描深度，避免过深的目录结构
      if (depth > 10) {
        return;
      }
      
      try {
        const items = await fs.promises.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          
          if (item.isDirectory()) {
            // 扩展忽略目录列表
            const ignoreDirs = [
              '__pycache__', '.git', 'node_modules', '.vscode', 
              'venv', '.env', '.pytest_cache', 'build', 'dist',
              '.mypy_cache', '.coverage', 'htmlcov'
            ];
            
            if (!ignoreDirs.includes(item.name)) {
              await scanDirectory(fullPath, depth + 1);
            }
          } else if (item.isFile() && item.name.endsWith('.py')) {
            pythonFiles.push(fullPath);
          }
        }
      } catch (error) {
        // 目录扫描失败时不要阻塞整个过程
        console.warn(`跳过目录扫描: ${dir} (${error.message})`);
      }
    };
    
    await scanDirectory(dirPath);
    
    console.log(`在目录 ${dirPath} 中找到 ${pythonFiles.length} 个Python文件`);
    return pythonFiles;
  }

  /**
   * 扫描工作区中的所有Python文件
   */
  async scanPythonFiles(workspaceRoot) {
    console.log('开始扫描Python文件...');
    const pythonFiles = [];
    
    const scanDirectory = async (dir, depth = 0) => {
      // 限制扫描深度，避免过深的目录结构
      if (depth > 10) {
        return;
      }
      
      try {
        const items = await fs.promises.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          
          if (item.isDirectory()) {
            // 扩展忽略目录列表
            const ignoreDirs = [
              '__pycache__', '.git', 'node_modules', '.vscode', 
              'venv', '.env', '.pytest_cache', 'build', 'dist',
              '.mypy_cache', '.coverage', 'htmlcov'
            ];
            
            if (!ignoreDirs.includes(item.name)) {
              await scanDirectory(fullPath, depth + 1);
            }
          } else if (item.isFile() && item.name.endsWith('.py')) {
            pythonFiles.push(fullPath);
          }
        }
      } catch (error) {
        // 目录扫描失败时不要阻塞整个过程
        console.warn(`跳过目录扫描: ${dir} (${error.message})`);
      }
    };
    
    await scanDirectory(workspaceRoot);
    
    console.log(`扫描完成，找到 ${pythonFiles.length} 个Python文件`);
    return pythonFiles;
  }

  /**
   * 查找引用了指定模块的文件
   */
  async findFilesReferencingModule(modulePath, workspaceRoot) {
    const pythonFiles = await this.scanPythonFiles(workspaceRoot);
    const referencingFiles = [];
    const parser = new PythonImportParser();
    
    // 显示进度
    const totalFiles = pythonFiles.length;
    let processedFiles = 0;
    
    if (totalFiles > 50) {
      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "正在扫描导入引用...",
        cancellable: false
      }, async (progress) => {
        return this.processFiles(pythonFiles, modulePath, parser, referencingFiles, progress);
      });
    } else {
      await this.processFiles(pythonFiles, modulePath, parser, referencingFiles);
    }
    
    return referencingFiles;
  }

  /**
   * 批量处理文件
   */
  async processFiles(pythonFiles, modulePath, parser, referencingFiles, progress = null) {
    const batchSize = 10; // 批处理大小
    const batches = [];
    
    // 将文件分批处理
    for (let i = 0; i < pythonFiles.length; i += batchSize) {
      batches.push(pythonFiles.slice(i, i + batchSize));
    }
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      // 并行处理批次内的文件
      const batchPromises = batch.map(async (file) => {
        try {
          // 首先快速检查文件是否可能包含导入
          const content = await fs.promises.readFile(file, 'utf8');
          
          // 快速预检查：如果文件不包含import关键字，跳过
          if (!content.includes('import') && !content.includes('from')) {
            return null;
          }
          
          // 进一步检查：如果不包含模块名，跳过
          const moduleBaseName = modulePath.split('.')[0];
          if (!content.includes(moduleBaseName)) {
            return null;
          }
          
          const imports = parser.parseImports(content);
          const matchingImports = imports.filter(imp => 
            imp.module === modulePath || 
            (imp.module && imp.module.startsWith(modulePath + '.'))
          );
          
          if (matchingImports.length > 0) {
            return {
              file,
              imports: matchingImports
            };
          }
          
          return null;
        } catch (error) {
          console.error(`读取文件失败: ${file}`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      // 收集有效结果
      batchResults.forEach(result => {
        if (result) {
          referencingFiles.push(result);
        }
      });
      
      // 更新进度
      if (progress) {
        const progressPercent = ((batchIndex + 1) / batches.length) * 100;
        progress.report({ 
          increment: 100 / batches.length,
          message: `已处理 ${(batchIndex + 1) * batchSize}/${pythonFiles.length} 个文件`
        });
      }
      
      // 短暂延迟，避免阻塞UI
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}

/**
 * 导入更新主控制器
 */
class ImportUpdateController {
  constructor() {
    this.parser = new PythonImportParser();
    this.fileScanner = new FileScanner();
    this.isProcessing = false; // 防止并发处理
    this.statusItem = null; // 状态栏项目
  }

  /**
   * 创建或更新状态栏显示
   */
  updateStatus(text, autoDispose = false, delay = 5000) {
    if (this.statusItem) {
      this.statusItem.text = text;
    } else {
      this.statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
      this.statusItem.text = text;
      this.statusItem.show();
    }

    if (autoDispose) {
      setTimeout(() => {
        if (this.statusItem) {
          this.statusItem.dispose();
          this.statusItem = null;
        }
      }, delay);
    }
  }

  /**
   * 清理状态栏
   */
  clearStatus() {
    if (this.statusItem) {
      this.statusItem.dispose();
      this.statusItem = null;
    }
  }

  /**
   * 处理文件夹移动并更新其中所有Python文件的导入引用
   */
  async handleFolderMove(oldPath, newPath, workspaceRoot) {
    console.log(`处理文件夹移动: ${oldPath} -> ${newPath}`);
    
    // 获取文件夹中的所有Python文件
    const pythonFiles = await this.fileScanner.scanPythonFilesInDirectory(newPath);
    
    if (pythonFiles.length === 0) {
      console.log('文件夹中没有Python文件，无需处理');
      return;
    }
    
    console.log(`文件夹中包含 ${pythonFiles.length} 个Python文件，开始处理导入更新`);
    
    this.updateStatus("$(sync~spin) 正在处理文件夹移动...");
    
    try {
      // 转换为模块路径
      const oldFolderModulePath = PathCalculator.filePathToModulePath(oldPath, workspaceRoot);
      const newFolderModulePath = PathCalculator.filePathToModulePath(newPath, workspaceRoot);
      
      console.log(`文件夹模块路径变化: ${oldFolderModulePath} -> ${newFolderModulePath}`);
      
      // 1. 更新所有文件中对被移动文件夹内容的导入引用
      this.updateStatus("$(sync~spin) 正在更新全局导入引用...");
      await this.updateAllImportsForFolderMove(oldFolderModulePath, newFolderModulePath, workspaceRoot);
      
      // 2. 更新被移动文件夹内文件的相对导入
      this.updateStatus("$(sync~spin) 正在更新被移动文件的相对导入...");
      let relativeImportUpdatedCount = 0;
      for (const newFilePath of pythonFiles) {
        // 计算对应的旧文件路径
        const relativePath = path.relative(newPath, newFilePath);
        const oldFilePath = path.join(oldPath, relativePath);
        
        const updated = await this.updateRelativeImportsInMovedFile(oldFilePath, newFilePath, workspaceRoot);
        if (updated) {
          relativeImportUpdatedCount++;
        }
      }
      
      this.updateStatus("$(check) 文件夹移动处理完成", true);
      
      // 构建更详细的完成消息
      let message = `✅ 文件夹移动完成！`;
      message += `\n📁 已处理 ${pythonFiles.length} 个被移动的Python文件`;
      if (relativeImportUpdatedCount > 0) {
        message += `\n🔄 更新了 ${relativeImportUpdatedCount} 个文件的相对导入`;
      } else {
        message += `\n📝 被移动文件中没有需要更新的相对导入`;
      }
      
      vscode.window.showInformationMessage(message);
      
    } catch (error) {
      this.clearStatus();
      throw error;
    }
  }

  /**
   * 更新所有文件中对被移动文件夹的导入引用
   */
  async updateAllImportsForFolderMove(oldFolderModulePath, newFolderModulePath, workspaceRoot) {
    // 扫描所有Python文件
    const allPythonFiles = await this.fileScanner.scanPythonFiles(workspaceRoot);
    
    let updatedFileCount = 0;
    
    for (const filePath of allPythonFiles) {
      try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        const imports = this.parser.parseImports(content);
        const lines = content.split('\n');
        let fileModified = false;
        
        for (const importInfo of imports) {
          const updatedLine = this.updateImportForFolderMove(
            importInfo, oldFolderModulePath, newFolderModulePath, filePath, workspaceRoot
          );
          
          if (updatedLine && updatedLine !== importInfo.originalLine) {
            lines[importInfo.lineNumber] = updatedLine;
            fileModified = true;
            console.log(`更新导入: ${importInfo.originalLine.trim()} -> ${updatedLine.trim()}`);
          }
        }
        
        if (fileModified) {
          await fs.promises.writeFile(filePath, lines.join('\n'), 'utf8');
          updatedFileCount++;
          console.log(`已更新文件: ${filePath}`);
        }
        
      } catch (error) {
        console.error(`处理文件失败: ${filePath}`, error);
      }
    }
    
    console.log(`文件夹移动：共更新了 ${updatedFileCount} 个文件的导入引用`);
    console.log(`全局导入更新：${updatedFileCount > 0 ? `成功更新了 ${updatedFileCount} 个文件` : '没有找到需要更新的导入引用'}`);
  }

  /**
   * 更新单个导入语句（文件夹移动专用）
   */
  updateImportForFolderMove(importInfo, oldFolderModulePath, newFolderModulePath, fromFile, workspaceRoot) {
    const { type, module, items, indentation, alias } = importInfo;
    
    if (type === 'absolute_import' || type === 'absolute_from') {
      // 检查是否导入了被移动文件夹中的内容
      if (module === oldFolderModulePath || module.startsWith(oldFolderModulePath + '.')) {
        const updatedModule = module.replace(oldFolderModulePath, newFolderModulePath);
        
        if (type === 'absolute_import') {
          return `${indentation}import ${updatedModule}${alias ? ` as ${alias}` : ''}`;
        } else {
          return `${indentation}from ${updatedModule} import ${items}`;
        }
      }
    } else if (type === 'relative_from') {
      // 对于相对导入，需要检查是否指向被移动的文件夹
      const fromDir = path.dirname(fromFile);
      const targetPath = this.resolveRelativeImportTarget(module, fromDir, workspaceRoot);
      const oldFolderPath = PathCalculator.modulePathToFolderPath(oldFolderModulePath, workspaceRoot);
      
      if (targetPath) {
        // 检查目标路径是否等于或在被移动的文件夹内
        const normalizedTargetPath = path.normalize(targetPath);
        const normalizedOldFolderPath = path.normalize(oldFolderPath);
        
        if (normalizedTargetPath === normalizedOldFolderPath || 
            normalizedTargetPath.startsWith(normalizedOldFolderPath + path.sep)) {
          
          // 计算新的目标路径
          const newFolderPath = PathCalculator.modulePathToFolderPath(newFolderModulePath, workspaceRoot);
          const newTargetPath = normalizedTargetPath.replace(normalizedOldFolderPath, newFolderPath);
          
          // 重新计算相对导入路径
          const newRelativePath = PathCalculator.calculateRelativeImport(
            fromFile, newTargetPath, workspaceRoot, true
          );
          
          return `${indentation}from ${newRelativePath} import ${items}`;
        }
      }
    }
    
    return null; // 不需要更新
  }

  /**
   * 解析相对导入的目标路径
   */
  resolveRelativeImportTarget(relativePath, fromDir, workspaceRoot) {
    try {
      let targetPath = fromDir;
      let dotCount = 0;
      
      // 计算点的数量
      for (let i = 0; i < relativePath.length && relativePath[i] === '.'; i++) {
        dotCount++;
      }
      
      // 向上移动对应的层级（点数-1，因为第一个点表示当前包）
      for (let i = 1; i < dotCount; i++) {
        targetPath = path.dirname(targetPath);
      }
      
      // 添加剩余的路径部分
      const remainingPath = relativePath.substring(dotCount);
      if (remainingPath) {
        targetPath = path.join(targetPath, remainingPath.split('.').join(path.sep));
      }
      
      return targetPath;
    } catch (error) {
      console.error('解析相对导入目标失败:', error);
      return null;
    }
  }

  /**
   * 处理文件移动并更新导入引用
   */
  async handleFileMove(oldPath, newPath, workspaceRoot) {
    // 防止并发处理
    if (this.isProcessing) {
      console.log('正在处理其他文件移动，跳过...');
      return;
    }

    this.isProcessing = true;
    
    try {
      // 转换为模块路径
      const oldModulePath = PathCalculator.filePathToModulePath(oldPath, workspaceRoot);
      const newModulePath = PathCalculator.filePathToModulePath(newPath, workspaceRoot);
      
      console.log(`文件移动: ${oldModulePath} -> ${newModulePath}`);
      
      // 如果模块路径相同，无需更新
      if (oldModulePath === newModulePath) {
        console.log('模块路径未变化，无需更新导入引用');
        return;
      }
      
      // 显示开始处理的通知
      this.updateStatus("$(sync~spin) 正在更新导入引用...");
      
      // 查找所有引用了旧模块的文件
      const referencingFiles = await this.fileScanner.findFilesReferencingModule(oldModulePath, workspaceRoot);
      
      if (referencingFiles.length === 0) {
        console.log('没有找到需要更新的导入引用');
        this.updateStatus("$(check) 无需更新导入引用", true, 3000);
        return;
      }
      
      console.log(`找到 ${referencingFiles.length} 个文件需要更新导入引用`);
      this.updateStatus(`$(sync~spin) 正在更新 ${referencingFiles.length} 个文件...`);
      
      // 更新每个文件中的导入语句
      let updatedCount = 0;
      for (const { file, imports } of referencingFiles) {
        const updated = await this.updateImportsInFile(file, imports, oldModulePath, newModulePath, workspaceRoot);
        if (updated) updatedCount++;
      }
      
      // 更新被移动文件内部的相对导入语句
      this.updateStatus("$(sync~spin) 正在更新被移动文件的相对导入...");
      const relativeImportUpdated = await this.updateRelativeImportsInMovedFile(oldPath, newPath, workspaceRoot);
      if (relativeImportUpdated) {
        updatedCount++;
        console.log('已更新被移动文件的相对导入');
      }
      
      // 显示完成通知
      this.updateStatus(`$(check) 已更新 ${updatedCount} 个文件`, true);
      
      if (updatedCount > 0) {
        vscode.window.showInformationMessage(
          `✅ 已更新 ${updatedCount} 个文件中的导入引用`
        );
      }
      
    } catch (error) {
      console.error('更新导入引用时出错:', error);
      vscode.window.showErrorMessage(`❌ 更新导入引用失败: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 更新单个文件中的导入语句
   */
  async updateImportsInFile(filePath, imports, oldModulePath, newModulePath, workspaceRoot) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      let modified = false;
      
      for (const importInfo of imports) {
        const updatedLine = PathCalculator.updateImportStatement(
          importInfo, oldModulePath, newModulePath, filePath, workspaceRoot
        );
        
        if (updatedLine && updatedLine !== importInfo.originalLine) {
          lines[importInfo.lineNumber] = updatedLine;
          modified = true;
          console.log(`更新导入: ${importInfo.originalLine.trim()} -> ${updatedLine.trim()}`);
        }
      }
      
      if (modified) {
        await fs.promises.writeFile(filePath, lines.join('\n'), 'utf8');
        console.log(`已更新文件: ${filePath}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`更新文件失败: ${filePath}`, error);
      return false;
    }
  }

  /**
   * 更新被移动文件内部的相对导入语句
   */
  async updateRelativeImportsInMovedFile(oldFilePath, newFilePath, workspaceRoot) {
    try {
      const content = await fs.promises.readFile(newFilePath, 'utf8');
      const imports = this.parser.parseImports(content);
      
      // 只处理相对导入
      const relativeImports = imports.filter(imp => imp.type === 'relative_from');
      
      if (relativeImports.length === 0) {
        return false;
      }
      
      const lines = content.split('\n');
      let modified = false;
      
      for (const importInfo of relativeImports) {
        const updatedLine = PathCalculator.updateRelativeImportsForMovedFile(
          importInfo, oldFilePath, newFilePath, workspaceRoot
        );
        
        if (updatedLine && updatedLine !== importInfo.originalLine) {
          lines[importInfo.lineNumber] = updatedLine;
          modified = true;
          console.log(`更新被移动文件的相对导入: ${importInfo.originalLine.trim()} -> ${updatedLine.trim()}`);
        }
      }
      
      if (modified) {
        await fs.promises.writeFile(newFilePath, lines.join('\n'), 'utf8');
        console.log(`已更新被移动文件的相对导入: ${newFilePath}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`更新被移动文件的相对导入失败: ${newFilePath}`, error);
      return false;
    }
  }
}

module.exports = {
  PythonImportParser,
  PathCalculator,
  FileScanner,
  ImportUpdateController
};