import { Plugin } from "obsidian";
import { RangeSetBuilder } from "@codemirror/rangeset";
import { EditorView, Decoration, DecorationSet, ViewUpdate, ViewPlugin } from "@codemirror/view";
import { LanguageSupport } from "@codemirror/language";
import { highlightTree, HighlightStyle, tags } from "@codemirror/highlight";
import { javascript } from "@codemirror/lang-javascript";

export const highlightStyle = HighlightStyle.define([
  { tag: tags.link, class: "cm-link" },
  { tag: tags.heading, class: "cm-heading" },
  { tag: tags.emphasis, class: "cm-emphasis" },
  { tag: tags.strong, class: "cm-strong" },
  { tag: tags.keyword, class: "cm-keyword" },
  { tag: tags.atom, class: "cm-atom" },
  { tag: tags.bool, class: "cm-bool" },
  { tag: tags.url, class: "cm-url" },
  { tag: tags.labelName, class: "cm-labelName" },
  { tag: tags.inserted, class: "cm-inserted" },
  { tag: tags.deleted, class: "cm-deleted" },
  { tag: tags.literal, class: "cm-literal" },
  { tag: tags.string, class: "cm-string" },
  { tag: tags.number, class: "cm-number" },
  { tag: [tags.regexp, tags.escape, tags.special(tags.string)], class: "cm-string-2" },
  { tag: tags.variableName, class: "cm-variable" },
  { tag: tags.local(tags.variableName), class: "cm-variable cm-local" },
  { tag: tags.definition(tags.variableName), class: "cm-variable cm-def" },
  { tag: tags.special(tags.variableName), class: "cm-variable" },
  { tag: tags.typeName, class: "cm-typeName" },
  { tag: tags.namespace, class: "cm-namespace" },
  { tag: tags.macroName, class: "cm-macroName" },
  { tag: tags.definition(tags.propertyName), class: "cm-propertyName" },
  { tag: tags.operator, class: "cm-operator" },
  { tag: tags.comment, class: "cm-comment" },
  { tag: tags.meta, class: "cm-meta" },
  { tag: tags.invalid, class: "cm-invalid" },
  { tag: tags.punctuation, class: "cm-punctuation" },
  { tag: tags.modifier, class: "cm-modifier" },
  { tag: tags.function(tags.definition(tags.variableName)), class: "cm-function cm-def" },
  { tag: tags.definition(tags.className), class: "cm-class cm-def" },
  { tag: tags.operatorKeyword, class: "cm-operator" },
]);

function syntaxHighlight(
  text: string,
  support: LanguageSupport,
  callback: (token: { text: string; style: string; from: number; to: number }) => void,
  options = { match: highlightStyle.match }
) {
  let pos = 0;
  let tree = support.language.parser.parse(text);
  highlightTree(tree, options.match, (from, to, classes) => {
    from > pos && callback({ text: text.slice(pos, from), style: null, from: pos, to: from });
    callback({ text: text.slice(from, to), style: classes, from, to });
    pos = to;
  });
  pos != tree.length && callback({ text: text.slice(pos, tree.length), style: null, from: pos, to: tree.length });
}

export default class AttributesPlugin extends Plugin {
  async onload() {
    const ext = this.buildAttributesViewPlugin();
    this.registerEditorExtension(ext);
  }

  buildAttributesViewPlugin() {
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

        buildDecorations(view: EditorView) {
          let decorations = new RangeSetBuilder<Decoration>();
          const codeBlocks = [];
          let blockStart: number, blockEnd: number;
          for (let lines = view.state.doc.iterLines(), pos = 0; !lines.next().done; ) {
            let { value } = lines,
              m;
            if ((m = value.match(/\<\%([*])?/))) {
              // console.log("start", value, m, lines);
              blockStart = pos + m.index; //+ m[0].length;
            }
            if ((m = value.match(/\%\>/))) {
              // console.log("end", value, m, lines);
              blockEnd = pos + m.index + 2;
            }
            pos += value.length + 1;
            if ((blockStart === 0 || blockStart) && (blockEnd === 0 || blockEnd)) {
              codeBlocks.push([blockStart, blockEnd]);
              blockStart = blockEnd = null;
            }
          }
          let lastLineMark = -1;
          for ([blockStart, blockEnd] of codeBlocks) {
            const textContent = view.state.doc.sliceString(blockStart, blockEnd);
            // TODO: Don't mark the line if it's an inline code block
            syntaxHighlight(textContent, this.language, ({ from, to, style }) => {
              let deco = Decoration.line({
                class: "HyperMD-codeblock HyperMD-codeblock-bg",
                attributes: { "data-templater-code": "", spellcheck: "false" },
              });
              let line = view.state.doc.lineAt(blockStart + from);
              style &&
                lastLineMark !== line.from &&
                (lastLineMark = line.from) &&
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
