import React, { forwardRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { TextInput } from '@/components/common/AppTextInput';
import { fontSizes } from '@/theme/tokens';
import { radius } from '@/theme/tokens';
import { iconSize } from '@/theme/tokens';
import { colors } from '@/theme/colors';
import Icon from '@/components/common/Icon';

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
  /** Focus the field as soon as it mounts, natively, without waiting for the screen's other work. */
  autoFocus?: boolean;
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
      iconColor,
      showClear = true,
      autoFocus = false,
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);
    const glyph = iconColor ?? (focused ? colors.accent : colors.inputPlaceholder);
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
          <Icon name="search" size={iconSize.sm} color={glyph} />
        </TouchableOpacity>

        {/* Input */}
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.inputPlaceholder}
          selectionColor={colors.accent}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={placeholder}
          style={[styles.input, inputStyle]}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
          maxLength={maxLength}
          autoFocus={autoFocus}
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
            <Icon name="x-circle" size={iconSize.sm} color={colors.inputPlaceholder} />
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
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
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
    color: colors.inputText,
    paddingVertical: 0, // prevents weird vertical stretching
  },
});