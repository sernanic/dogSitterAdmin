export default {
  name: "pikpup caregiver", 
  slug: "pikpup", 
  version: "1.0.2", 
  orientation: "portrait",
  icon: "./assets/images/pikpupCaregiverIcon.png", 
  userInterfaceStyle: "light", 
  splash: {
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
      NSPhotoLibraryUsageDescription: "Allow PikPup to access your photos to update your profile picture and portfolio images",
      NSCameraUsageDescription: "Allow PikPup to access your camera to take profile pictures and portfolio images",
      NSLocationWhenInUseUsageDescription: "Allow PikPup to access your location to help pet owners find caregivers nearby and accurately set your service address",
      NSLocationAlwaysUsageDescription: "Allow PikPup to access your location to provide real-time updates during pet sitting sessions and walks",
      NSUserNotificationsUsageDescription: "Allow PikPup to send you notifications about booking requests, messages from pet owners, and important updates",
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
      backgroundColor: "#62C6B9"
    },
    permissions: [ 
      "CAMERA",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION"
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
    EXPO_PUBLIC_GOOGLE_PLACES_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY
  }
};
