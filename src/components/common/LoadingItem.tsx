import { 
  View, 
} 
from 'react-native';

import AnimatedGradient, {presetColors} from '../functions/AnimatedGradient';

const LoadingItem = ({width, height, radius} : any) => {

    return (
        <View style={{
            width: width,
            height: height,
            borderRadius: radius,
            margin: 10
        }}>
            <AnimatedGradient customColors={presetColors.loading} speed={2000} />
        </View>
    )
};

export default LoadingItem;