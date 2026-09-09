import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { inlineLocalImage } from '../../server/src/features/preview';

describe('inlineLocalImage', () => {
  const imagePath = path.join(__dirname, '..', 'fixtures', 'assets', 'orgdown.png');

  it('inlines a local image as a data URI', () => {
    const dataUri = inlineLocalImage(pathToFileURL(imagePath).href);
    expect(dataUri).toBeDefined();
    expect(dataUri?.startsWith('data:image/png;base64,')).toBe(true);
    expect((dataUri ?? '').length).toBeGreaterThan(1000);
  });

  it('returns undefined for non-file targets', () => {
    expect(inlineLocalImage('https://example.com/img.png')).toBeUndefined();
    expect(inlineLocalImage('./img.png')).toBeUndefined();
  });

  it('returns undefined for missing files', () => {
    const missing = pathToFileURL(path.join(__dirname, 'does-not-exist.png')).href;
    expect(inlineLocalImage(missing)).toBeUndefined();
  });

  it('returns undefined for unsupported file types', () => {
    const orgFile = path.join(__dirname, '..', 'fixtures', 'F24-preview-image.org');
    expect(inlineLocalImage(pathToFileURL(orgFile).href)).toBeUndefined();
  });
});
