import { useState, useEffect } from 'react';
import { Alert, StyleSheet, Text, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterFormData } from '@/lib/api-config';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { isOnline } from '@/lib/network';
import { hapticError } from '@/lib/haptics';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { register, biometricsEnabled, setBiometrics } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hardwareCompatible, setHardwareCompatible] = useState(false);

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setHardwareCompatible(compatible && enrolled);
    })();
  }, []);

  const { control, handleSubmit, trigger, setError, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      bio: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'student'
    }
  });

  const nextStep = async () => {
    // Trigger validation for the first step fields before proceeding
    const isValid = await trigger(['full_name', 'phone', 'bio']);
    if (isValid) {
      setStep(2);
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    if (!(await isOnline())) {
      hapticError();
      Alert.alert('Requires internet connection', 'Please connect to the internet to create an account.');
      return;
    }
    setLoading(true);
    const result = await register(data);
    setLoading(false);
    if (result.success) {
      // Email verification required — navigate to the pending screen
      if (result.pendingVerification) {
        router.replace('/(auth)/verify-pending');
        return;
      }
      const redirectPath = result.user?.role === 'landlord' ? '/landlord/dashboard' : '/';
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
    } else {
      hapticError();
      const errMsg = result.error ?? 'Registration failed';
      const isDuplicateEmail =
        errMsg.toLowerCase().includes('email') &&
        (errMsg.toLowerCase().includes('already') || errMsg.toLowerCase().includes('exists') || errMsg.toLowerCase().includes('duplicate'));
      if (isDuplicateEmail) {
        setStep(2);
        setError('email', { message: errMsg });
      } else {
        Alert.alert('Registration failed', errMsg);
      }
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
          <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.subtext }]}>
            Step {step} of 2: {step === 1 ? 'Profile Info' : 'Account Details'}
          </Text>
        </View>

        <Card style={styles.card}>
          {step === 1 && (
            <>
              <Controller
                control={control}
                name="full_name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Full Name"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    error={errors.full_name?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Phone Number"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    keyboardType="phone-pad"
                    placeholder="+2376xxxxxxxx"
                    error={errors.phone?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="bio"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Bio"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    multiline
                    numberOfLines={3}
                    error={errors.bio?.message}
                  />
                )}
              />

              <Button title="Next Step" onPress={nextStep} style={styles.button} />
            </>
          )}

          {step === 2 && (
            <>
              <Text style={[styles.label, { color: colors.text }]}>I am registering as a:</Text>
              <Controller
                control={control}
                name="role"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.roleRow}>
                    <Button
                      title="Student"
                      variant={value === 'student' ? 'primary' : 'secondary'}
                      onPress={() => onChange('student')}
                      style={styles.roleBtn}
                    />
                    <Button
                      title="Landlord"
                      variant={value === 'landlord' ? 'primary' : 'secondary'}
                      onPress={() => onChange('landlord')}
                      style={styles.roleBtn}
                    />
                  </View>
                )}
              />

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

              <View style={styles.btnRow}>
                <Button title="Back" variant="secondary" onPress={() => setStep(1)} style={styles.halfBtn} />
                <Button title="Register" loading={loading} onPress={handleSubmit(onSubmit)} style={styles.halfBtn} />
              </View>
            </>
          )}
        </Card>

        <Button title="Already have an account? Sign In" variant="secondary" onPress={() => router.back()} style={styles.backBtn} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header: { marginBottom: 28, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '900', textAlign: 'center' },
  subtitle: { fontSize: 16, marginTop: 8, textAlign: 'center' },
  card: { padding: 20, gap: 16 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  roleBtn: { flex: 1 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  halfBtn: { flex: 1 },
  button: { marginTop: 8 },
  backBtn: { marginTop: 20 }
});

