import { createEditor } from 'lexical';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS } from '@lexical/markdown';

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
          editor.setRootElement(container);

          // Add plugins
          editor.registerPlugin(new RichTextPlugin());
          editor.registerPlugin(new HistoryPlugin());
          editor.registerPlugin(new AutoFocusPlugin());
          editor.registerPlugin(new LinkPlugin());
          editor.registerPlugin(new ListPlugin());
          editor.registerPlugin(new MarkdownShortcutPlugin(TRANSFORMERS));

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
    initializeToolbarButtons(changeRequestData);
  });
}

// Initialize toolbar buttons with FDK context
function initializeToolbarButtons(changeRequestData) {
  const toolbarButtons = document.querySelectorAll('.editor-toolbar button');
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
              editor.dispatchCommand('FORMAT_TEXT', 'bold');
              break;
            case 'italic':
              editor.dispatchCommand('FORMAT_TEXT', 'italic');
              break;
            case 'underline':
              editor.dispatchCommand('FORMAT_TEXT', 'underline');
              break;
            case 'bullet-list':
              editor.dispatchCommand('INSERT_UNORDERED_LIST');
              break;
            case 'numbered-list':
              editor.dispatchCommand('INSERT_ORDERED_LIST');
              break;
            case 'link':
              const url = prompt('Enter URL:');
              if (url) {
                editor.dispatchCommand('CREATE_LINK', url);
              }
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

export { initializeLexicalEditors }; 