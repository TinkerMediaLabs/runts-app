import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import useOnPlay from '@/components/functions/OnPlay';
import { useApp } from '@/context/AppContext';

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
        <TouchableOpacity onPress={handlePress} activeOpacity={0.75}>
            <View style={styles.pill}>
                <FontAwesome5
                    name="play"
                    color="#00ffffa6"
                    size={10}
                    style={{ marginRight: 10 }}
                    iconStyle="solid"
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
        borderRadius:      30,
        paddingVertical:   6,
        paddingHorizontal: 10,
        backgroundColor:   '#0027271a',
        borderWidth:       0.5,
        borderColor:       '#00ffffa6',
    },
    time: {
        color:    '#00ffffa6',
        fontSize: 12,
    },
});

export default PlayButtonV2;