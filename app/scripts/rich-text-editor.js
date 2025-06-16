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
    const editorConfig = {
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
    };

    // Create editor instance
    this.editor = new Lexical.Editor(editorConfig);
    this.editor.mount(editorContainer);

    // Set initial content
    if (this.initialContent) {
      this.editor.update(() => {
        const root = this.editor.getRootElement();
        root.innerHTML = this.initialContent;
      });
    }

    // Sync with textarea
    this.editor.registerUpdateListener(({ editorState }) => {
      const content = editorState.toJSON();
      if (textarea) {
        textarea.value = JSON.stringify(content);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  executeCommand(command) {
    if (!this.editor) return;

    const commandHandlers = {
      bold: () => this.editor.dispatchCommand(Lexical.FORMAT_TEXT_COMMAND, 'bold'),
      italic: () => this.editor.dispatchCommand(Lexical.FORMAT_TEXT_COMMAND, 'italic'),
      underline: () => this.editor.dispatchCommand(Lexical.FORMAT_TEXT_COMMAND, 'underline'),
      bullet: () => this.editor.dispatchCommand(Lexical.INSERT_UNORDERED_LIST_COMMAND),
      number: () => this.editor.dispatchCommand(Lexical.INSERT_ORDERED_LIST_COMMAND),
      link: () => this.promptForLink(),
      code: () => this.editor.dispatchCommand(Lexical.INSERT_CODE_BLOCK_COMMAND),
      table: () => this.promptForTable()
    };

    const handler = commandHandlers[command];
    if (handler) {
      handler();
    }
  }

  promptForLink() {
    Swal.fire({
      title: 'Add Link',
      input: 'url',
      inputLabel: 'Enter URL',
      inputPlaceholder: 'https://example.com',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'Please enter a URL';
        }
        try {
          new URL(value);
        } catch (e) {
          return 'Please enter a valid URL';
        }
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.editor.dispatchCommand(Lexical.INSERT_LINK_COMMAND, result.value);
      }
    });
  }

  promptForTable() {
    Swal.fire({
      title: 'Insert Table',
      html: `
        <div class="mb-3">
          <label for="rows" class="form-label">Number of Rows</label>
          <input type="number" id="rows" class="form-control" value="3" min="1" max="10">
        </div>
        <div class="mb-3">
          <label for="cols" class="form-label">Number of Columns</label>
          <input type="number" id="cols" class="form-control" value="3" min="1" max="10">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Insert',
      cancelButtonText: 'Cancel',
      focusConfirm: false,
      preConfirm: () => {
        const rows = document.getElementById('rows').value;
        const cols = document.getElementById('cols').value;
        if (!rows || !cols || rows < 1 || cols < 1 || rows > 10 || cols > 10) {
          Swal.showValidationMessage('Please enter valid numbers between 1 and 10');
          return false;
        }
        return { rows: parseInt(rows), cols: parseInt(cols) };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.editor.dispatchCommand(Lexical.INSERT_TABLE_COMMAND, {
          rows: result.value.rows,
          columns: result.value.cols
        });
      }
    });
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

// Initialize rich text editors when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const editorFields = [
    'change-description',
    'reason-for-change',
    'implementation-plan',
    'backout-plan',
    'validation-plan'
  ];

  editorFields.forEach(fieldId => {
    new RichTextEditor(fieldId);
  });
}); 