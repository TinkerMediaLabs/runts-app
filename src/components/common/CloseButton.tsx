import {
    View, 
    TouchableWithoutFeedback,
} from 'react-native';

import { iconSize } from '@/theme/tokens';
import { colors } from '@/theme/colors';
import Icon from '@/components/common/Icon';

// backdrop: a dark round backing so the icon stays visible over artwork (story pages).
const CloseButton = ({navigation, backdrop = false} :any) => {

    return (
        <TouchableWithoutFeedback
            onPress={() => {navigation.goBack(); }}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        >
            <View style={ [{
                flexDirection: 'row',        
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: backdrop ? 'rgba(0,0,0,0.6)' : 'transparent',
                borderRadius: 50,
                width: 36,
                height: 36,
                marginHorizontal: 10,}]}
            >
                <Icon name="close" size={iconSize.md} color={colors.textPrimary} />
            </View>
        </TouchableWithoutFeedback>
    );
};

export default CloseButton;

