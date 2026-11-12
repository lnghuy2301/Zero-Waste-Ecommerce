import { unlink } from 'fs/promises';
import { join } from 'path';

// Accept only generated upload names; external URLs and arbitrary paths are never deleted.
export async function removeUpload(url?: string | null) {
  const match = url?.match(
    /^\/uploads\/([a-f0-9-]{36}\.(?:jpe?g|png|gif|webp|mp4|mov|avi|webm))$/i,
  );
  if (!match) return;
  try {
    await unlink(join(process.cwd(), 'uploads', match[1]));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
      console.warn('Could not remove an unused upload.');
  }
}
