// Simple Editor.js Tools - Like the official demo
// Based on the clean implementation from https://editorjs.io/

// Simple List Tool - works like the official demo
class SimpleList {
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

  static get isReadOnlySupported() {
    return true;
  }

  render() {
    const wrapper = document.createElement('div');
    wrapper.classList.add('cdx-list');
    
    this.wrapper = wrapper;
    this.list = document.createElement(this.data.style === 'ordered' ? 'ol' : 'ul');
    this.list.classList.add(`cdx-list--${this.data.style}`);
    
    if (this.data.items.length) {
      this.data.items.forEach(itemContent => {
        this.list.appendChild(this.createItem(itemContent));
      });
    } else {
      this.list.appendChild(this.createItem());
    }

    wrapper.appendChild(this.list);
    return wrapper;
  }

  createItem(content = '') {
    const item = document.createElement('li');
    item.classList.add('cdx-list__item');
    item.innerHTML = content;
    item.contentEditable = !this.readOnly;

    item.addEventListener('keydown', (event) => {
      switch (event.code) {
        case 'Enter':
          this.enterPressed(event);
          break;
        case 'Backspace':
          this.backspace(event);
          break;
      }
    });

    return item;
  }

  enterPressed(event) {
    event.preventDefault();

    const currentItem = event.target;
    const currentItemContent = currentItem.innerHTML.replace('<br>', ' ').trim();

    if (currentItemContent.length === 0) {
      // If empty item, convert to paragraph
      this.api.blocks.insert();
      this.api.blocks.delete();
      return;
    }

    const newItem = this.createItem();
    this.list.insertBefore(newItem, currentItem.nextSibling);
    newItem.focus();
  }

  backspace(event) {
    const currentItem = event.target;
    const currentItemContent = currentItem.textContent.trim();

    if (currentItemContent.length === 0) {
      event.preventDefault();
      
      if (this.list.children.length === 1) {
        // If only one item left, convert to paragraph
        this.api.blocks.insert();
        this.api.blocks.delete();
        return;
      }
      
      const previousItem = currentItem.previousElementSibling;
      if (previousItem) {
        currentItem.remove();
        previousItem.focus();
        this.moveCaretToEnd(previousItem);
      }
    }
  }

  moveCaretToEnd(element) {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  save() {
    const items = Array.from(this.list.children).map(item => item.innerHTML);
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
        b: true,
        i: true,
        em: true,
        u: true,
        s: true,
        code: true,
        mark: true,
        a: {
          href: true
        }
      }
    };
  }
}

// Simple Table Tool - works like the official demo
class SimpleTable {
  constructor({ data, api, readOnly }) {
    this.api = api;
    this.readOnly = readOnly;
    this.data = {
      withHeadings: data.withHeadings !== undefined ? data.withHeadings : false,
      content: data.content || [['', ''], ['', '']]
    };
  }

  static get toolbox() {
    return {
      icon: '<svg width="14" height="14"><rect width="14" height="14" rx="1" fill="none" stroke="currentColor"/><line x1="0" y1="4" x2="14" y2="4" stroke="currentColor"/><line x1="4" y1="0" x2="4" y2="14" stroke="currentColor"/></svg>',
      title: 'Table'
    };
  }

  static get isReadOnlySupported() {
    return true;
  }

  render() {
    const wrapper = document.createElement('div');
    wrapper.classList.add('tc-table-wrapper');
    
    const table = this.createTable();
    wrapper.appendChild(table);
    
    this.table = table;
    this.wrapper = wrapper;

    return wrapper;
  }

  createTable() {
    const table = document.createElement('table');
    table.classList.add('tc-table');
    table.style.cssText = `
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #e9ecef;
      margin: 0;
    `;

    this.data.content.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
      
      row.forEach((cell, cellIndex) => {
        const cellElement = document.createElement(
          this.data.withHeadings && rowIndex === 0 ? 'th' : 'td'
        );
        
        cellElement.classList.add('tc-table__cell');
        cellElement.contentEditable = !this.readOnly;
        cellElement.innerHTML = cell;
        cellElement.style.cssText = `
          border: 1px solid #e9ecef;
          padding: 12px;
          text-align: left;
          min-width: 50px;
          background-color: ${this.data.withHeadings && rowIndex === 0 ? '#f8f9fa' : 'white'};
          font-weight: ${this.data.withHeadings && rowIndex === 0 ? '600' : 'normal'};
        `;
        
        if (!cell) {
          cellElement.setAttribute('data-placeholder', this.data.withHeadings && rowIndex === 0 ? 'Header' : '');
        }
        
        // Add keyboard navigation like in the demo
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
        } else if (nextRowIndex >= rows.length) {
          // Add new row when tabbing from last cell
          this.addRow();
          setTimeout(() => {
            if (this.table.rows[nextRowIndex]) {
              this.table.rows[nextRowIndex].cells[0].focus();
            }
          }, 0);
        }
        break;
        
      case 'Enter':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.addRow();
          setTimeout(() => {
            const newRowIndex = rowIndex + 1;
            if (this.table.rows[newRowIndex]) {
              this.table.rows[newRowIndex].cells[cellIndex].focus();
            }
          }, 0);
        }
        break;
    }
  }

  addRow() {
    const newRowData = new Array(this.data.content[0].length).fill('');
    this.data.content.push(newRowData);
    this.refreshTable();
  }

  addColumn() {
    this.data.content.forEach(row => row.push(''));
    this.refreshTable();
  }

  refreshTable() {
    const newTable = this.createTable();
    this.table.parentNode.replaceChild(newTable, this.table);
    this.table = newTable;
  }

  updateContentFromTable() {
    const rows = Array.from(this.table.rows);
    this.data.content = rows.map(row => {
      return Array.from(row.cells).map(cell => cell.innerHTML);
    });
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
        b: true,
        i: true,
        em: true,
        u: true,
        s: true,
        code: true,
        mark: true,
        a: {
          href: true
        }
      }
    };
  }
}

// Export the tools
window.SimpleList = SimpleList;
window.SimpleTable = SimpleTable; 