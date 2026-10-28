import React, {useContext, useEffect} from 'react';
import {Dimensions, Platform, StyleSheet} from 'react-native';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import { radius } from '@/theme/tokens';

const SCREEN_WIDTH = Dimensions.get('window').width
const SCREEN_HEIGHT = Dimensions.get('window').height


function useTypography() {

  //const { theme } = useContext(AppContext);

return StyleSheet.create ({
  
    container: {
        flex: 1,
        backgroundColor:  colors.surface0,
      },
      h1: {
        fontSize: fontSizes.headline,
        fontWeight: '600',
        color: colors.textPrimary,
      },
      title: {
        fontSize: fontSizes.subtitle,
        fontWeight: 'bold',
        color: colors.textPrimary,
      },
      genreTile: {
          color: colors.textSecondary,
          fontSize: fontSizes.display,
          fontWeight: '900',
          textTransform: 'capitalize',
          paddingHorizontal: 20,
      },
      largetitle: {
        textAlign: 'center', 
        color: colors.textPrimary, 
        fontSize: fontSizes.display, 
        fontWeight: 'bold'
      },
      premiumtile: {
        fontWeight: 'bold', 
        fontSize: fontSizes.body,
      },
      premiumprice: {
        fontSize: fontSizes.caption, 
        fontWeight: 'bold',
      },
      premiumtotalprice: {
        fontSize: fontSizes.title, 
        fontWeight: 'bold',
      },
      //settings styles
      menuheader: {
        color: colors.textPrimary,
        fontSize: fontSizes.title,
        fontWeight: 'bold',
        marginHorizontal: 40,
        marginVertical: 20,
        textTransform: 'capitalize'
    },
    infotext: {
        fontSize: fontSizes.small,
        color: colors.textSecondary,
      },
    accounttitle: {
        fontSize: fontSizes.body,
        fontWeight: 'bold',
        color: colors.textPrimary,
      },








    
      subtitle: {
        fontSize: fontSizes.body,
        fontWeight: 'bold',
        color: colors.textPrimary,
      },
      // infotext: {
      //   fontSize: fontSizes.small,
      //   color: colors.textSecondary,
      // },
    paragraph: {
      fontSize: fontSizes.small,
      color: colors.textPrimary,
    },
    subtext: {
      fontSize: fontSizes.caption,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    itemtext: {
      marginLeft: 30,
      fontSize: fontSizes.body,
      fontWeight: '400',
      color: colors.textPrimary,
    },
    textInputTitle: {
      color: colors.textPrimary,
      fontWeight: 'normal',
    },
    inputfield: {
        width: SCREEN_WIDTH - 40,
        height: 40,
        backgroundColor: colors.surface3,
        padding: 10,
        borderRadius: radius.md,
        alignSelf: 'center',
        overflow: 'hidden',
    },
    inputtitle: {
      color: colors.textPrimary,
      fontSize: fontSizes.subtitle,
      fontWeight: '600'
    },
    buttonlayout: {
        backgroundColor: colors.accent,
        borderRadius: radius.xl,
        paddingVertical: 10,
        paddingHorizontal: 30,
        overflow: 'hidden',
        width: Dimensions.get('window').width*0.8,
        alignItems: 'center'
    },
    buttontext: {
      fontSize: fontSizes.body,
      fontWeight: '600',
      color: colors.textOnAccent,
      textAlign: 'center'
    },
    optionsitem: {
      flexDirection: 'row', 
      justifyContent: 'space-between',
      marginLeft: 40,
      marginRight: 40,
      marginBottom: 30,
  },
  timeselect: {
    fontSize: fontSizes.subtitle,
    fontWeight: '600',
    color: colors.textOnAccent,
  },
  settingsitem: {
    fontSize: fontSizes.body,
    color: colors.textPrimary,
  },
  tagtext: {
    color: colors.accent,
    fontSize: fontSizes.small,
    backgroundColor: '#1A4851a5',
    borderColor: colors.accentSoft,
    borderWidth: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: radius.md,
    textTransform: 'lowercase',
    overflow: 'hidden',
    marginBottom: 1
},
erotictagtext: {
  color: 'magenta',
  fontSize: fontSizes.small,
  backgroundColor: '#3C1A41a5',
  borderColor: '#ff00ffa5',
  borderWidth: 0.5,
  paddingHorizontal: 16,
  paddingVertical: 6,
  borderRadius: radius.md,
  textTransform: 'lowercase',
  overflow: 'hidden',
  marginBottom: 1
},
accountcontainer: {
  width: '100%',
  paddingHorizontal: 20,
  paddingVertical: 16,
},
socialbuttontext: {
      fontSize: fontSizes.body,
      fontWeight: '500',
      color: colors.textPrimary,
      textAlign: 'center',
      paddingRight: 20,
      paddingLeft: 18
},
socialbuttonlayout: {
  backgroundColor: colors.surface3, 
  borderRadius: radius.xl, 
  overflow: 'hidden', 
  alignSelf: 'center', 
  flexDirection: 'row', 
  alignItems: 'center',
  width: Dimensions.get('window').width*0.8,
  paddingHorizontal: 10,
  paddingVertical: 8,
}
});
}

// const styles = StyleSheet.create ({
  
//     container: {
//         flex: 1,
//         backgroundColor: theme === true ? '#000' : '#fff',
//         alignItems: 'center',
//         width: SCREEN_WIDTH,
//         height: SCREEN_HEIGHT,
//       },
//     title: {
//         fontSize: fontSizes.subtitle,
//         fontWeight: 'bold',
//         color: colors.textOnAccent,
//       },
//       infotext: {
//         fontSize: fontSizes.small,
//         color: '#000000a5',
//       },
//     paragraph: {
//       fontSize: fontSizes.small,
//       color: colors.textOnAccent,
//     },
//     subtext: {
//       fontSize: fontSizes.caption,
//       fontWeight: '600',
//       color: '#000000a5',
//     },
//     itemtext: {
//       marginLeft: 30,
//         fontSize: fontSizes.body,
//         fontWeight: '700'
//     },
//     textInputTitle: {
//       color: colors.textPrimary,
//       fontWeight: 'normal',
//     },
//     inputfield: {
//         width: SCREEN_WIDTH - 40,
//         height: 40,
//         backgroundColor: colors.surface3,
//         padding: 10,
//         borderRadius: radius.md,
//         alignSelf: 'center',
//     },
//     inputtitle: {
//       color: colors.textPrimary,
//       fontSize: fontSizes.subtitle,
//       fontWeight: '600'
//     },
//     buttonlayout: {
//         backgroundColor: 'maroon',
//         borderRadius: radius.xl,
//         paddingVertical: 10,
//         paddingHorizontal: 30,
//         overflow: 'hidden',
//     },
//     buttontext: {
//       fontSize: fontSizes.body,
//       fontWeight: '800',
//       color: colors.textPrimary,
//       textAlign: 'center'
//     },
//     optionsitem: {
//       flexDirection: 'row', 
//       justifyContent: 'space-between',
//       marginLeft: 40,
//       marginRight: 40,
//       marginBottom: 30,
//   },
//   timeselect: {
//     fontSize: fontSizes.subtitle,
//     fontWeight: '600',
//   },
// });

//const styles = useTypography()

//export { styles }

export default useTypography;