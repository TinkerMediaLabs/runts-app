import { 
  Dimensions, 
  TouchableWithoutFeedback,
  View, 
  Text, 
} 
from 'react-native';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

import useStyles from '../../theme/styles';
import useTypography from '../../theme/typography';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/types';

const SearchBar = () => {

    const styles = useStyles();
    const typo = useTypography();

    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    

    return (
        <View style={{ marginBottom: 20, marginHorizontal: 20, alignItems: 'center'}}>
            <TouchableWithoutFeedback onPress={() => navigation.navigate('SearchScreen')}>
                <View style={
                    {alignItems: 'center', 
                    paddingHorizontal: 10, 
                    borderRadius: 8, 
                    flexDirection: 'row', 
                    backgroundColor: '#e0e0e0', 
                    height: 40, 
                    width: Dimensions.get('window').width - 40}}
                >
                <FontAwesome5 
                    name='search'
                    color='#000000a5'
                    size={18}
                    iconStyle="solid"
                />
                <Text style={{marginLeft: 20, color: '#000000a5'}}>
                    Search stories, authors, tags
                </Text>
                </View>
            </TouchableWithoutFeedback>
        </View>
    )
}

export default SearchBar;