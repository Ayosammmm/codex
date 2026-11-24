import { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { TextStyle, Color, BackgroundColor } from '@tiptap/extension-text-style';
import { TextAlign } from '@tiptap/extension-text-align';
import { Subscript as SubscriptMark } from '@tiptap/extension-subscript';
import { Superscript as SuperscriptMark } from '@tiptap/extension-superscript';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Baseline, Bold, Code, Highlighter, ImageIcon, Italic, Link,
  List, ListOrdered, ListTodo, Quote, Redo2, RemoveFormatting, SeparatorHorizontal, SquareCode, Strikethrough,
  Subscript, Superscript, Table2, Underline, Undo2,
} from '@/components/ui/icons';
import { Menu } from './Menu';
import { cx } from './cx';
import { transformPastedHTML } from './pasteLineBreaks';
import styles from './RichText.module.scss';

/** Affiche du HTML venant de l'éditeur, après assainissement (les univers peuvent être importés). */
export function RichText({ html, className }) {
  if (!html) return null;
  return <div className={cx('rich-text', className)} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;
}

const EXTENSIONS = [
  StarterKit.configure({ link: { openOnClick: false, defaultProtocol: 'https' } }),
  // Image / TextStyle / couleurs : conservent aussi la mise en forme des descriptions créées avec la v2
  Image,
  TextStyle,
  Color,
  BackgroundColor,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  SubscriptMark,
  SuperscriptMark,
  TaskList,
  TaskItem.configure({ nested: true }),
  TableKit.configure({ table: { resizable: false } }),
];

// ---------------------------------------------------------------------------
// Outils
// ---------------------------------------------------------------------------

// Style du paragraphe courant (liste déroulante)
const BLOCKS = [
  { value: 'paragraph', label: 'Paragraphe', run: (c) => c.setParagraph(), active: (e) => e.isActive('paragraph') },
  ...[1, 2, 3, 4, 5, 6].map((level) => ({
    value: `h${level}`,
    label: `Titre ${level}`,
    run: (c) => c.setHeading({ level }),
    active: (e) => e.isActive('heading', { level }),
  })),
];

// Groupes de boutons, séparés par un trait. `key` : identifiant de l'état actif / disponible.
const TOOL_GROUPS = [
  [
    { key: 'bold', label: 'Gras (Ctrl+B)', icon: Bold, run: (c) => c.toggleBold() },
    { key: 'italic', label: 'Italique (Ctrl+I)', icon: Italic, run: (c) => c.toggleItalic() },
    { key: 'underline', label: 'Souligné (Ctrl+U)', icon: Underline, run: (c) => c.toggleUnderline() },
    { key: 'strike', label: 'Barré (Ctrl+Maj+S)', icon: Strikethrough, run: (c) => c.toggleStrike() },
    { key: 'superscript', label: 'Exposant', icon: Superscript, run: (c) => c.toggleSuperscript() },
    { key: 'subscript', label: 'Indice', icon: Subscript, run: (c) => c.toggleSubscript() },
    { key: 'code', label: 'Code', icon: Code, run: (c) => c.toggleCode() },
  ],
  ['textColor', 'highlight', { key: 'clear', label: 'Effacer la mise en forme', icon: RemoveFormatting, run: (c) => c.unsetAllMarks() }],
  [
    { key: 'alignLeft', label: 'Aligner à gauche', icon: AlignLeft, run: (c) => c.setTextAlign('left'), active: (e) => e.isActive({ textAlign: 'left' }) },
    { key: 'alignCenter', label: 'Centrer', icon: AlignCenter, run: (c) => c.setTextAlign('center'), active: (e) => e.isActive({ textAlign: 'center' }) },
    { key: 'alignRight', label: 'Aligner à droite', icon: AlignRight, run: (c) => c.setTextAlign('right'), active: (e) => e.isActive({ textAlign: 'right' }) },
    { key: 'alignJustify', label: 'Justifier', icon: AlignJustify, run: (c) => c.setTextAlign('justify'), active: (e) => e.isActive({ textAlign: 'justify' }) },
  ],
  [
    { key: 'bulletList', label: 'Liste à puces', icon: List, run: (c) => c.toggleBulletList() },
    { key: 'orderedList', label: 'Liste numérotée', icon: ListOrdered, run: (c) => c.toggleOrderedList() },
    { key: 'taskList', label: 'Liste de cases à cocher', icon: ListTodo, run: (c) => c.toggleTaskList() },
    { key: 'blockquote', label: 'Citation', icon: Quote, run: (c) => c.toggleBlockquote() },
    { key: 'codeBlock', label: 'Bloc de code', icon: SquareCode, run: (c) => c.toggleCodeBlock() },
    { key: 'hr', label: 'Ligne de séparation', icon: SeparatorHorizontal, run: (c) => c.setHorizontalRule(), toggle: false },
  ],
  ['link', 'image', 'table'],
  [
    { key: 'undo', label: 'Annuler (Ctrl+Z)', icon: Undo2, run: (c) => c.undo(), toggle: false, can: (e) => e.can().undo() },
    { key: 'redo', label: 'Rétablir (Ctrl+Maj+Z)', icon: Redo2, run: (c) => c.redo(), toggle: false, can: (e) => e.can().redo() },
  ],
];

