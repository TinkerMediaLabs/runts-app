import { View } from 'react-native';
import { Text } from '@/components/common/AppText';
import TagPill from '@/components/common/TagPill';

import useStyles from '@/theme/styles';
import { navigate }       from '@/navigation/RootNavigator';
import { collapsePlayer } from '@/features/audio/Playerref';
import { fontSizes } from '@/theme/tokens';
import { colors } from '@/theme/colors';

const BasicTagsList = ({ tags }: any) => {
    const styles = useStyles();

    return (
        <View>
            <Text style={{
                marginTop:    20,
                paddingBottom: 20,
                color:        colors.textPrimary,
                fontSize:     fontSizes.title,
                fontWeight:   'bold',
                borderColor:  '#5f5f5f',
            }}>
                Tags
            </Text>

            <View style={{
                flexDirection: 'row',
                flexWrap:      'wrap',
                justifyContent: 'center',
                marginTop:     20,
            }}>
                {tags?.map((item: any) => (
                    <TagPill
                        key={item.id}
                        name={item.name}
                        erotic={!!item.isErotic}
                        style={{ marginRight: 10, marginTop: 10 }}
                        onPress={() => {
                            collapsePlayer();
                            navigate('TagHomeScreen', { id: item.id, name: item.name });
                        }}
                    />
                ))}
            </View>
        </View>
    );
};

export default BasicTagsList;