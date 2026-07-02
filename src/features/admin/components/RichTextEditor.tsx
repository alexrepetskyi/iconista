'use client';

import { useEffect, useRef } from 'react';

type Tool =
  | { label: string; title: string; command: string; arg?: string }
  | { label: string; title: string; action: 'link' | 'unlink' };

const TOOLS: (Tool | 'sep')[] = [
  { label: 'B', title: 'Bold', command: 'bold' },
  { label: 'I', title: 'Italic', command: 'italic' },
  { label: 'U', title: 'Underline', command: 'underline' },
  { label: 'S', title: 'Strikethrough', command: 'strikeThrough' },
  'sep',
  { label: 'H2', title: 'Heading', command: 'formatBlock', arg: 'h2' },
  { label: 'H3', title: 'Subheading', command: 'formatBlock', arg: 'h3' },
  { label: '¶', title: 'Paragraph', command: 'formatBlock', arg: 'p' },
  'sep',
  { label: '• list', title: 'Bullet list', command: 'insertUnorderedList' },
  { label: '1. list', title: 'Numbered list', command: 'insertOrderedList' },
  { label: '❝', title: 'Quote', command: 'formatBlock', arg: 'blockquote' },
  { label: '—', title: 'Divider', command: 'insertHorizontalRule' },
  'sep',
  { label: '🔗', title: 'Link (select text first)', action: 'link' },
  { label: '⛓︎̷', title: 'Remove link', action: 'unlink' },
  'sep',
  { label: '↶', title: 'Undo', command: 'undo' },
  { label: '↷', title: 'Redo', command: 'redo' },
  { label: 'Tx', title: 'Clear formatting', command: 'removeFormat' },
];

/**
 * Dependency-free WYSIWYG on contentEditable, fully UNCONTROLLED: typing
 * never triggers a React re-render (a re-render is what stole the focus),
 * the hidden form input is synced imperatively. The server sanitizes the
 * HTML to a strict allowlist, so the editor only needs to be pleasant.
 */
export function RichTextEditor({
  name,
  placeholder,
  initialHtml = '',
}: {
  name: string;
  placeholder?: string;
  initialHtml?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);

  const sync = () => {
    if (hiddenRef.current && editorRef.current) {
      hiddenRef.current.value = editorRef.current.innerHTML;
    }
  };

  useEffect(() => {
    if (initialHtml && editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = initialHtml;
      sync();
    }
    // form.reset() clears the hidden input but not contentEditable — mirror it.
    const form = editorRef.current?.closest('form');
    if (!form) return;
    const onReset = () => {
      if (editorRef.current) editorRef.current.innerHTML = '';
    };
    form.addEventListener('reset', onReset);
    return () => form.removeEventListener('reset', onReset);
  }, [initialHtml]);

  const exec = (command: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    sync();
  };

  const run = (tool: Tool) => {
    if ('action' in tool) {
      if (tool.action === 'link') {
        const url = window.prompt('Link URL (https://…):', 'https://');
        if (url && /^https?:\/\//.test(url)) exec('createLink', url);
      } else {
        exec('unlink');
      }
      return;
    }
    exec(tool.command, tool.arg);
  };

  return (
    <div style={{ border: '1px solid var(--line)', background: '#fff' }}>
      <div
        style={{
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--line)',
          padding: 4,
        }}
      >
        {TOOLS.map((tool, i) =>
          tool === 'sep' ? (
            <span key={`sep-${i}`} style={{ width: 1, background: 'var(--line)', margin: '2px 4px' }} />
          ) : (
            <button
              key={tool.label}
              type="button"
              title={tool.title}
              onMouseDown={(e) => {
                e.preventDefault(); // keep the selection in the editor
                run(tool);
              }}
              style={{
                padding: '5px 9px',
                fontSize: 12,
                fontWeight: tool.label === 'B' ? 700 : 400,
                fontStyle: tool.label === 'I' ? 'italic' : undefined,
                textDecoration:
                  tool.label === 'U' ? 'underline' : tool.label === 'S' ? 'line-through' : undefined,
                border: '1px solid transparent',
                borderRadius: 2,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--cream)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {tool.label}
            </button>
          ),
        )}
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        onBlur={sync}
        data-placeholder={placeholder}
        className="rte-area"
        style={{
          minHeight: 140,
          padding: '12px 14px',
          fontSize: 14,
          fontWeight: 300,
          lineHeight: 1.6,
          outline: 'none',
        }}
      />
      <input type="hidden" name={name} ref={hiddenRef} defaultValue={initialHtml} />
    </div>
  );
}
