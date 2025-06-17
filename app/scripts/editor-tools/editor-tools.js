// Editor.js Tools Bundle

// Header Tool
class Header {
  static get toolbox() {
    return {
      title: 'Header',
      icon: '<svg width="10" height="14" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 14"><path d="M7.6 8.15H2.25v4.525a1.125 1.125 0 0 1-2.25 0V1.125a1.125 1.125 0 1 1 2.25 0V5.9H7.6V1.125a1.125 1.125 0 0 1 2.25 0v11.55a1.125 1.125 0 0 1-2.25 0V8.15z"/></svg>'
    };
  }

  static get isInline() {
    return false;
  }

  static get sanitize() {
    return {
      level: false,
      text: {}
    };
  }

  constructor({ data, config, api }) {
    this.api = api;
    this.data = {
      text: data.text || '',
      level: data.level || config.defaultLevel || 2
    };
    this.config = config || {};
    this.wrapper = undefined;
  }

  render() {
    this.wrapper = document.createElement('div');
    this.wrapper.classList.add('ce-header');

    const input = document.createElement('input');
    input.classList.add('ce-header__input');
    input.value = this.data.text;
    input.placeholder = 'Heading';
    input.contentEditable = true;

    const levelSelect = document.createElement('select');
    levelSelect.classList.add('ce-header__level-select');
    
    // Add level options (h1, h2, h3)
    [1, 2, 3].forEach(level => {
      const option = document.createElement('option');
      option.value = level;
      option.text = `H${level}`;
      option.selected = this.data.level === level;
      levelSelect.appendChild(option);
    });

    levelSelect.addEventListener('change', (e) => {
      this.data.level = parseInt(e.target.value);
      this._toggleLevel();
    });

    this.wrapper.appendChild(levelSelect);
    this.wrapper.appendChild(input);
    this._toggleLevel();

    return this.wrapper;
  }

  _toggleLevel() {
    this.wrapper.className = this.wrapper.className.replace(/ce-header--[a-z0-9]+/g, '');
    this.wrapper.classList.add(`ce-header--${this.data.level}`);
  }

  save(blockContent) {
    const input = blockContent.querySelector('.ce-header__input');
    const select = blockContent.querySelector('.ce-header__level-select');

    return {
      text: input.value,
      level: parseInt(select.value)
    };
  }

  validate(savedData) {
    if (!savedData.text.trim()) {
      return false;
    }
    return true;
  }

  static get pasteConfig() {
    return {
      tags: ['H1', 'H2', 'H3']
    };
  }
}

// List Tool
class List {
  static get toolbox() {
    return {
      title: 'List',
      icon: '<svg width="17" height="13" viewBox="0 0 17 13" xmlns="http://www.w3.org/2000/svg"> <path d="M5.625 4.85h9.25a1.125 1.125 0 0 1 0 2.25h-9.25a1.125 1.125 0 0 1 0-2.25zm0-4.85h9.25a1.125 1.125 0 0 1 0 2.25h-9.25a1.125 1.125 0 0 1 0-2.25zm0 9.85h9.25a1.125 1.125 0 0 1 0 2.25h-9.25a1.125 1.125 0 0 1 0-2.25zm-4.5-5a1.125 1.125 0 1 1 0 2.25 1.125 1.125 0 0 1 0-2.25zm0-4.85a1.125 1.125 0 1 1 0 2.25 1.125 1.125 0 0 1 0-2.25zm0 9.85a1.125 1.125 0 1 1 0 2.25 1.125 1.125 0 0 1 0-2.25z"/></svg>'
    };
  }

  static get isInline() {
    return false;
  }

  static get sanitize() {
    return {
      style: {},
      items: {
        br: true
      }
    };
  }

  constructor({ data, config, api }) {
    this.api = api;
    this.data = {
      items: Array.isArray(data.items) ? data.items : [],
      style: data.style || 'unordered'
    };
    this.config = config || {};
    this.wrapper = undefined;
  }

  render() {
    this.wrapper = document.createElement('div');
    this.wrapper.classList.add('ce-list');

    const styleToggle = document.createElement('button');
    styleToggle.classList.add('ce-list__style-toggle');
    styleToggle.innerHTML = this.data.style === 'ordered' ? '1.' : '•';
    styleToggle.addEventListener('click', () => {
      this.data.style = this.data.style === 'ordered' ? 'unordered' : 'ordered';
      styleToggle.innerHTML = this.data.style === 'ordered' ? '1.' : '•';
      this._renderList();
    });

    const list = this._renderList();
    
    // Add new item button
    const addButton = document.createElement('button');
    addButton.classList.add('ce-list__add-item');
    addButton.innerHTML = '+ Add Item';
    addButton.addEventListener('click', () => {
      this.data.items.push('');
      this._renderList();
    });

    this.wrapper.appendChild(styleToggle);
    this.wrapper.appendChild(list);
    this.wrapper.appendChild(addButton);

    return this.wrapper;
  }

  _renderList() {
    // Remove existing list if any
    const oldList = this.wrapper.querySelector('.ce-list__container');
    if (oldList) {
      oldList.remove();
    }

    const list = document.createElement(this.data.style === 'ordered' ? 'ol' : 'ul');
    list.classList.add('ce-list__container');

    this.data.items.forEach((item, index) => {
      const li = document.createElement('li');
      li.classList.add('ce-list__item');
      
      const input = document.createElement('input');
      input.value = item;
      input.placeholder = 'List item';
      input.addEventListener('input', (e) => {
        this.data.items[index] = e.target.value;
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.classList.add('ce-list__delete-item');
      deleteBtn.innerHTML = '×';
      deleteBtn.addEventListener('click', () => {
        this.data.items.splice(index, 1);
        this._renderList();
      });

      li.appendChild(input);
      li.appendChild(deleteBtn);
      list.appendChild(li);
    });

    // If no items, add one empty item
    if (this.data.items.length === 0) {
      this.data.items.push('');
      return this._renderList();
    }

    this.wrapper.insertBefore(list, this.wrapper.lastChild);
    return list;
  }

  save(blockContent) {
    const items = Array.from(blockContent.querySelectorAll('.ce-list__item input'))
      .map(input => input.value.trim())
      .filter(item => item !== '');

    return {
      items,
      style: this.data.style
    };
  }

  validate(savedData) {
    return savedData.items.length > 0;
  }

  static get pasteConfig() {
    return {
      tags: ['UL', 'OL', 'LI']
    };
  }
}

// Expose tools to window
window.Header = Header;
window.List = List;
console.log('✅ Editor.js tools loaded and exposed to window'); 