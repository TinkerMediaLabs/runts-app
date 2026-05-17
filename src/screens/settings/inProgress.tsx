//this screen is for users to see the list of stories that they have started but not yet finished

import React, {useState, useEffect, useContext} from 'react';
import { 
    View, 
    Text,
} from 'react-native';

import Screen from '@/components/common/Screen';

import useStyles from '@/theme/styles';
import useTypography from '@/theme/typography';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

import { useApp } from '@/context/AppContext';
import { usePlayer } from '@/context/PlayerContext';

import MenuHeader from '@/components/common/MenuHeader';
import ProgressTileList from '@/components/story/ProgressTileList';



const InProgress = ({navigation} : any) => {

    const { userId, isAuthenticated, logout } = useApp();
    const {  } = usePlayer();

    const styles = useStyles();
    const typo = useTypography();

    return (
        <Screen>
            <View style={styles.container}>
                <MenuHeader title='Actively Listening' navigation={navigation}/>
                <ProgressTileList />
            </View>
            
        </Screen>
        
    );
}; export default InProgress;

