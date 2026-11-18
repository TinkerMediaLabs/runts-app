import React, {useState, useEffect, useContext} from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/common/AppText';


import TimeConversion from '../functions/TimeConversion';

import useStyles from '@/theme/styles';
import useTypography from '@/theme/typography';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

import { useApp } from '@/context/AppContext';
import { usePlayer } from '@/context/PlayerContext';

import useOnPlay from '@/components/functions/OnPlay';
import { fontSizes } from '@/theme/tokens';
import Icon from '@/components/common/Icon';

const TilePlayButton = ({duration, id, title, audioUri, imageUri, author} : any) => {

    const { userId, isAuthenticated, logout } = useApp();

    const styles = useStyles();
    const typo = useTypography();

    const onPlay = useOnPlay();

    return (
        <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Play ${title ?? 'story'}, ${TimeConversion(duration)}`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => onPlay({
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
                    <Icon 
                        name="play"
                        color={colors.textPrimary}
                        size={10}
                        style={{marginRight: 8}}
                    />
                    <Text style={{
                        fontSize: fontSizes.small,
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