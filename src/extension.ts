import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as prettier from 'prettier';

export function activate(context: vscode.ExtensionContext) {

  const supportedLanguages = ['blade', 'php'];

  const formatterProvider = vscode.languages.registerDocumentFormattingEditProvider(supportedLanguages, {
    async provideDocumentFormattingEdits(document: vscode.TextDocument): Promise<vscode.TextEdit[]> {
      const fullText = document.getText();
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(fullText.length)
      );

      try {
        if (document.languageId === 'php') {
          const finalPhpText = await runPhpCsFixer(fullText);
          return [vscode.TextEdit.replace(fullRange, finalPhpText)];
        }

        const formattedByPrettier = await prettier.format(fullText, {
          parser: 'blade',
          plugins: [
            require.resolve('prettier-plugin-blade'),
            require.resolve('@prettier/plugin-php'),
            require.resolve('prettier-plugin-tailwindcss')
          ],
          tabWidth: 2,
          useTabs: false,
          // @ts-ignore
          bladeTabSize: 2,
          // @ts-ignore
          bladeFormatFormatter: 'prettier',
        });

        let finalFormattedText = await runPhpCsFixer(formattedByPrettier);
        finalFormattedText = finalFormattedText.replace(/(\?>)\s*\n(?=\s*<)/g, '$1\n\n');
        return [vscode.TextEdit.replace(fullRange, finalFormattedText)];
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

        const isWireAttribute = /(wire:[a-z.-]+|x-on:[a-z.-]+|wire:model[a-z.-]*)="[^"]*$/i.test(linePrefix);

        if (!isWireAttribute) {
          return undefined;
        }

        const text = document.getText();
        const items: vscode.CompletionItem[] = [];

        const classMatch = text.match(/(?:new\s+class|class\s+\w+)[\s\S]*?\{([\s\S]*?)\};?\s*\?>/i);

        if (classMatch && classMatch[1]) {
          const classBody = classMatch[1];

          const methodRegex = /public\s+function\s+([a-zA-Z0-9_]+)\s*\(/g;
          let match;
          let index = 0;
          while ((match = methodRegex.exec(classBody)) !== null) {
            const methodName = match[1];
            const item = new vscode.CompletionItem(methodName, vscode.CompletionItemKind.Method);
            item.detail = `Livewire Method`;
            item.insertText = methodName;
            item.sortText = `0_${index++}`;
            item.preselect = true;
            items.push(item);
          }

          const propertyRegex = /public\s+(?:[\w\\|]+\s+)?\$([a-zA-Z0-9_]+)/g;
          while ((match = propertyRegex.exec(classBody)) !== null) {
            const propName = match[1];
            const item = new vscode.CompletionItem(propName, vscode.CompletionItemKind.Property);
            item.detail = `Livewire Property`;
            item.insertText = propName;
            item.sortText = `0_${index++}`;
            items.push(item);
          }
        }
        return items;
      }
    },
    '"', "'", ':', '-'
  );
  context.subscriptions.push(formatterProvider, completionProvider);
}

function runPhpCsFixer(text: string): Promise<string> {
  return new Promise((resolve) => {
    const tempDir = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'blade-'));
    const tempFile = path.join(tempDir, 'temp.php');

    fs.writeFileSync(tempFile, text, 'utf-8');

    const myRules = {
      "@PSR12": true,
      "class_attributes_separation": {
        "elements": {
          "method": "one",
          "property": "one",
          "trait_import": "none"
        }
      },
      "cast_spaces": true,
      "concat_space": {
        "spacing": "one"
      },
      "array_indentation": true,
      "trim_array_spaces": true,
      "no_whitespace_before_comma_in_array": true,
      "whitespace_after_comma_in_array": {
        "ensure_single_space": true
      },
      "no_spaces_around_offset": true,
      "array_syntax": {
        "syntax": "short"
      },
      "binary_operator_spaces": {
        "default": "align_single_space_minimal"
      },
      "no_unused_imports": true,
      "ordered_imports": true,
      "no_extra_blank_lines": {
        "tokens": [
          "curly_brace_block",
          "extra",
          "return",
          "square_brace_block"
        ]
      },
      "new_with_braces": {
        "anonymous_class": false,
        "named_class": false
      }
    };

    const rulesJson = JSON.stringify(myRules).replace(/"/g, '\\"');
    const command = `php-cs-fixer fix "${tempFile}" --rules="${rulesJson}"`;

    exec(command, () => {
      let result = text;
      if (fs.existsSync(tempFile)) {
        result = fs.readFileSync(tempFile, 'utf-8');
        result = result.replace(/(\}(?:;\s*)?)\n+(?=\s*class\s+)/g, '$1\n\n');
        result = result.replace(/\n+\s*\?>/g, '\n?>');
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      resolve(result);
    });
  });
}

export function deactivate() { }