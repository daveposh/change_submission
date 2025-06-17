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

// Enhanced List Tool with Add Button
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
    wrapper.style.position = 'relative';
    
    const list = document.createElement(this.data.style === 'ordered' ? 'ol' : 'ul');
    list.style.marginBottom = '10px';
    
    this.data.items.forEach((item) => {
      const li = this.createListItem(item);
      list.appendChild(li);
    });

    if (this.data.items.length === 0) {
      const li = this.createListItem('');
      list.appendChild(li);
    }

    // Add button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '8px';
    buttonContainer.style.marginTop = '8px';
    
    // Add item button
    if (!this.readOnly) {
      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.innerHTML = '+ Add Item';
      addButton.style.cssText = `
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        padding: 6px 12px;
        font-size: 12px;
        color: #495057;
        cursor: pointer;
        transition: all 0.2s;
      `;
      
      addButton.addEventListener('mouseenter', () => {
        addButton.style.background = '#e9ecef';
        addButton.style.borderColor = '#adb5bd';
      });
      
      addButton.addEventListener('mouseleave', () => {
        addButton.style.background = '#f8f9fa';
        addButton.style.borderColor = '#dee2e6';
      });
      
      addButton.addEventListener('click', () => {
        const newItem = this.createListItem('');
        list.appendChild(newItem);
        newItem.focus();
      });
      
      buttonContainer.appendChild(addButton);
      
      // Style toggle button
      const styleButton = document.createElement('button');
      styleButton.type = 'button';
      styleButton.innerHTML = this.data.style === 'ordered' ? '1. → •' : '• → 1.';
      styleButton.title = 'Toggle list style';
      styleButton.style.cssText = `
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        padding: 6px 12px;
        font-size: 12px;
        color: #495057;
        cursor: pointer;
        transition: all 0.2s;
      `;
      
      styleButton.addEventListener('mouseenter', () => {
        styleButton.style.background = '#e9ecef';
        styleButton.style.borderColor = '#adb5bd';
      });
      
      styleButton.addEventListener('mouseleave', () => {
        styleButton.style.background = '#f8f9fa';
        styleButton.style.borderColor = '#dee2e6';
      });
      
      styleButton.addEventListener('click', () => {
        this.toggleListStyle(list, styleButton);
      });
      
      buttonContainer.appendChild(styleButton);
    }

    wrapper.appendChild(list);
    wrapper.appendChild(buttonContainer);
    this.list = list;

    return wrapper;
  }

  createListItem(content) {
    const li = document.createElement('li');
    li.innerHTML = content;
    li.contentEditable = !this.readOnly;
    li.style.marginBottom = '4px';
    
    if (!content) {
      li.setAttribute('data-placeholder', 'List item');
    }
    
    // Add event listeners for better UX
    if (!this.readOnly) {
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const newItem = this.createListItem('');
          li.parentNode.insertBefore(newItem, li.nextSibling);
          newItem.focus();
        }
        if (e.key === 'Backspace' && li.textContent.trim() === '' && li.parentNode.children.length > 1) {
          e.preventDefault();
          const prevItem = li.previousElementSibling;
          li.remove();
          if (prevItem) {
            prevItem.focus();
            // Move cursor to end
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(prevItem);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      });
    }
    
    return li;
  }

  toggleListStyle(list, button) {
    if (!list || !list.parentNode) {
      console.warn('List element not found or has no parent');
      return;
    }
    
    const items = Array.from(list.children);
    const newStyle = this.data.style === 'ordered' ? 'unordered' : 'ordered';
    const newList = document.createElement(newStyle === 'ordered' ? 'ol' : 'ul');
    newList.style.marginBottom = '10px';
    
    items.forEach(item => {
      // Clone the item to avoid moving issues
      const clonedItem = item.cloneNode(true);
      newList.appendChild(clonedItem);
    });
    
    try {
      list.parentNode.replaceChild(newList, list);
      this.list = newList;
      this.data.style = newStyle;
      
      button.innerHTML = newStyle === 'ordered' ? '1. → •' : '• → 1.';
    } catch (error) {
      console.error('Error replacing list:', error);
    }
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
        span: true,
        mark: true,
        code: true
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

// Enhanced Table Tool with Controls
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
    wrapper.style.position = 'relative';
    
    const tableContainer = document.createElement('div');
    tableContainer.style.marginBottom = '10px';
    
    const table = this.createTable();
    tableContainer.appendChild(table);
    
    // Control buttons container
    if (!this.readOnly) {
      const controlsContainer = document.createElement('div');
      controlsContainer.style.display = 'flex';
      controlsContainer.style.gap = '8px';
      controlsContainer.style.flexWrap = 'wrap';
      controlsContainer.style.marginTop = '8px';
      
      // Add Row button
      const addRowButton = this.createControlButton('+ Add Row', () => {
        this.addRow();
      });
      controlsContainer.appendChild(addRowButton);
      
      // Add Column button
      const addColumnButton = this.createControlButton('+ Add Column', () => {
        this.addColumn();
      });
      controlsContainer.appendChild(addColumnButton);
      
      // Remove Row button
      const removeRowButton = this.createControlButton('- Remove Row', () => {
        this.removeRow();
      });
      controlsContainer.appendChild(removeRowButton);
      
      // Remove Column button
      const removeColumnButton = this.createControlButton('- Remove Column', () => {
        this.removeColumn();
      });
      controlsContainer.appendChild(removeColumnButton);
      
      // Toggle Header button
      const toggleHeaderButton = this.createControlButton(
        this.data.withHeadings ? 'Remove Headers' : 'Add Headers',
        () => {
          this.toggleHeaders(toggleHeaderButton);
        }
      );
      controlsContainer.appendChild(toggleHeaderButton);
      
      wrapper.appendChild(tableContainer);
      wrapper.appendChild(controlsContainer);
    } else {
      wrapper.appendChild(tableContainer);
    }
    
    this.table = table;
    this.wrapper = wrapper;

    return wrapper;
  }

  createTable() {
    const table = document.createElement('table');
    table.style.cssText = `
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #dee2e6;
      margin-bottom: 0;
    `;

    this.data.content.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
      
      row.forEach((cell, cellIndex) => {
        const cellElement = document.createElement(
          this.data.withHeadings && rowIndex === 0 ? 'th' : 'td'
        );
        
        cellElement.contentEditable = !this.readOnly;
        cellElement.innerHTML = cell;
        cellElement.style.cssText = `
          border: 1px solid #dee2e6;
          padding: 8px;
          text-align: left;
          min-width: 100px;
          background-color: ${this.data.withHeadings && rowIndex === 0 ? '#f8f9fa' : 'white'};
          font-weight: ${this.data.withHeadings && rowIndex === 0 ? 'bold' : 'normal'};
        `;
        
        if (!cell) {
          cellElement.setAttribute('data-placeholder', this.data.withHeadings && rowIndex === 0 ? 'Header' : 'Cell');
        }
        
        // Add keyboard navigation
        if (!this.readOnly) {
          cellElement.addEventListener('keydown', (e) => {
            this.handleCellKeydown(e, rowIndex, cellIndex);
          });
        }

        tr.appendChild(cellElement);
      });
      
      table.appendChild(tr);
    });

    return table;
  }

  createControlButton(text, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = text;
    button.style.cssText = `
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      padding: 6px 12px;
      font-size: 12px;
      color: #495057;
      cursor: pointer;
      transition: all 0.2s;
    `;
    
    button.addEventListener('mouseenter', () => {
      button.style.background = '#e9ecef';
      button.style.borderColor = '#adb5bd';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.background = '#f8f9fa';
      button.style.borderColor = '#dee2e6';
    });
    
    button.addEventListener('click', onClick);
    
    return button;
  }

  handleCellKeydown(e, rowIndex, cellIndex) {
    const rows = this.table.rows;
    const currentRow = rows[rowIndex];
    
    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        const nextCellIndex = e.shiftKey ? cellIndex - 1 : cellIndex + 1;
        const nextRowIndex = nextCellIndex < 0 ? rowIndex - 1 : 
                            nextCellIndex >= currentRow.cells.length ? rowIndex + 1 : rowIndex;
        
        if (nextRowIndex >= 0 && nextRowIndex < rows.length) {
          const targetRow = rows[nextRowIndex];
          const targetCellIndex = nextCellIndex < 0 ? targetRow.cells.length - 1 :
                                 nextCellIndex >= currentRow.cells.length ? 0 : nextCellIndex;
          
          if (targetRow.cells[targetCellIndex]) {
            targetRow.cells[targetCellIndex].focus();
          }
        }
        break;
        
      case 'Enter':
        if (e.ctrlKey) {
          e.preventDefault();
          this.addRow();
        }
        break;
    }
  }

  addRow() {
    const columnCount = this.data.content[0] ? this.data.content[0].length : 2;
    const newRow = new Array(columnCount).fill('');
    this.data.content.push(newRow);
    this.refreshTable();
  }

  addColumn() {
    this.data.content.forEach(row => {
      row.push('');
    });
    this.refreshTable();
  }

  removeRow() {
    if (this.data.content.length > 1) {
      this.data.content.pop();
      this.refreshTable();
    }
  }

  removeColumn() {
    if (this.data.content[0] && this.data.content[0].length > 1) {
      this.data.content.forEach(row => {
        row.pop();
      });
      this.refreshTable();
    }
  }

  toggleHeaders(button) {
    this.data.withHeadings = !this.data.withHeadings;
    button.innerHTML = this.data.withHeadings ? 'Remove Headers' : 'Add Headers';
    this.refreshTable();
  }

  refreshTable() {
    // Save current content before refresh
    this.updateContentFromTable();
    
    // Replace table with new one
    const newTable = this.createTable();
    this.table.parentNode.replaceChild(newTable, this.table);
    this.table = newTable;
  }

  updateContentFromTable() {
    if (this.table && this.table.rows) {
      this.data.content = Array.from(this.table.rows).map(row => 
        Array.from(row.cells).map(cell => cell.innerHTML)
      );
    }
  }

  save() {
    this.updateContentFromTable();
    
    return {
      withHeadings: this.data.withHeadings,
      content: this.data.content
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
        span: true,
        mark: true,
        code: true
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
    if (this.api && this.api.selection) {
      const strong = this.api.selection.findParentTag('STRONG') || this.api.selection.findParentTag('B');
      this.state = !!strong;
    } else {
      this.state = false;
    }
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
    if (this.api && this.api.selection) {
      const em = this.api.selection.findParentTag('EM') || this.api.selection.findParentTag('I');
      this.state = !!em;
    } else {
      this.state = false;
    }
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
    if (this.api && this.api.selection) {
      const u = this.api.selection.findParentTag('U');
      this.state = !!u;
    } else {
      this.state = false;
    }
  }
}

