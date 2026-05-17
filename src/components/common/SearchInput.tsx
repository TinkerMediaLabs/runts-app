import React, { forwardRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

type SearchInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  maxLength?: number;
  style?: any;
  inputStyle?: any;
  iconColor?: string;
  showClear?: boolean;
};

const SearchBar = forwardRef<TextInput, SearchInputProps>(
  (
    {
      value,
      onChangeText,
      onSubmit,
      placeholder = 'Search',
      maxLength = 20,
      style,
      inputStyle,
      iconColor = '#000000a5',
      showClear = true,
    },
    ref
  ) => {
    return (
      <View style={[styles.container, style]}>
        {/* Left Icon */}
        <TouchableOpacity onPress={onSubmit} style={styles.iconLeft}>
          <FontAwesome5 name="search" size={16} color={iconColor} />
        </TouchableOpacity>

        {/* Input */}
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={iconColor}
          style={[styles.input, inputStyle]}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
          maxLength={maxLength}
        />

        {/* Clear Button */}
        {showClear && value?.length > 0 && (
          <TouchableOpacity
            onPress={() => onChangeText('')}
            style={styles.iconRight}
          >
            <FontAwesome5 name="times-circle" size={16} color={iconColor} />
          </TouchableOpacity>
        )}
      </View>
    );
  }
);

export default SearchBar;

const styles = StyleSheet.create({
  container: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  iconLeft: {
    marginRight: 6,
  },
  iconRight: {
    marginLeft: 6,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    paddingVertical: 0, // prevents weird vertical stretching
  },
});