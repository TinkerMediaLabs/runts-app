import { previewSourceFor } from '../lib/previewSource';

describe('previewSourceFor', () => {
  const free = { audioUri: 'stories/audio/a.mp3', isPremium: false };
  const premium = { audioUri: 'stories/audio/a.mp3', isPremium: true };

  it('plays the clip from its start when the story has one, premium or not', () => {
    expect(previewSourceFor({ ...free, previewUri: 'stories/previews/a.mp3' })).toEqual({ path: 'stories/previews/a.mp3', isClip: true });
    expect(previewSourceFor({ ...premium, previewUri: 'stories/previews/a.mp3' })).toEqual({ path: 'stories/previews/a.mp3', isClip: true });
  });

  it('plays the full audio from the preview start for a free story without a clip', () => {
    expect(previewSourceFor(free)).toEqual({ path: 'stories/audio/a.mp3', isClip: false });
    expect(previewSourceFor({ audioUri: 'stories/audio/a.mp3' })).toEqual({ path: 'stories/audio/a.mp3', isClip: false });
    expect(previewSourceFor({ ...free, isPremium: null })).toEqual({ path: 'stories/audio/a.mp3', isClip: false });
  });

  it('has no preview for a premium story without a clip (its full audio is never handed out)', () => {
    expect(previewSourceFor(premium)).toBeNull();
  });

  it('has no preview when there is no audio and no clip', () => {
    expect(previewSourceFor({})).toBeNull();
    expect(previewSourceFor({ audioUri: null, previewUri: null })).toBeNull();
    expect(previewSourceFor({ audioUri: '', isPremium: false })).toBeNull();
  });
});