const BUTTONS = TOOL_GROUPS.flat().filter((t) => typeof t === 'object');

// Couleurs proposées. Celles de l'univers suivent son thème ; les surlignages sont semi-transparents
// pour rester lisibles en clair comme en sombre.
const THEME_COLORS = [
  { label: 'Primaire', value: 'var(--primary)' },
  { label: 'Secondaire', value: 'var(--secondary)' },
  { label: 'Tertiaire', value: 'var(--tertiary)' },
];
const PALETTE = [
  { label: 'Rouge', value: '#dc2626' },
  { label: 'Orange', value: '#ea580c' },
  { label: 'Jaune', value: '#ca8a04' },
  { label: 'Vert', value: '#16a34a' },
  { label: 'Turquoise', value: '#0d9488' },
  { label: 'Bleu', value: '#2563eb' },
  { label: 'Violet', value: '#7c3aed' },
  { label: 'Rose', value: '#db2777' },
  { label: 'Gris', value: '#6b7280' },
];
// Surlignage : couleur à 30 % d'opacité. Hex avec alpha pour la palette ; color-mix pour les couleurs
// du thème (les navigateurs réécrivent color-mix avec une couleur fixe, mais pas avec une variable).
const highlightOf = (color) => (color.startsWith('#') ? `${color}4d` : `color-mix(in oklab, ${color} 30%, transparent)`);

/** Compare deux couleurs CSS (le navigateur normalise #dc2626 en rgb(220, 38, 38) au rechargement). */
const normalizeColor = (color) => {
  if (!color) return '';
  const el = document.createElement('span');
  el.style.color = color;
  return el.style.color || color;
};

/** État de la barre d'outils, recalculé à chaque transaction de l'éditeur. */
const selectToolbarState = ({ editor: e }) => {
  if (!e) return null;
  const state = {
    block: BLOCKS.find((b) => b.active(e))?.value ?? '',
    textColor: e.getAttributes('textStyle').color || null,
    highlight: e.getAttributes('textStyle').backgroundColor || null,
    link: e.getAttributes('link').href || null,
    inTable: e.isActive('table'),
    active: {},
    disabled: {},
  };
  for (const tool of BUTTONS) {
    if (tool.toggle !== false) state.active[tool.key] = tool.active ? tool.active(e) : e.isActive(tool.key);
    if (tool.can) state.disabled[tool.key] = !tool.can(e);
  }
  return state;
};

// ---------------------------------------------------------------------------
// Éditeur
// ---------------------------------------------------------------------------

/**
 * Éditeur de texte riche (TipTap). `value` / `onChange` en HTML ; chaîne vide si le contenu est vide.
 */
