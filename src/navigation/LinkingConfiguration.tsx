import * as Linking from 'expo-linking';


export default {
  
  prefixes: [Linking.createURL('/')],
  config: {
    screens: {
      Root: {
        screens: {
          Home: {
            screens: {
              HomeScreen: 'Home',
            },
          },
          Stories: {
            screens: {
              DiscoverScreen: 'StoriesScreen',
            },
          },
          Playlist: {
            screens: {
              PlaylistScreen: 'three',
            },
          },
          
        },
      },
      DiscoverScreen: {
        path: 'discoverscreen/ : id?',
        //path: 'storyscreen/:id?',
        parse: {
          id: (id: String) => `${id}`,
        },
    },
  },
},
async getInitialURL() {
  // variable for url
let deepLink
  // Check if app was opened from a deep link
  deepLink = await Linking.getInitialURL()
  // Don't handle it now - wait until Navigation is ready
  console.log('DeepLink URL:', deepLink)
},
};