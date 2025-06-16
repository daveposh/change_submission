/* eslint-disable no-unused-vars */
import React from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { HeadingNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { CodeNode } from '@lexical/code';
/* eslint-enable no-unused-vars */

const theme = {
  // Theme styling for the editor
  text: {
    base: 'text-base',
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    underlineStrikethrough: 'underline line-through',
  },
  list: {
    ul: 'list-disc ml-4',
    ol: 'list-decimal ml-4',
  },
  link: 'text-blue-500 underline',
};

const RichTextEditor = ({ placeholder, onChange }) => {
  const OnChangePlugin = React.memo(({ onChange }) => {
    const [editor] = useLexicalComposerContext();
    React.useEffect(() => {
      return editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          const jsonString = JSON.stringify(editorState.toJSON());
          onChange(jsonString);
        });
      });
    }, [editor, onChange]);
    return null;
  });

  const initialConfig = {
    namespace: 'ChangeRequestEditor',
    theme,
    onError: (error) => {
      console.error('Lexical Editor Error:', error);
    },
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      LinkNode,
      CodeNode
    ]
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="editor-container border rounded p-3">
        <RichTextPlugin
          contentEditable={<ContentEditable className="editor-input min-h-[100px] outline-none" />}
          placeholder={
            <div className="editor-placeholder text-gray-400">
              {placeholder}
            </div>
          }
        />
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <OnChangePlugin onChange={onChange} />
      </div>
    </LexicalComposer>
  );
};

export default RichTextEditor; 