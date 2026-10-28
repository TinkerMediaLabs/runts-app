import React, { forwardRef } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { TextInput } from '@/components/common/AppTextInput';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { fontSizes } from '@/theme/tokens';
import { radius } from '@/theme/tokens';
import { iconSize } from '@/theme/tokens';
import { colors } from '@/theme/colors';

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
        <TouchableOpacity
          onPress={onSubmit}
          style={styles.iconLeft}
          accessibilityRole="button"
          accessibilityLabel="Search"
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        >
          <FontAwesome5 name="search" size={iconSize.sm} color={iconColor} iconStyle="solid" />
        </TouchableOpacity>

        {/* Input */}
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#595959"
          accessibilityLabel={placeholder}
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
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          >
            <FontAwesome5 name="times-circle" size={iconSize.sm} color={iconColor} iconStyle="solid" />
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
    borderRadius: radius.sm,
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
    fontSize: fontSizes.small,
    color: colors.textOnAccent,
    paddingVertical: 0, // prevents weird vertical stretching
  },
});