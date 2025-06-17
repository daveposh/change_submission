/**
 * Editor.js Tools Configuration
 * Provides tools for rich text editing in the change request form
 */

// Header Tool
class Header {
  constructor({ data, config, api, readOnly }) {
    this.api = api;
    this.readOnly = readOnly;
    this.data = {
      text: data.text || '',
      level: data.level || config.defaultLevel || 2
    };
    this.config = config;
  }

  static get toolbox() {
    return {
      icon: '<svg width="11" height="14"><path d="M7.6 8.15H2.25v4.525a1.125 1.125 0 0 1-2.25 0V1.125a1.125 1.125 0 1 1 2.25 0V5.9H7.6V1.125a1.125 1.125 0 0 1 2.25 0v11.55a1.125 1.125 0 0 1-2.25 0V8.15Z"/></svg>',
      title: 'Heading'
    };
  }

  render() {
    const wrapper = document.createElement('div');
    const input = document.createElement('h' + this.data.level);
    input.contentEditable = !this.readOnly;
    input.innerHTML = this.data.text;
    input.placeholder = 'Heading';

    wrapper.appendChild(input);
    this.input = input;

    return wrapper;
  }

  save() {
    return {
      text: this.input.innerHTML,
      level: this.data.level
    };
  }

  static get sanitize() {
    return {
      level: false,
      text: {
        br: true,
        strong: true,
        em: true,
        u: true,
        s: true,
        span: true
      }
    };
  }
}

// List Tool
class List {
  constructor({ data, config, api, readOnly }) {
    this.api = api;
    this.readOnly = readOnly;
    this.data = {
      style: data.style || config.defaultStyle || 'unordered',
      items: data.items || []
    };
    this.config = config;
  }

  static get toolbox() {
    return {
      icon: '<svg width="17" height="13"><path d="M5.625 4.85h9.25a1.125 1.125 0 0 1 0 2.25h-9.25a1.125 1.125 0 0 1 0-2.25ZM5.625 1.125h9.25a1.125 1.125 0 0 1 0 2.25h-9.25a1.125 1.125 0 0 1 0-2.25ZM5.625 8.5h9.25a1.125 1.125 0 0 1 0 2.25h-9.25a1.125 1.125 0 0 1 0-2.25ZM.875 1.125a1.125 1.125 0 1 1 0 2.25 1.125 1.125 0 0 1 0-2.25ZM.875 4.85a1.125 1.125 0 1 1 0 2.25 1.125 1.125 0 0 1 0-2.25ZM.875 8.5a1.125 1.125 0 1 1 0 2.25 1.125 1.125 0 0 1 0-2.25Z"/></svg>',
      title: 'List'
    };
  }

  render() {
    const wrapper = document.createElement('div');
    const list = document.createElement(this.data.style === 'ordered' ? 'ol' : 'ul');
    
    this.data.items.forEach((item) => {
      const li = document.createElement('li');
      li.innerHTML = item;
      li.contentEditable = !this.readOnly;
      list.appendChild(li);
    });

    if (this.data.items.length === 0) {
      const li = document.createElement('li');
      li.contentEditable = !this.readOnly;
      li.placeholder = 'List item';
      list.appendChild(li);
    }

    wrapper.appendChild(list);
    this.list = list;

    return wrapper;
  }

  save() {
    const items = Array.from(this.list.children).map(li => li.innerHTML);
    return {
      style: this.data.style,
      items: items.filter(item => item.trim() !== '')
    };
  }

  static get sanitize() {
    return {
      style: false,
      items: {
        br: true,
        strong: true,
        em: true,
        u: true,
        s: true,
        span: true
      }
    };
  }
}

// Code Block Tool
class CodeTool {
  constructor({ data, api, readOnly }) {
    this.api = api;
    this.readOnly = readOnly;
    this.data = {
      code: data.code || ''
    };
  }

