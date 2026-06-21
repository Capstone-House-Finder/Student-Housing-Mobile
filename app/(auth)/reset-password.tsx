import { useState } from 'react';
import { Alert, StyleSheet, Text, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordFormData, authApi } from '@/lib/api-config';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);

  // The backend reset link supplies the raw reset token as the only required identifier.
  const tokenParam = typeof params.token === 'string' ? params.token : '';

  const { control, handleSubmit, formState: { errors } } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' }
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!tokenParam) {
      Alert.alert('Error', 'Missing reset token. Please click the link in your email again.');
      return;
    }

    setLoading(true);
    const response = await authApi.resetPassword({
      token: tokenParam,
      password: data.newPassword
    });
    setLoading(false);
    
    if (response.success) {
      Alert.alert('Password Updated', 'Your password has been successfully reset.', [
        { text: 'Log In', onPress: () => router.replace('/(auth)/login') }
      ]);
    } else {
      Alert.alert('Error', response.error?.message || 'Unable to update password');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Set New Password</Text>
          <Text style={[styles.subtitle, { color: colors.subtext }]}>
            Create a strong new password
          </Text>
        </View>

        <Card style={styles.card}>
          <Controller
            control={control}
            name="newPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="New Password"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                secureTextEntry
                showPasswordToggle
                error={errors.newPassword?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Confirm Password"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                secureTextEntry
                showPasswordToggle
                error={errors.confirmPassword?.message}
              />
            )}
          />

          <Button
            title="Update Password"
            loading={loading}
            onPress={handleSubmit(onSubmit)}
            style={styles.button}
          />
        </Card>

        <Button
          title="Back to Login"
          variant="secondary"
          onPress={() => router.push('/(auth)/login')}
          style={styles.backBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header: { marginBottom: 32, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '900', textAlign: 'center' },
  subtitle: { fontSize: 16, marginTop: 8, textAlign: 'center' },
  card: { padding: 20, gap: 16 },
  button: { marginTop: 8 },
  backBtn: { marginTop: 24 }
});
