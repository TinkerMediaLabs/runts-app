import React, { useEffect, useState, useRef } from 'react';
import { 
    ScrollView, 
    TouchableWithoutFeedback,
    View,
    Text,
    AppState,
    Dimensions,
} from 'react-native';

import { FontAwesome } from '@react-native-vector-icons/fontawesome';
import {LinearGradient} from 'expo-linear-gradient';
import * as Linking from 'expo-linking'
import { getStatusBarHeight } from 'react-native-status-bar-height';

import useStyles from '../../theme/styles';
import useTypography from '../../theme/typography';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

import Screen from '@/components/common/Screen';

import { useApp } from '@/context/AppContext';
// import Trending from '../components/lists/Trending';
// import ShortSweet from '../components/lists/ShortSweet';
import ForYouCarousel from '../../components/story/ForYouCarousel';
import HorizontztalList from '../../components/story/HorizontalList';
import ContinueListening from '../../components/story/ContinueListening';
// import NewList from '../components/lists/NewList';

import dummystories from '../../../dummydata/stories';
import dummyProgressStory from '../../../dummydata/dummyProgressStory';
import dummyHorizontalLists from '../../../dummydata/dummyHorizontalLists';


const HomeScreen = ({navigation} : any) => {

    const { userId, isAuthenticated, logout } = useApp();

    const styles = useStyles();
    const typo = useTypography();

    //fetch the stories for a specific genre for promoted carousel      
    const [stories, setStories] = useState(dummystories);
    const [horizontalLists, setHorizontalLists] = useState(dummyHorizontalLists);

    const appState = useRef(AppState.currentState);

    const welcomeText = [
        "Discover a new world",
        "Relax. Have a listen",
        "Greetings, Traveler",
        "Enjoy your storytime",
        "Jump into the rabbit hole",
        "Let the story begin",
        "Find your next escape",
        "Drift into a new tale",
        "Step beyond the page",
        "Step 1: Press play.",
        "Leave here for a while"
    ]

    const [text, setText] = useState('')

    useEffect(() => {

        let txt = welcomeText[getRandomInt(welcomeText.length)]

        function getRandomInt(max : any) {
                return Math.floor(Math.random() * max);
            }
        setText(txt)
    }, [])

    //set the in progress story
    const [progressExists, setProgressExists] = useState(true)

    return (
    <Screen>
        <LinearGradient 
            colors={['#13192Ca5', '#161b1b', '#000000']} 
            style={{flex: 1, minHeight: Dimensions.get('window').height, }} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }}
        >
            <ScrollView style={{ }} showsVerticalScrollIndicator={false} contentContainerStyle={{flexGrow: 1 }} > 
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: getStatusBarHeight() + 20, marginBottom: 10, marginHorizontal: spacing.margin}}>
                  <Text style={[{color: colors.text}, typo.h1]}>
                      {text}
                  </Text>

                  <TouchableWithoutFeedback onPress={() => navigation.navigate('UserScreen')}>
                      <View style={{ paddingLeft: 30, justifyContent: 'center'}}>
                          <FontAwesome
                              name='user'
                              size={20}
                              color='#fff'  
                          />
                      </View>
                  </TouchableWithoutFeedback>
                </View>

                <View >
                    <ForYouCarousel stories={stories} />
                </View>

                <View style={{paddingVertical: 20}}>
                    {progressExists === true ? (
                        <ContinueListening story={dummyProgressStory}/>
                    ) : null}
                </View>

                <View>
                     <View style={{marginLeft: spacing.margin, paddingVertical: spacing.margin}}>
                        <Text style={typo.title}>
                            {horizontalLists[0].title}
                        </Text>
                    </View>
                    <HorizontztalList stories={stories} tagId={horizontalLists[0]?.id} tagName={horizontalLists[0]?.title} />
                </View> 

                <View>
                     <View style={{ marginLeft: spacing.margin, paddingVertical: spacing.margin}}>
                        <Text style={typo.title}>
                            {horizontalLists[1].title}
                        </Text>
                    </View>
                    <HorizontztalList stories={stories} tagId={horizontalLists[1]?.id} tagName={horizontalLists[1]?.title} />
                </View> 

                <View>
                     <View style={{marginLeft: spacing.margin, paddingVertical: spacing.margin}}>
                        <Text style={typo.title}>
                            {horizontalLists[2].title}
                        </Text>
                    </View>
                    <HorizontztalList stories={stories} tagId={horizontalLists[2]?.id} tagName={horizontalLists[2]?.title} />
                </View> 

                 <View>
                     <View style={{marginLeft: spacing.margin, paddingVertical: spacing.margin}}>
                        <Text style={typo.title}>
                            {horizontalLists[3].title}
                        </Text>
                    </View>
                    <HorizontztalList stories={stories} tagId={horizontalLists[3]?.id} tagName={horizontalLists[3]?.title} />
                </View> 
                
                <View style={{height: 300}} />
            </ScrollView>
        </LinearGradient>
    </Screen>
    );
}

export default HomeScreen;