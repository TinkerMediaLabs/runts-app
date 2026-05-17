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


const PlayButtonV3 = ({style, id, title, audioUri, imageUri, author} :any) => {

    const onPlay = useOnPlay();

    return (
        <TouchableOpacity onPress={() => {onPlay({
            id: id,
            title: title,
            url: audioUri,
            artwork: imageUri,
            artist: author,
        })}}>
            <Animated.View 
                style={[
                    style,
                    {
                        height: 30,
                        width: 30,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: colors.primary,
                        borderRadius: 15,
                        margin: 12,
                    }
                ]}
            >
                <FontAwesome5 
                    name='play'
                    size={14}
                    color='#171717'
                    style={{marginLeft: 2}}
                    iconStyle="solid"
                />
            </Animated.View>
        </TouchableOpacity>
    );
};

export default PlayButtonV3;