// Inline Code Tool
class InlineCode {
  constructor({ api }) {
    this.api = api;
  }

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
    if (this.api && this.api.selection) {
      const code = this.api.selection.findParentTag('CODE');
      this.state = !!code;
    } else {
      this.state = false;
    }
  }
}

// Font Family Tool
class FontFamily {
  constructor({ api }) {
    this.api = api;
    this.fontFamilies = [
      { name: 'Default', value: '' },
      { name: 'Arial', value: 'Arial, sans-serif' },
      { name: 'Times New Roman', value: 'Times New Roman, serif' },
      { name: 'Courier New', value: 'Courier New, monospace' },
      { name: 'Georgia', value: 'Georgia, serif' },
      { name: 'Verdana', value: 'Verdana, sans-serif' },
      { name: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' },
      { name: 'Comic Sans MS', value: 'Comic Sans MS, cursive' }
    ];
  }

  static get isInline() {
    return true;
  }

  static get sanitize() {
    return {
      span: {
        style: true
      }
    };
  }

  static get title() {
    return 'Font Family';
  }

  render() {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';

    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.innerHTML = '<svg width="14" height="14"><path d="M3.5 2h7l1.5 4h-1.2L9.9 4.8H4.1L3.2 6H2l1.5-4zm1.1 1.5l1.4 3.5h2l1.4-3.5H4.6z"/></svg>';
    this.button.title = 'Font Family';
    this.button.style.cssText = `
      background: transparent;
      border: none;
      padding: 4px;
      cursor: pointer;
      border-radius: 3px;
    `;

    this.dropdown = document.createElement('div');
    this.dropdown.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      background: white;
      border: 1px solid #e1e5e9;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      min-width: 150px;
      z-index: 1000;
      display: none;
    `;

    this.fontFamilies.forEach(font => {
      const option = document.createElement('div');
      option.textContent = font.name;
      option.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        font-family: ${font.value || 'inherit'};
      `;
      option.addEventListener('mouseenter', () => {
        option.style.backgroundColor = '#f8f9fa';
      });
      option.addEventListener('mouseleave', () => {
        option.style.backgroundColor = '';
      });
      option.addEventListener('click', () => {
        this.applyFont(font.value);
        this.hideDropdown();
      });
      this.dropdown.appendChild(option);
    });

