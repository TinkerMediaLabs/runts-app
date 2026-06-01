import { View, Text } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

import useStyles from '@/theme/styles';
import { navigate } from '@/navigation/RootNavigator';
import { collapsePlayer } from '@/features/audio/Playerref';

const BasicTagsList = ({ tags }: any) => {

    const styles = useStyles();

    return (
        <View>

            <Text style={{
                marginTop: 20,
                paddingBottom: 20,
                color: '#fff',
                fontSize: 20,
                fontWeight: 'bold',
                //borderBottomWidth: 1,
                borderColor: '#5f5f5f',
            }}>
                Tags
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 20 }}>
                {tags?.map((item: any) => (
                    <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.7}
                        onPress={() => {
                            collapsePlayer();
                            navigate('TagHomeScreen', { id: item.id, name: item.name });
                        }}
                        style={{ marginRight: 10, marginTop: 10 }}
                    >
                        <Text style={styles.tagtext}>#{item.name}</Text>
                    </TouchableOpacity>
                ))}
            </View>

        </View>
    );
};

export default BasicTagsList;