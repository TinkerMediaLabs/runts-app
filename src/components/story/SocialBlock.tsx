import {
    View,  
    Dimensions,
    Linking,
    Image,
    TouchableWithoutFeedback,
} from 'react-native';

const SocialBlock = ({tikTok, website, instagram, reddit, deviantArt, facebook, youTube, email} : any) => {

    return (
        <View style={{width: Dimensions.get('window').width - 80, flexDirection: 'row', alignItems: 'center', marginVertical: 10, flexWrap: 'wrap', justifyContent: 'center'}}>

            {facebook ? (
                <TouchableWithoutFeedback onPress={() => Linking.openURL(facebook)}>
                    <Image 
                        style={{height: 50, width: 50}}
                        source={require('../../../assets/social/facebook.png')}
                    />
                </TouchableWithoutFeedback> 
            ) : null}
            
            {deviantArt ? (
                <TouchableWithoutFeedback onPress={() => Linking.openURL(deviantArt)}>
                    <Image 
                        style={{height: 40, width: 40, marginRight: 4}}
                        source={require('../../../assets/social/deviantart.png')}
                    />
                </TouchableWithoutFeedback>
            ) : null}
            
            {instagram ? (
                <TouchableWithoutFeedback onPress={() => Linking.openURL(instagram)}>
                    <Image 
                        style={{height: 40, width: 40, marginRight: 6}}
                        source={require('../../../assets/social/instagram.png')}
                    />
                </TouchableWithoutFeedback>
            ) : null}

            {youTube ? (
                <TouchableWithoutFeedback onPress={() => Linking.openURL(youTube)}>
                    <Image 
                        style={{height: 35, width: 35, marginRight: 6}}
                        source={require('../../../assets/social/youtube.png')}
                    /> 
                </TouchableWithoutFeedback>
            ) : null}
            
            {tikTok ? (
                <TouchableWithoutFeedback onPress={() => Linking.openURL(tikTok)}>
                    <Image 
                        style={{height: 34, width: 34, borderRadius: 16, overflow: 'hidden', marginRight: 6}}
                        source={require('../../../assets/social/tiktok.png')}
                    />
                </TouchableWithoutFeedback>
            ) : null}

            {reddit ? (
                <TouchableWithoutFeedback onPress={() => Linking.openURL(reddit)}>
                    <Image 
                        style={{height: 34, width: 34, borderRadius: 16, overflow: 'hidden', marginRight: 6}}
                        source={require('../../../assets/social/reddit.png')}
                    />
                </TouchableWithoutFeedback>
            ) : null}

            {website ? (
                <TouchableWithoutFeedback onPress={() => Linking.openURL(website)}>
                    <Image 
                        style={{height: 36, width: 36, borderRadius: 16, overflow: 'hidden', marginRight: 6}}
                        source={require('../../../assets/social/website.png')}
                    />
                </TouchableWithoutFeedback>
            ) : null}
            
            {email ? (
                <TouchableWithoutFeedback onPress={() => Linking.openURL('mailto:' + email)}>
                    <Image 
                        style={{height: 36, width: 36}}
                        source={require('../../../assets/social/email.png')}
                    />
                </TouchableWithoutFeedback>
            ) : null}
            
        </View>
    )
}

export default SocialBlock;