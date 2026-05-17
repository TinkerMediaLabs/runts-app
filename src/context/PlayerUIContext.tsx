import React, { createContext, useContext, useState } from 'react';
import { useSharedValue, withSpring} from 'react-native-reanimated';

const PlayerUIContext = createContext<any>(null);

export const PlayerUIProvider = ({ children }: any) => {

    const [tabBarHeight, setTabBarHeight] = useState(0);

    const expanded = useSharedValue(0);

    const expand = () => {
      expanded.value = withSpring(1);
    };

    const collapse = () => {
      expanded.value = withSpring(0);
    };

  return (
    <PlayerUIContext.Provider
      value={{
        expanded,
        expand,
        collapse,
        tabBarHeight,
        setTabBarHeight,
      }}
    >
      {children}
    </PlayerUIContext.Provider>
  );
};

export const usePlayerUI = () => useContext(PlayerUIContext);