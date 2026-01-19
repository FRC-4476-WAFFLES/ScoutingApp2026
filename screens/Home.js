import React, { useState, useEffect, useRef } from "react";
import {
    Text,
    SafeAreaView,
    ImageBackground,
    Image,
    TouchableOpacity,
    View,
    StyleSheet,
    Dimensions,
    StatusBar,
    Platform,
    Animated,
    Easing,
} from "react-native";
import * as Font from 'expo-font';
import Constants from 'expo-constants';

import { ScreenHeight, ScreenWidth } from "../components/shared";
import ShimmerText from "../components/ShimmerText";

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';
const BUILD_YEAR = '2026';

const HomeScreen = props => {
  const { navigation, route } = props;
  const [orientation, setOrientation] = useState('portrait');
  const [isTablet, setIsTablet] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  const titleFade = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(30)).current;
  const titleScale = useRef(new Animated.Value(0.8)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;
  const ribbonFade = useRef(new Animated.Value(0)).current;
  const ribbonSlide = useRef(new Animated.Value(50)).current;
  const buttonFade = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.3)).current;
  const buttonPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        'Cooper-Black': require('../assets/fonts/CooperBlackRegular.ttf'),
      });
      setFontsLoaded(true);

      Animated.sequence([
        // Title animation
        Animated.parallel([
          Animated.timing(titleFade, {
            toValue: 1,
            duration: 700,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(titleSlide, {
            toValue: 0,
            duration: 700,
            easing: Easing.out(Easing.back(1.2)),
            useNativeDriver: true,
          }),
          Animated.timing(titleScale, {
            toValue: 1,
            duration: 700,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Subtitle fade in
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(subtitleFade, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();

      // Ribbon slide in from right
      Animated.sequence([
        Animated.delay(400),
        Animated.parallel([
          Animated.timing(ribbonFade, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(ribbonSlide, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Button bounce in
      Animated.sequence([
        Animated.delay(600),
        Animated.parallel([
          Animated.timing(buttonFade, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(buttonScale, {
            toValue: 1,
            tension: 100,
            friction: 5,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Breathing pulse on button
      Animated.loop(
        Animated.sequence([
          Animated.timing(buttonPulse, {
            toValue: 1.05,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(buttonPulse, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }

    loadFonts();
    const updateLayout = () => {
      const dim = Dimensions.get('screen');
      setOrientation(dim.width > dim.height ? 'landscape' : 'portrait');
      // Check if device is tablet based on screen size
      setIsTablet(Math.min(dim.width, dim.height) >= 600);
    };

    updateLayout();
    const subscription = Dimensions.addEventListener('change', updateLayout);

    return () => {
      subscription.remove();
    };
  }, []);

  if (!fontsLoaded) {
    return null; // Or a loading indicator
  }

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        style={styles.backdrop}
        source={require("../assets/images/HomeScreen/backdrop.png")}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <View style={[
            styles.titleContainer,
            isTablet && styles.titleContainerTablet
          ]}>
            <Animated.Text style={[
              styles.title,
              isTablet && styles.titleTablet,
              orientation === 'landscape' && !isTablet && styles.titleLandscape,
              {
                opacity: titleFade,
                transform: [
                  { translateY: titleSlide },
                  { scale: titleScale }
                ]
              }
            ]}>W.A.F.F.L.E.S.</Animated.Text>
            <Animated.Text style={[
              styles.subtitle,
              isTablet && styles.subtitleTablet,
              orientation === 'landscape' && !isTablet && styles.subtitleLandscape,
              { opacity: subtitleFade }
            ]}>Scouting</Animated.Text>
          </View>

          <Animated.View style={[
            styles.ribbonContainer,
            { opacity: ribbonFade, transform: [{ translateX: ribbonSlide }] }
          ]}>
            <View style={[styles.ribbon, isTablet && styles.ribbonTablet]}>
              <ShimmerText
                style={[styles.ribbonText, isTablet && styles.ribbonTextTablet]}
                duration={2000}
              >
                {BUILD_YEAR}
              </ShimmerText>
            </View>
          </Animated.View>

          <Animated.View style={[
            styles.bottomContainer,
            { opacity: buttonFade }
          ]}>
            <Animated.View style={{ transform: [{ scale: buttonPulse }] }}>
              <TouchableOpacity
                style={[
                  styles.button,
                  orientation === 'landscape' && !isTablet && styles.buttonLandscape
                ]}
                onPress={() => navigation.navigate("Pregame", {})}
              >
                <Text style={styles.buttonText}>Start Scouting</Text>
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.rowIcons}>
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => navigation.navigate("Settings")}
              >
                <Image
                  style={styles.settingsIcon}
                  source={require("../assets/images/HomeScreen/settings-icon.png")}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.versionText}>v{APP_VERSION}</Text>
          </Animated.View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

export default HomeScreen;

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#1a1a1a",
    },
  
    backdrop: {
      position: 'absolute',
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
    },

    overlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: Platform.OS === "android" ? StatusBar.currentHeight + 20 : 20,
    },

    titleContainer: {
      alignItems: 'center',
      marginTop: 100,
    },

    titleContainerTablet: {
      marginTop: 120,
    },

    ribbonContainer: {
      position: 'absolute',
      top: Platform.OS === "android" ? StatusBar.currentHeight + 10 : 50,
      right: 16,
    },

    ribbon: {
      backgroundColor: '#000000',
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 8,
      elevation: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
    },

    ribbonTablet: {
      paddingVertical: 16,
      paddingHorizontal: 28,
      borderRadius: 12,
    },

    ribbonText: {
      color: '#FFD700',
      fontSize: 32,
      fontFamily: 'Cooper-Black',
    },

    ribbonTextTablet: {
      fontSize: 48,
    },

    title: {
      fontSize: 48,
      fontFamily: 'Cooper-Black',
      color: "#000000",
      textAlign: "center",
    },

    titleTablet: {
      fontSize: 72,
    },

    titleLandscape: {
      fontSize: 36,
      marginTop: 0,
    },

    subtitle: {
      fontSize: 28,
      fontFamily: 'Cooper-Black',
      color: "#000000",
      textAlign: "center",
      marginTop: 8,
    },

    subtitleTablet: {
      fontSize: 40,
    },

    subtitleLandscape: {
      fontSize: 24,
    },
  
    button: {
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 32,
      backgroundColor: "#000000",
      width: ScreenWidth * 0.85,
      marginBottom: 20,
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },

    buttonLandscape: {
      width: ScreenHeight * 0.4,
    },
  
    buttonText: {
      color: "#FFD700",
      fontWeight: "600",
      fontSize: 24,
      fontFamily: 'Cooper-Black',
      textAlign: "center",
    },
  
    rowIcons: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
    },

    settingsButton: {
      padding: 12,
      backgroundColor: '#000000',
      borderRadius: 12,
    },

    settingsIcon: {
      width: 24,
      height: 24,
      tintColor: '#FFD700',
    },

    bottomContainer: {
      width: '100%',
      alignItems: 'center',
      marginBottom: 20,
    },

    versionText: {
      color: '#000000',
      fontSize: 12,
      marginTop: 16,
      opacity: 0.6,
    },
});