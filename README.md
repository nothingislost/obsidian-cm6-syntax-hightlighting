## Obsidian CM6 Syntax Highlighting

An experimental Obsidian plugin that syntax highlights custom code blocks using a CM6 Lezer

## Not yet implemented

- The ability to dynamically choose a syntax language
  - It is currently hardcoded to javascript
- An efficient way of identifying custom code fences
  - Currently a naive line iterator + regex is being used
- The ability to use CM5 Legacy modes for highlighting
  - Currently only CM6 Lezers are working
- The ability to clear out any existing decorations from the code block text
  - Currently the highlighting is applying over the top of the HyperMD parser's marks
- Decoration Caching
  - Currently the syntax highlighting gets reparsed and reapplied on every editor change
- Differentiate between block and inline code fences

### Installing via BRAT

Install the BRAT plugin via the Obsidian Plugin Browser and then add the beta repository "nothingislost/obsidian-cm6-syntax-hightlighting"

### Manually installing the plugin

- Copy over `main.js`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/obsidian-cm6-syntax-hightlighting/`.
