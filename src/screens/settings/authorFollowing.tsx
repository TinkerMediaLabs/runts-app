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

import MenuHeader from '../../components/common/MenuHeader';


const AuthorFollowing = ({navigation} : any) => {

    const { userId, isAuthenticated, logout } = useApp();
    const {  } = usePlayer();

    const styles = useStyles();
    const typo = useTypography();

    return (
        <Screen>
            <View style={styles.container}>
                <MenuHeader title='Following' navigation={navigation}/>
            </View>
        </Screen>
        
    );
}; export default AuthorFollowing;
//this is a screen where users can see the authors they are following and unfollow them if they want to
