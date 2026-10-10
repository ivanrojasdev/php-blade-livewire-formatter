import * as vscode from 'vscode';
import * as prettier from 'prettier';

function processImports(code: string): string {
  const lines = code.split('\n');
  const useRegex = /^use\s+([\w\\]+)(?:\s+as\s+(\w+))?;\r?$/;

  const imports: { lineIndex: number; fullPath: string; className: string }[] = [];

  lines.forEach((line, index) => {
    const match = line.trim().match(useRegex);
    if (match) {
      const fullPath = match[1];
      const alias = match[2];
      const className = alias || fullPath.split('\\').pop() || '';
      imports.push({ lineIndex: index, fullPath, className });
    }
  });

  if (imports.length === 0) return code;

  const codeWithoutImports = lines
    .filter((_, idx) => !imports.some(imp => imp.lineIndex === idx))
    .join('\n');

  const unusedIndices = new Set<number>();

  imports.forEach(imp => {
    const usageRegex = new RegExp(`\\b${imp.className}\\b`);
    if (!usageRegex.test(codeWithoutImports)) {
      unusedIndices.add(imp.lineIndex);
    }
  });

  const activeImports = imports
    .filter(imp => !unusedIndices.has(imp.lineIndex))
    .sort((a, b) => a.fullPath.localeCompare(b.fullPath));

  let importInsertIndex = imports[0].lineIndex;
  const finalLines: string[] = [];
  let importsInserted = false;

  lines.forEach((line, idx) => {
    if (unusedIndices.has(idx) || imports.some(imp => imp.lineIndex === idx)) {
      if (idx === importInsertIndex && !importsInserted) {
        activeImports.forEach(imp => {
          finalLines.push(`use ${imp.fullPath};`);
        });
        importsInserted = true;
      }
    } else {
      finalLines.push(line);
    }
  });

  return finalLines.join('\n');
}

/**
 * Ajusta la indentación interna y mueve la llave de apertura { de clases anónimas a la línea siguiente.
 */
