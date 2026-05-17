//tile component for the list that shows the progress of the story for the user

import React, {useState, useEffect, useContext} from 'react';
import { 
    View, 
    Text,
    Dimensions,
} from 'react-native';

import Screen from '@/components/common/Screen';

import useStyles from '@/theme/styles';
import useTypography from '@/theme/typography';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

import { useApp } from '@/context/AppContext';
import { usePlayer } from '@/context/PlayerContext';

import StoryTile from './StoryTile';


const ProgressTile  = (item : any) => {

    const {  } = usePlayer();

    const styles = useStyles();
    const typo = useTypography();
    
    const percent = 50; //dummy data for now, will be calculated based on the time listened and total time of the story

    return (
        <View style={styles.container}>
            <StoryTile 
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
            <View style={{width: Dimensions.get('window').width - 50, marginBottom: 20}}>
                <View style={{width: `${percent}%` as `${number}%`, height: 1, backgroundColor: '#00ffff', marginLeft: 26, marginTop: -4, alignSelf: 'flex-start'}}/>
                <View style={{marginHorizontal: 20, marginTop: 6, flexDirection: 'row', justifyContent: 'space-between'}}>
                <Text style={{color: 'gray'}}>
                    {Math.floor((item.duration/item.duration)*100) + '%'} Complete
                </Text>
                <Text style={{color: 'gray', marginRight: -50}}>
                    {Math.floor(((item.duration-item.duration)/60)/1000)} minutes left
                </Text>
            </View>
            </View>
        </View>        
    );
}; export default ProgressTile;