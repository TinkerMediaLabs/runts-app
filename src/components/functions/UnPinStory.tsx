import {graphqlOperation, API, Auth} from 'aws-amplify';
import { getUser } from '../../src/graphql/queries';
import { deletePinnedStory } from '../../src/graphql/mutations';
import { AppContext } from '../../AppContext';
import React, {useState, useEffect, useContext} from 'react';

const unPinStory = async ({storyID} : any) => {

    const { userID } = useContext(AppContext);
    const { userPins } = useContext(AppContext);
    const { setUserPins } = useContext(AppContext);

    const [nextToken, setNextToken] = useState()

    let userInfo = await Auth.currentAuthenticatedUser();

    let getPin = await API.graphql(graphqlOperation(
        getUser, {id: userInfo.attributes.sub}
    ))

    const getThePins = async () => {
        for (let i = 0; i < getPin.data.getUser.Pinned.items.length; i++) {
            if (getPin.data.getUser.Pinned.items[i].storyID === storyID) {
                let deleteConnection = await API.graphql(graphqlOperation(
                    deletePinnedStory, {input: {"id": getPin.data.getUser.Pinned.items[i].id}}
                ))
                console.log(deleteConnection)
            }

            // if (getPin.data.getUser.Pinned.nextToken) {
            //     setNextToken(getPin.data.getUser.Pinned.nextToken);
            //     getThePins();
            //     return;
            // }
        }

            const index = userPins.indexOf(storyID);

            const x = userPins.splice(index, 1);

            setUserPins(x)
    }
    getThePins(); 
}

export default unPinStory;