  static get toolbox() {
    return {
      icon: '<svg width="14" height="14"><path d="M3.177 6.852c.205.253.347.572.427.954.078.372.117.844.117 1.417 0 .418.01.725.03.92.02.18.057.314.107.397.046.075.093.117.14.126.043.005.09.007.14.007v.928c-.284 0-.537-.028-.758-.085a1.76 1.76 0 0 1-.593-.289c-.17-.133-.3-.31-.394-.532-.09-.221-.135-.49-.135-.804 0-.307-.01-.58-.03-.82a3.17 3.17 0 0 0-.1-.626c-.043-.18-.1-.34-.168-.48-.065-.14-.146-.258-.242-.355-.096-.097-.218-.168-.364-.214v-.07c.146-.046.268-.117.364-.214a1.861 1.861 0 0 0 .242-.355 4.8 4.8 0 0 0 .168-.48 3.177 3.177 0 0 0 .1-.626c.02-.24.03-.513.03-.82 0-.314.045-.583.135-.804.094-.222.224-.4.394-.532.18-.14.378-.221.593-.289.221-.057.474-.085.758-.085v.928a1.394 1.394 0 0 0-.14.007c-.047.009-.094.051-.14.126-.05.083-.087.217-.107.397-.02.195-.03.502-.03.92 0 .573-.039 1.045-.117 1.417-.08.382-.222.701-.427.954Z"/><path d="M10.823 6.852c-.205.253-.347.572-.427.954-.078.372-.117.844-.117 1.417 0 .418-.01.725-.03.92-.02.18-.057.314-.107.397-.046.075-.093.117-.14.126-.043.005-.09.007-.14.007v.928c.284 0 .537-.028.758-.085.215-.068.413-.149.593-.289.17-.133.3-.31.394-.532.09-.221.135-.49.135-.804 0-.307.01-.58.03-.82.02-.24.057-.447.1-.626.043-.18.1-.34.168-.48.065-.14.146-.258.242-.355.096-.097.218-.168.364-.214v-.07c-.146-.046-.268-.117-.364-.214a1.861 1.861 0 0 1-.242-.355 4.8 4.8 0 0 1-.168-.48 3.177 3.177 0 0 1-.1-.626c-.02-.24-.03-.513-.03-.82 0-.314-.045-.583-.135-.804-.094-.222-.224-.4-.394-.532a1.75 1.75 0 0 0-.593-.289 2.873 2.873 0 0 0-.758-.085v.928c.05 0 .097.002.14.007.047.009.094.051.14.126.05.083.087.217.107.397.02.195.03.502.03.92 0 .573.039 1.045.117 1.417.08.382.222.701.427.954Z"/></svg>',
      title: 'Code'
    };
  }

  render() {
    const wrapper = document.createElement('div');
    const textarea = document.createElement('textarea');
    
    textarea.placeholder = 'Enter your code...';
    textarea.value = this.data.code;
    textarea.readOnly = this.readOnly;
    textarea.style.width = '100%';
    textarea.style.minHeight = '150px';
    textarea.style.fontFamily = 'monospace';
    textarea.style.fontSize = '14px';
    textarea.style.border = '1px solid #e1e5e9';
    textarea.style.borderRadius = '4px';
    textarea.style.padding = '12px';
    textarea.style.background = '#f8f9fa';
    textarea.style.resize = 'vertical';

    wrapper.appendChild(textarea);
    this.textarea = textarea;

    return wrapper;
  }

  save() {
    return {
      code: this.textarea.value
    };
  }

  static get sanitize() {
    return {
      code: false // Don't sanitize code content
    };
  }
}

// Table Tool
class Table {
  constructor({ data, api, readOnly }) {
    this.api = api;
    this.readOnly = readOnly;
    this.data = {
      withHeadings: data.withHeadings !== undefined ? data.withHeadings : true,
      content: data.content || [['', ''], ['', '']]
    };
  }

  static get toolbox() {
    return {
      icon: '<svg width="14" height="14"><rect width="14" height="14" rx="1" fill="none" stroke="currentColor"/><line x1="0" y1="4" x2="14" y2="4" stroke="currentColor"/><line x1="4" y1="0" x2="4" y2="14" stroke="currentColor"/><line x1="10" y1="0" x2="10" y2="14" stroke="currentColor"/></svg>',
      title: 'Table'
    };
  }

