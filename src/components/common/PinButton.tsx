import React from 'react';
import { TouchableOpacity } from 'react-native';
import AntDesign from '@react-native-vector-icons/ant-design';
import { useIsPinned, useTogglePin } from '../../hooks/queries/usePinnedStories';

type PinButtonProps = {
  storyId: string;
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
};

const PinButton = ({
  storyId,
  size = 20,
  activeColor = 'cyan',
  inactiveColor = 'rgba(255,255,255,0.75)',
}: PinButtonProps) => {

  const { data: isPinnedData } = useIsPinned(storyId);
  const { toggle } = useTogglePin();

  const isPinned = isPinnedData ?? false;

  return (
    <TouchableOpacity
      onPress={() => toggle(storyId, isPinned)}
      activeOpacity={0.7}
      style={{ padding: 0 }}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      accessibilityRole="button"
      accessibilityLabel={isPinned ? 'Unpin story from playlist' : 'Pin story to playlist'}
      accessibilityState={{ selected: isPinned }}
    >
      <AntDesign
        name="pushpin"
        size={size}
        color={isPinned ? activeColor : inactiveColor}
      />
    </TouchableOpacity>
  );
};

export default PinButton;