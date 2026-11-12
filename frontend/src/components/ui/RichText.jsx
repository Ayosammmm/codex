import { useEffect } from 'react';
import DOMPurify from 'dompurify';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { TextStyle, Color, BackgroundColor } from '@tiptap/extension-text-style';
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Undo2, Redo2 } from 'lucide-react';
import { cx } from './cx';
import { transformPastedHTML } from './pasteLineBreaks';
import styles from './RichText.module.scss';

/** Affiche du HTML venant de l'éditeur, après assainissement (les univers peuvent être importés). */
export function RichText({ html, className }) {
  if (!html) return null;
  return <div className={cx('rich-text', className)} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;
}

const TOOLS = [
  { label: 'Gras', icon: Bold, run: (c) => c.toggleBold(), active: (e) => e.isActive('bold') },
  { label: 'Italique', icon: Italic, run: (c) => c.toggleItalic(), active: (e) => e.isActive('italic') },
  { separator: true },
  { label: 'Titre', icon: Heading2, run: (c) => c.toggleHeading({ level: 2 }), active: (e) => e.isActive('heading', { level: 2 }) },
  { label: 'Sous-titre', icon: Heading3, run: (c) => c.toggleHeading({ level: 3 }), active: (e) => e.isActive('heading', { level: 3 }) },
  { label: 'Liste à puces', icon: List, run: (c) => c.toggleBulletList(), active: (e) => e.isActive('bulletList') },
  { label: 'Liste numérotée', icon: ListOrdered, run: (c) => c.toggleOrderedList(), active: (e) => e.isActive('orderedList') },
  { label: 'Citation', icon: Quote, run: (c) => c.toggleBlockquote(), active: (e) => e.isActive('blockquote') },
  { separator: true },
  { label: 'Annuler', icon: Undo2, run: (c) => c.undo() },
  { label: 'Rétablir', icon: Redo2, run: (c) => c.redo() },
];

/**
 * Éditeur de texte riche (TipTap). `value` / `onChange` en HTML ; chaîne vide si le contenu est vide.
 */
export function RichTextEditor({ value, onChange, label, id, minHeight = '8rem', ...aria }) {
  const editor = useEditor({
    // Image / TextStyle / couleurs : conservent la mise en forme des descriptions créées avec la v2
    extensions: [StarterKit.configure({ link: { openOnClick: false } }), Image, TextStyle, Color, BackgroundColor],
    content: value || '',
    editorProps: {
      // Texte collé depuis une page web : garde ses retours à la ligne (voir pasteLineBreaks.js)
      transformPastedHTML,
      attributes: {
        ...(id ? { id } : {}),
        ...Object.fromEntries(Object.entries(aria).filter(([k, v]) => k.startsWith('aria-') && v !== undefined)),
        'aria-label': label,
        role: 'textbox',
        'aria-multiline': 'true',
        class: `rich-text ${styles.content}`,
        style: `--min-height:${minHeight}`,
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
  });

  // Valeur modifiée de l'extérieur (annulation du formulaire...) : on recharge l'éditeur
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? '' : editor.getHTML();
    if ((value || '') !== current) editor.commands.setContent(value || '', { emitUpdate: false });
  }, [editor, value]);

  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? TOOLS.map((t) => Boolean(t.active?.(e))) : []),
  });

  return (
    <div className={styles.editor}>
      <div role="toolbar" aria-label="Mise en forme" className={styles.toolbar}>
        {TOOLS.map((tool, i) =>
          tool.separator ? (
            <span key={`sep-${i}`} className={styles.separator} aria-hidden />
          ) : (
            <button
              key={tool.label}
              type="button"
              title={tool.label}
              aria-label={tool.label}
              aria-pressed={tool.active ? Boolean(active?.[i]) : undefined}
              onClick={() => editor && tool.run(editor.chain().focus()).run()}
              className={styles.tool}
            >
              <tool.icon aria-hidden />
            </button>
          ),
        )}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
