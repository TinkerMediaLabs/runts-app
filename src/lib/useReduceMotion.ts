import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// True when the phone's "Reduce Motion" accessibility setting is on. Reanimated animations already
// follow that setting by default; use this for plain React Native Animated code and custom motion.
export function useReduceMotion(): boolean {
    const [reduce, setReduce] = useState(false);

    useEffect(() => {
        let mounted = true;
        AccessibilityInfo.isReduceMotionEnabled()
            .then(value => { if (mounted) setReduce(value); })
            .catch(() => {});
        const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
        return () => {
            mounted = false;
            sub.remove();
        };
    }, []);

    return reduce;
}
