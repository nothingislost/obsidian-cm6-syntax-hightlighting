import { Plugin } from "obsidian";
import { RangeSetBuilder } from "@codemirror/rangeset";
import { EditorView, Decoration, DecorationSet, ViewUpdate, ViewPlugin, PluginField } from "@codemirror/view";
import { LanguageSupport } from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { syntaxHighlight } from "./syntaxHighlight";

export default class SyntaxHighlightingPlugin extends Plugin {
  async onload() {
    const ext = this.buildSyntaxViewPlugin();
    this.registerEditorExtension(ext);
  }

  buildSyntaxViewPlugin() {
    const plugin = this;
    const viewPlugin = ViewPlugin.fromClass(
      class {
        blockDecorations: DecorationSet;
        inlineDecorations: DecorationSet;
        language: LanguageSupport;

        constructor(view: EditorView) {
          this.language = javascript();
          [this.blockDecorations, this.inlineDecorations] = this.buildDecorations(view);
        }

        update(update: ViewUpdate) {
          console.log("viewUpdate", update);
          if (update.docChanged || update.viewportChanged) {
            [this.blockDecorations, this.inlineDecorations] = this.buildDecorations(update.view);
          }
        }

        parseCodeBlocks(view: EditorView) {
          // This method is currently very inefficient and is mostly just a placeholder
          // until a better code fence parser is written
          const codeBlocks: [number, number, string][] = [];
          let blockStart: number, blockEnd: number, blockType: string;
          // TODO: iterate only over visible lines in the viewport
          for (let lines = view.state.doc.iterLines(), pos = 0; !lines.next().done; ) {
            let { value } = lines,
              match;
            if ((match = value.match(/<%(\*)?/))) {
              blockStart = pos + match.index;
              match.index === 0 ? (blockType = "block") : (blockType = "inline");
            }
            if ((match = value.match(/%>/))) {
              blockEnd = pos + match.index + 2;
            }
            pos += value.length + 1;
            if ((blockStart === 0 || blockStart) && (blockEnd === 0 || blockEnd)) {
              codeBlocks.push([blockStart, blockEnd, blockType]);
              blockStart = blockEnd = blockType = null;
            }
          }
          return codeBlocks;
        }

        buildDecorations(view: EditorView) {
          let tokenDecoSet = new RangeSetBuilder<Decoration>();
          let lineDecoSet = new RangeSetBuilder<Decoration>();
          let lineDeco = Decoration.line({
            class: "HyperMD-codeblock HyperMD-codeblock-bg templater",
            attributes: { "data-templater-code": "", spellcheck: "false" },
          });
          let tokenDeco = Decoration.mark({
            class: "cm-inline-code templater",
            attributes: { "data-templater-code": "", spellcheck: "false" },
          });

          const codeBlocks = this.parseCodeBlocks(view);
          for (let [blockStart, blockEnd, blockType] of codeBlocks) {
            const textContent = view.state.doc.sliceString(blockStart, blockEnd);

            let lineStart = view.state.doc.lineAt(blockStart),
              lineEnd = view.state.doc.lineAt(blockEnd);

            if (blockType == "block") {
              for (let line = lineStart.number; line <= lineEnd.number; line++) {
                let curLine = view.state.doc.line(line);
                lineDecoSet.add(curLine.from, curLine.from, lineDeco);
              }
            } else {
              lineDecoSet.add(blockStart, blockEnd, tokenDeco);
            }

            syntaxHighlight(textContent, this.language, ({ from, to, style }) => {
              style && tokenDecoSet.add(blockStart + from, blockStart + to, Decoration.mark({ class: style }));
            });
          }
          return [lineDecoSet.finish(), tokenDecoSet.finish()];
        }
      },
      {
        provide: [
          PluginField.decorations.from(viewPlugin => viewPlugin.blockDecorations),
          PluginField.decorations.from(viewPlugin => viewPlugin.inlineDecorations),
        ],
      }
    );
    return viewPlugin;
  }
}
