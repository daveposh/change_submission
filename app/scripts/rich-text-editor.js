class RichTextEditor {
  constructor(containerId, initialContent = '') {
    this.containerId = containerId;
    this.initialContent = initialContent;
    this.editor = null;
    this.initialize();
  }

  initialize() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    // Create editor container
    const editorContainer = document.createElement('div');
    editorContainer.className = 'lexical-editor';
    editorContainer.style.minHeight = '150px';
    editorContainer.style.border = '1px solid #ced4da';
    editorContainer.style.borderRadius = '0.25rem';
    editorContainer.style.padding = '0.5rem';
    editorContainer.style.backgroundColor = '#fff';

    // Create toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'lexical-toolbar';
    toolbar.style.marginBottom = '0.5rem';
    toolbar.style.padding = '0.5rem';
    toolbar.style.borderBottom = '1px solid #ced4da';
    toolbar.style.backgroundColor = '#f8f9fa';

    // Add toolbar buttons
    const buttons = [
      { icon: 'bold', action: 'bold', title: 'Bold' },
      { icon: 'italic', action: 'italic', title: 'Italic' },
      { icon: 'underline', action: 'underline', title: 'Underline' },
      { icon: 'list-ul', action: 'bullet', title: 'Bullet List' },
      { icon: 'list-ol', action: 'number', title: 'Numbered List' },
      { icon: 'link', action: 'link', title: 'Add Link' },
      { icon: 'code', action: 'code', title: 'Code Block' },
      { icon: 'table', action: 'table', title: 'Insert Table' }
    ];

    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.className = 'btn btn-sm btn-outline-secondary me-1';
      button.innerHTML = `<i class="fas fa-${btn.icon}"></i>`;
      button.title = btn.title;
      button.onclick = (e) => {
        e.preventDefault();
        this.executeCommand(btn.action);
      };
      toolbar.appendChild(button);
    });

    // Replace textarea with editor
    const textarea = container.querySelector('textarea');
    if (textarea) {
      textarea.style.display = 'none';
      container.insertBefore(toolbar, textarea);
      container.insertBefore(editorContainer, textarea);
    }

    // Initialize Lexical editor
    this.editor = new Lexical.Editor({
      namespace: this.containerId,
      nodes: [
        Lexical.RichTextNode,
        Lexical.ListNode,
        Lexical.LinkNode,
        Lexical.TableNode,
        Lexical.CodeNode
      ],
      onError: (error) => {
        console.error('Lexical editor error:', error);
      }
    });

    // Create editor instance
    const editorInstance = this.editor.createEditor({
      namespace: this.containerId,
      nodes: [
        Lexical.RichTextNode,
        Lexical.ListNode,
        Lexical.LinkNode,
        Lexical.TableNode,
        Lexical.CodeNode
      ],
      onError: (error) => {
        console.error('Lexical editor error:', error);
      }
    });

    // Mount editor
    editorInstance.mount(editorContainer);

    // Set initial content
    if (this.initialContent) {
      editorInstance.update(() => {
        const root = editorInstance.getRootElement();
        root.innerHTML = this.initialContent;
      });
    }

    // Sync with textarea
    editorInstance.registerUpdateListener(({ editorState }) => {
      const content = editorState.toJSON();
      if (textarea) {
        textarea.value = JSON.stringify(content);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  executeCommand(command) {
    if (!this.editor) return;

    switch (command) {
      case 'bold':
        this.editor.dispatchCommand(Lexical.FORMAT_TEXT_COMMAND, 'bold');
        break;
      case 'italic':
        this.editor.dispatchCommand(Lexical.FORMAT_TEXT_COMMAND, 'italic');
        break;
      case 'underline':
        this.editor.dispatchCommand(Lexical.FORMAT_TEXT_COMMAND, 'underline');
        break;
      case 'bullet':
        this.editor.dispatchCommand(Lexical.INSERT_UNORDERED_LIST_COMMAND);
        break;
      case 'number':
        this.editor.dispatchCommand(Lexical.INSERT_ORDERED_LIST_COMMAND);
        break;
      case 'link':
        this.promptForLink();
        break;
      case 'code':
        this.editor.dispatchCommand(Lexical.INSERT_CODE_BLOCK_COMMAND);
        break;
      case 'table':
        this.promptForTable();
        break;
    }
  }

  promptForLink() {
    const url = prompt('Enter URL:');
    if (url) {
      this.editor.dispatchCommand(Lexical.INSERT_LINK_COMMAND, url);
    }
  }

  promptForTable() {
    const rows = prompt('Enter number of rows:', '3');
    const cols = prompt('Enter number of columns:', '3');
    if (rows && cols) {
      this.editor.dispatchCommand(Lexical.INSERT_TABLE_COMMAND, {
        rows: parseInt(rows),
        columns: parseInt(cols)
      });
    }
  }

  getContent() {
    if (!this.editor) return '';
    return this.editor.getRootElement().innerHTML;
  }

  setContent(content) {
    if (!this.editor) return;
    this.editor.update(() => {
      const root = this.editor.getRootElement();
      root.innerHTML = content;
    });
  }
}

// Initialize rich text editors when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize editors for each textarea
  const editorFields = [
    'change-description',
    'reason-for-change',
    'implementation-plan',
    'backout-plan',
    'validation-plan'
  ];

  editorFields.forEach(fieldId => {
    const container = document.getElementById(fieldId);
    if (container) {
      new RichTextEditor(fieldId, container.value);
    }
  });
}); 