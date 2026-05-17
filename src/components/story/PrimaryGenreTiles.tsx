import React, {useState, useEffect} from 'react';

import { 
  StyleSheet, 
  Dimensions, 
  TouchableWithoutFeedback,
  View, 
  Text, 
  FlatList,
  ImageBackground
} 
from 'react-native';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import {LinearGradient} from 'expo-linear-gradient';

import useStyles from '../../theme/styles';
import useTypography from '../../theme/typography';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const GenreTilesList = ({primaryTags, navigation} : any) => {

  const styles = useStyles();
  const typo = useTypography();

  //genre array state
  const [genres, setGenres] = useState(primaryTags);


  //genre tile item should show genre name, color, and image
  const Item = ({name, id, color, imageUri, icon, isPrimary, tileImageUri} : any) => {

      useEffect(() => {
        setImageU(tileImageUri)
    }, [])
  
    const [imageU, setImageU] = useState(tileImageUri);
  
    const localAssets: Record<string, any> = {
      fanfiction: require('../../../assets/images/genres/fanfictionTileImage.jpg'),
      sciencefiction: require('../../../assets/images/genres/scienceFictionTileImage.jpg'),
      dystopian: require('../../../assets/images/genres/dystopianTileImage.png'),
      fantasy: require('../../../assets/images/genres/fantasyTileImage.png'),
    };

    const currentBg: string = tileImageUri ?? '';

  //   useEffect(() => {
  //     const fetchImage = async () => {
  //         let response = await Storage.get(imageUri)
  //         if (response) {
  //             setImageU(response)
  //         }
  //     }
  //     fetchImage();
  // }, [])

    //state that locks the after dark tile
    const [locked, setIsLocked] = useState(false);

    return (
      <TouchableWithoutFeedback 
        //onPress = {() => locked === false ? (name === 'after dark' ? (navigation.navigate('AfterDarkHome', {genreID: id, genreName: name, genreIcon: icon, genreColor: color, genreImage: imageUri})) : (navigation.navigate('GenreHome', {genreID: id, genreName: name, genreIcon: icon, genreColor: color, genreImage: imageUri}))) : alert('Go to your settings to unlock this content.')}
        onPress = {() => navigation.navigate('TagHomeScreen')} >
        <View style={{
          flexDirection: 'row', height: 200, overflow: 'hidden', borderRadius: 15, alignItems: 'center', marginVertical: 10, width: Dimensions.get('window').width-40, alignSelf: 'center'}}>
            {imageU ? (
              <ImageBackground
                // source={{ uri: imageU}}
                source={localAssets[currentBg]}
                style={{borderRadius: 15, width: '100%', height: '100%', position: 'absolute', backgroundColor: 'gray', right: 0}}
              />
            ) : null}

              <LinearGradient 
                colors={['#000000a5', "#000000a5", 'transparent', 'transparent', 'transparent']}
                locations={[0.0, 0.33, 0.66, 0.7, 1.0]}
                start={{ x: 0, y: 1 }}
                end={{ x: 0, y: 0 }}
                style={[styles.genrebox]}
            >
                <View style={{justifyContent: 'flex-end', borderRadius: 15, backgroundColor: locked === true ? '#363636a5' : 'transparent', width: '100%', height: '100%'}}>
                <Text style={[typo.genreTile, {marginBottom: 10}]}>
                    {name}
                </Text>
                {locked === true ? (
                    <FontAwesome5 
                    name='lock'
                    size={20}
                    color='gray'
                    style={{alignSelf: 'center', position: 'absolute'}}
                    iconStyle="solid"
                    />
                ) : null}
                
                </View>
            </LinearGradient>
          </View>
        </TouchableWithoutFeedback>
    );
  }
    
  const renderItem = ({ item, index } : any) => {

    return (
      <Item 
          id={item.id}
          name={item.name}
          color={item.color}
          imageUri={item.imageUri}
          tileImageUri={item.tileImageUri}
          index={index}
          isPrimary={item.isPrimary}
      />
    );
  }


//return the primary genres list
    return (
      <View style={{backgroundColor: 'transparent'}}>
              <View>
                  <FlatList 
                    data={genres}
                    renderItem={({item, index}) => renderItem({item, index})}
                    keyExtractor={item => item.id}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={genres.length}
                    contentContainerStyle={{paddingBottom: 80}}
                    ListHeaderComponent={ () => {

                        return (
                          <View style={{marginTop: 20}}>
                            <Text style={[typo.title, {marginBottom: 10}]}>
                                Genres
                            </Text>
                          </View>   
                        );
                    }}
                />
              </View>
      </View>
    );
}


const styles = StyleSheet.create ({
  title: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 5,
    textTransform: 'capitalize'
},
genre: {
    color: '#000',
    fontSize: 24,
    fontWeight: '900',
    textTransform: 'capitalize',
    paddingHorizontal: 20,
},
box: {
    height: 60,
    width: Dimensions.get('window').width - 40,
    borderRadius: 15,
    marginVertical: 10,
    padding: 10,
    alignItems: 'center',
  },
  tagtext: {
    color: 'cyan',
    fontSize: 14,
    backgroundColor: '#0D2429',
    borderColor: '#008080',
    borderWidth: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
    overflow: 'hidden'
},
  genrebox: {
    height: 100,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
});

export default GenreTilesList;