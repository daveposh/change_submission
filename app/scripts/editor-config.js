// Editor.js configuration
const editorConfig = {
  // Common configuration for all editors
  commonConfig: {
    placeholder: 'Start typing...',
    autofocus: false,
    readOnly: false,
    minHeight: 350,
    onReady: function() {
      console.log('✅ Editor.js ready');
    },
    logLevel: 'WARN', // Reduce log verbosity
    // Disable features that cause SecurityError in iframe
    sanitizer: {
      b: true,
      i: true,
      u: true,
      s: true,
      p: true,
      br: true,
      div: true,
      span: true,
      strong: true,
      em: true,
      h1: true,
      h2: true,
      h3: true,
      h4: true,
      h5: true,
      h6: true,
      ul: true,
      ol: true,
      li: true,
      blockquote: true,
      code: true,
      pre: true,
      table: true,
      thead: true,
      tbody: true,
      tr: true,
      th: true,
      td: true,
      cite: true
    },
    tools: {
      // Block Tools
      header: {
        class: window.Header,
        inlineToolbar: true,
        config: {
          levels: [1, 2, 3],
          defaultLevel: 2
        }
      },
      list: {
        class: window.List,
        inlineToolbar: true,
        config: {
          defaultStyle: 'unordered'
        }
      },
      code: {
        class: window.CodeTool,
        config: {
          placeholder: 'Enter your code here...'
        }
      },
      table: {
        class: window.Table,
        inlineToolbar: true,
        config: {
          rows: 2,
          cols: 2,
          withHeadings: true
        }
      },
      quote: {
        class: window.Quote,
        inlineToolbar: true,
        config: {
          quotePlaceholder: 'Enter a quote',
          captionPlaceholder: 'Quote\'s author'
        }
      },
      // Inline Tools
      bold: {
        class: window.Bold
      },
      italic: {
        class: window.Italic
      },
      underline: {
        class: window.Underline
      },
      inlineCode: {
        class: window.InlineCode
      }
    }
  },

  // Initialize editors for specific fields
  initializeEditors: function() {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔧 Initializing Editor.js instances...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => {
            this._initializeEditors().then(resolve).catch(reject);
          });
          return;
        }
        
        // Wait for Editor.js to be loaded
        if (typeof window.EditorJS !== 'function') {
          console.warn('⚠️ Editor.js not loaded yet, waiting...');
          const checkInterval = setInterval(() => {
            if (typeof window.EditorJS === 'function') {
              clearInterval(checkInterval);
              this._initializeEditors().then(resolve).catch(reject);
            }
          }, 100);

          // Timeout after 5 seconds
          setTimeout(() => {
            clearInterval(checkInterval);
            reject(new Error('Editor.js failed to load after timeout'));
          }, 5000);
          return;
        }

        this._initializeEditors().then(resolve).catch(reject);
      } catch (error) {
        console.error('❌ Error initializing editors:', error);
        reject(error);
      }
    });
  },

  // Internal method to initialize editors
  _initializeEditors: function() {
    return new Promise((resolve, reject) => {
      try {
        // Check if required tools are loaded
        if (!window.Header || !window.List || !window.CodeTool || !window.Table || !window.Quote || !window.Bold || !window.Italic || !window.Underline || !window.InlineCode) {
          reject(new Error('Required Editor.js tools not loaded'));
          return;
        }
        
        // Check if required elements exist and are visible
        const holders = [
          'reason-for-change-editor',
          'implementation-plan-editor',
          'backout-plan-editor',
          'validation-plan-editor'
        ];
        
        const missingHolders = holders.filter(id => {
          const element = document.getElementById(id);
          return !element || element.offsetParent === null;
        });
        
        if (missingHolders.length > 0) {
          console.warn('⚠️ Some editor containers not visible yet:', missingHolders);
          // Try again after a short delay
          setTimeout(() => {
            this._initializeEditors().then(resolve).catch(reject);
          }, 500);
          return;
        }

        // Clear any existing editor content first and apply positioning styles
        holders.forEach(id => {
          const holder = document.getElementById(id);
          if (holder) {
            holder.innerHTML = '';
            holder.style.position = 'relative';
            holder.style.width = '100%';
            holder.style.overflow = 'hidden';
            holder.style.boxSizing = 'border-box';
          }
        });

        // Inject additional CSS to override Editor.js centering
        this._injectAntiCenteringCSS();

        // Initialize each editor with proper container styling
        const editors = {};
        let initCount = 0;
        const totalEditors = 4;
        
        const checkComplete = () => {
          initCount++;
          if (initCount === totalEditors) {
            // Apply post-initialization fixes
            setTimeout(() => {
              this._fixEditorPositioning();
            }, 100);
            
            // Store editor instances globally
            window.editors = editors;
            console.log('✅ Editor.js instances initialized successfully');
            resolve(editors);
          }
        };
        
        // Create a simplified config that avoids SecurityError
        const safeConfig = {
          ...this.commonConfig,
          // Remove features that might cause SecurityError
          onChange: undefined,
          onReady: () => {
            console.log('✅ Editor ready');
            checkComplete();
          }
        };
        
        try {
          editors.reason = new window.EditorJS({
            holder: 'reason-for-change-editor',
            ...safeConfig,
            placeholder: 'Describe the reason for this change...'
          });
          console.log('✅ Reason editor initialized');
        } catch (error) {
          console.error('❌ Failed to initialize reason editor:', error);
          checkComplete();
        }

        try {
          editors.implementation = new window.EditorJS({
            holder: 'implementation-plan-editor',
            ...safeConfig,
            placeholder: 'Describe the implementation steps...'
          });
          console.log('✅ Implementation editor initialized');
        } catch (error) {
          console.error('❌ Failed to initialize implementation editor:', error);
          checkComplete();
        }

        try {
          editors.backout = new window.EditorJS({
            holder: 'backout-plan-editor',
            ...safeConfig,
            placeholder: 'Describe the backout procedure...'
          });
          console.log('✅ Backout editor initialized');
        } catch (error) {
          console.error('❌ Failed to initialize backout editor:', error);
          checkComplete();
        }

        try {
          editors.validation = new window.EditorJS({
            holder: 'validation-plan-editor',
            ...safeConfig,
            placeholder: 'Describe how the change will be validated...'
          });
          console.log('✅ Validation editor initialized');
        } catch (error) {
          console.error('❌ Failed to initialize validation editor:', error);
          checkComplete();
        }

      } catch (error) {
        console.error('❌ Error initializing editors:', error);
        reject(error);
      }
    });
  },

  // Inject CSS to prevent Editor.js centering
  _injectAntiCenteringCSS: function() {
    const style = document.createElement('style');
    style.textContent = `
      .editor-container .codex-editor,
      .editor-container .codex-editor__redactor,
      .editor-container .ce-block,
      .editor-container .ce-block__content {
        margin: 0 !important;
        left: 0 !important;
        transform: none !important;
        position: relative !important;
        width: 100% !important;
        max-width: none !important;
      }
      
      .editor-container .codex-editor {
        padding: 1rem !important;
      }
      
      .editor-container .codex-editor__redactor {
        padding-bottom: 100px !important;
      }
      
      /* Inline toolbar styles for new tools */
      .editor-container .ce-inline-tool--active {
        background-color: #007bff !important;
        color: white !important;
      }
      
      .editor-container .ce-inline-toolbar {
        background: white !important;
        border: 1px solid #e1e5e9 !important;
        border-radius: 4px !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
      }
      
      .editor-container .ce-inline-tool {
        border: none !important;
        background: transparent !important;
        padding: 6px 8px !important;
        border-radius: 3px !important;
        margin: 2px !important;
        cursor: pointer !important;
      }
      
      .editor-container .ce-inline-tool:hover {
        background-color: #f8f9fa !important;
      }
      
      /* Toolbox visibility fixes */
      .ce-popover {
        z-index: 99999 !important;
        max-height: 400px !important;
        overflow-y: auto !important;
        position: fixed !important;
        background: white !important;
        border: 1px solid #e1e5e9 !important;
        border-radius: 4px !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
        min-width: 220px !important;
      }
      
      .ce-popover__items {
        max-height: 350px !important;
        overflow-y: auto !important;
        padding: 8px !important;
      }
      
      .ce-popover__item {
        padding: 12px !important;
        border-radius: 4px !important;
        margin-bottom: 4px !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
      }
      
      .ce-popover__item:hover {
        background-color: #f8f9fa !important;
      }
      
      .ce-popover__item-icon {
        margin-right: 12px !important;
        width: 20px !important;
        height: 20px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      
      .ce-popover__item-title {
        font-size: 14px !important;
        color: #333 !important;
      }
      
      /* Ensure containers don't clip the toolbox */
      .tab-content,
      .tab-pane,
      .container-fluid,
      .card,
      .tabs-wrapper,
      .form-group,
      .mb-4 {
        overflow: visible !important;
        z-index: auto !important;
      }
      
      .editor-container {
        overflow: visible !important;
        z-index: auto !important;
      }
      
      /* Code block styles */
      .editor-container .ce-code {
        background-color: #f8f9fa !important;
        border: 1px solid #e9ecef !important;
        border-radius: 4px !important;
        font-family: 'Courier New', Courier, monospace !important;
      }
      
      /* Table styles */
      .editor-container table {
        border-collapse: collapse !important;
        width: 100% !important;
      }
      
      .editor-container table td,
      .editor-container table th {
        border: 1px solid #dee2e6 !important;
        padding: 8px !important;
        text-align: left !important;
      }
      
      .editor-container table th {
        background-color: #f8f9fa !important;
        font-weight: bold !important;
      }
      
      /* Quote styles */
      .editor-container blockquote {
        border-left: 4px solid #007bff !important;
        padding-left: 16px !important;
        margin: 0 !important;
        font-style: italic !important;
      }
      
      .editor-container cite {
        display: block !important;
        font-size: 0.875rem !important;
        color: #6c757d !important;
        margin-top: 8px !important;
      }
    `;
    document.head.appendChild(style);
  },

  // Fix editor positioning after initialization
  _fixEditorPositioning: function() {
    const containers = document.querySelectorAll('.editor-container');
    containers.forEach(container => {
      const editor = container.querySelector('.codex-editor');
      const redactor = container.querySelector('.codex-editor__redactor');
      const blocks = container.querySelectorAll('.ce-block');
      const contents = container.querySelectorAll('.ce-block__content');
      
      if (editor) {
        editor.style.margin = '0';
        editor.style.left = '0';
        editor.style.transform = 'none';
        editor.style.position = 'relative';
        editor.style.width = '100%';
        editor.style.maxWidth = 'none';
      }
      
      if (redactor) {
        redactor.style.margin = '0';
        redactor.style.left = '0';
        redactor.style.transform = 'none';
        redactor.style.position = 'relative';
        redactor.style.width = '100%';
        redactor.style.maxWidth = 'none';
      }
      
      blocks.forEach(block => {
        block.style.margin = '0';
        block.style.left = '0';
        block.style.transform = 'none';
        block.style.position = 'relative';
        block.style.width = '100%';
        block.style.maxWidth = 'none';
      });
      
      contents.forEach(content => {
        content.style.margin = '0';
        content.style.left = '0';
        content.style.transform = 'none';
        content.style.position = 'relative';
        content.style.width = '100%';
        content.style.maxWidth = 'none';
      });
    });
  },

  // Save editor content
  saveEditorContent: async function() {
    const editors = window.editors;
    if (!editors) {
      console.error('❌ No editor instances found');
      return null;
    }

    try {
      console.log('💾 Saving editor content...');
      const content = {};
      
      if (editors.reason) {
        content.reasonForChange = await editors.reason.save();
      }
      if (editors.implementation) {
        content.implementationPlan = await editors.implementation.save();
      }
      if (editors.backout) {
        content.backoutPlan = await editors.backout.save();
      }
      if (editors.validation) {
        content.validationPlan = await editors.validation.save();
      }

      console.log('✅ Editor content saved successfully');
      return content;
    } catch (error) {
      console.error('❌ Error saving editor content:', error);
      throw error;
    }
  },

  // Load editor content
  loadEditorContent: async function(data) {
    const editors = window.editors;
    if (!editors || !data) {
      console.error('❌ No editor instances or data found');
      return;
    }

    try {
      console.log('📥 Loading editor content...');
      if (data.reasonForChange && editors.reason) {
        await editors.reason.render(data.reasonForChange);
      }
      if (data.implementationPlan && editors.implementation) {
        await editors.implementation.render(data.implementationPlan);
      }
      if (data.backoutPlan && editors.backout) {
        await editors.backout.render(data.backoutPlan);
      }
      if (data.validationPlan && editors.validation) {
        await editors.validation.render(data.validationPlan);
      }
      console.log('✅ Editor content loaded successfully');
    } catch (error) {
      console.error('❌ Error loading editor content:', error);
      throw error;
    }
  }
};

// Export the configuration
window.editorConfig = editorConfig;
console.log('✅ Editor configuration loaded'); 