  render() {
    const wrapper = document.createElement('div');
    const table = document.createElement('table');
    
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.border = '1px solid #dee2e6';

    this.data.content.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
      
      row.forEach((cell) => {
        const cellElement = document.createElement(
          this.data.withHeadings && rowIndex === 0 ? 'th' : 'td'
        );
        
        cellElement.contentEditable = !this.readOnly;
        cellElement.innerHTML = cell;
        cellElement.style.border = '1px solid #dee2e6';
        cellElement.style.padding = '8px';
        cellElement.style.textAlign = 'left';
        
        if (this.data.withHeadings && rowIndex === 0) {
          cellElement.style.backgroundColor = '#f8f9fa';
          cellElement.style.fontWeight = 'bold';
        }

        tr.appendChild(cellElement);
      });
      
      table.appendChild(tr);
    });

    wrapper.appendChild(table);
    this.table = table;

    return wrapper;
  }

  save() {
    const content = Array.from(this.table.rows).map(row => 
      Array.from(row.cells).map(cell => cell.innerHTML)
    );

    return {
      withHeadings: this.data.withHeadings,
      content
    };
  }

  static get sanitize() {
    return {
      withHeadings: false,
      content: {
        br: true,
        strong: true,
        em: true,
        u: true,
        s: true,
        span: true
      }
    };
  }
}

// Quote Tool
class Quote {
  constructor({ data, api, readOnly }) {
    this.api = api;
    this.readOnly = readOnly;
    this.data = {
      text: data.text || '',
      caption: data.caption || ''
    };
  }

  static get toolbox() {
    return {
      icon: '<svg width="15" height="14"><path d="M13.53 6.185s.923.464 1.464 1.46c.54.997.782 2.818.242 3.814-.54.997-1.426 1.536-2.673 1.536-1.248 0-1.957-.54-1.957-1.536 0-.997.709-1.656 1.597-1.536.888.12 1.326-.22 1.326-.22s-.132-.66-.33-1.536c-.197-.875-.726-1.978-.726-1.978ZM7.35 6.185s.923.464 1.464 1.46c.54.997.782 2.818.242 3.814-.54.997-1.426 1.536-2.673 1.536-1.248 0-1.957-.54-1.957-1.536 0-.997.709-1.656 1.597-1.536.888.12 1.326-.22 1.326-.22s-.132-.66-.33-1.536c-.197-.875-.726-1.978-.726-1.978Z"/></svg>',
      title: 'Quote'
    };
  }

  render() {
    const wrapper = document.createElement('div');
    const blockquote = document.createElement('blockquote');
    const textDiv = document.createElement('div');
    const captionDiv = document.createElement('cite');

    textDiv.contentEditable = !this.readOnly;
    textDiv.innerHTML = this.data.text;
    textDiv.placeholder = 'Enter a quote';
    textDiv.style.fontSize = '16px';
    textDiv.style.fontStyle = 'italic';
    textDiv.style.marginBottom = '8px';

    captionDiv.contentEditable = !this.readOnly;
    captionDiv.innerHTML = this.data.caption;
    captionDiv.placeholder = 'Source (optional)';
    captionDiv.style.fontSize = '14px';
    captionDiv.style.color = '#6c757d';

    blockquote.style.borderLeft = '4px solid #dee2e6';
    blockquote.style.paddingLeft = '16px';
    blockquote.style.margin = '0';

    blockquote.appendChild(textDiv);
    blockquote.appendChild(captionDiv);
    wrapper.appendChild(blockquote);

    this.textDiv = textDiv;
    this.captionDiv = captionDiv;

    return wrapper;
  }

  save() {
    return {
      text: this.textDiv.innerHTML,
      caption: this.captionDiv.innerHTML
    };
  }

  static get sanitize() {
    return {
      text: {
        br: true,
        strong: true,
        em: true,
        u: true,
        s: true,
        span: true
      },
      caption: {
        br: true,
        strong: true,
        em: true,
        u: true,
        s: true,
        span: true
      }
    };
  }
}

