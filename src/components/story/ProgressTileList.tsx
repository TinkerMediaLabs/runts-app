import React, {useState, useEffect, useContext} from 'react';
import { 
    View, 
    Text, 
    FlatList, 
    Dimensions, 
    RefreshControl,
    ActivityIndicator 
} from 'react-native';

import ProgressTile from './ProgressTile';

import { useApp } from '@/context/AppContext';
import { usePlayer } from '@/context/PlayerContext';

import useStyles from '@/theme/styles';
import useTypography from '@/theme/typography';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

import stories from '../../../dummydata/stories';

const StoryTileList = () => {

    const {  } = usePlayer();

    const styles = useStyles();
    const typo = useTypography();

    //const { refreshPins } = useContext(AppContext);

    //state for the array of pinned stories for that user
    const [pinnedStories, setPinnedStories] = useState<any[]>(stories)

    //update trigger for fetching the pinned stories
    const [didUpdate, setDidUpdate] = useState(false);

    //refresh state of the flatlist
    const [isFetching, setIsFetching] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const onRefresh = () => {
        setIsFetching(true);
        setDidUpdate(!didUpdate)
        setTimeout(() => {
          setIsFetching(false);
        }, 2000);
      }

      const renderItem = ({ item }: any) => {
        
        return (
            <ProgressTile 
                title={item.title}
                imageUri={item.imageUri}
                primaryTag={item.primaryTag}
                audioUri={item.audioUri}
                summary={item.summary}
                author={item.author}
                description={item.description}
                duration={item.duration}
                id={item.id}
                numListens={item.numListens}
            />
      );}

    return (
            <View style={{width: Dimensions.get('window').width}}>
               
                <FlatList 
                    data={pinnedStories}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    extraData={pinnedStories}
                    maxToRenderPerBatch={100}
                    initialNumToRender={100}
                    refreshControl={
                        <RefreshControl
                        refreshing={isFetching}
                        onRefresh={onRefresh}
                        />
                    }
                    showsVerticalScrollIndicator={false}    
                    ListFooterComponent={ () => {
                        return (
                            <View style={{ height:  100}} />
                    );}}
                    ListEmptyComponent={ () => {
                        return (
                            <View style={{ alignItems: 'center'}}>
                                {isLoading === true ? (
                                <View style={{margin: 30}}>
                                    <ActivityIndicator size='small' color='cyan' />
                                </View>
                                ) : (
                                <View>
                                    <Text style={{ color: 'white', margin: 20,}}>
                                        There is nothing here yet.
                                    </Text>

                                    <Text style={{ textAlign: 'center', color: 'gray', margin: 20,}}>
                                        (pull to refresh)
                                    </Text>
                                </View>
                                )}
                            </View>
                    );}}
                />
            
            </View>
    );
}

export default StoryTileList;