import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, View, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getStatusBarHeight } from 'react-native-status-bar-height';

import Screen from '@/components/common/Screen';
import { spacing } from '../../theme/spacing';

import PrimaryGenreTilesList from '../../components/story/PrimaryGenreTiles';
import SearchBar              from '../../components/common/SearchBar';
import { SkeletonGenreTiles, SkeletonCardRow } from '../../components/common/Skeleton';
import Reveal                 from '../../components/common/Reveal';
import { SubgenreRow, ExploreSubgenres, CatalogLinks } from '../../components/discover/DiscoverSections';

import { usePrimaryTags } from '../../hooks/queries/useTags';
import {
    useDiscoverLayout, usePopularSubgenres, useExplorePool, useFeaturedTags, useBecauseSubgenres, pickTryNew,
} from '../../hooks/queries/useDiscover';
import { useTasteProfile } from '../../hooks/queries/useTasteProfile';
import { useApp } from '@/context/AppContext';

const { width } = Dimensions.get('window');
const GIVE_UP_MS = 3000;   // show what is ready after this long even if a section is still loading

// The Discover tab: search, then the sections the CMS set up (Discover layout). Sections load in parallel and
// appear top to bottom as each one is ready; a placeholder in the same shape holds the place of the next ones, so
// a slow section never holds up the ones above it and nothing jumps down as data arrives.
const BrowseScreen = ({ navigation }: any) => {
    const { eroticEnabled, profile } = useApp();
    const picked = useMemo(() => (profile?.preferredTagIds ?? []).filter(Boolean) as string[], [profile?.preferredTagIds]);

    const { sections, isLoading: layoutLoading } = useDiscoverLayout();
    const has = (type: string) => sections.some(s => s.type === type);
    const wantsPopular = has('discoverPopular'), wantsTry = has('discoverTryNew'), wantsBecause = has('discoverBecause');

    const { data: primaryTags, isLoading: primaryLoading } = usePrimaryTags();
    const popularQ = usePopularSubgenres(wantsPopular || wantsTry);
    const exploreQ = useExplorePool(has('discoverShuffle'));
    const tasteQ = useTasteProfile(picked, wantsBecause || wantsTry);
    const ownIds = useMemo(() => [...picked, ...(tasteQ.data?.learnedTagIds ?? [])], [picked, tasteQ.data]);
    const becauseQ = useBecauseSubgenres(ownIds, wantsBecause && !tasteQ.isLoading);

    const featuredIds = useMemo(
        () => Array.from(new Set(sections.filter(s => s.type === 'discoverFeatured').flatMap(s => (s.tagIds ?? []).filter(Boolean) as string[]))),
        [sections],
    );
    const featuredQ = useFeaturedTags(featuredIds);

    const [gaveUp, setGaveUp] = useState(false);
    useEffect(() => { const t = setTimeout(() => setGaveUp(true), GIVE_UP_MS); return () => clearTimeout(t); }, []);

    // Is this section still waiting for its data?
    const sectionLoading = (s: any): boolean => {
        switch (s.type) {
            case 'discoverGenres':   return primaryLoading;
            case 'discoverPopular':  return popularQ.isLoading;
            case 'discoverFeatured': return featuredIds.length > 0 && featuredQ.isLoading;
            case 'discoverShuffle':  return exploreQ.isLoading;
            case 'discoverBecause':  return tasteQ.isLoading || becauseQ.isLoading;
            case 'discoverTryNew':   return popularQ.isLoading || tasteQ.isLoading;
            default:                 return false;
        }
    };
    // Sections above this one are shown; this one and the next two show a placeholder. -1 = nothing is waiting.
    const firstLoading = gaveUp || layoutLoading ? -1 : sections.findIndex(sectionLoading);

    const nonErotic = useMemo(() => (primaryTags ?? []).filter((t: any) => !t.isErotic), [primaryTags]);

    const renderPlaceholder = (s: any) => {
        switch (s.type) {
            case 'discoverGenres':  return <SkeletonGenreTiles key={s.id} />;
            case 'discoverCatalog': return null;
            default:                return <SkeletonCardRow key={s.id} cardWidth={156} cardHeight={100} />;
        }
    };

    const renderSection = (s: any, i: number) => {
        switch (s.type) {
            case 'discoverGenres':
                return nonErotic.length > 0 ? (
                    <View key={s.id} style={{ marginHorizontal: spacing.margin }}>
                        <PrimaryGenreTilesList primaryTags={nonErotic} navigation={navigation} eroticEnabled={eroticEnabled} />
                    </View>
                ) : null;
            case 'discoverPopular': {
                const list = (popularQ.data ?? []).slice(0, s.limit ?? 12);
                return list.length ? <Reveal key={s.id} duration={350}><SubgenreRow title={s.title || 'Popular right now'} tags={list} /></Reveal> : null;
            }
            case 'discoverFeatured': {
                const order = ((s.tagIds ?? []).filter(Boolean) as string[]);
                const byId = new Map(featuredQ.tags.map(t => [t.id, t]));
                const list = order.map(id => byId.get(id)).filter(Boolean) as any[];
                return list.length ? <Reveal key={s.id} duration={350}><SubgenreRow title={s.title || 'Featured'} tags={list} /></Reveal> : null;
            }
            case 'discoverShuffle':
                return (exploreQ.data ?? []).length ? <Reveal key={s.id} duration={350}><ExploreSubgenres pool={exploreQ.data!} title={s.title || 'Explore subgenres'} /></Reveal> : null;
            case 'discoverBecause':
                return becauseQ.tags.length ? <Reveal key={s.id} duration={350}><SubgenreRow title={s.title || 'Based on your listening'} tags={becauseQ.tags} /></Reveal> : null;
            case 'discoverTryNew': {
                const list = pickTryNew(popularQ.data ?? [], tasteQ.data?.listenedTagIds ?? [], picked, s.limit ?? 10);
                return list.length ? <Reveal key={s.id} duration={350}><SubgenreRow title={s.title || 'Try something new'} tags={list} /></Reveal> : null;
            }
            case 'discoverCatalog':
                return <Reveal key={s.id} duration={350}><CatalogLinks title={s.title} /></Reveal>;
            default:
                return null;
        }
    };

    return (
        <Screen>
            <View style={{ flex: 1 }}>
                <LinearGradient
                    style={{
                        height: Platform.OS === 'android'
                            ? Dimensions.get('window').height - getStatusBarHeight()
                            : Dimensions.get('window').height,
                    }}
                    colors={['#000', '#0f1112', '#000']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={{ marginTop: getStatusBarHeight() + 30, marginBottom: 0, marginHorizontal: 20 }} />

                        <SearchBar />

                        {layoutLoading && !gaveUp ? (
                            <View>
                                <SkeletonGenreTiles />
                                <SkeletonCardRow cardWidth={156} cardHeight={100} />
                                <SkeletonCardRow cardWidth={156} cardHeight={100} />
                            </View>
                        ) : (
                            sections.map((s, i) => {
                                if (firstLoading === -1 || i < firstLoading) return renderSection(s, i);
                                return i < firstLoading + 3 ? renderPlaceholder(s) : null;
                            })
                        )}

                        <View style={{ height: 100 }} />
                    </ScrollView>
                </LinearGradient>
            </View>
        </Screen>
    );
};

export default BrowseScreen;
