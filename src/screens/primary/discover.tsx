import {useState, useEffect, useContext} from 'react';

import { 
  Dimensions, 
  View, 
  ScrollView,
  Platform
} 
from 'react-native';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import {LinearGradient} from 'expo-linear-gradient';
import { getStatusBarHeight } from 'react-native-status-bar-height';

import Screen from '@/components/common/Screen';

import useStyles from '../../theme/styles';
import useTypography from '../../theme/typography';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

import PrimaryGenreTilesList from '../../components/story/PrimaryGenreTiles';
import SearchBar from '../../components/common/SearchBar';
import PopularTagsList from '../../components/story/PopularTagsList';
import LoadingItem from '../../components/common/LoadingItem';

import dummytags from '../../../dummydata/dummytags'

import { useApp } from '@/context/AppContext';
import { usePlayer } from '@/context/PlayerContext';


const BrowseScreen = ({navigation} : any) => {

  const { userId, isAuthenticated, logout } = useApp();

  const styles = useStyles();
  const typo = useTypography();

  const screen_width = Dimensions.get('window').width

  //genre array state
  const [genres, setGenres] = useState(dummytags);
    
  //popular tags list data set
  const [tags, setTags] = useState(dummytags);

//return the primary function
    return (
      <Screen>
        <View style={{flex: 1}}>
          <LinearGradient 
            style={{height: Platform.OS === 'android' ? Dimensions.get('window').height - getStatusBarHeight() : Dimensions.get('window').height}}
            colors={['#13192Ca5', '#161616', '#000000', '#000000']} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: getStatusBarHeight() + 30, marginBottom: 0, marginHorizontal: 20}}/ >
          
              <SearchBar />

              {tags.length > 0 ? (
                <View style={{marginHorizontal: spacing.margin}}>
                  <PopularTagsList tags={dummytags}/>
                </View>
              ) : (
                <View style={{marginLeft: spacing.margin, marginBottom: spacing.margin}}>
                  <View style={{flexDirection: 'row'}}>
                    <LoadingItem width={80} height={40} radius={15}/>
                    <LoadingItem width={80} height={40} radius={15}/>
                </View>
                <View style={{flexDirection: 'row'}}>
                  <LoadingItem width={80} height={40} radius={15}/>
                  <LoadingItem width={80} height={40} radius={15}/>
                </View>
                </View>
              )}
            
              <View style={{ marginHorizontal: spacing.margin }}>
                <View>
                  {genres.length > 0 ? (
                    <PrimaryGenreTilesList primaryTags={dummytags} navigation={navigation} />
                  ) : (
                    <View style={{alignItems: 'center'}}>
                      <LoadingItem width={screen_width - 40} height={100} radius={15}/>
                      <LoadingItem width={screen_width - 40} height={100} radius={15}/>
                      <LoadingItem width={screen_width - 40} height={100} radius={15}/>
                    </View>
                  )}
                </View>
              </View>

              <View style={{height:100}}/>

            </ScrollView>
          </LinearGradient>
        </View>
      </Screen>
    );
};

export default BrowseScreen;