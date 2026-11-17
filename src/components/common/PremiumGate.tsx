import React, { useEffect, useState } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { PREMIUM_REQUIRED_MESSAGE, onPremiumSheetRequest } from '@/lib/premiumGate';
import PaywallModal from './PaywallModal';

// Shows the Premium bottom sheet when a premium story is played by someone without Premium. Two ways in, one sheet:
// the play button asks for it at once (the phone already knows the story is premium), and a server refusal that
// still gets through (a story the phone did not know about) arrives as the player's playError.
export default function PremiumGate() {
  const { state, clearPlayError } = usePlayer();
  const [requested, setRequested] = useState<{ title?: string } | null>(null);

  useEffect(() => onPremiumSheetRequest(title => setRequested({ title })), []);

  const refused = state.playError === PREMIUM_REQUIRED_MESSAGE;
  return (
    <PaywallModal
      visible={!!requested || refused}
      storyTitle={requested?.title}
      onClose={() => { setRequested(null); if (refused) clearPlayError(); }}
    />
  );
}
