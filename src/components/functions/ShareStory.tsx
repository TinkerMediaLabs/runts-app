import React, {useState, useEffect, useRef, useContext} from 'react';
import * as Linking from 'expo-linking';
import {
    Share
} from 'react-native';

const handleShareWithLinking = async ({id, title}: any) => {

    //let deepUri = Linking.createURL('twisp.space/storyscreen/', { queryParams: {id: id } } ) 
    
    let deeperUri = 'https://tinkermedia.net/runts/storyscreen/?id=' + id.toString();

    try {
      const result = await Share.share({
        message: deeperUri,
        url: deeperUri,
        title: 'Check out this short story on Twisp! ' + title
      });
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // shared with activity type of result.activityType
        } else {
          // shared
        }
      } else if (result.action === Share.dismissedAction) {
        // dismissed
      }
    } catch (error) {
      //alert(error.message);
    }
}

export default handleShareWithLinking;