import { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { router } from 'expo-router';
import { authApi } from '@/lib/api-config';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';

const RESEND_COOLDOWN = 60;

export default function VerifyPendingScreen() {
  const { colors } = useTheme();
  const { logout } = useAuth();

  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [sent, setSent] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Entrance animations
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(28)).current;
  const envelopeScale = useRef(new Animated.Value(0)).current;
  const envelopeRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(cardTranslateY, { toValue: 0, tension: 55, friction: 10, useNativeDriver: true }),
    ]).start(() => {
      // Pop the envelope icon in
      Animated.spring(envelopeScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }).start();
      // Then gently wiggle
      Animated.loop(
        Animated.sequence([
          Animated.delay(2000),
          Animated.timing(envelopeRotate, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.timing(envelopeRotate, { toValue: -1, duration: 120, useNativeDriver: true }),
          Animated.timing(envelopeRotate, { toValue: 0, duration: 120, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  const envelopeRotateDeg = envelopeRotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-8deg', '8deg'],
  });

  const startCountdown = () => {
    setCountdown(RESEND_COOLDOWN);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setMsgOk(false);
      setMsg('Please enter your email address.');
      return;
    }
    setMsg('');
    try {
      // Always returns the same message to prevent enumeration
      await authApi.resendVerification(email.trim().toLowerCase());
      setSent(true);
      setMsgOk(true);
      setMsg('If that address is registered, a new verification link has been sent. Check your inbox (and spam).');
      startCountdown();
    } catch {
      setMsgOk(false);
      setMsg('Network error. Please try again.');
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const s = styles(colors);

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled">
        <Animated.View style={[s.card, { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] }]}>

          {/* Warning badge */}
          <View style={s.badge}>
            <Text style={s.badgeText}>⚠ Verification Required</Text>
          </View>

          {/* Envelope icon with wiggle */}
          <Animated.View style={[s.iconWrap, { transform: [{ scale: envelopeScale }, { rotate: envelopeRotateDeg }] }]}>
            <Text style={s.iconEmoji}>📬</Text>
          </Animated.View>

          <Text style={s.title}>Check Your Inbox</Text>
          <Text style={s.subtitle}>
            We sent a verification link to your email when you registered. 
            Click the link in the email to activate your account.
          </Text>

          {/* Step guide */}
          <View style={s.stepsCard}>
            {[
              'Open the email from Student Housing in your inbox.',
              'Tap the "Verify Email" button in the email.',
              'You\'ll be taken back to the app automatically.',
            ].map((step, i) => (
              <View key={i} style={[s.stepRow, i < 2 && s.stepRowBorder]}>
                <View style={s.stepNum}>
                  <Text style={s.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={s.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          <View style={s.divider} />
          <Text style={s.sectionLabel}>Didn't receive it?</Text>

          <TextInput
            style={s.input}
            placeholder="your@email.com"
            placeholderTextColor={colors.subtext}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!sent || countdown === 0}
          />

          <TouchableOpacity
            id="vp-resend-btn"
            style={[s.btnPrimary, countdown > 0 && s.btnDisabled]}
            onPress={handleResend}
            disabled={countdown > 0}
          >
            <Text style={s.btnPrimaryText}>
              {countdown > 0 ? `⏳ Resend in ${countdown}s` : '↺ Resend Verification Email'}
            </Text>
          </TouchableOpacity>

          {msg ? (
            <View style={[s.msgBox, msgOk ? s.msgOk : s.msgErr]}>
              <Text style={[s.msgText, msgOk ? s.msgTextOk : s.msgTextErr]}>{msg}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={s.btnGhost} onPress={handleLogout}>
            <Text style={s.btnGhostText}>Sign Out</Text>
          </TouchableOpacity>

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: Record<string, string>) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  root: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 440,
    backgroundColor: colors.card ?? colors.surface ?? '#1e1b4b',
    borderRadius: 22, padding: 30,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.35, shadowRadius: 28,
    elevation: 12,
  },
  badge: {
    backgroundColor: 'rgba(234,179,8,0.15)',
    borderWidth: 1, borderColor: 'rgba(234,179,8,0.3)',
    borderRadius: 20, paddingVertical: 5, paddingHorizontal: 14,
    marginBottom: 22,
  },
  badgeText: { color: '#fbbf24', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  iconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderWidth: 2, borderColor: 'rgba(99,102,241,0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 22,
  },
  iconEmoji: { fontSize: 40 },
  title:    { fontSize: 23, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 10, letterSpacing: -0.4 },
  subtitle: { fontSize: 14, color: colors.subtext, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  stepsCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 12, padding: 16, marginBottom: 24,
  },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10 },
  stepRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  stepNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#6366f1',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  stepNumText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 13, color: colors.subtext, lineHeight: 20 },
  divider: { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 18 },
  sectionLabel: {
    alignSelf: 'flex-start', fontSize: 12, fontWeight: '600',
    color: colors.subtext, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },
  input: {
    width: '100%', padding: 13, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    color: colors.text, fontSize: 14, marginBottom: 12,
  },
  btnPrimary: {
    width: '100%', padding: 14, borderRadius: 12,
    backgroundColor: '#6366f1', alignItems: 'center',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12,
    elevation: 6,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  btnGhost: {
    width: '100%', padding: 13, borderRadius: 12, marginTop: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center',
  },
  btnGhostText: { color: colors.subtext, fontSize: 14, fontWeight: '500' },
  msgBox: { width: '100%', padding: 12, borderRadius: 8, marginTop: 10, borderWidth: 1 },
  msgOk:      { backgroundColor: 'rgba(34,197,94,0.1)',  borderColor: 'rgba(34,197,94,0.25)' },
  msgErr:     { backgroundColor: 'rgba(239,68,68,0.1)',  borderColor: 'rgba(239,68,68,0.25)' },
  msgText:    { fontSize: 13, lineHeight: 20 },
  msgTextOk:  { color: '#86efac' },
  msgTextErr: { color: '#fca5a5' },
});
