import {
    Dimensions,
    TouchableOpacity,
    View,
    Text,
    FlatList,
} from 'react-native';

import useTypography from '../../theme/typography';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/types';

const PopularTagsList = ({ tags }: { tags: any[] }) => {

    const typo = useTypography();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    const Tag = ({ id, name }: any) => (
        <View style={{ marginTop: 10, marginRight: 8 }}>
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('TagHomeScreen', { id, name })}
            >
                <Text style={tagStyle}>
                    #{name}
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderTag = ({ item }: any) => (
        <Tag id={item.id} name={item.name} />
    );

    return (
        <View style={{ marginTop: 0 }}>
        <View style={{ marginTop: 10 }}>
            <Text style={[typo.title, { marginBottom: 6 }]}>
                Popular Tags
            </Text>
            <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                width: Dimensions.get('window').width - 30,
            }}>
                {tags.map(item => (
                    <Tag key={item.id} id={item.id} name={item.name} />
                ))}
            </View>
        </View>
    </View>
    );
};

const tagStyle = {
    color: 'cyan',
    fontSize: 14,
    backgroundColor: '#0D2429',
    borderColor: '#008080',
    borderWidth: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
    overflow: 'hidden' as const,
};

export default PopularTagsList;