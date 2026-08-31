import {
    View,
    Text,
    TouchableOpacity, 
} from 'react-native';

import useStyles from '@/theme/styles';
import useTypography from '@/theme/typography';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

import { FontAwesome5 } from '@expo/vector-icons';

import useOnPlay from '@/components/functions/OnPlay';


const PlayButtonV4 = ({ style, id, title, audioUri, imageUri, author, isLocked = false, onLocked }: any) => {
    const onPlay = useOnPlay();

    const handlePress = () => {
        if (isLocked) { onLocked?.(); return; }
        onPlay({ id, title, url: audioUri, artwork: imageUri, artist: author });
    };

    return (
        <TouchableOpacity onPress={handlePress}>
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 6,
                paddingHorizontal: 30,
                backgroundColor: isLocked ? '#2a2a2a' : '#00ffff',
                margin: 10,
                borderRadius: 30,
            }}>
                <FontAwesome5
                    name={isLocked ? 'lock' : 'play'}
                    size={14}
                    color={isLocked ? '#ffffff50' : '#000000'}
                    iconStyle="solid"
                />
                <Text style={{
                    color: isLocked ? '#ffffff50' : '#000000',
                    fontSize: 18,
                    fontWeight: 'bold',
                }}>
                    {isLocked ? 'Premium' : 'Play'}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

export default PlayButtonV4;