export function RichTextEditor({ value, onChange, label, id, minHeight = '8rem', ...aria }) {
  const editor = useEditor({
    extensions: EXTENSIONS,
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

  const state = useEditorState({ editor, selector: selectToolbarState });
  const run = (fn) => editor && fn(editor.chain().focus()).run();

  const renderTool = (tool) => {
    if (tool === 'textColor') {
      return <ColorTool key={tool} label="Couleur du texte" icon={Baseline} value={state?.textColor} kind="text" run={run} />;
    }
    if (tool === 'highlight') {
      return <ColorTool key={tool} label="Surlignage" icon={Highlighter} value={state?.highlight} kind="highlight" run={run} />;
    }
    if (tool === 'link') return <LinkTool key={tool} editor={editor} href={state?.link} run={run} />;
    if (tool === 'image') return <ImageTool key={tool} run={run} />;
    if (tool === 'table') return <TableTool key={tool} inTable={state?.inTable} run={run} />;
    return (
      <ToolButton
        key={tool.key}
        label={tool.label}
        icon={tool.icon}
        pressed={tool.toggle === false ? undefined : Boolean(state?.active[tool.key])}
        disabled={Boolean(state?.disabled[tool.key])}
        onClick={() => run(tool.run)}
      />
    );
  };

  return (
    <div className={styles.editor}>
      <div role="toolbar" aria-label="Mise en forme" className={styles.toolbar}>
        <select
          aria-label="Style du paragraphe"
          title="Style du paragraphe"
          className={styles.blockSelect}
          value={state?.block ?? ''}
          onChange={(e) => {
            const block = BLOCKS.find((b) => b.value === e.target.value);
            if (block) run(block.run);
          }}
        >
          {!state?.block && <option value="">—</option>}
          {BLOCKS.map((b) => (
            <option key={b.value} value={b.value}>{b.label}</option>
          ))}
        </select>
        {TOOL_GROUPS.map((group, i) => (
          <span key={i} className={styles.group}>
            <span className={styles.separator} aria-hidden />
            {group.map(renderTool)}
          </span>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Boutons et panneaux de la barre d'outils
// ---------------------------------------------------------------------------

function ToolButton({ label, icon: Icon, pressed, className, ...props }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      // Garde la sélection du texte pendant le clic
      onMouseDown={(e) => e.preventDefault()}
      className={cx(styles.tool, className)}
      {...props}
    >
      <Icon aria-hidden />
    </button>
  );
}

/** Bouton qui ouvre un petit panneau (couleurs, lien, image). `children(close)` : contenu. */
function ToolPopover({ label, icon, pressed, swatch, children }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => !rootRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div
      ref={rootRef}
      className={styles.popoverRoot}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          close();
          rootRef.current?.querySelector('button')?.focus();
        }
      }}
    >
      <ToolButton
        label={label}
        icon={icon}
        pressed={pressed}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={swatch !== undefined ? styles.colorTool : undefined}
        style={swatch ? { '--swatch': swatch } : undefined}
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <div role="dialog" aria-label={label} className={styles.popover}>
          {children(close)}
        </div>
      )}
    </div>
  );
}

function ColorTool({ label, icon, value, kind, run }) {
  const isText = kind === 'text';
  const apply = (color) => run((c) => (isText ? c.setColor(color) : c.setBackgroundColor(color)));
  const reset = () => run((c) => (isText ? c.unsetColor() : c.unsetBackgroundColor()));
  const toValue = (color) => (isText ? color : highlightOf(color));
  const current = normalizeColor(value);

  const swatchList = (colors, close) => (
    <div className={styles.swatches}>
      {colors.map((c) => {
        const v = toValue(c.value);
        return (
          <button
            key={c.value}
            type="button"
            title={c.label}
            aria-label={c.label}
            aria-pressed={current === normalizeColor(v)}
            className={styles.swatch}
            style={{ '--swatch': v }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              apply(v);
              close();
            }}
          />
        );
      })}
    </div>
  );

  return (
    <ToolPopover label={label} icon={icon} pressed={Boolean(value)} swatch={value || ''}>
      {(close) => (
        <>
          <p className={styles.popoverLabel}>Couleurs de l’univers</p>
          {swatchList(THEME_COLORS, close)}
          <p className={styles.popoverLabel}>Palette</p>
          {swatchList(PALETTE, close)}
          <div className={styles.popoverRow}>
            <label className={styles.customColor}>
              <input
                type="color"
                defaultValue="#000000"
                onChange={(e) => apply(toValue(e.target.value))}
              />
              Autre…
            </label>
            <button
              type="button"
              className={styles.textButton}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                reset();
                close();
              }}
            >
              {isText ? 'Par défaut' : 'Aucun'}
            </button>
          </div>
        </>
      )}
    </ToolPopover>
  );
}

/** Adresses acceptées pour les liens et images : web, e-mail et fichiers du serveur. */
const isSafeUrl = (url) => /^(https?:\/\/|mailto:|\/)/i.test(url);
const normalizeUrl = (raw) => {
  const url = raw.trim();
  if (!url) return '';
  return /^[a-z][a-z0-9+.-]*:|^\//i.test(url) ? url : `https://${url}`;
};

