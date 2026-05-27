import React, { useState } from 'react';
import {
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    View,
    Text,
    FlatList,
    ImageBackground,
} from 'react-native';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { LinearGradient } from 'expo-linear-gradient';

import useStyles from '../../theme/styles';
import useTypography from '../../theme/typography';

const { width } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Local tile images — keyed by tileImageUri value stored in DynamoDB
// ---------------------------------------------------------------------------

const localAssets: Record<string, any> = {
    fanfiction:     require('../../../assets/images/genres/fanfictionTileImage.jpg'),
    sciencefiction: require('../../../assets/images/genres/scienceFictionTileImage.jpg'),
    dystopian:      require('../../../assets/images/genres/dystopianTileImage.png'),
    fantasy:        require('../../../assets/images/genres/fantasyTileImage.png'),
};

// ---------------------------------------------------------------------------
// Genre tile item
// ---------------------------------------------------------------------------

const Item = ({ name, id, tileImageUri, navigation }: any) => {

    const typo = useTypography();
    const styles = useStyles();

    const bgSource = tileImageUri && localAssets[tileImageUri]
        ? localAssets[tileImageUri]
        : null;

    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('TagHomeScreen', { id, name })}
            style={styles_local.tileWrapper}
        >
            {bgSource ? (
                <ImageBackground
                    source={bgSource}
                    style={styles_local.tileImage}
                    imageStyle={{ borderRadius: 15 }}
                >
                    <LinearGradient
                        colors={['#000000a5', '#000000a5', 'transparent']}
                        locations={[0.0, 0.33, 1.0]}
                        start={{ x: 0, y: 1 }}
                        end={{ x: 0, y: 0 }}
                        style={styles_local.tileGradient}
                    >
                        <Text style={[typo.genreTile, { marginBottom: 10 }]}>
                            {name}
                        </Text>
                    </LinearGradient>
                </ImageBackground>
            ) : (
                // Fallback for genres without a tile image
                <View style={[styles_local.tileImage, styles_local.tileFallback]}>
                    <Text style={[typo.genreTile, { marginBottom: 10 }]}>
                        {name}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

const GenreTilesList = ({ primaryTags, navigation }: any) => {

    const typo = useTypography();

    const renderItem = ({ item }: any) => (
        <Item
            id={item.id}
            name={item.name}
            tileImageUri={item.tileImageUri}
            navigation={navigation}
        />
    );

    return (
        <View style={{ backgroundColor: 'transparent' }}>
            <FlatList
                data={primaryTags}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                initialNumToRender={primaryTags?.length ?? 4}
                contentContainerStyle={{ paddingBottom: 80 }}
                ListHeaderComponent={() => (
                    <View style={{ marginTop: 20 }}>
                        <Text style={[typo.title, { marginBottom: 10 }]}>
                            Genres
                        </Text>
                    </View>
                )}
                ListFooterComponent={<View style={{ height: 20 }} />}
            />
        </View>
    );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles_local = StyleSheet.create({
    tileWrapper: {
        marginVertical: 10,
        width: width - 40,
        alignSelf: 'center',
        borderRadius: 15,
        overflow: 'hidden',
    },
    tileImage: {
        width: '100%',
        height: 160,
        borderRadius: 15,
        justifyContent: 'flex-end',
    },
    tileGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 15,
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
    },
    tileFallback: {
        backgroundColor: '#1a1a1a',
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
});

export default GenreTilesList;