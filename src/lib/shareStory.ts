import { Share, Platform } from 'react-native';
import { storyShareContent } from './storyShareContent';
import { SHARE_PREVIEW_URL, APP_SCHEME } from './amplifyConfig';

// The Share button for a story: sends just its link (see storyShareContent).
export async function shareStory(id: string, title: string | null | undefined): Promise<void> {
  if (!id) return;
  await Share.share(storyShareContent(id, title, Platform.OS, SHARE_PREVIEW_URL ? { url: SHARE_PREVIEW_URL, scheme: APP_SCHEME } : null));
}
