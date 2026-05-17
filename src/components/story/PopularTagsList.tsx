import { 
  Dimensions, 
  TouchableOpacity, 
  View, 
  Text, 
  FlatList,
} 
from 'react-native';

import useStyles from '../../theme/styles';
import useTypography from '../../theme/typography';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/types';

const PopularTagsList = ({tags} : {tags: any[]}) => {

    const styles = useStyles();
    const typo = useTypography();

    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();


//tag item
  const Tag = ({id, name}: any) => {
    return (
      <View style={{marginTop: 14}}>
        <TouchableOpacity onPress={() => navigation.navigate('TagHomeScreen', {id: id, name: name})}>
            <View style={{marginRight: 10}}>
                <Text style={styles.tagtext}>
                    #{name}
                </Text>
            </View>
        </TouchableOpacity>
      </View>
    )
  }

  //render the tag item for flatlist
  const renderTag = ({ item } : any) => (
    <Tag 
        id={item.id}
        name={item.name}
    />
  );

    return (
       <View style={{ marginTop: 0}}>
            <View style={{marginTop: 10}}>
                <Text style={[typo.title, {marginBottom: 10}]}>
                    Popular Tags
                </Text>
                <View>
                <FlatList 
                    data={tags}
                    renderItem={renderTag}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    maxToRenderPerBatch={15}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        width: Dimensions.get('window').width - 30,
                    }}
                />
                </View>
            </View>
            
        </View>  
    )
}



export default PopularTagsList;