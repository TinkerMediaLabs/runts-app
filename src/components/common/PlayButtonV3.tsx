import { TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { colors } from '@/theme/colors';
import { useApp } from '@/context/AppContext';
import useOnPlay from '@/components/functions/OnPlay';
import { iconSize } from '@/theme/tokens';

const PlayButtonV3 = ({ style, id, title, audioUri, imageUri, author, isPremium = false }: any) => {
    const onPlay = useOnPlay();
    const { isPremium: userIsPremium } = useApp();

    // Hide entirely when story is premium and user is not subscribed
    if (isPremium && !userIsPremium) return null;

    return (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Play ${title ?? 'story'}`} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }} onPress={() => onPlay({ id, title, url: audioUri, artwork: imageUri, artist: author })}>
            <Animated.View style={[
                style,
                {
                    height:          30,
                    width:           30,
                    alignItems:      'center',
                    justifyContent:  'center',
                    backgroundColor: colors.primary,
                    borderRadius:    15,
                    margin:          12,
                }
            ]}>
                <FontAwesome5
                    name="play"
                    size={iconSize.sm}
                    color="#171717"
                    style={{ marginLeft: 2 }}
                    iconStyle="solid"
                />
            </Animated.View>
        </TouchableOpacity>
    );
};

export default PlayButtonV3;