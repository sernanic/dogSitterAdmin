export default {
  name: "pikpup caregiver", 
  slug: "pikpup", 
  version: "1.0.2", 
  orientation: "portrait",
  icon: "./assets/images/pikpupCaregiverIcon.png", 
  userInterfaceStyle: "light", 
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
    bundleIdentifier: "com.nicolasserna.pikpup",
    buildNumber: "4.0.0", 
    icon: "./assets/images/pikpupCaregiverIcon.png", 
    infoPlist: {
      NSPhotoLibraryUsageDescription: "Allow pikpup to access your photos to update your profile picture",
      NSCameraUsageDescription: "Allow pikpup to access your camera to take profile pictures",
      ITSAppUsesNonExemptEncryption: false, 
      "UIBackgroundModes": ["fetch", "remote-notification"]
    },
    "entitlements": {
    }
  },
  android: {
    package: "com.nicolasserna.pikpup", 
    adaptiveIcon: {
      foregroundImage: "./assets/images/pikpupCaregiverIcon.png", 
      backgroundColor: "#ffffff"
    },
    permissions: [ 
      "CAMERA",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE"
    ],
    "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [ { "scheme": "pikpup", "host": "auth", "pathPrefix": "/reset-password" } ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
    ]
  },
  web: {
    favicon: "./assets/images/favicon.png" 
  },
  plugins: [
    "expo-router", 
    [
      "expo-image-picker", 
      {
        "photosPermission": "Allow pikpup to access your photos to update your profile picture",
        "cameraPermission": "Allow pikpup to access your camera to take profile pictures"
      }
    ],
    [ 
      "expo-notifications",
      {
        "icon": "./assets/images/icon.png", 
        "color": "#62C6B9",
        "sounds": []
      }
    ],
    "expo-font" 
  ],
  scheme: "pikpup",
  experiments: {
    "typedRoutes": true 
  },
  extra: {
    eas: {
      projectId: "bed81605-7359-4e68-8786-b04d457fc427" 
    },
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    EXPO_PUBLIC_GOOGLE_PLACES_API_KEY: "AIzaSyDex8KhVir0fRdJ4WCyHrrt91YZrBX9JTk"
  }
};
