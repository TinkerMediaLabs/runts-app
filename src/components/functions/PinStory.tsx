import {graphqlOperation, API, Auth} from 'aws-amplify';
import { createPinnedStory } from '../../src/graphql/mutations';
import { AppContext } from '../../AppContext';
import React, {useState, useEffect, useContext} from 'react';

const PinStory = async ({storyID} : any) => {

    const { userPins } = useContext(AppContext);
    const { setUserPins } = useContext(AppContext);

    let userInfo = await Auth.currentAuthenticatedUser();

    let pins = userPins

    let createPin = await API.graphql(graphqlOperation(
        createPinnedStory, {input: {
            userID: userInfo.attributes.sub, 
            storyID: storyID,
            type: "PinnedStory",
            createdAt: new Date(),
        }}
    ))
    console.log(createPin)

    pins.push(storyID);
    setUserPins(pins)

}

export default PinStory;