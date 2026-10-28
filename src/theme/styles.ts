import React, {useContext, useEffect} from 'react';
import {Dimensions, Platform, StyleSheet} from 'react-native';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import { radius } from '@/theme/tokens';

const SCREEN_WIDTH = Dimensions.get('window').width
const SCREEN_HEIGHT = Dimensions.get('window').height


function useStyles() {

  //const { theme } = useContext(AppContext);

return StyleSheet.create ({
  
    //global app styles
    container: {
        flex: 1,
        backgroundColor:  colors.surface0,
      },
    title: {
        fontSize: fontSizes.subtitle,
        fontWeight: 'bold',
        color: colors.textPrimary,
      },
      subtitle: {
        fontSize: fontSizes.body,
        fontWeight: 'bold',
        color: colors.textPrimary,
      },

      //for you carousel styles
      carouselcontainer: {
        width: Dimensions.get('window').width*0.9,
        alignSelf: 'center',
      },
      carouseltitle: {
        fontSize: fontSizes.body,
        fontWeight: '600',
        color: colors.textPrimary,
        flexWrap: 'wrap',
        width: 275, 
      },
      carouselauthor: {
        fontSize: fontSizes.small,
        color: colors.textSecondary,
        textTransform: 'capitalize'
      },

      //horizontal list tile
      horizontaltitle: {
        color: colors.textPrimary, 
        fontSize: fontSizes.small, 
        fontWeight: '600'
      },
      horizontalGenreText: {
        fontSize: fontSizes.small, 
        color: colors.textPrimary, 
        textTransform: 'capitalize'
      },
      tilesubtext: {
        fontSize: fontSizes.small, 
        color: colors.textSecondary, 
        textTransform: 'capitalize'
      },

      //progres tile (continue listening)
      progresstitle: {
        color: colors.textPrimary, 
        fontWeight: 'bold', 
        fontSize: fontSizes.body, 
        width: '90%'
      },
      progressauthor: {
        color: 'gray', 
        textTransform: 'capitalize', 
        fontSize: fontSizes.micro
      },
      progresstimeleft: {
        color: colors.textPrimary, 
        fontSize: fontSizes.micro,
      },

      //story details
      headertext: {
        width: '70%', 
        fontSize: fontSizes.subtitle, 
        color: colors.textPrimary, 
        fontWeight: 'bold', 
      },
      storydetailstitle: {
        color: colors.textPrimary,
        fontSize: fontSizes.title,
        fontWeight: 'bold',
        textAlign: 'center',
      },
      storydetailsauthor: {
        color: '#ffffffCC',
        fontSize: fontSizes.small,
        textTransform: 'capitalize'
      },
      storydetailsicon: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        marginRight: 30,
      },
      storydetailsp: {
        textAlign: 'center', 
        color: colors.textPrimary, 
        fontSize: fontSizes.small
      },
      storydetailsgenre: {
        fontSize: fontSizes.body, 
        textTransform: 'capitalize', 
        textAlign: 'center', 
        color: colors.textSecondary
      },

      //author details
      authorname: {
          fontSize: fontSizes.body,
          fontWeight: 'bold',
          color: colors.textPrimary,
          textTransform: 'capitalize'
      },

      //story list tile styles
      tile: {
        backgroundColor: '#202020a5',
        marginHorizontal: 8,
        marginVertical: 5,
        paddingVertical: 10,
        paddingHorizontal: 14, 
        borderRadius: radius.lg,
      },
      tiletitle: {
        fontSize: fontSizes.body,
        fontWeight: '500',
        color: colors.textPrimary,
        flexWrap: 'wrap',
        width: 225,
    },
    tileauthor: {
        fontSize: fontSizes.caption,
        color: colors.textSecondary,
        marginRight: 15,
        marginLeft: 5,
        textTransform: 'capitalize'
    },
      







      infotext: {
        fontSize: fontSizes.small,
        color: colors.textSecondary,
      },
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
    },
    inputfield: {
        width: SCREEN_WIDTH - 40,
        height: 40,
        backgroundColor: colors.surface3,
        padding: 10,
        borderRadius: radius.md,
        alignSelf: 'center',
        //overflow: 'hidden',
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
    marginBottom: 1,
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
},
  genrebox: {
    height: 200,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
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

//const styles = useStyles()

//export { styles }

export default useStyles