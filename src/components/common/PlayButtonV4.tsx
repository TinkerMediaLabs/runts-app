import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/common/AppText';

import useStyles from '@/theme/styles';
import useTypography from '@/theme/typography';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

import useOnPlay from '@/components/functions/OnPlay';
import { fontSizes } from '@/theme/tokens';
import { iconSize } from '@/theme/tokens';


const PlayButtonV4 = ({ style, id, title, audioUri, imageUri, author, isLocked = false, onLocked }: any) => {
    const onPlay = useOnPlay();

    const handlePress = () => {
        if (isLocked) { onLocked?.(); return; }
        onPlay({ id, title, url: audioUri, artwork: imageUri, artist: author });
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            accessibilityRole="button"
            accessibilityLabel={isLocked ? 'Premium story. Unlock to play' : `Play ${title ?? 'story'}`}
        >
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 6,
                paddingHorizontal: 30,
                backgroundColor: isLocked ? '#2a2a2a' : colors.accent,
                margin: 10,
                borderRadius: 30,
            }}>
                <FontAwesome5
                    name={isLocked ? 'lock' : 'play'}
                    size={iconSize.sm}
                    color={isLocked ? '#ffffff50' : '#000000'}
                    iconStyle="solid"
                />
                <Text style={{
                    color: isLocked ? '#ffffff50' : '#000000',
                    fontSize: fontSizes.subtitle,
                    fontWeight: 'bold',
                }}>
                    {isLocked ? 'Premium' : 'Play'}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

export default PlayButtonV4;

