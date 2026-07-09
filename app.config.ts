import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the web-platform .env file
dotenv.config({ path: path.resolve(__dirname, '../web-platform/.env') });

export default {
  expo: {
    name: 'Student Housing',
    slug: 'student-housing',
    version: '1.0.0',
    scheme: 'studenthousing',
    orientation: 'portrait',
    owner: "watasa05",
    icon: './assets/images/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#fff7fb'
    },
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL ?? process.env.API_BASE_URL ?? null,
      appEnv: process.env.APP_ENV ?? 'development',
      sentryDsn: process.env.SENTRY_DSN ?? '',
      eas: {
        projectId: "8d94224c-f467-437e-a821-d2c30a810b98"
      },
      cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? null,
      cloudinaryUploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET ?? null,
      cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ?? null,
      cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? null
    },
    ios: {
      bundleIdentifier: 'com.studenthousing.app',
      associatedDomains: ['applinks:housefinder.com']
    },
    android: {
      package: 'com.studenthousing.app',
      adaptiveIcon: {
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png'
      },
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: 'https', host: 'housefinder.com', pathPrefix: '/listing' }],
          category: ['BROWSABLE', 'DEFAULT']
        },
        {
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: 'https', host: 'housefinder.com', pathPrefix: '/reset-password' }],
          category: ['BROWSABLE', 'DEFAULT']
        },
        {
          action: 'VIEW',
          data: [{ scheme: 'studenthousing' }],
          category: ['BROWSABLE', 'DEFAULT']
        }
      ]
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-sharing',
      ['expo-notifications', { sounds: ['notification.wav'] }],
      ['expo-image-picker', { photosPermission: 'Allow Student Housing to access your photos.' }],
      ['expo-local-authentication', { faceIDPermission: 'Use Face ID to sign in.' }],
      '@react-native-community/datetimepicker'
    ]
  }
};
