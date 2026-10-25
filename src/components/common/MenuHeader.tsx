import { View, TouchableWithoutFeedback } from 'react-native';
import { Text } from '@/components/common/AppText';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

import useStyles from '../../theme/styles';
import useTypography from '../../theme/typography';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const MenuHeader = ({title, navigation} : any) => {

    const styles = useStyles();
    const typo = useTypography();

    return (
        <View style={{ flexDirection: 'row', marginTop: 30, marginLeft: 20, alignItems: 'center'}}>
            <TouchableWithoutFeedback hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
                <View style={{padding: 30, margin: -30}}>
                    <FontAwesome5 
                        name='chevron-left'
                        color='#fff'
                        size={20}
                        iconStyle="solid"
                    />
                </View>
            </TouchableWithoutFeedback>
            <Text style={typo.menuheader}>
                {title}
            </Text>
        </View>
    );
};

export default MenuHeader;