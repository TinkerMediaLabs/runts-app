import {
    View, 
    TouchableWithoutFeedback,
} from 'react-native';

import { iconSize } from '@/theme/tokens';
import { colors } from '@/theme/colors';
import Icon from '@/components/common/Icon';

const CloseButton = ({navigation} :any) => {

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
                backgroundColor: 'transparent',
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

