// Editor.js configuration
const editorConfig = {
  // Common configuration for all editors
  commonConfig: {
    placeholder: 'Start typing...',
    autofocus: false,
    readOnly: false,
    minHeight: 250,
    inlineToolbar: ['customBold', 'customItalic', 'customUnderline', 'customHighlight', 'customInlineCode', 'customFontFamily', 'customTextColor'],
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
      // Block Tools - using unique names to avoid conflicts
      customHeader: {
        class: window.Header,
        inlineToolbar: true,
        config: {
          levels: [1, 2, 3],
          defaultLevel: 2
        }
      },
      simpleList: {
        class: window.SimpleList,
        inlineToolbar: true,
        config: {
          defaultStyle: 'unordered'
        }
      },
      customCode: {
        class: window.CodeTool,
        config: {
          placeholder: 'Enter your code here...'
        }
      },
      simpleTable: {
        class: window.SimpleTable,
        inlineToolbar: true,
        config: {
          rows: 2,
          cols: 2,
          withHeadings: false
        }
      },
      customQuote: {
        class: window.Quote,
        inlineToolbar: true,
        config: {
          quotePlaceholder: 'Enter a quote',
          captionPlaceholder: 'Quote\'s author'
        }
      },
      // Inline Tools
      customBold: {
        class: window.Bold
      },
      customItalic: {
        class: window.Italic
      },
      customUnderline: {
        class: window.Underline
      },
      customInlineCode: {
        class: window.InlineCode
      },
      customHighlight: {
        class: window.Highlight
      },
      customFontFamily: {
        class: window.FontFamily
      },
      customTextColor: {
        class: window.TextColor
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
        console.log('🔍 Checking tool availability:');
        console.log('Header:', typeof window.Header);
        console.log('SimpleList:', typeof window.SimpleList);
        console.log('SimpleTable:', typeof window.SimpleTable);
        console.log('CodeTool:', typeof window.CodeTool);
        console.log('Quote:', typeof window.Quote);
        console.log('Bold:', typeof window.Bold);
        console.log('Italic:', typeof window.Italic);
        console.log('Underline:', typeof window.Underline);
        console.log('InlineCode:', typeof window.InlineCode);
        console.log('Highlight:', typeof window.Highlight);
        console.log('FontFamily:', typeof window.FontFamily);
        console.log('TextColor:', typeof window.TextColor);
        
        if (!window.Header || !window.SimpleList || !window.SimpleTable || !window.CodeTool || !window.Quote || !window.Bold || !window.Italic || !window.Underline || !window.InlineCode || !window.Highlight || !window.FontFamily || !window.TextColor) {
          console.error('❌ Some tools not loaded');
          reject(new Error('Required Editor.js tools not loaded'));
          return;
        }
        
        console.log('✅ All tools loaded successfully');
        
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
            holder.style.overflow = 'visible';
            holder.style.boxSizing = 'border-box';
            holder.style.minHeight = '150px';
            holder.style.border = '1px solid #dee2e6';
            holder.style.borderRadius = '0.375rem';
            holder.style.padding = '16px';
            holder.style.backgroundColor = '#fff';
            
            // Add a placeholder while loading
            holder.innerHTML = '<div style="color: #6c757d; font-style: italic; padding: 20px;">Loading rich text editor...</div>';
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
          this._enhanceInlineToolbarPositioning();
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
            console.log('🔧 Available tools in this editor:', Object.keys(safeConfig.tools || {}));
            checkComplete();
          }
        };
        
        console.log('🔧 Configured tools:', Object.keys(safeConfig.tools || {}));
        
        try {
          editors.reason = new window.EditorJS({
            holder: 'reason-for-change-editor',
            ...safeConfig,
            placeholder: 'Describe the reason for this change...'
          });
          console.log('✅ Reason editor initialized');
        } catch (error) {
          console.error('❌ Failed to initialize reason editor:', error);
          this._createFallbackTextarea('reason-for-change-editor', 'Describe the reason for this change...');
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
          this._createFallbackTextarea('implementation-plan-editor', 'Describe the implementation steps...');
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
          this._createFallbackTextarea('backout-plan-editor', 'Describe the backout procedure...');
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
          this._createFallbackTextarea('validation-plan-editor', 'Describe how the change will be validated...');
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
      .editor-container .ce-inline-toolbar {
        background: white !important;
        border: 1px solid #dee2e6 !important;
        border-radius: 8px !important;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
        padding: 6px !important;
        position: absolute !important;
        z-index: 99999 !important;
        animation: fadeInUp 0.2s ease-out !important;
        white-space: nowrap !important;
      }
      
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .editor-container .ce-inline-tool {
        background: transparent !important;
        border: none !important;
        border-radius: 4px !important;
        padding: 8px 10px !important;
        margin: 2px !important;
        cursor: pointer !important;
        color: #333333 !important;
        font-weight: 500 !important;
        transition: all 0.2s ease !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-width: 32px !important;
        height: 32px !important;
      }
      
      .editor-container .ce-inline-tool:hover {
        background-color: #f8f9fa !important;
        color: #007bff !important;
        transform: translateY(-1px) !important;
      }
      
      .editor-container .ce-inline-tool--active {
        background-color: #007bff !important;
        color: white !important;
        box-shadow: 0 2px 4px rgba(0, 123, 255, 0.3) !important;
      }
      
      .editor-container .ce-inline-tool svg {
        width: 16px !important;
        height: 16px !important;
        fill: currentColor !important;
        stroke: currentColor !important;
      }
      
      /* Toolbox visibility fixes */
      .ce-popover {
        z-index: 99999 !important;
        max-height: 400px !important;
        overflow-y: auto !important;
        position: absolute !important;
        background: white !important;
        border: 1px solid #e1e5e9 !important;
        border-radius: 4px !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
        min-width: 220px !important;
        top: 100% !important;
        left: 0 !important;
        margin-top: 5px !important;
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
        position: relative !important;
      }
      
      .editor-container {
        overflow-y: auto !important;
        overflow-x: hidden !important;
        z-index: 1 !important;
        position: relative !important;
      }
      
      .ce-toolbar__plus {
        z-index: 10000 !important;
      }
      
      .ce-toolbar__settings-btn {
        z-index: 10000 !important;
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

  // Enhance inline toolbar positioning to follow cursor
  _enhanceInlineToolbarPositioning: function() {
    // Add event listeners to improve inline toolbar behavior
    const containers = document.querySelectorAll('.editor-container');
    
    containers.forEach(container => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            // Look for inline toolbar additions
            const addedNodes = Array.from(mutation.addedNodes);
            addedNodes.forEach(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const inlineToolbar = node.querySelector('.ce-inline-toolbar') || 
                                    (node.classList && node.classList.contains('ce-inline-toolbar') ? node : null);
                
                if (inlineToolbar) {
                  this._positionInlineToolbar(inlineToolbar);
                }
              }
            });
          }
        });
      });
      
      // Start observing
      observer.observe(container, {
        childList: true,
        subtree: true
      });
      
      // Also handle existing toolbars
      const existingToolbars = container.querySelectorAll('.ce-inline-toolbar');
      existingToolbars.forEach(toolbar => {
        this._positionInlineToolbar(toolbar);
      });
    });
  },

  // Position inline toolbar near cursor/selection
  _positionInlineToolbar: function(toolbar) {
    if (!toolbar) return;
    
    // Get current selection
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    if (rect.width === 0 && rect.height === 0) {
      // Handle caret position
      const tempSpan = document.createElement('span');
      tempSpan.appendChild(document.createTextNode('\u200B')); // Zero-width space
      range.insertNode(tempSpan);
      const tempRect = tempSpan.getBoundingClientRect();
      tempSpan.remove();
      
      if (tempRect.width > 0 || tempRect.height > 0) {
        this._setToolbarPosition(toolbar, tempRect);
      }
    } else {
      // Handle text selection
      this._setToolbarPosition(toolbar, rect);
    }
  },

  // Set toolbar position based on selection rect
  _setToolbarPosition: function(toolbar, rect) {
    const container = toolbar.closest('.editor-container');
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    
    // Get the scroll position of the container
    const scrollTop = container.scrollTop;
    const scrollLeft = container.scrollLeft;
    
    // Calculate position relative to container's content area (accounting for scroll)
    const relativeTop = rect.top - containerRect.top + scrollTop;
    const relativeLeft = rect.left - containerRect.left + scrollLeft + (rect.width / 2);
    
    // Get toolbar dimensions (temporarily show it to measure)
    toolbar.style.visibility = 'hidden';
    toolbar.style.display = 'block';
    const toolbarWidth = toolbar.offsetWidth;
    const toolbarHeight = toolbar.offsetHeight;
    toolbar.style.visibility = '';
    
    // Position above selection with spacing, but ensure it stays within container bounds
    let topPosition = Math.max(10, relativeTop - toolbarHeight - 10);
    let leftPosition = Math.max(10, Math.min(
      container.clientWidth - toolbarWidth - 10,
      relativeLeft - (toolbarWidth / 2)
    ));
    
    // If toolbar would be above container, position it below the selection instead
    if (topPosition < 10) {
      topPosition = relativeTop + rect.height + 10;
    }
    
    // Apply positioning
    toolbar.style.top = topPosition + 'px';
    toolbar.style.left = leftPosition + 'px';
    toolbar.style.position = 'absolute';
    toolbar.style.transform = 'none';
    toolbar.style.zIndex = '99999';
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
  },

  // Create fallback textarea when Editor.js fails to initialize
  _createFallbackTextarea: function(holderId, placeholder) {
    const holder = document.getElementById(holderId);
    if (!holder) return;

    console.log('🔧 Creating fallback textarea for:', holderId);
    
    const textarea = document.createElement('textarea');
    textarea.placeholder = placeholder;
    textarea.className = 'form-control';
    textarea.style.cssText = `
      width: 100% !important;
      min-height: 150px !important;
      height: 200px !important;
      max-height: 80vh !important;
      padding: 16px !important;
      border: 1px solid #dee2e6 !important;
      border-radius: 0.375rem !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 14px !important;
      line-height: 1.6 !important;
      resize: vertical !important;
      box-sizing: border-box !important;
      overflow: auto !important;
      scrollbar-width: thin !important;
    `;
    
    // Add some styling for better UX
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: relative;
      width: 100%;
    `;
    
    const label = document.createElement('div');
    label.style.cssText = `
      position: absolute;
      top: -8px;
      left: 12px;
      background: white;
      padding: 0 4px;
      font-size: 12px;
      color: #6c757d;
      z-index: 1;
    `;
    label.textContent = 'Rich text editor unavailable - using simple text editor';
    
    wrapper.appendChild(label);
    wrapper.appendChild(textarea);
    
    holder.innerHTML = '';
    holder.appendChild(wrapper);
    
    // Add the textarea to a global reference for form submission
    if (!window.fallbackTextareas) {
      window.fallbackTextareas = {};
    }
    window.fallbackTextareas[holderId] = textarea;
    
    console.log('✅ Fallback textarea created for:', holderId);
  }
};

// Export the configuration
window.editorConfig = editorConfig;
console.log('✅ Editor configuration loaded'); 