import {
    View,
    Text,
    TouchableOpacity, 
} from 'react-native';

import useStyles from '@/theme/styles';
import useTypography from '@/theme/typography';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

import useOnPlay from '@/components/functions/OnPlay';


const PlayButtonV4 = ({style, id, title, audioUri, imageUri, author} :any) => {

        const onPlay = useOnPlay();
    
        const styles = useStyles();
        const typo = useTypography();


    return (
        <TouchableOpacity onPress={() => onPlay({
            id: id,
            title: title,
            url: audioUri,
            artwork: imageUri,
            artist: author,
        })}>
            <View style={{ paddingVertical: 6, paddingHorizontal: 30, backgroundColor: '#00ffff', margin: 10, borderRadius: 30 }}>
                <Text style={{ color: '#000000', fontSize: 18, fontWeight: 'bold', }}>
                    Play
                </Text>
            </View>
        </TouchableOpacity>
    );
};

export default PlayButtonV4;

