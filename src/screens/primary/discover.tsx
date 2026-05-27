import React from 'react';
import {
    Dimensions,
    View,
    ScrollView,
    Platform,
    ActivityIndicator,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { getStatusBarHeight } from 'react-native-status-bar-height';

import Screen from '@/components/common/Screen';
import { spacing } from '../../theme/spacing';

import PrimaryGenreTilesList from '../../components/story/PrimaryGenreTiles';
import SearchBar from '../../components/common/SearchBar';
import PopularTagsList from '../../components/story/PopularTagsList';
import LoadingItem from '../../components/common/LoadingItem';

import { useTags, usePrimaryTags } from '../../hooks/queries/useTags';

const { width } = Dimensions.get('window');

const BrowseScreen = ({ navigation }: any) => {

    const { data: allTags, isLoading: tagsLoading } = useTags();
    const { data: primaryTags, isLoading: primaryLoading } = usePrimaryTags();

    const isLoading = tagsLoading || primaryLoading;

    return (
        <Screen>
            <View style={{ flex: 1 }}>
                <LinearGradient
                    style={{
                        height: Platform.OS === 'android'
                            ? Dimensions.get('window').height - getStatusBarHeight()
                            : Dimensions.get('window').height,
                    }}
                    colors={['#13192Ca5', '#161616', '#000000', '#000000']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>

                        <View style={{
                            marginTop: getStatusBarHeight() + 30,
                            marginBottom: 0,
                            marginHorizontal: 20,
                        }} />

                        <SearchBar />

                        {isLoading ? (
                            <View style={{ padding: spacing.margin }}>
                                {/* Popular tags loading skeleton */}
                                <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                                    <LoadingItem width={80} height={40} radius={15} />
                                    <LoadingItem width={80} height={40} radius={15} />
                                    <LoadingItem width={80} height={40} radius={15} />
                                </View>
                                <View style={{ flexDirection: 'row', marginBottom: 24 }}>
                                    <LoadingItem width={80} height={40} radius={15} />
                                    <LoadingItem width={80} height={40} radius={15} />
                                </View>
                                {/* Genre tiles loading skeleton */}
                                <LoadingItem width={width - 40} height={100} radius={15} />
                                <LoadingItem width={width - 40} height={100} radius={15} />
                                <LoadingItem width={width - 40} height={100} radius={15} />
                            </View>
                        ) : (
                            <>
                                {/* Popular tags — all tags shown as chips */}
                                {allTags && allTags.length > 0 && (
                                    <View style={{ marginHorizontal: spacing.margin }}>
                                        <PopularTagsList tags={allTags} />
                                    </View>
                                )}

                                {/* Primary genre tiles */}
                                {primaryTags && primaryTags.length > 0 && (
                                    <View style={{ marginHorizontal: spacing.margin }}>
                                        <PrimaryGenreTilesList
                                            primaryTags={primaryTags}
                                            navigation={navigation}
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

export default BrowseScreen;