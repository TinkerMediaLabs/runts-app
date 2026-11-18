import { Dimensions, TouchableWithoutFeedback, View } from 'react-native';
import { Text } from '@/components/common/AppText';


import useStyles from '../../theme/styles';
import useTypography from '../../theme/typography';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/types';
import { useTipTarget } from '../../tips/useTipTarget';
import { radius } from '@/theme/tokens';
import Icon from '@/components/common/Icon';

const SearchBar = () => {

    const styles = useStyles();
    const typo = useTypography();

    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const tipRef = useTipTarget('search-bar');
    

    return (
        <View style={{ marginBottom: 20, marginHorizontal: 20, alignItems: 'center'}}>
            <TouchableWithoutFeedback
                onPress={() => navigation.navigate('SearchScreen')}
                accessibilityRole="button"
                accessibilityLabel="Search stories, authors, tags"
                accessibilityHint="Opens search"
            >
                <View ref={tipRef} collapsable={false} style={
                    {alignItems: 'center', 
                    paddingHorizontal: 10, 
                    borderRadius: radius.sm, 
                    flexDirection: 'row', 
                    backgroundColor: '#e0e0e0', 
                    height: 40, 
                    width: Dimensions.get('window').width - 40}}
                >
                <Icon 
                    name="search"
                    color='#000000a5'
                    size={18}
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