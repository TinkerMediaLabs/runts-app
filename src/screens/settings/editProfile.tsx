//this is where users can edit and update their user info

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


const EditProfile = () => {

    const { userId, isAuthenticated, logout } = useApp();
    const {  } = usePlayer();

    const styles = useStyles();
    const typo = useTypography();

    return (
        <Screen>
            <View style={styles.container}>
                <MenuHeader title='Edit Profile' navigation={navigation}/>
            </View>
        </Screen>
        
    );
}; export default EditProfile;

