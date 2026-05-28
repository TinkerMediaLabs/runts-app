import React from 'react';
import { TouchableOpacity, ActivityIndicator } from 'react-native';
import AntDesign from '@react-native-vector-icons/ant-design';
import { usePinnedStoryIds, useTogglePin } from '../../hooks/queries/usePinnedStories';

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

  const { data: pinnedIds } = usePinnedStoryIds();
  const { toggle, isLoading } = useTogglePin();

  const isPinned = pinnedIds?.has(storyId) ?? false;

  if (isLoading) {
    return <ActivityIndicator size="small" color={activeColor} />;
  }

  return (
    <TouchableOpacity
      onPress={() => toggle(storyId, isPinned)}
      activeOpacity={0.7}
      style={{ padding: 4 }}
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