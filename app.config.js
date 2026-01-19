export default {
  expo: {
    name: "ScoutingApp2026",
    slug: "scouting-2026",
    version: "2026.1.1",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSCameraUsageDescription: "Allow $(PRODUCT_NAME) to access your camera",
        NSMicrophoneUsageDescription:
          "Allow $(PRODUCT_NAME) to access your microphone",
      },
    },
    android: {
      package: "com.brennan.ScoutingApp2026",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
      ],
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    extra: {
      eas: {
        projectId: "d412a8c5-f217-4fb7-9884-f23da5bd0d81",
      },
      firstApiUsername: process.env.FIRST_API_USERNAME,
      firstApiPassword: process.env.FIRST_API_PASSWORD,
    },
    plugins: [
      [
        "expo-camera",
        {
          cameraPermission: "Allow $(PRODUCT_NAME) to access your camera.",
        },
      ],
      "expo-font",
    ],
    newArchEnabled: true,
    fonts: [
      {
        asset: "./assets/fonts/CooperBlackRegular.ttf",
        family: "Cooper-Black",
      },
    ],
    owner: "brennanb",
  },
};