    this.button.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleDropdown();
    });

    wrapper.appendChild(this.button);
    wrapper.appendChild(this.dropdown);

    return wrapper;
  }

  toggleDropdown() {
    const isVisible = this.dropdown.style.display === 'block';
    this.dropdown.style.display = isVisible ? 'none' : 'block';
  }

  hideDropdown() {
    this.dropdown.style.display = 'none';
  }

  applyFont(fontFamily) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (!range.collapsed) {
        const span = document.createElement('span');
        span.style.fontFamily = fontFamily;
        try {
          span.appendChild(range.extractContents());
          range.insertNode(span);
        } catch (e) {
          console.warn('Font application failed:', e);
        }
      }
    }
  }

  surround() {
    // This tool uses dropdown, surround not applicable
  }

  checkState() {
    // FontFamily tool doesn't need state checking like toggle tools
    return false;
  }
}

// Highlight Tool
class Highlight {
  constructor({ api }) {
    this.api = api;
  }

  static get isInline() {
    return true;
  }

  static get sanitize() {
    return {
      mark: {
        style: true
      }
    };
  }

  static get title() {
    return 'Highlight';
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
    this.button.innerHTML = '<svg width="14" height="14"><rect x="2" y="3" width="10" height="8" rx="1" fill="none" stroke="currentColor"/><path d="M3 5h8M3 7h8M3 9h6" stroke="currentColor"/></svg>';
    this.button.title = 'Highlight';
    
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
    const mark = document.createElement('mark');
    mark.style.backgroundColor = '#fff3cd';
    mark.style.padding = '1px 2px';
    mark.appendChild(selectedText);
    range.insertNode(mark);
  }

