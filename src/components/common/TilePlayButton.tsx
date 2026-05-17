import React, {useState, useEffect, useContext} from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity 
} from 'react-native';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import AntDesign from '@react-native-vector-icons/ant-design';

import TimeConversion from '../functions/TimeConversion';

import useStyles from '@/theme/styles';
import useTypography from '@/theme/typography';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

import { useApp } from '@/context/AppContext';
import { usePlayer } from '@/context/PlayerContext';

import useOnPlay from '@/components/functions/OnPlay';

const TilePlayButton = ({duration, id, title, audioUri, imageUri, author} : any) => {

    const { userId, isAuthenticated, logout } = useApp();

    const styles = useStyles();
    const typo = useTypography();

    const onPlay = useOnPlay();

    return (
        <TouchableOpacity onPress={() => onPlay({
            id: id,
            title: title,
            url: audioUri,
            artwork: imageUri,
            artist: author,
        })}>
            <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                borderRadius: 30,
                paddingVertical: 2,
                paddingHorizontal: 8,
                backgroundColor: '#171717a5',
                borderColor: '#ffffffCC',
                margin: 10,
                alignSelf: 'flex-start',
                

                }}>
                    <FontAwesome5 
                        name='play'
                        color='#ffffff'
                        size={10}
                        style={{marginRight: 8}}
                        iconStyle="solid"
                    />
                    <Text style={{
                        fontSize: 14,
                        fontWeight: 'normal',
                        color: '#ffffffCC',
                    
                    }}>
                        {TimeConversion(duration)}
                    </Text> 
            </View>
        </TouchableOpacity>
    )
}

export default TilePlayButton;