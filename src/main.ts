import { Plugin } from "obsidian";
import { RangeSetBuilder } from "@codemirror/rangeset";
import { EditorView, Decoration, DecorationSet, ViewUpdate, ViewPlugin } from "@codemirror/view";
import { LanguageSupport } from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { syntaxHighlight } from "./syntaxHighlight";

export default class SyntaxHighlightingPlugin extends Plugin {
  async onload() {
    const ext = this.buildSyntaxViewPlugin();
    this.registerEditorExtension(ext);
  }

  buildSyntaxViewPlugin() {
    const viewPlugin = ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;
        language: LanguageSupport;

        constructor(view: EditorView) {
          this.language = javascript();
          this.decorations = this.buildDecorations(view);
        }

        update(update: ViewUpdate) {
          if (update.docChanged || update.viewportChanged) {
            this.decorations = this.buildDecorations(update.view);
          }
        }

        destroy() {}

        parseCodeBlocks(view: EditorView) {
          const codeBlocks = [];
          let blockStart: number, blockEnd: number;
          for (let lines = view.state.doc.iterLines(), pos = 0; !lines.next().done; ) {
            let { value } = lines,
              match;
            if ((match = value.match(/<%(\*)?/))) {
              blockStart = pos + match.index;
            }
            if ((match = value.match(/%>/))) {
              blockEnd = pos + match.index + 2;
            }
            pos += value.length + 1;
            if ((blockStart === 0 || blockStart) && (blockEnd === 0 || blockEnd)) {
              codeBlocks.push([blockStart, blockEnd]);
              blockStart = blockEnd = null;
            }
          }
          return codeBlocks;
        }

        buildDecorations(view: EditorView) {
          let decorations = new RangeSetBuilder<Decoration>();
          const codeBlocks = this.parseCodeBlocks(view);
          let prevLineMark = -1;
          for (let [blockStart, blockEnd] of codeBlocks) {
            const textContent = view.state.doc.sliceString(blockStart, blockEnd);
            syntaxHighlight(textContent, this.language, ({ from, to, style }) => {
              let deco = Decoration.line({
                class: "HyperMD-codeblock HyperMD-codeblock-bg",
                attributes: { "data-templater-code": "", spellcheck: "false" },
              });
              let line = view.state.doc.lineAt(blockStart + from);
              style &&
                prevLineMark !== line.from &&
                (prevLineMark = line.from) &&
                decorations.add(line.from, line.from, deco);
              style && decorations.add(blockStart + from, blockStart + to, Decoration.mark({ class: style }));
            });
          }
          return decorations.finish();
        }
      },
      {
        decorations: v => v.decorations,
      }
    );
    return viewPlugin;
  }
}
