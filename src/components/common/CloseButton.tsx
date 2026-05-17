import {
    View, 
    TouchableWithoutFeedback,
} from 'react-native';

import AntDesign from '@react-native-vector-icons/ant-design';

const CloseButton = ({navigation} :any) => {

    return (
        <TouchableWithoutFeedback onPress={() => {navigation.goBack(); }}>
            <View style={ [{
                flexDirection: 'row',        
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                borderRadius: 50,
                width: 36,
                height: 36,
                marginHorizontal: 10,}]}
            >
                <AntDesign 
                    name='close'
                    size={22}
                    color='#fff'
                />
            </View>
        </TouchableWithoutFeedback>
    );
};

export default CloseButton;

