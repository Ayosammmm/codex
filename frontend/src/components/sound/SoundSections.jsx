import { uploadUrl } from '@/api/client';
import { SheetSection } from '@/components/entity/SheetSection';
import { FormSection } from '@/components/universe/UniverseForm';
import { SoundPicker } from './SoundPicker';
import { SoundPlayer } from './SoundPlayer';
import { soundName } from './soundFiles';
import styles from './Sound.module.scss';

/**
 * Section « Son » d'un formulaire (module « Son »). `fields` : [{ field, label, hint }] ;
 * les fichiers passent par `images` comme les images (envoyés à l'enregistrement).
 */
export function SoundFormSection({ entity, fields, images, setImage, onError }) {
  return (
    <FormSection id="son" title="Son" description="Écoutez le son choisi avant d’enregistrer.">
      <div className={styles.pickers}>
        {fields.map(({ field, label, hint }) => (
          <SoundPicker
            key={field}
            label={label}
            hint={hint}
            loop
            currentUrl={uploadUrl(entity?.[field])}
            value={images[field]}
            onChange={(v) => setImage(field, v)}
            onError={onError}
          />
        ))}
      </div>
    </FormSection>
  );
}

// Volume des sons d'une fiche
const SHEET_VOLUME = 0.2;

/**
 * Section « Son » d'une fiche : lecteurs des sons enregistrés (`sounds` : [{ label, path, autoPlay }]),
 * titrés « Thème - Taverne.mp3 », à 30 % du volume. `autoPlay` : lancé à l'ouverture de la fiche (le thème).
 * Rien si aucun son.
 */
export function SoundSheetSection({ sounds }) {
  const present = sounds.filter((s) => s.path);
  if (!present.length) return null;
  return (
    <SheetSection id="son" title="Son">
      <div className={styles.players}>
        {present.map((s) => (
          <SoundPlayer
            key={s.label}
            src={uploadUrl(s.path)}
            label={`${s.label} - ${soundName(s.path)}`}
            loop
            volume={SHEET_VOLUME}
            autoPlay={s.autoPlay}
          />
        ))}
      </div>
    </SheetSection>
  );
}
