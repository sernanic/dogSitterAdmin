export default {
  name: "PawSitter",
  slug: "pawsitter",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true,
    infoPlist: {
      NSPhotoLibraryUsageDescription: "Allow PawSitter to access your photos to update your profile picture",
      NSCameraUsageDescription: "Allow PawSitter to access your camera to take profile pictures"
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    },
    permissions: [
      "CAMERA",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE"
    ]
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  plugins: [
    "expo-router",
    [
      "expo-image-picker",
      {
        "photosPermission": "Allow PawSitter to access your photos to update your profile picture",
        "cameraPermission": "Allow PawSitter to access your camera to take profile pictures"
      }
    ]
  ],
  scheme: "pawsitter",
  // Environment variables and other extras
  extra: {
    eas: {
      projectId: "your-eas-project-id"
    },
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    EXPO_PUBLIC_GOOGLE_PLACES_API_KEY: "AIzaSyDex8KhVir0fRdJ4WCyHrrt91YZrBX9JTk"
  }
}; 