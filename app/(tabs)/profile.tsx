import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, View, ActivityIndicator, Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Toast from 'react-native-toast-message';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { authApi, changePasswordSchema, type ChangePasswordFormData } from '@/lib/api-config';
import { hapticError } from '@/lib/haptics';
import { uploadImageToCloudinary } from '@/services/cloudinary';
import { isRemotePushSupported } from '@/lib/push-capabilities';
import {
  getNotificationPermissionStatus,
  registerForPushNotifications,
  unregisterPushNotifications
} from '@/services/notifications';
import { z } from 'zod';

const editProfileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(7, 'Phone number must be valid')
});

type EditProfileData = z.infer<typeof editProfileSchema>;

export default function ProfileScreen() {
  const {
    user,
    accessToken,
    logout,
    refreshUser,
    biometricsEnabled,
    setBiometrics,
    biometricHardwareAvailable
  } = useAuth();
  const { colors, preference, setPreference } = useTheme();
  const [updating, setUpdating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(() => {
    if (!isRemotePushSupported()) return false;
    return false; // Will be updated by the effect below
  });
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>((user as { avatar_url?: string })?.avatar_url);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<EditProfileData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      full_name: user?.full_name ?? '',
      phone: user?.phone ?? ''
    }
  });

  const passwordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' }
  });

  useEffect(() => {
    reset({ full_name: user?.full_name ?? '', phone: user?.phone ?? '' });
  }, [user, reset]);

  useEffect(() => {
    if (!isRemotePushSupported()) {
      return;
    }
    getNotificationPermissionStatus().then((status) => {
      setPushEnabled(status);
    });
  }, []);

  const handlePickAvatar = async () => {
    Alert.alert('Change Photo', 'Choose a source', [
      {
        text: 'Camera',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) return;
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
          if (!result.canceled && result.assets[0]) await uploadAvatar(result.assets[0].uri);
        }
      },
      {
        text: 'Gallery',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
          if (!result.canceled && result.assets[0]) await uploadAvatar(result.assets[0].uri);
        }
      },
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  const uploadAvatar = async (uri: string) => {
    if (!accessToken) return;
    setUploadingAvatar(true);
    try {
      const uploaded = await uploadImageToCloudinary(uri, "2", 'student_housing/avatars');
      setAvatarUrl(uploaded.url);
      const response = await authApi.updateProfile(accessToken, { avatar_url: uploaded.url });
      if (response.success) {
        await refreshUser();
        Toast.show({ type: 'success', text1: 'Avatar updated' });
      } else {
        hapticError();
        Toast.show({ type: 'error', text1: response.error?.message ?? 'Upload failed' });
      }
    } catch {
      hapticError();
      Toast.show({ type: 'error', text1: 'Avatar upload failed' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onSubmit = async (data: EditProfileData) => {
    if (!accessToken) return;
    setUpdating(true);
    const response = await authApi.updateProfile(accessToken, data);
    setUpdating(false);
    if (response.success) {
      await refreshUser();
      Toast.show({ type: 'success', text1: 'Profile updated' });
    } else {
      hapticError();
      Toast.show({ type: 'error', text1: response.error?.message ?? 'Update failed' });
    }
  };

  const onChangePassword = async (data: ChangePasswordFormData) => {
    if (!accessToken) return;
    setUpdating(true);
    const response = await authApi.changePassword(accessToken, {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword
    });
    setUpdating(false);
    if (response.success) {
      passwordForm.reset();
      setShowPasswordSection(false);
      Toast.show({ type: 'success', text1: 'Password changed' });
    } else {
      hapticError();
      Toast.show({ type: 'error', text1: response.error?.message ?? 'Password change failed' });
    }
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (!accessToken) return;
    if (!isRemotePushSupported()) {
      Alert.alert(
        'Development build required',
        'Push notifications are not available in Expo Go. Create a development build to test push notifications.'
      );
      return;
    }
    if (enabled) {
      const result = await registerForPushNotifications(accessToken);
      setPushEnabled(result.granted);
      if (result.unsupported) {
        Alert.alert(
          'Development build required',
          'Push notifications are not available in Expo Go. Create a development build to test push notifications.'
        );
        return;
      }
      if (!result.granted) {
        Alert.alert('Notifications denied', 'Enable notifications in system settings to receive alerts.');
      }
    } else {
      await unregisterPushNotifications(accessToken);
      setPushEnabled(false);
    }
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    await setBiometrics(enabled);
    Toast.show({ type: 'success', text1: enabled ? 'Biometric login enabled' : 'Biometric login disabled' });
  };

  const handleLogout = () => {
    setShowMenu(false);
    Alert.alert('Log Out', 'End this session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        }
      }
    ]);
  };

  const handleMenuAction = (action: string) => {
    setShowMenu(false);
    switch (action) {
      case 'logout':
        handleLogout();
        break;
      case 'help':
        Alert.alert('Help', 'For support, contact support@housing.com');
        break;
      case 'about':
        Alert.alert('About', 'Student Housing App v1.0.0');
        break;
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
          <Pressable onPress={() => setShowMenu(!showMenu)} style={styles.menuButton}>
            <Text style={[styles.menuIcon, { color: colors.text }]}>⋮</Text>
          </Pressable>
        </View>

        {showMenu && (
          <View style={[styles.menuDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable style={styles.menuItem} onPress={() => handleMenuAction('help')}>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Help & Support</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => handleMenuAction('about')}>
              <Text style={[styles.menuItemText, { color: colors.text }]}>About</Text>
            </Pressable>
            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
            <Pressable style={styles.menuItem} onPress={() => handleMenuAction('logout')}>
              <Text style={[styles.menuItemText, { color: '#E63946' }]}>Log Out</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.avatarSection}>
          <Avatar name={user?.full_name ?? user?.email} size={90} uri={avatarUrl} />
          {uploadingAvatar ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Button title="Change Photo" variant="secondary" onPress={handlePickAvatar} style={styles.changePhotoBtn} />
          )}
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{user?.full_name ?? user?.email}</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>{user?.role?.toUpperCase()}</Text>

        <Card style={styles.card}>
          <Input label="Email (read-only)" value={user?.email ?? ''} editable={false} />
          <Controller
            control={control}
            name="full_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Display Name" value={value} onBlur={onBlur} onChangeText={onChange} error={errors.full_name?.message} />
            )}
          />
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Phone Number" value={value} onBlur={onBlur} onChangeText={onChange} keyboardType="phone-pad" error={errors.phone?.message} />
            )}
          />
          <Button title="Save Changes" loading={updating} onPress={handleSubmit(onSubmit)} style={styles.saveBtn} />
        </Card>

        <Card style={styles.card}>
          <Pressable onPress={() => setShowPasswordSection((v) => !v)} style={styles.expandHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Change Password</Text>
            <Text style={{ color: colors.subtext }}>{showPasswordSection ? '▲' : '▼'}</Text>
          </Pressable>
          {showPasswordSection && (
            <View style={{ gap: 12 }}>
              <Controller
                control={passwordForm.control}
                name="currentPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input label="Current Password" value={value} onBlur={onBlur} onChangeText={onChange} secureTextEntry showPasswordToggle error={passwordForm.formState.errors.currentPassword?.message} />
                )}
              />
              <Controller
                control={passwordForm.control}
                name="newPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input label="New Password" value={value} onBlur={onBlur} onChangeText={onChange} secureTextEntry showPasswordToggle error={passwordForm.formState.errors.newPassword?.message} />
                )}
              />
              <Controller
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input label="Confirm New Password" value={value} onBlur={onBlur} onChangeText={onChange} secureTextEntry showPasswordToggle error={passwordForm.formState.errors.confirmPassword?.message} />
                )}
              />
              <Button title="Update Password" loading={updating} onPress={passwordForm.handleSubmit(onChangePassword)} />
            </View>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
          {isRemotePushSupported() && (
            <View style={styles.toggleRow}>
              <Text style={{ color: colors.text, flex: 1 }}>Push notifications</Text>
              <Switch value={pushEnabled} onValueChange={handlePushToggle} />
            </View>
          )}
          <View style={styles.toggleRow}>
            <Text style={{ color: colors.text, flex: 1 }}>Dark mode</Text>
            <Switch
              value={preference === 'dark'}
              onValueChange={(v) => setPreference(v ? 'dark' : 'light')}
            />
          </View>
          {biometricHardwareAvailable && (
            <View style={styles.toggleRow}>
              <Text style={{ color: colors.text, flex: 1 }}>Biometric login</Text>
              <Switch value={biometricsEnabled} onValueChange={handleBiometricToggle} />
            </View>
          )}
          <Button title="Log Out" variant="danger" onPress={handleLogout} style={styles.settingsBtn} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 18, gap: 16, alignItems: 'stretch', paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: '900' },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent'
  },
  menuIcon: { fontSize: 24, fontWeight: '300', lineHeight: 24 },
  menuDropdown: {
    position: 'absolute',
    top: 50,
    right: 18,
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
    zIndex: 1000,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600'
  },
  menuDivider: {
    height: 1,
    marginVertical: 4
  },
  avatarSection: { alignItems: 'center', gap: 10, marginTop: 10 },
  changePhotoBtn: { minHeight: 36, paddingHorizontal: 12 },
  title: { fontSize: 24, fontWeight: '900', textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: 13, fontWeight: '700', textAlign: 'center', letterSpacing: 1 },
  card: { padding: 18, gap: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  expandHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saveBtn: { marginTop: 8 },
  settingsBtn: { marginTop: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }
});
