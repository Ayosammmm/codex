import { useEffect, useRef, useState } from 'react';
import { Layers, Minus, RotateCcw } from 'lucide-react';
import { Plus } from '@/components/ui/icons';
import { cx } from '@/components/ui/cx';
import styles from './MapViewer.module.scss';

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** Zoom de `factor` autour du point (px, py) du cadre : ce point reste immobile. */
function zoomView(v, factor, px, py) {
  const scale = clamp(v.scale * factor, MIN_SCALE, MAX_SCALE);
  if (scale === MIN_SCALE) return { scale, x: 0, y: 0 };
  const k = scale / v.scale;
  return { scale, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
}

/**
 * Carte d'un lieu (image) avec ses repères ; zoom (molette, boutons) et déplacement (glisser).
 * - pins : [{ id, name, x, y (en %), color?, hasMap? }]
 * - onPinClick(pin) : clic sur un repère (consultation)
 * - editable : `onPlace(x, y)` au clic sur la carte (si `placing`), repères déplaçables (`onMove(id, x, y)`)
 */
export function MapViewer({ src, pins = [], onPinClick, editable = false, placing = false, onPlace, onMove, selectedId, label = 'Carte', className }) {
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [dragPin, setDragPin] = useState(null); // { id, x, y } pendant le déplacement d'un repère
  const viewportRef = useRef(null);
  const imageRef = useRef(null);
  const gesture = useRef(null);

  // Position (en %) d'un point de l'écran sur l'image, en tenant compte du zoom
  const toPercent = (clientX, clientY) => {
    const rect = imageRef.current.getBoundingClientRect();
    return [clamp(((clientX - rect.left) / rect.width) * 100, 0, 100), clamp(((clientY - rect.top) / rect.height) * 100, 0, 100)];
  };

  // Boutons : zoom autour du centre du cadre
  const zoomAt = (factor) => {
    const rect = viewportRef.current.getBoundingClientRect();
    setView((v) => zoomView(v, factor, rect.width / 2, rect.height / 2));
  };

  // Molette : écouteur natif non passif, pour zoomer sans faire défiler la page
  useEffect(() => {
    const el = viewportRef.current;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      setView((v) => zoomView(v, e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX - rect.left, e.clientY - rect.top));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    gesture.current = { startX: e.clientX, startY: e.clientY, view, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    const g = gesture.current;
    if (!g) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (!g.moved && Math.hypot(dx, dy) < 4) return;
    g.moved = true;
    if (dragPin) {
      const [x, y] = toPercent(e.clientX, e.clientY);
      setDragPin({ ...dragPin, x, y });
    } else if (view.scale > 1) {
      setView({ ...g.view, x: g.view.x + dx, y: g.view.y + dy });
    }
  };

  const onPointerUp = (e) => {
    const g = gesture.current;
    gesture.current = null;
    if (dragPin) {
      if (g?.moved) onMove?.(dragPin.id, dragPin.x, dragPin.y);
      setDragPin(null);
      return;
    }
    // Simple clic sur la carte : placement du repère sélectionné
    if (g && !g.moved && editable && placing) onPlace?.(...toPercent(e.clientX, e.clientY));
  };

  const startPinDrag = (e, pin) => {
    if (!editable) return;
    e.stopPropagation();
    gesture.current = { startX: e.clientX, startY: e.clientY, view, moved: false };
    viewportRef.current.setPointerCapture(e.pointerId);
    setDragPin({ id: pin.id, x: pin.x, y: pin.y });
  };

  return (
    <div className={cx(styles.root, className)}>
      <div
        ref={viewportRef}
        className={cx(styles.viewport, placing && styles.placing, view.scale > 1 && styles.pannable)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          gesture.current = null;
          setDragPin(null);
        }}
        role="group"
        aria-label={label}
      >
        <div className={styles.stage} style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, '--inv-scale': 1 / view.scale }}>
          <img ref={imageRef} src={src} alt="" className={styles.image} draggable={false} />
          {pins.map((pin) => {
            const pos = dragPin?.id === pin.id ? dragPin : pin;
            return (
              <button
                key={pin.id}
                type="button"
                className={cx(styles.pin, pin.id === selectedId && styles.pinSelected, editable && styles.pinEditable)}
                style={{ left: `${pos.x}%`, top: `${pos.y}%`, '--pin': pin.color || 'var(--primary)' }}
                onPointerDown={(e) => (editable ? startPinDrag(e, pin) : e.stopPropagation())}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!editable) onPinClick?.(pin);
                }}
                title={pin.hasMap && !editable ? `${pin.name} — ouvrir sa carte` : pin.name}
              >
                <span className={styles.pinDot} aria-hidden>
                  {pin.hasMap && <Layers />}
                </span>
                <span className={styles.pinLabel}>{pin.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.controls}>
        <button type="button" aria-label="Zoomer" onClick={() => zoomAt(1.4)} disabled={view.scale >= MAX_SCALE}>
          <Plus aria-hidden />
        </button>
        <button type="button" aria-label="Dézoomer" onClick={() => zoomAt(1 / 1.4)} disabled={view.scale <= MIN_SCALE}>
          <Minus aria-hidden />
        </button>
        <button type="button" aria-label="Recentrer" onClick={() => setView({ scale: 1, x: 0, y: 0 })} disabled={view.scale === 1}>
          <RotateCcw aria-hidden />
        </button>
      </div>
    </div>
  );
}