  unwrap(range) {
    const mark = this.api.selection.findParentTag('MARK');
    if (mark) {
      const text = range.extractContents();
      mark.remove();
      range.insertNode(text);
    }
  }

  checkState() {
    if (this.api && this.api.selection) {
      const mark = this.api.selection.findParentTag('MARK');
      this.state = !!mark;
    } else {
      this.state = false;
    }
  }
}

// Text Color Tool
class TextColor {
  constructor({ api }) {
    this.api = api;
    this.colors = [
      { name: 'Default', value: '' },
      { name: 'Red', value: '#dc3545' },
      { name: 'Green', value: '#198754' },
      { name: 'Blue', value: '#0d6efd' },
      { name: 'Orange', value: '#fd7e14' },
      { name: 'Purple', value: '#6f42c1' },
      { name: 'Teal', value: '#20c997' },
      { name: 'Gray', value: '#6c757d' },
      { name: 'Dark', value: '#212529' }
    ];
  }

  static get isInline() {
    return true;
  }

  static get sanitize() {
    return {
      span: {
        style: true
      }
    };
  }

  static get title() {
    return 'Text Color';
  }

  render() {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';

    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.innerHTML = '<svg width="14" height="14"><path d="M3 12h8l-1.5-4H4.5L3 12zm1-6h6l1.5 4H2.5L4 6zm3-4L5.5 4h3L7 2z" fill="currentColor"/><rect x="0" y="13" width="14" height="1" fill="#dc3545"/></svg>';
    this.button.title = 'Text Color';
    this.button.style.cssText = `
      background: transparent;
      border: none;
      padding: 4px;
      cursor: pointer;
      border-radius: 3px;
    `;

    this.dropdown = document.createElement('div');
    this.dropdown.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      background: white;
      border: 1px solid #e1e5e9;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      min-width: 120px;
      z-index: 1000;
      display: none;
      padding: 4px;
    `;

    this.colors.forEach(color => {
      const option = document.createElement('div');
      option.style.cssText = `
        padding: 6px 8px;
        cursor: pointer;
        border-radius: 3px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
      `;
      
      const colorDot = document.createElement('div');
      colorDot.style.cssText = `
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background-color: ${color.value || '#000'};
        border: 1px solid #dee2e6;
      `;
      
      const colorName = document.createElement('span');
      colorName.textContent = color.name;
      colorName.style.color = color.value || '#000';
      
      option.appendChild(colorDot);
      option.appendChild(colorName);
      
      option.addEventListener('mouseenter', () => {
        option.style.backgroundColor = '#f8f9fa';
      });
      option.addEventListener('mouseleave', () => {
        option.style.backgroundColor = '';
      });
      option.addEventListener('click', () => {
        this.applyColor(color.value);
        this.hideDropdown();
      });
      this.dropdown.appendChild(option);
    });

    this.button.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleDropdown();
    });

    wrapper.appendChild(this.button);
    wrapper.appendChild(this.dropdown);

    return wrapper;
  }

  toggleDropdown() {
    const isVisible = this.dropdown.style.display === 'block';
    this.dropdown.style.display = isVisible ? 'none' : 'block';
  }

  hideDropdown() {
    this.dropdown.style.display = 'none';
  }

  applyColor(color) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (!range.collapsed) {
        const span = document.createElement('span');
        span.style.color = color;
        try {
          span.appendChild(range.extractContents());
          range.insertNode(span);
        } catch (e) {
          console.warn('Color application failed:', e);
        }
      }
    }
  }

  surround() {
    // This tool uses dropdown, surround not applicable
  }

  checkState() {
    // TextColor tool doesn't need state checking like toggle tools
    return false;
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
window.FontFamily = FontFamily;
window.Highlight = Highlight;
window.TextColor = TextColor;

console.log('✅ Editor.js tools loaded and exposed to window'); 