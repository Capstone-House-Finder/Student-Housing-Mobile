import { useState } from 'react';
import { Alert, StyleSheet, Text, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordFormData, authApi } from '@/lib/api-config';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' }
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    const response = await authApi.forgotPassword(data.email);
    setLoading(false);
    
    if (response.success) {
      Alert.alert('Check your email', 'We have sent a password reset link to your email address.', [
        { text: 'OK', onPress: () => router.push('/(auth)/login') }
      ]);
    } else {
      Alert.alert('Error', response.error?.message || 'Unable to send reset link');
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
          <Text style={[styles.title, { color: colors.text }]}>Reset Password</Text>
          <Text style={[styles.subtitle, { color: colors.subtext }]}>
            Enter your email to receive a reset link
          </Text>
        </View>

        <Card style={styles.card}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email Address"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                autoCapitalize="none"
                keyboardType="email-address"
                error={errors.email?.message}
              />
            )}
          />

          <Button
            title="Send Reset Link"
            loading={loading}
            onPress={handleSubmit(onSubmit)}
            style={styles.button}
          />
        </Card>

        <Button
          title="Back to Login"
          variant="secondary"
          onPress={() => router.back()}
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
