//this is the template for a taghome screen, which is the screen that shows the stories for a specific tag.

import React, {useState, useEffect, useRef} from 'react';
import { 
    View, 
    StyleSheet, 
    Text, 
    TouchableWithoutFeedback, 
    ScrollView,
    FlatList,
    Dimensions,
    Animated
} from 'react-native';

import {useRoute} from '@react-navigation/native'

import {LinearGradient} from 'expo-linear-gradient';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { getStatusBarHeight } from 'react-native-status-bar-height';

// import { genreTagsByGenreId,  } from '../src/graphql/queries';
// import {graphqlOperation, API, Storage} from 'aws-amplify';

import ForYouCarousel from '../../components/story/ForYouCarousel';
import HorizontalList from '../../components/story/HorizontalList';

import tags from '../../../dummydata/dummytags';
import stories from '../../../dummydata/stories';

import useStyles from '../../theme/styles';
import useTypography from '../../theme/typography';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

import Screen from '@/components/common/Screen';

import dummyHorizontalLists from '../../../dummydata/dummyHorizontalLists';
import dummystories from '../../../dummydata/stories';
import dummytags from '../../../dummydata/dummytags';

import { useApp } from '@/context/AppContext';

const GenreHome = ({id, name, navigation} : any) => {

        const { userId, isAuthenticated, logout } = useApp();

        const styles = useStyles();
        const typo = useTypography();

        const [dummyTags, setDummyTags] = useState(tags);
        const [stories, setStories] = useState(dummystories);
        const [horizontalLists, setHorizontalLists] = useState(dummyHorizontalLists);

//route params from the StoriesScreen to specifiy the genre
    const route = useRoute();


//get 2 trending tags in the genre
const [trendingTags, setTrendingTags] = useState([]);

    const animation = useRef(new Animated.Value(0)).current;

    const animatedOpacity = animation.interpolate({
        inputRange: [0, 50],
        outputRange: [1, 0],
        extrapolate: 'clamp',
        });

    const animatedOpacitySlow = animation.interpolate({
        inputRange: [0, 220],
        outputRange: [1, 0],
        extrapolate: 'clamp',
        });

    const animatedAppearOpacity = animation.interpolate({
        inputRange: [0, 450],
        outputRange: [0, 1],
        extrapolate: 'clamp',
        });

    const animatedHeaderHeight = animation.interpolate({
        inputRange: [0, 350],
        outputRange: [450, 80],
        extrapolate: 'clamp',
        });

    const animatedColor = animation.interpolate({
        inputRange: [250, 800],
        outputRange: ['#000000', '#363636'],
        extrapolate: 'clamp',
        });


    return (
        <Screen>
            <View style={styles.container}>
                <LinearGradient
                    colors={['#212121', '#000', '#000',]}
                    style={{height: '100%'}}
                    start={{ x: 1, y: 1 }}
                    end={{ x: 0.5, y: 0.5 }}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        

                        <View style={{ marginTop: 100}}>
                            <ForYouCarousel stories={stories}/>
                        </View>

                        <View style={{marginTop: 20}}>
                            
                            {/* <View style={{}}>
                                <FlatList 
                                    data={trendingTags}
                                    keyExtractor={item => item.id}
                                    renderItem={renderGenreTag}
                                    scrollEnabled={false}
                                    numColumns={2}
                                    contentContainerStyle={{width: Dimensions.get('window').width - 40, marginHorizontal: 20, }}
                                    ListHeaderComponent={() => {
                                        return (
                                            <View style={{marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', }}>
                                                <View style={{marginBottom: 0, flexDirection: 'row', alignItems: 'center'}}>
                                                    <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 18, }}>
                                                        Popular Tags in 
                                                    </Text>
                                                    <Text style={{ marginLeft: 6, color: '#fff', fontWeight: 'bold', fontSize: 18, textTransform: 'capitalize'}}>
                                                        {dummyTags[Number(dummyTags)-1].name}
                                                    </Text>
                                                </View>
                                                <FontAwesome5 
                                                    name='chevron-right'
                                                    color='#fff'
                                                    size={17}
                                                    style={{padding: 10, }}
                                                    iconStyle="solid"
                                                    //onPress={() => navigation.navigate('ViewGenreTags', {genreRoute: genreID, genreName: genreName})}
                                                />
                                            </View>
                                        )
                                    }}
                                />
                            </View> */}
                        </View>

                        <View>
                            <View style={{marginLeft: spacing.margin, paddingVertical: spacing.margin}}>
                                <Text style={typo.title}>
                                    {horizontalLists[0].title}
                                </Text>
                            </View>
                            <HorizontalList stories={stories}/>
                        </View> 

                        <View>
                            <View style={{marginLeft: spacing.margin, paddingVertical: spacing.margin}}>
                                <Text style={typo.title}>
                                    {horizontalLists[2].title}
                                </Text>
                            </View>
                            <HorizontalList stories={stories}/>
                        </View> 

                        <View style={{height: 200}}/>

                        

                    </ScrollView>
                    <View style={{position: 'absolute', paddingTop: getStatusBarHeight() + 20, paddingBottom: 10, alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row',  width: Dimensions.get('window').width, backgroundColor: '#000000CC'}}>
                            <View style={{flexDirection: 'row', alignItems: 'center', height: getStatusBarHeight() + 10}}>
                                <FontAwesome5 
                                    name='chevron-left'
                                    size={22}
                                    color='#fff'
                                    style={{padding: 30, margin: -30, paddingLeft: 50}}
                                    onPress={() => navigation.goBack()}
                                    iconStyle="solid"
                                /> 
                                <Text style={{fontWeight: 'bold', marginLeft: 20, fontSize: 22, color: '#fff', textTransform: 'capitalize'}}>
                                    {dummyTags[1].name}
                                    {/* {dummyTags[Number(dummyTags.id)-1].name} */}
                                </Text>
                            </View>
                            <View>
                                <TouchableWithoutFeedback 
                                    onPress={() => navigation.navigate('BrowseByTitle')}
                                >
                                    <Text style={{marginRight: 20, color: '#fff'}}>
                                        Browse
                                    </Text> 
                                </TouchableWithoutFeedback>
                                
                            </View>
                        </View>
                        
                </LinearGradient>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create ({
    container: {
        flex: 1,
    },
    gradient: {
        height: 300
    },
});

export default GenreHome;
