import { useState, useEffect } from 'react';
import { Alert, StyleSheet, Text, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '@/lib/api-config';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { isOnline } from '@/lib/network';
import { hapticError } from '@/lib/haptics';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { login, biometricsEnabled, setBiometrics } = useAuth();
  const [loading, setLoading] = useState(false);
  const [hardwareCompatible, setHardwareCompatible] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setHardwareCompatible(compatible && enrolled);
    })();
  }, []);

  const onSubmit = async (data: LoginFormData) => {
    if (!(await isOnline())) {
      hapticError();
      Alert.alert('Requires internet connection', 'Please connect to the internet to sign in.');
      return;
    }
    setLoading(true);
    const result = await login(data.email, data.password);
    setLoading(false);
    if (result.success) {
      const redirectPath = result.user?.role === 'landlord' ? '/dashboard' : '/';
      if (hardwareCompatible && !biometricsEnabled) {
        Alert.alert(
          'Enable Biometrics',
          'Would you like to enable biometric sign in for future logins?',
          [
            { text: 'No', style: 'cancel', onPress: () => router.replace(redirectPath) },
            {
              text: 'Yes',
              onPress: async () => {
                await setBiometrics(true);
                router.replace(redirectPath);
              }
            }
          ]
        );
      } else {
        router.replace(redirectPath);
      }
    } else if (result.errorCode === 'EMAIL_UNVERIFIED') {
      router.replace({
        pathname: '/(auth)/verify-pending',
        params: { email: data.email.trim().toLowerCase() },
      });
    } else {
      hapticError();
      Alert.alert('Login failed', result.error);
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
          <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: colors.subtext }]}>
            Find the perfect student housing today
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

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                secureTextEntry
                showPasswordToggle
                error={errors.password?.message}
              />
            )}
          />

          <Button
            title="Sign In"
            loading={loading}
            onPress={handleSubmit(onSubmit)}
            style={styles.button}
          />
        </Card>

        <View style={styles.footer}>
          <Button
            title="Create Account"
            variant="secondary"
            onPress={() => router.push('/(auth)/register')}
          />
          <Button
            title="Forgot Password?"
            variant="secondary"
            onPress={() => router.push('/(auth)/forgot-password')}
          />
        </View>
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
  footer: { marginTop: 24, gap: 10 }
});