// Inline Tools for formatting (Bold, Italic, Underline)

// Bold Tool
class Bold {
  constructor({ api }) {
    this.api = api;
  }

  static get isInline() {
    return true;
  }

  static get sanitize() {
    return {
      strong: {},
      b: {}
    };
  }

  static get title() {
    return 'Bold';
  }

  get state() {
    return this._state;
  }

  set state(state) {
    this._state = state;
    this.button.classList.toggle('ce-inline-tool--active', state);
  }

  render() {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.innerHTML = '<svg width="12" height="14"><path d="M2.8 1.125C2.8.504 3.304 0 3.925 0h3.2c1.656 0 3 1.344 3 3s-1.344 3-3 3h-3.2v-1.875h3.2c.621 0 1.125-.504 1.125-1.125S7.746 1.875 7.125 1.875h-3.2v-.75ZM3.925 6h3.95c1.795 0 3.25 1.455 3.25 3.25S9.67 12.5 7.875 12.5h-3.95C3.304 12.5 2.8 11.996 2.8 11.375V6.625c0-.621.504-1.125 1.125-1.125v.5Z"/></svg>';
    this.button.title = 'Bold';
    
    return this.button;
  }

  surround(range) {
    if (this.state) {
      this.unwrap(range);
    } else {
      this.wrap(range);
    }
  }

  wrap(range) {
    const selectedText = range.extractContents();
    const strong = document.createElement('strong');
    strong.appendChild(selectedText);
    range.insertNode(strong);
  }

  unwrap(range) {
    const strong = this.api.selection.findParentTag('STRONG') || this.api.selection.findParentTag('B');
    const text = range.extractContents();
    
    strong.remove();
    range.insertNode(text);
  }

  checkState() {
    const strong = this.api.selection.findParentTag('STRONG') || this.api.selection.findParentTag('B');
    this.state = !!strong;
  }
}

// Italic Tool
class Italic {
  constructor({ api }) {
    this.api = api;
  }

  static get isInline() {
    return true;
  }

  static get sanitize() {
    return {
      em: {},
      i: {}
    };
  }

  static get title() {
    return 'Italic';
  }

  get state() {
    return this._state;
  }

  set state(state) {
    this._state = state;
    this.button.classList.toggle('ce-inline-tool--active', state);
  }

  render() {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.innerHTML = '<svg width="8" height="14"><path d="M2.094 1.125C2.094.504 2.598 0 3.219 0h2.562c.621 0 1.125.504 1.125 1.125s-.504 1.125-1.125 1.125H4.906L3.781 11.25h.875c.621 0 1.125.504 1.125 1.125s-.504 1.125-1.125 1.125H1.094c-.621 0-1.125-.504-1.125-1.125s.504-1.125 1.125-1.125h.875L3.094 2.25h-.875c-.621 0-1.125-.504-1.125-1.125Z"/></svg>';
    this.button.title = 'Italic';
    
    return this.button;
  }

  surround(range) {
    if (this.state) {
      this.unwrap(range);
    } else {
      this.wrap(range);
    }
  }

  wrap(range) {
    const selectedText = range.extractContents();
    const em = document.createElement('em');
    em.appendChild(selectedText);
    range.insertNode(em);
  }

  unwrap(range) {
    const em = this.api.selection.findParentTag('EM') || this.api.selection.findParentTag('I');
    const text = range.extractContents();
    
    em.remove();
    range.insertNode(text);
  }

  checkState() {
    const em = this.api.selection.findParentTag('EM') || this.api.selection.findParentTag('I');
    this.state = !!em;
  }
}

// Underline Tool
class Underline {
  constructor({ api }) {
    this.api = api;
  }

  static get isInline() {
    return true;
  }

  static get sanitize() {
    return {
      u: {}
    };
  }

  static get title() {
    return 'Underline';
  }

  get state() {
    return this._state;
  }

  set state(state) {
    this._state = state;
    this.button.classList.toggle('ce-inline-tool--active', state);
  }