function enforcePhpFourSpacesInBlade(code: string): string {
  const phpBlockRegex = /(<\?php[\s\S]*?\?>|@php[\s\S]*?@endphp)/gi;

  return code.replace(phpBlockRegex, (match) => {
    // Mover la llave de apertura de clases anónimas (new class ... {) a la línea de abajo
    let processedMatch = match.replace(/(\bnew\s+class\b[^\{]*?)\s*\{/g, '$1\n{');

    const lines = processedMatch.split('\n');

    const indentedLines = lines.map((line, index) => {
      if (index === 0 || index === lines.length - 1) {
        return line;
      }

      const leadingSpaces = line.match(/^(\s*)/)?.[1] || '';
      if (leadingSpaces.length > 0) {
        const level = Math.ceil(leadingSpaces.length / 2);
        const newIndent = ' '.repeat(level * 4);
        return newIndent + line.trimStart();
      }

      return line;
    });

    return indentedLines.join('\n');
  });
}

export function activate(context: vscode.ExtensionContext) {
  const supportedLanguages = ['blade', 'php'];

  const formatterProvider = vscode.languages.registerDocumentFormattingEditProvider(supportedLanguages, {
    async provideDocumentFormattingEdits(document: vscode.TextDocument): Promise<vscode.TextEdit[]> {
      // VERIFICACIÓN DE ERRORES: Si hay errores de sintaxis activos en el archivo, no formatear para evitar corrimientos
      const diagnostics = vscode.languages.getDiagnostics(document.uri);
      const hasSyntaxErrors = diagnostics.some(d =>
        d.severity === vscode.DiagnosticSeverity.Error &&
        (d.source === 'php' || d.source === 'Blade' || d.message.toLowerCase().includes('syntax error'))
      );

      if (hasSyntaxErrors) {
        return [];
      }

      const fullText = document.getText();
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(fullText.length)
      );

      try {
        const textWithoutUnusedImports = processImports(fullText);

        const isBlade = document.languageId === 'blade';
        let formattedText = '';

        if (isBlade) {
          const formattedByBlade = await prettier.format(textWithoutUnusedImports, {
            parser: 'blade',
            plugins: [
              require.resolve('prettier-plugin-blade'),
              require.resolve('@prettier/plugin-php'),
              require.resolve('prettier-plugin-tailwindcss')
            ],
            tabWidth: 2,
            useTabs: false,
            // @ts-ignore
            phpVersion: '8.2',
            // @ts-ignore
            trailingCommaPHP: false,
            // @ts-ignore
            braceStyle: 'psr-2',
            // @ts-ignore
            bladeTabSize: 2,
            // @ts-ignore
            bladeFormatFormatter: 'prettier',
          });
          formattedText = enforcePhpFourSpacesInBlade(formattedByBlade);
          formattedText = formattedText.replace(/\n\s*\?>/g, '\n?>');
          formattedText = formattedText.replace(/(\?>)\s*\n+(?=\s*<)/g, '$1\n\n');
        } else {
          formattedText = await prettier.format(textWithoutUnusedImports, {
            parser: 'php',
            plugins: [
              require.resolve('@prettier/plugin-php')
            ],
            tabWidth: 4,
            useTabs: false,
            // @ts-ignore
            phpVersion: '8.2',
            // @ts-ignore
            trailingCommaPHP: false,
            // @ts-ignore
            braceStyle: 'psr-2',
          });

          // También asegurar que en archivos .php puros la llave baje si hubiera una clase anónima
          formattedText = formattedText.replace(/(\bnew\s+class\b[^\{]*?)\s*\{/g, '$1\n{');
        }

        // Asegurar una línea en blanco después de los use
        formattedText = formattedText.replace(/(use\s+[^;]+;)(?:\r?\n)+(?!\r?\n)(?=\s*(?:#[^\]]+\]\s*)?(?:class|abstract\s+class|interface|trait|enum|new\b))/g, '$1\n\n');

        // Asegurar línea en blanco entre clases y clases anónimas
        formattedText = formattedText.replace(/(?:}|};\s*)(\s*\n)+\s*(?=\b(?:class|abstract\s+class|interface|trait)\s+)/g, (match) => {
          return match.startsWith('};') ? '};\n\n' : '}\n\n';
        });

        // Limpiar espacios en blanco vacíos dentro de atributos HTML/Blade (ej: wire:model="   " -> wire:model="")
        formattedText = formattedText.replace(/([a-zA-Z0-9_:-]+)="[\s\n]+"/g, '$1=""');

        return [vscode.TextEdit.replace(fullRange, formattedText)];
      } catch (error) {
        vscode.window.showErrorMessage(`Error formatting: ${error}`);
        return [];
      }
    }
  });

  const completionProvider = vscode.languages.registerCompletionItemProvider(
    supportedLanguages,
    {
      provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
        const linePrefix = document.lineAt(position).text.substring(0, position.character);
        
        // Verificamos si estamos escribiendo dentro de una directiva wire: o x-on:
        const isWireAttribute = /(wire:[a-z.-]+|x-on:[a-z.-]+|wire:model[a-z.-]*)="[^"]*$/i.test(linePrefix);

        if (!isWireAttribute) {
          return undefined;
        }

        // Comprobamos si es un evento click (wire:click o x-on:click)
        const clickRegexes = [
          /wire:click(\.[a-z]+)*="[^"]*$/i,
          /x-on:click(\.[a-z]+)*="[^"]*$/i
        ];
        const isClickAction = clickRegexes.some(regex => regex.test(linePrefix));

        // Comprobamos si es un modelo (wire:model con cualquier modificador como .live, .blur, etc.)
        const isModelAction = /wire:model(\.[a-z]+)*="[^"]*$/i.test(linePrefix);

        const text = document.getText();
        const items: vscode.CompletionItem[] = [];

        const classMatch = text.match(/(?:new\s+class|class\s+\w+)[\s\S]*?\{([\s\S]*?)\};?\s*\?>/i);

        if (classMatch && classMatch[1]) {
          const classBody = classMatch[1];

          // Los métodos SOLO se muestran si NO estamos en una directiva de modelo (wire:model)
          if (!isModelAction) {
            const methodRegex = /public\s+function\s+([a-zA-Z0-9_]+)\s*\(/g;
            let match;
            let index = 0;
            while ((match = methodRegex.exec(classBody)) !== null) {
              const methodName = match[1];
              const item = new vscode.CompletionItem(methodName, vscode.CompletionItemKind.Method);
              item.detail = `Livewire Method`;
              item.insertText = methodName;
              item.sortText = `0_${index++}`;
              item.preselect = !isClickAction;
              items.push(item);
            }
          }

          // Las propiedades SOLO se muestran si NO estamos en una directiva de tipo click (ej. wire:click)
          if (!isClickAction) {
            const propertyRegex = /public\s+(?:[\w\\|]+\s+)?\$([a-zA-Z0-9_]+)/g;
            let match;
            let index = 0;
            while ((match = propertyRegex.exec(classBody)) !== null) {
              const propName = match[1];
              const item = new vscode.CompletionItem(propName, vscode.CompletionItemKind.Property);
              item.detail = `Livewire Property`;
              item.insertText = propName;
              item.sortText = `1_${index++}`;
              item.preselect = isModelAction;
              items.push(item);
            }
          }
        }
        return items;
      }
    },
    '"', "'", ':', '-'
  );

  context.subscriptions.push(formatterProvider, completionProvider);
}

export function deactivate() { }