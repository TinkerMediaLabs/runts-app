import React from 'react';
import { radius } from '@/theme/tokens';
import { colors } from '@/theme/colors';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import useOnPlay from '@/components/functions/OnPlay';
import { useApp } from '@/context/AppContext';
import { fontSizes } from '@/theme/tokens';
import Icon from '@/components/common/Icon';

function TimeConversion(duration: number): string {
    if (!duration) return '';
    const m = Math.round(duration / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

interface Props {
    id:        string;
    duration:  number;
    author?:   string;
    imageUri?: string;
    audioUri?: string;
    title?:    string;
    isPremium?: boolean; // story-level premium flag
}

const PlayButtonV2 = ({ id, duration, author, imageUri, audioUri, title, isPremium }: Props) => {
    const onPlay          = useOnPlay();
    const { isPremium: userIsPremium } = useApp();

    // Hide entirely when story is premium and user is not subscribed
    if (isPremium && !userIsPremium) return null;

    const handlePress = () => {
        onPlay({
            id,
            url:     audioUri ?? '',
            artwork: imageUri ?? '',
            artist:  author   ?? '',
            title:   title    ?? '',
        });
    };

    return (
        <TouchableOpacity onPress={handlePress} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="Play story">
            <View style={styles.pill}>
                <Icon
                    name="play"
                    color={colors.accentSoft}
                    size={10}
                    style={{ marginRight: 10 }}
                />
                {/* <Text style={styles.time}>{TimeConversion(duration)}</Text> */}
                <Text style={styles.time}>PLAY</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    pill: {
        flexDirection:     'row',
        alignItems:        'center',
        borderRadius:      radius.pill,
        paddingVertical:   6,
        paddingHorizontal: 10,
        backgroundColor:   colors.accentDeep,
        borderWidth:       0.5,
        borderColor:       colors.accentSoft,
    },
    time: {
        color:    colors.accentSoft,
        fontSize: fontSizes.caption,
    },
});

export default PlayButtonV2;