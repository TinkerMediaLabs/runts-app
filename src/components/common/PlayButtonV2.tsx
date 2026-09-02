import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
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
                    color="#ffffff"
                    size={10}
                    style={{ marginRight: 2 }}
                    iconStyle="solid"
                />
                <Text style={styles.time}>{TimeConversion(duration)}</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    pill: {
        flexDirection:     'row',
        alignItems:        'center',
        borderRadius:      30,
        paddingVertical:   2,
        paddingHorizontal: 10,
        backgroundColor:   'rgba(54,54,54,0.65)',
        borderWidth:       0.5,
        borderColor:       'rgba(255,255,255,0.65)',
    },
    time: {
        color:    '#fff',
        fontSize: 12,
    },
});

export default PlayButtonV2;