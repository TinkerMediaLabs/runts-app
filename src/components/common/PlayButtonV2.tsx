import { 
    View, 
    Text, 
    StyleSheet,
    TouchableOpacity,
} from 'react-native';

import {FontAwesome5} from '@react-native-vector-icons/fontawesome5';

import TimeConversion from '../functions/TimeConversion';

import { useApp } from '@/context/AppContext';

import useOnPlay from '@/components/functions/OnPlay';


const PlayButtonV2 = ({id, duration, title, audioUrl, imageUri, author} : any) => {

    const onPlay = useOnPlay();

    return (
        <TouchableOpacity onPress={() => onPlay({
            id: id,
            title: title,
            url: audioUrl,
            artwork: imageUri,
            artist: author,
        })}>
            <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                borderRadius: 30,
                paddingVertical: 2,
                paddingHorizontal: 10,
                backgroundColor: '#363636a5',
                borderWidth: 0.5,
                borderColor: '#ffffffa5'
            }}>
                <FontAwesome5 
                    name='play'
                    color='#ffffff'
                    size={10}
                    style={{marginRight: 2}}
                    iconStyle="solid"
                />
                <Text style={styles.time}>
                    {TimeConversion(duration)}
                </Text> 
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({

    time: {
        fontSize: 14,
        fontWeight: 'normal',
        color: '#ffffffCC',
        marginLeft: 3,
    },
  });

export default PlayButtonV2;