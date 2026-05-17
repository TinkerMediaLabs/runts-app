import { 
    View, 
    Text, 
    TouchableWithoutFeedback,  
} from 'react-native';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

import useStyles from '../../theme/styles';
import useTypography from '../../theme/typography';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const MenuTile = ({title, onPress} : any) => {

    const styles = useStyles();
    const typo = useTypography();

    return (
        <TouchableWithoutFeedback onPress={onPress}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 40, marginVertical: 20}}>
                <Text style={{ color: '#fff', fontSize: 16}}>
                    {title}
                </Text>
                <FontAwesome5 
                    name='chevron-right'
                    color='#fff'
                    size={15}
                    iconStyle="solid"
                />
            </View>
        </TouchableWithoutFeedback>
    );
};

export default MenuTile;