function UrlForm({ label, initial = '', placeholder, submitLabel, onSubmit, extra, children }) {
  const [url, setUrl] = useState(initial);
  const [error, setError] = useState(null);
  const submit = () => {
    const value = normalizeUrl(url);
    if (value && !isSafeUrl(value)) return setError('Adresse non valide.');
    onSubmit(value);
  };
  // Pas de <form> : le panneau est déjà dans le formulaire de la page (Entrée valide le panneau seul)
  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };
  return (
    <div className={styles.urlForm} onKeyDown={onKeyDown}>
      <label className={styles.popoverLabel}>
        {label}
        <input
          type="text"
          inputMode="url"
          autoFocus
          className={styles.urlInput}
          value={url}
          placeholder={placeholder}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
          }}
        />
      </label>
      {children}
      {error && <p className={styles.popoverError}>{error}</p>}
      <div className={styles.popoverRow}>
        {extra}
        <button type="button" className={cx(styles.textButton, styles.primaryButton)} onClick={submit}>{submitLabel}</button>
      </div>
    </div>
  );
}

function LinkTool({ editor, href, run }) {
  return (
    <ToolPopover label="Lien" icon={Link} pressed={Boolean(href)}>
      {(close) => (
        <UrlForm
          label="Adresse du lien"
          initial={href || ''}
          placeholder="https://…"
          submitLabel={href ? 'Modifier' : 'Ajouter'}
          extra={
            href && (
              <button
                type="button"
                className={styles.textButton}
                onClick={() => {
                  run((c) => c.extendMarkRange('link').unsetLink());
                  close();
                }}
              >
                Retirer
              </button>
            )
          }
          onSubmit={(url) => {
            if (!url) run((c) => c.extendMarkRange('link').unsetLink());
            else if (editor?.state.selection.empty && !href) {
              // Aucun texte sélectionné : l'adresse devient le texte du lien
              run((c) => c.insertContent({ type: 'text', text: url, marks: [{ type: 'link', attrs: { href: url } }] }));
            } else run((c) => c.extendMarkRange('link').setLink({ href: url }));
            close();
          }}
        />
      )}
    </ToolPopover>
  );
}

function ImageTool({ run }) {
  const altRef = useRef(null);
  return (
    <ToolPopover label="Image" icon={ImageIcon}>
      {(close) => (
        <UrlForm
          label="Adresse de l’image"
          placeholder="https://…/image.jpg"
          submitLabel="Insérer"
          onSubmit={(src) => {
            if (src) run((c) => c.setImage({ src, alt: altRef.current?.value.trim() || null }));
            close();
          }}
        >
          <label className={styles.popoverLabel}>
            Description (facultatif)
            <input ref={altRef} type="text" className={styles.urlInput} />
          </label>
        </UrlForm>
      )}
    </ToolPopover>
  );
}

function TableTool({ inTable, run }) {
  const item = (label, fn) => ({ label, onSelect: () => run(fn) });
  const items = inTable
    ? [
        item('Ligne au-dessus', (c) => c.addRowBefore()),
        item('Ligne en dessous', (c) => c.addRowAfter()),
        item('Colonne à gauche', (c) => c.addColumnBefore()),
        item('Colonne à droite', (c) => c.addColumnAfter()),
        { separator: true },
        item('Ligne d’en-tête', (c) => c.toggleHeaderRow()),
        item('Fusionner / séparer les cellules', (c) => c.mergeOrSplit()),
        { separator: true },
        { ...item('Supprimer la ligne', (c) => c.deleteRow()), danger: true },
        { ...item('Supprimer la colonne', (c) => c.deleteColumn()), danger: true },
        { ...item('Supprimer le tableau', (c) => c.deleteTable()), danger: true },
      ]
    : [
        item('Insérer un tableau 2 × 2', (c) => c.insertTable({ rows: 2, cols: 2, withHeaderRow: true })),
        item('Insérer un tableau 3 × 3', (c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true })),
        item('Insérer un tableau 4 × 4', (c) => c.insertTable({ rows: 4, cols: 4, withHeaderRow: true })),
      ];

  return (
    <Menu
      align="start"
      items={items}
      trigger={(props) => (
        <ToolButton label={inTable ? 'Modifier le tableau' : 'Tableau'} icon={Table2} pressed={inTable} {...props} />
      )}
    />
  );
}
