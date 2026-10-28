import {
    View, 
    TouchableWithoutFeedback,
} from 'react-native';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { iconSize } from '@/theme/tokens';
import { colors } from '@/theme/colors';

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
                <FontAwesome5 name="times" size={iconSize.md} color={colors.textPrimary} iconStyle="solid" />
            </View>
        </TouchableWithoutFeedback>
    );
};

export default CloseButton;

