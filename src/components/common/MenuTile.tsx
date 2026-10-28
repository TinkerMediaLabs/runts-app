import { View, TouchableWithoutFeedback } from 'react-native';
import { Text } from '@/components/common/AppText';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

import useStyles from '../../theme/styles';
import useTypography from '../../theme/typography';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { fontSizes } from '@/theme/tokens';
import { iconSize } from '@/theme/tokens';

const MenuTile = ({title, onPress} : any) => {

    const styles = useStyles();
    const typo = useTypography();

    return (
        <TouchableWithoutFeedback onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 40, marginVertical: 20}}>
                <Text style={{ color: colors.textPrimary, fontSize: fontSizes.body}}>
                    {title}
                </Text>
                <FontAwesome5 
                    name='chevron-right'
                    color={colors.textPrimary}
                    size={iconSize.sm}
                    iconStyle="solid"
                />
            </View>
        </TouchableWithoutFeedback>
    );
};

export default MenuTile;