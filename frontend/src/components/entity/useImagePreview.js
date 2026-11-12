import { useEffect, useMemo } from 'react';
import { uploadUrl } from '@/api/client';

/**
 * URL à afficher pour une image modifiable :
 * `value` File (nouvelle image) → aperçu local ; null (retirée) → null ; absent → image enregistrée.
 */
export function useImagePreview(savedPath, value) {
  const objectUrl = useMemo(() => (value instanceof File ? URL.createObjectURL(value) : null), [value]);
  useEffect(() => () => objectUrl && URL.revokeObjectURL(objectUrl), [objectUrl]);
  if (value === null) return null;
  return objectUrl || uploadUrl(savedPath);
}
