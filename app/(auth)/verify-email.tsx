import { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { authApi } from '@/lib/api-config';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { secureStorage } from '@/lib/storage';

const ACCESS_TOKEN_KEY = 'housing_access_token';
const REFRESH_TOKEN_KEY = 'housing_refresh_token';

type Status = 'loading' | 'success' | 'error' | 'idle';

const RESEND_COOLDOWN = 60;

export default function VerifyEmailScreen() {
  const { colors } = useTheme();
  const { refreshUser } = useAuth();
  const { token: paramToken } = useLocalSearchParams<{ token?: string }>();

  const [status, setStatus] = useState<Status>(paramToken ? 'loading' : 'idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [email, setEmail] = useState('');
  const [resendMsg, setResendMsg] = useState('');
  const [resendOk, setResendOk] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animations
  const iconScale = useMemo(() => new Animated.Value(0), []);
  const cardOpacity = useMemo(() => new Animated.Value(0), []);
  const cardTranslateY = useMemo(() => new Animated.Value(24), []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(cardTranslateY, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [cardOpacity, cardTranslateY]);

  useEffect(() => {
    if (!paramToken) return;
    authApi.verifyEmail(paramToken).then(async (res) => {
      if (res.success && res.data) {
        const payload = res.data as { token?: string; refreshToken?: string };
        if (payload.token) {
          await secureStorage.setToken(ACCESS_TOKEN_KEY, payload.token);
          if (payload.refreshToken) {
            await secureStorage.setToken(REFRESH_TOKEN_KEY, payload.refreshToken);
          }
          await refreshUser();
        }
        setStatus('success');
        Animated.spring(iconScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }).start();
        setTimeout(() => router.replace('/'), 2500);
      } else {
        setStatus('error');
        const msg = res.error?.message ?? '';
        setErrorMsg(
          msg.includes('expired') ? 'This verification link has expired.' :
          msg.includes('used')    ? 'This link has already been used.' :
          msg.includes('Invalid') ? 'This verification link is invalid.' :
          'Verification failed. Please try again.'
        );
        Animated.spring(iconScale, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }).start();
      }
    }).catch(() => {
      setStatus('error');
      setErrorMsg('A network error occurred. Please check your connection.');
    });
  }, [paramToken, iconScale, refreshUser]);

  const startCountdown = () => {
    setCountdown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (!email.trim()) { setResendOk(false); setResendMsg('Please enter your email address.'); return; }
    setResendMsg('');
    try {
      await authApi.resendVerification(email.trim().toLowerCase());
      setResendOk(true);
      setResendMsg('Verification email sent! Check your inbox.');
      startCountdown();
    } catch {
      setResendOk(false);
      setResendMsg('Network error. Please try again.');
    }
  };

  const s = styles(colors);

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled">
        <Animated.View style={[s.card, { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] }]}>

          {/* LOADING */}
          {status === 'loading' && (
            <>
              <View style={[s.iconWrap, s.iconWrapPurple]}>
                <ActivityIndicator size="large" color="#818cf8" />
              </View>
              <Text style={s.title}>Verifying your email…</Text>
              <Text style={s.subtitle}>Please wait while we confirm your address.</Text>
            </>
          )}

          {/* IDLE — no token from deep link */}
          {status === 'idle' && (
            <>
              <Animated.View style={[s.iconWrap, s.iconWrapPurple]}>
                <Text style={s.iconEmoji}>📧</Text>
              </Animated.View>
              <Text style={s.title}>Enter Verification Token</Text>
              <Text style={s.subtitle}>
                Paste the token from your verification email, or use the link in the email to open this screen automatically.
              </Text>
            </>
          )}

          {/* SUCCESS */}
          {status === 'success' && (
            <>
              <Animated.View style={[s.iconWrap, s.iconWrapGreen, { transform: [{ scale: iconScale }] }]}>
                <Text style={s.iconEmoji}>✓</Text>
              </Animated.View>
              <Text style={s.title}>Email Verified!</Text>
              <Text style={s.subtitle}>Your account is now active. Taking you home…</Text>
              <TouchableOpacity style={s.btnPrimary} onPress={() => router.replace('/')}>
                <Text style={s.btnPrimaryText}>Go to App</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ERROR */}
          {status === 'error' && (
            <>
              <Animated.View style={[s.iconWrap, s.iconWrapRed, { transform: [{ scale: iconScale }] }]}>
                <Text style={s.iconEmoji}>✕</Text>
              </Animated.View>
              <Text style={s.title}>Verification Failed</Text>
              <Text style={s.subtitle}>{errorMsg}</Text>

              <View style={s.divider} />
              <Text style={s.sectionLabel}>Resend a new link</Text>

              <TextInput
                style={s.input}
                placeholder="your@email.com"
                placeholderTextColor={colors.subtext}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={countdown === 0}
              />
              <TouchableOpacity
                style={[s.btnPrimary, countdown > 0 && s.btnDisabled]}
                onPress={handleResend}
                disabled={countdown > 0}
              >
                <Text style={s.btnPrimaryText}>
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Verification Email'}
                </Text>
              </TouchableOpacity>

              {resendMsg ? (
                <View style={[s.msgBox, resendOk ? s.msgOk : s.msgErr]}>
                  <Text style={[s.msgText, resendOk ? s.msgTextOk : s.msgTextErr]}>{resendMsg}</Text>
                </View>
              ) : null}

              <TouchableOpacity style={s.btnGhost} onPress={() => router.replace('/(auth)/login')}>
                <Text style={s.btnGhostText}>Back to Login</Text>
              </TouchableOpacity>
            </>
          )}

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: Record<string, string>) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  root: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 420,
    backgroundColor: colors.card ?? colors.surface ?? '#1e1b4b',
    borderRadius: 20, padding: 32,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 24,
    elevation: 10,
  },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  iconWrapPurple: { backgroundColor: 'rgba(99,102,241,0.18)' },
  iconWrapGreen:  { backgroundColor: 'rgba(34,197,94,0.18)' },
  iconWrapRed:    { backgroundColor: 'rgba(239,68,68,0.18)' },
  iconEmoji:      { fontSize: 36 },
  title:    { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 10, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: colors.subtext, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  divider:  { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.subtext, alignSelf: 'flex-start', marginBottom: 12, letterSpacing: 0.3 },
  input: {
    width: '100%', padding: 13, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    color: colors.text, fontSize: 14, marginBottom: 12,
  },
  btnPrimary: {
    width: '100%', padding: 14, borderRadius: 12,
    backgroundColor: '#6366f1', alignItems: 'center', marginBottom: 4,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.5 },
  btnGhost: {
    width: '100%', padding: 13, borderRadius: 12, marginTop: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  btnGhostText: { color: colors.subtext, fontSize: 14, fontWeight: '500' },
  msgBox: { width: '100%', padding: 12, borderRadius: 8, marginTop: 10, borderWidth: 1 },
  msgOk:      { backgroundColor: 'rgba(34,197,94,0.1)',  borderColor: 'rgba(34,197,94,0.25)' },
  msgErr:     { backgroundColor: 'rgba(239,68,68,0.1)',  borderColor: 'rgba(239,68,68,0.25)' },
  msgText:    { fontSize: 13 },
  msgTextOk:  { color: '#86efac' },
  msgTextErr: { color: '#fca5a5' },
});
