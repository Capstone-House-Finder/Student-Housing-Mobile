import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View, Pressable } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Layout } from '@/constants/layout';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  showPasswordToggle?: boolean;
}

export function Input({ label, error, value, onFocus, onBlur, secureTextEntry, showPasswordToggle, ...props }: InputProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(Boolean(secureTextEntry));

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSecure(Boolean(secureTextEntry));
    }, 0);
    return () => clearTimeout(timer);
  }, [secureTextEntry]);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: isFocused ? colors.text : colors.subtext }]}> 
        {label}
      </Text>
      <View
        style={[
          styles.inputWrap,
          {
            borderColor: error ? colors.danger : isFocused ? colors.text : colors.border,
            backgroundColor: colors.surface,
          },
          props.multiline && { minHeight: 80, justifyContent: 'flex-start' }
        ]}
      >
        <TextInput
          {...props}
          secureTextEntry={isSecure}
          value={value}
          placeholderTextColor={colors.subtext}
          style={[
            styles.input,
            { color: colors.text },
            secureTextEntry && { paddingRight: 70 },
            props.multiline && { height: undefined, minHeight: 80, paddingTop: 10, textAlignVertical: 'top' }
          ]}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
        />
        {secureTextEntry && showPasswordToggle !== false ? (
          <Pressable style={styles.toggleButton} onPress={() => setIsSecure((prev) => !prev)}>
            <Text style={[styles.toggleIcon, { color: colors.text }]}>
              {isSecure ? '👁️' : '🙈'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  inputWrap: {
    borderWidth: 1,
    borderRadius: Layout.radius.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  label: { fontSize: 14, fontWeight: '700' },
  input: {
    paddingHorizontal: 14,
    fontSize: 16,
    height: 48,
    paddingVertical: 10,
  },
  toggleButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center'
  },
  toggleIcon: { fontSize: 20 },
  error: { fontSize: 12 }
});
