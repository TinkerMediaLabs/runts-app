import React from 'react';
import { TouchableOpacity } from 'react-native';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { useIsPinned, useTogglePin } from '../../hooks/queries/usePinnedStories';
import { useTipTarget } from '../../tips/useTipTarget';
import { tapHaptic, successHaptic } from '../../lib/haptics';
import { colors } from '@/theme/colors';

type PinButtonProps = {
  storyId: string;
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
  tipTarget?: string;   // name for first-use tips (see src/tips)
};

const PinButton = ({
  storyId,
  size = 20,
  activeColor = colors.accent,
  inactiveColor = colors.textStrong,
  tipTarget,
}: PinButtonProps) => {
  const tipRef = useTipTarget(tipTarget);

  const { data: isPinnedData } = useIsPinned(storyId);
  const { toggle } = useTogglePin();

  const isPinned = isPinnedData ?? false;

  return (
    <TouchableOpacity
      ref={tipRef as any}
      onPress={() => { isPinned ? tapHaptic() : successHaptic(); toggle(storyId, isPinned); }}
      activeOpacity={0.7}
      style={{ padding: 0 }}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      accessibilityRole="button"
      accessibilityLabel={isPinned ? 'Unpin story from playlist' : 'Pin story to playlist'}
      accessibilityState={{ selected: isPinned }}
    >
      <FontAwesome5
        iconStyle="solid"
        name="thumbtack"
        size={size}
        color={isPinned ? activeColor : inactiveColor}
      />
    </TouchableOpacity>
  );
};

export default PinButton;