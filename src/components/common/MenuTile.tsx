import { View, TouchableWithoutFeedback } from 'react-native';
import { Text } from '@/components/common/AppText';


import useStyles from '../../theme/styles';
import useTypography from '../../theme/typography';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { fontSizes } from '@/theme/tokens';
import { iconSize } from '@/theme/tokens';
import Icon from '@/components/common/Icon';

const MenuTile = ({title, onPress} : any) => {

    const styles = useStyles();
    const typo = useTypography();

    return (
        <TouchableWithoutFeedback onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 40, marginVertical: 20}}>
                <Text style={{ color: colors.textPrimary, fontSize: fontSizes.body}}>
                    {title}
                </Text>
                <Icon 
                    name="chevron-right"
                    color={colors.textPrimary}
                    size={iconSize.sm}
                />
            </View>
        </TouchableWithoutFeedback>
    );
};

export default MenuTile;