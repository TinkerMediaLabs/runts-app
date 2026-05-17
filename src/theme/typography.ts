import React, {useContext, useEffect} from 'react';
import {Dimensions, Platform, StyleSheet} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width
const SCREEN_HEIGHT = Dimensions.get('window').height


function useTypography() {

  //const { theme } = useContext(AppContext);

return StyleSheet.create ({
  
    container: {
        flex: 1,
        backgroundColor:  '#000',
      },
      h1: {
        fontSize: 24,
        fontWeight: '600',
        color: '#fff',
      },
      title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
      },
      genreTile: {
          color: '#ffffffa5',
          fontSize: 30,
          fontWeight: '900',
          textTransform: 'capitalize',
          paddingHorizontal: 20,
      },
      largetitle: {
        textAlign: 'center', 
        color: '#fff', 
        fontSize: 32, 
        fontWeight: 'bold'
      },
      premiumtile: {
        fontWeight: 'bold', 
        fontSize: 15,
      },
      premiumprice: {
        fontSize: 12, 
        fontWeight: 'bold',
      },
      premiumtotalprice: {
        fontSize: 20, 
        fontWeight: 'bold',
      },
      //settings styles
      menuheader: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
        marginHorizontal: 40,
        marginVertical: 20,
        textTransform: 'capitalize'
    },
    infotext: {
        fontSize: 14,
        color: '#ffffffa5',
      },
    accounttitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
      },








    
      subtitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
      },
      infotext: {
        fontSize: 14,
        color: '#ffffffa5',
      },
    paragraph: {
      fontSize: 14,
      color: '#fff',
    },
    subtext: {
      fontSize: 12,
      fontWeight: '600',
      color: '#ffffffa5',
    },
    itemtext: {
      marginLeft: 30,
      fontSize: 16,
      fontWeight: '400',
      color: '#fff',
    },
    textInputTitle: {
      color: '#fff',
      fontWeight: 'normal',
    },
    inputfield: {
        width: SCREEN_WIDTH - 40,
        height: 40,
        backgroundColor: '#363636',
        padding: 10,
        borderRadius: 10,
        alignSelf: 'center',
        overflow: 'hidden',
    },
    inputtitle: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '600'
    },
    buttonlayout: {
        backgroundColor: '#00FFFF',
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 30,
        overflow: 'hidden',
        width: Dimensions.get('window').width*0.8,
        alignItems: 'center'
    },
    buttontext: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  settingsitem: {
    fontSize: 16,
    color: '#fff',
  },
  tagtext: {
    color: 'cyan',
    fontSize: 14,
    backgroundColor: '#1A4851a5',
    borderColor: '#00ffffa5',
    borderWidth: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 13,
    textTransform: 'lowercase',
    overflow: 'hidden',
    marginBottom: 1
},
erotictagtext: {
  color: 'magenta',
  fontSize: 14,
  backgroundColor: '#3C1A41a5',
  borderColor: '#ff00ffa5',
  borderWidth: 0.5,
  paddingHorizontal: 16,
  paddingVertical: 6,
  borderRadius: 13,
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
      fontSize: 16,
      fontWeight: '500',
      color: '#fff',
      textAlign: 'center',
      paddingRight: 20,
      paddingLeft: 18
},
socialbuttonlayout: {
  backgroundColor: '#363636', 
  borderRadius: 24, 
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
//         fontSize: 18,
//         fontWeight: 'bold',
//         color: '#000',
//       },
//       infotext: {
//         fontSize: 14,
//         color: '#000000a5',
//       },
//     paragraph: {
//       fontSize: 14,
//       color: '#000',
//     },
//     subtext: {
//       fontSize: 12,
//       fontWeight: '600',
//       color: '#000000a5',
//     },
//     itemtext: {
//       marginLeft: 30,
//         fontSize: 16,
//         fontWeight: '700'
//     },
//     textInputTitle: {
//       color: '#fff',
//       fontWeight: 'normal',
//     },
//     inputfield: {
//         width: SCREEN_WIDTH - 40,
//         height: 40,
//         backgroundColor: '#363636',
//         padding: 10,
//         borderRadius: 10,
//         alignSelf: 'center',
//     },
//     inputtitle: {
//       color: '#fff',
//       fontSize: 18,
//       fontWeight: '600'
//     },
//     buttonlayout: {
//         backgroundColor: 'maroon',
//         borderRadius: 20,
//         paddingVertical: 10,
//         paddingHorizontal: 30,
//         overflow: 'hidden',
//     },
//     buttontext: {
//       fontSize: 16,
//       fontWeight: '800',
//       color: '#fff',
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
//     fontSize: 18,
//     fontWeight: '600',
//   },
// });

//const styles = useTypography()

//export { styles }

export default useTypography;