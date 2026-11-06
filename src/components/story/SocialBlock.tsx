import {
    View,
    Dimensions,
    Linking,
    Image,
    TouchableOpacity,
} from 'react-native';
import { radius } from '@/theme/tokens';

const SocialLink = ({ label, url, source, size, round }: { label: string; url: string; source: any; size: number; round?: boolean }) => (
    <TouchableOpacity
        onPress={() => Linking.openURL(url)}
        activeOpacity={0.7}
        accessibilityRole="link"
        accessibilityLabel={label}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        style={{ marginRight: 6, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
    >
        <Image
            accessible={false}
            style={{ height: size, width: size, ...(round ? { borderRadius: radius.lg, overflow: 'hidden' as const } : null) }}
            source={source}
        />
    </TouchableOpacity>
);

const SocialBlock = ({tikTok, website, instagram, reddit, deviantArt, facebook, youTube, email} : any) => {
    return (
        <View style={{width: Dimensions.get('window').width - 80, flexDirection: 'row', alignItems: 'center', marginVertical: 10, flexWrap: 'wrap', justifyContent: 'center'}}>
            {facebook ? (
                <SocialLink label="Author on Facebook" url={facebook} source={require('../../../assets/social/facebook.png')} size={50} />
            ) : null}
            {deviantArt ? (
                <SocialLink label="Author on DeviantArt" url={deviantArt} source={require('../../../assets/social/deviantart.png')} size={40} />
            ) : null}
            {instagram ? (
                <SocialLink label="Author on Instagram" url={instagram} source={require('../../../assets/social/instagram.png')} size={40} />
            ) : null}
            {youTube ? (
                <SocialLink label="Author on YouTube" url={youTube} source={require('../../../assets/social/youtube.png')} size={35} />
            ) : null}
            {tikTok ? (
                <SocialLink label="Author on TikTok" url={tikTok} source={require('../../../assets/social/tiktok.png')} size={34} round />
            ) : null}
            {reddit ? (
                <SocialLink label="Author on Reddit" url={reddit} source={require('../../../assets/social/reddit.png')} size={34} round />
            ) : null}
            {website ? (
                <SocialLink label="Author website" url={website} source={require('../../../assets/social/website.png')} size={36} round />
            ) : null}
            {email ? (
                <SocialLink label="Email the author" url={'mailto:' + email} source={require('../../../assets/social/email.png')} size={36} />
            ) : null}
        </View>
    );
};

export default SocialBlock;
