import {
    TouchableOpacity, 
} from 'react-native';

import Animated from "react-native-reanimated";

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

import useStyles from '@/theme/styles';
import useTypography from '@/theme/typography';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

import { useApp } from '@/context/AppContext';

import useOnPlay from '@/components/functions/OnPlay';


const PlayButtonV3 = ({ style, id, title, audioUri, imageUri, author, isLocked = false, onLocked }: any) => {
    const onPlay = useOnPlay();

    const handlePress = () => {
        if (isLocked) { onLocked?.(); return; }
        onPlay({ id, title, url: audioUri, artwork: imageUri, artist: author });
    };

    return (
        <TouchableOpacity onPress={handlePress}>
            <Animated.View style={[
                style,
                {
                    height: 30, width: 30,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isLocked ? '#2a2a2a' : colors.primary,
                    borderRadius: 15,
                    margin: 12,
                }
            ]}>
                <FontAwesome5
                    name={isLocked ? 'lock' : 'play'}
                    size={isLocked ? 12 : 14}
                    color={isLocked ? '#ffffff50' : '#171717'}
                    style={isLocked ? {} : { marginLeft: 2 }}
                    iconStyle="solid"
                />
            </Animated.View>
        </TouchableOpacity>
    );
};

export default PlayButtonV3;

