import React, { useMemo } from 'react';
import {
    Dimensions,
    View,
    ScrollView,
    Platform,
    TouchableOpacity,
    Text,
    StyleSheet,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

import Screen from '@/components/common/Screen';
import { spacing } from '../../theme/spacing';

import PrimaryGenreTilesList from '../../components/story/PrimaryGenreTiles';
import SearchBar              from '../../components/common/SearchBar';
import PopularTagsList        from '../../components/story/PopularTagsList';
import LoadingItem            from '../../components/common/LoadingItem';

import { useTags, usePrimaryTags } from '../../hooks/queries/useTags';
import { useApp }                  from '@/context/AppContext';

const { width } = Dimensions.get('window');



// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const BrowseScreen = ({ navigation }: any) => {

    const { data: allTags,     isLoading: tagsLoading    } = useTags();
    const { data: primaryTags, isLoading: primaryLoading } = usePrimaryTags();
    const { eroticEnabled } = useApp();

    const isLoading = tagsLoading || primaryLoading;

    // Erotic tags are never shown in the general tag lists —
    // they only appear on the Erotic Home screen
    const filteredAllTags = useMemo(
        () => (allTags     ?? []).filter(t => !t.isErotic),
        [allTags]
    );
    const filteredPrimaryTags = useMemo(
        () => (primaryTags ?? []).filter(t => !t.isErotic),
        [primaryTags]
    );

    return (
        <Screen>
            <View style={{ flex: 1 }}>
                <LinearGradient
                    style={{
                        height: Platform.OS === 'android'
                            ? Dimensions.get('window').height - getStatusBarHeight()
                            : Dimensions.get('window').height,
                    }}
                    colors={['#0a0a14', '#12121a', '#000']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>

                        <View style={{
                            marginTop:        getStatusBarHeight() + 30,
                            marginBottom:     0,
                            marginHorizontal: 20,
                        }} />

                        <SearchBar />

                        {isLoading ? (
                            <View style={{ padding: spacing.margin }}>
                                <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                                    <LoadingItem width={80}           height={40}  radius={15} />
                                    <LoadingItem width={80}           height={40}  radius={15} />
                                    <LoadingItem width={80}           height={40}  radius={15} />
                                </View>
                                <View style={{ flexDirection: 'row', marginBottom: 24 }}>
                                    <LoadingItem width={80}           height={40}  radius={15} />
                                    <LoadingItem width={80}           height={40}  radius={15} />
                                </View>
                                <LoadingItem width={width - 40} height={100} radius={15} />
                                <LoadingItem width={width - 40} height={100} radius={15} />
                                <LoadingItem width={width - 40} height={100} radius={15} />
                            </View>
                        ) : (
                            <>
                                {/* Popular tags — erotic tags excluded */}
                                {filteredAllTags.length > 0 && (
                                    <View style={{ marginHorizontal: spacing.margin }}>
                                        <PopularTagsList tags={filteredAllTags} />
                                    </View>
                                )}

                                {/* Primary genre tiles — erotic tags excluded */}
                                {filteredPrimaryTags.length > 0 && (
                                    <View style={{ marginHorizontal: spacing.margin }}>
                                        <PrimaryGenreTilesList
                                            primaryTags={filteredPrimaryTags}
                                            navigation={navigation}
                                            eroticEnabled={eroticEnabled}
                                        />
                                    </View>
                                )}
                            </>
                        )}

                        <View style={{ height: 100 }} />

                    </ScrollView>
                </LinearGradient>
            </View>
        </Screen>
    );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    eroticaTile: {
        borderRadius:    14,
        overflow:        'hidden',
        borderWidth:     1,
        borderColor:     'rgba(255,124,42,0.25)',
        marginTop:       10,
        marginBottom:    4,
    },
    eroticaTileContent: {
        flexDirection:  'row',
        alignItems:     'center',
        paddingVertical: 18,
        paddingHorizontal: 16,
        gap:             14,
    },
    eroticaIconWrapper: {
        width:           44,
        height:          44,
        borderRadius:    12,
        backgroundColor: 'rgba(255,124,42,0.12)',
        borderWidth:     1,
        borderColor:     'rgba(255,124,42,0.25)',
        justifyContent:  'center',
        alignItems:      'center',
    },
    eroticaTitle: {
        fontSize:   17,
        fontWeight: '700',
        color:      '#ff7c2a',
    },
    eroticaSubtitle: {
        fontSize:   12,
        color:      'rgba(255,124,42,0.55)',
        marginTop:  2,
    },
});

export default BrowseScreen;