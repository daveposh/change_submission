// Import styles
require('../styles/lexical-editor.css');

const { createEditor } = require('lexical');
const { $getRoot, $createParagraphNode, $createTextNode } = require('lexical');
const { HeadingNode, QuoteNode } = require('@lexical/rich-text');
const { TableCellNode, TableNode, TableRowNode } = require('@lexical/table');
const { ListItemNode, ListNode } = require('@lexical/list');
const { CodeHighlightNode, CodeNode } = require('@lexical/code');
const { AutoLinkNode, LinkNode } = require('@lexical/link');

// Initialize the editor with FDK context
function initializeLexicalEditors(changeRequestData) {
  // Wait for FDK to be ready
  fdk.onReady(function() {
    console.log('🎯 Initializing Lexical editors...');

    // Editor configuration
    const editorConfig = {
      namespace: 'ChangeRequestEditor',
      theme: {
        paragraph: 'editor-paragraph',
        heading: {
          h1: 'editor-heading-h1',
          h2: 'editor-heading-h2',
          h3: 'editor-heading-h3',
        },
        list: {
          ol: 'editor-list-ol',
          ul: 'editor-list-ul',
          listitem: 'editor-listitem',
        },
        text: {
          bold: 'editor-text-bold',
          italic: 'editor-text-italic',
          underline: 'editor-text-underline',
          strikethrough: 'editor-text-strikethrough',
          underlineStrikethrough: 'editor-text-underlineStrikethrough',
        },
      },
      onError: (error) => {
        console.error('Lexical editor error:', error);
        fdk.notify('Editor error occurred. Please try again.', 'error');
      },
      nodes: [
        HeadingNode,
        ListNode,
        ListItemNode,
        QuoteNode,
        CodeNode,
        CodeHighlightNode,
        TableNode,
        TableCellNode,
        TableRowNode,
        AutoLinkNode,
        LinkNode
      ],
    };

    // Initialize editors for each field
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
        try {
          const editor = createEditor(editorConfig);
          
          // Create contentEditable element
          const contentEditable = document.createElement('div');
          contentEditable.className = 'editor-input';
          contentEditable.contentEditable = true;
          container.appendChild(contentEditable);
          
          editor.setRootElement(contentEditable);

          // Initialize with empty content
          editor.update(() => {
            const root = $getRoot();
            if (root.getFirstChild() === null) {
              const paragraph = $createParagraphNode();
              paragraph.append($createTextNode(''));
              root.append(paragraph);
            }
          });

          // Store editor instance
          window[`${fieldId}-editor`] = editor;

          // Add change listener
          editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
              const content = editor.getRootElement().innerHTML;
              changeRequestData[fieldId.replace(/-/g, '')] = content;
            });
          });

          console.log(`✅ Initialized editor for ${fieldId}`);
        } catch (error) {
          console.error(`Failed to initialize editor for ${fieldId}:`, error);
          fdk.notify(`Failed to initialize editor for ${fieldId}. Please refresh the page.`, 'error');
        }
      }
    });

    // Initialize toolbar buttons
    initializeToolbarButtons();
  });
}

// Initialize toolbar buttons with FDK context
function initializeToolbarButtons() {
  const toolbarButtons = document.querySelectorAll('.editor-toolbar button');
  let url = ''; // Declare url outside case block

  toolbarButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const action = e.target.dataset.action;
      const fieldId = e.target.closest('.editor-container').id;
      const editor = window[`${fieldId}-editor`];

      if (editor) {
        try {
          switch (action) {
            case 'bold':
              editor.dispatchCommand('FORMAT_TEXT_COMMAND', 'bold');
              break;
            case 'italic':
              editor.dispatchCommand('FORMAT_TEXT_COMMAND', 'italic');
              break;
            case 'underline':
              editor.dispatchCommand('FORMAT_TEXT_COMMAND', 'underline');
              break;
            case 'bullet-list':
              editor.dispatchCommand('INSERT_UNORDERED_LIST_COMMAND');
              break;
            case 'numbered-list':
              editor.dispatchCommand('INSERT_ORDERED_LIST_COMMAND');
              break;
            case 'link':
              // Use FDK modal instead of browser prompt
              fdk.modal({
                title: 'Insert Link',
                template: `
                  <div class="modal-body">
                    <input type="text" id="link-url" class="form-control" placeholder="Enter URL">
                  </div>
                `,
                buttons: [
                  { text: 'Cancel', type: 'secondary' },
                  { text: 'Insert', type: 'primary' }
                ],
                onAction: function(button) {
                  if (button.text === 'Insert') {
                    url = document.getElementById('link-url').value;
                    if (url) {
                      editor.dispatchCommand('TOGGLE_LINK_COMMAND', url);
                    }
                  }
                }
              });
              break;
          }
        } catch (error) {
          console.error('Toolbar action error:', error);
          fdk.notify('Failed to apply formatting. Please try again.', 'error');
        }
      }
    });
  });
}

module.exports = { initializeLexicalEditors }; 