  render() {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.innerHTML = '<svg width="12" height="14"><path d="M1.5 1.125C1.5.504 2.004 0 2.625 0s1.125.504 1.125 1.125v5.25c0 1.035.84 1.875 1.875 1.875s1.875-.84 1.875-1.875V1.125C7.5.504 8.004 0 8.625 0s1.125.504 1.125 1.125v5.25c0 2.277-1.848 4.125-4.125 4.125S1.5 8.652 1.5 6.375V1.125ZM.375 12.5c-.621 0-1.125.504-1.125 1.125s.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125s-.504-1.125-1.125-1.125H.375Z"/></svg>';
    this.button.title = 'Underline';
    
    return this.button;
  }

  surround(range) {
    if (this.state) {
      this.unwrap(range);
    } else {
      this.wrap(range);
    }
  }

  wrap(range) {
    const selectedText = range.extractContents();
    const u = document.createElement('u');
    u.appendChild(selectedText);
    range.insertNode(u);
  }

  unwrap(range) {
    const u = this.api.selection.findParentTag('U');
    const text = range.extractContents();
    
    u.remove();
    range.insertNode(text);
  }

  checkState() {
    const u = this.api.selection.findParentTag('U');
    this.state = !!u;
  }
}

// Inline Code Tool
class InlineCode {
  static get isInline() {
    return true;
  }

  static get sanitize() {
    return {
      code: {}
    };
  }

  static get title() {
    return 'Inline Code';
  }

  get state() {
    return this._state;
  }

  set state(state) {
    this._state = state;
    this.button.classList.toggle('ce-inline-tool--active', state);
  }

  render() {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.innerHTML = '<svg width="14" height="14"><path d="M3.177 6.852c.205.253.347.572.427.954.078.372.117.844.117 1.417 0 .418.01.725.03.92.02.18.057.314.107.397.046.075.093.117.14.126.043.005.09.007.14.007v.928c-.284 0-.537-.028-.758-.085a1.76 1.76 0 0 1-.593-.289c-.17-.133-.3-.31-.394-.532-.09-.221-.135-.49-.135-.804 0-.307-.01-.58-.03-.82a3.17 3.17 0 0 0-.1-.626c-.043-.18-.1-.34-.168-.48-.065-.14-.146-.258-.242-.355-.096-.097-.218-.168-.364-.214v-.07c.146-.046.268-.117.364-.214a1.861 1.861 0 0 0 .242-.355 4.8 4.8 0 0 0 .168-.48 3.177 3.177 0 0 0 .1-.626c.02-.24.03-.513.03-.82 0-.314.045-.583.135-.804.094-.222.224-.4.394-.532.18-.14.378-.221.593-.289.221-.057.474-.085.758-.085v.928a1.394 1.394 0 0 0-.14.007c-.047.009-.094.051-.14.126-.05.083-.087.217-.107.397-.02.195-.03.502-.03.92 0 .573-.039 1.045-.117 1.417-.08.382-.222.701-.427.954Z"/></svg>';
    this.button.title = 'Inline Code';
    
    return this.button;
  }

  surround(range) {
    if (this.state) {
      this.unwrap(range);
    } else {
      this.wrap(range);
    }
  }

  wrap(range) {
    const selectedText = range.extractContents();
    const code = document.createElement('code');
    
    code.style.backgroundColor = '#f8f9fa';
    code.style.padding = '2px 4px';
    code.style.borderRadius = '3px';
    code.style.fontFamily = 'monospace';
    code.style.fontSize = '90%';
    
    code.appendChild(selectedText);
    range.insertNode(code);
  }

  unwrap(range) {
    const code = this.api.selection.findParentTag('CODE');
    const text = range.extractContents();
    
    code.remove();
    range.insertNode(text);
  }

  checkState() {
    const code = this.api.selection.findParentTag('CODE');
    this.state = !!code;
  }
}

// Export all tools to window object
window.Header = Header;
window.List = List;
window.CodeTool = CodeTool;
window.Table = Table;
window.Quote = Quote;
window.Bold = Bold;
window.Italic = Italic;
window.Underline = Underline;
window.InlineCode = InlineCode;

console.log('✅ Editor.js tools loaded and exposed to window'); 