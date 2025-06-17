// Editor.js Tools Bundle

// Header Tool
class Header {
  static get toolbox() {
    return {
      title: 'Header',
      icon: '<svg width="10" height="14" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 14"><path d="M7.6 8.15H2.25v4.525a1.125 1.125 0 0 1-2.25 0V1.125a1.125 1.125 0 1 1 2.25 0V5.9H7.6V1.125a1.125 1.125 0 0 1 2.25 0v11.55a1.125 1.125 0 0 1-2.25 0V8.15z"/></svg>'
    };
  }

  constructor({ data, config }) {
    this.data = {
      text: data.text || '',
      level: data.level || config.defaultLevel || 2
    };
    this.config = config;
  }

  render() {
    const wrapper = document.createElement('div');
    const input = document.createElement('input');
    input.value = this.data.text;
    input.placeholder = 'Heading';
    wrapper.appendChild(input);
    return wrapper;
  }

  save(blockContent) {
    const input = blockContent.querySelector('input');
    return {
      text: input.value,
      level: this.data.level
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

  constructor({ data }) {
    this.data = {
      items: data.items || [],
      style: data.style || 'unordered'
    };
  }

  render() {
    const wrapper = document.createElement('div');
    const list = document.createElement(this.data.style === 'ordered' ? 'ol' : 'ul');
    this.data.items.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      list.appendChild(li);
    });
    wrapper.appendChild(list);
    return wrapper;
  }

  save(blockContent) {
    const items = Array.from(blockContent.querySelectorAll('li')).map(li => li.textContent);
    return {
      items,
      style: this.data.style
    };
  }
}

// Expose tools to window
window.Header = Header;
window.List = List;
console.log('✅ Editor.js tools loaded and exposed to window'); 