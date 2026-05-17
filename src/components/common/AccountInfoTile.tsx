import { 
    View, 
    Text, 
    TouchableWithoutFeedback,  
} from 'react-native';

import useStyles from '../../theme/styles';
import useTypography from '../../theme/typography';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const AccountInfoTile = ({title, detail, onPress} : any) => {

    const styles = useStyles();
    const typo = useTypography();

    return (
        <TouchableWithoutFeedback onPress={onPress}>
            <View style={{  width: '100%', paddingHorizontal: 40, paddingVertical: 20,} }> 
                <Text style={ [typo.accounttitle, {textTransform: 'capitalize'}] }>{title}</Text>
                <Text style={ [typo.infotext, {textTransform: 'capitalize'}] }>{detail}</Text>
            </View>
        </TouchableWithoutFeedback>
    );
};

export default AccountInfoTile;