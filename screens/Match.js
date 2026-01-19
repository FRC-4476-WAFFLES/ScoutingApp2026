import { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    TouchableOpacity,
    TextInput,
    Platform,
    StatusBar,
    Modal,
    TouchableWithoutFeedback,
    Keyboard,
    Dimensions,
    Animated
} from "react-native";

import * as FileSystem from "expo-file-system/legacy";
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from "../components/colors";
import { parseCSV, escapeCSVField } from "../utils/csv";
import { useSettings } from "../contexts/SettingsContext";

const getAllianceColor = (driverStation) => {
  if (!driverStation) return null;
  return driverStation.charAt(0) === 'R' ? colors.redAlliance : colors.blueAlliance;
};

const getAllianceTextColor = (driverStation) => {
  if (!driverStation) return colors.textPrimary;
  return driverStation.charAt(0) === 'R' ? colors.redAllianceText : colors.blueAllianceText;
};

const MatchScreen = props => {
  const { navigation, route } = props;

  // Scoring state
  const [autoFuelScored, setAutoFuelScored] = useState(0);
  const [autoPasses, setAutoPasses] = useState(0);
  const [teleOpFuelScored, setTeleOpFuelScored] = useState(0);
  const [teleOpPasses, setTeleOpPasses] = useState(0);

  // Collapsible section state (all expanded by default)
  const [autoExpanded, setAutoExpanded] = useState(true);
  const [teleOpExpanded, setTeleOpExpanded] = useState(true);

  // Auto reminder flash state
  const [autoReminderActive, setAutoReminderActive] = useState(false);
  const autoReminderTimeoutRef = useRef(null);
  const autoFlashAnim = useRef(new Animated.Value(0)).current;
  const autoFlashAnimRef = useRef(null);

  // Auto countdown timer (15 seconds for FRC auto)
  const [autoCountdown, setAutoCountdown] = useState(null);
  const autoCountdownIntervalRef = useRef(null);
  const autoStartTimeRef = useRef(null);

  const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
  const [commentValue, setCommentValue] = useState('');

  const [isQuestionModalVisible, setIsQuestionModalVisible] = useState(false);
  const [questionValue, setQuestionValue] = useState('');

  // Get settings from context
  const { driverStation } = useSettings();

  const [isTablet, setIsTablet] = useState(false);

  // Recent change tracking for fuel
  const [recentAutoChange, setRecentAutoChange] = useState(null);
  const [recentTeleOpChange, setRecentTeleOpChange] = useState(null);
  const autoTimeoutRef = useRef(null);
  const teleOpTimeoutRef = useRef(null);
  const autoTimerAnim = useRef(new Animated.Value(0)).current;
  const teleOpTimerAnim = useRef(new Animated.Value(0)).current;

  // Recent change tracking for passes
  const [recentAutoPassesChange, setRecentAutoPassesChange] = useState(null);
  const [recentTeleOpPassesChange, setRecentTeleOpPassesChange] = useState(null);
  const autoPassesTimeoutRef = useRef(null);
  const teleOpPassesTimeoutRef = useRef(null);
  const autoPassesTimerAnim = useRef(new Animated.Value(0)).current;
  const teleOpPassesTimerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const updateLayout = () => {
      const dim = Dimensions.get('screen');
      setIsTablet(Math.min(dim.width, dim.height) >= 600);
    };
    updateLayout();
    const subscription = Dimensions.addEventListener('change', updateLayout);
    return () => subscription.remove();
  }, []);

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (autoTimeoutRef.current) clearTimeout(autoTimeoutRef.current);
      if (teleOpTimeoutRef.current) clearTimeout(teleOpTimeoutRef.current);
      if (autoPassesTimeoutRef.current) clearTimeout(autoPassesTimeoutRef.current);
      if (teleOpPassesTimeoutRef.current) clearTimeout(teleOpPassesTimeoutRef.current);
      if (autoReminderTimeoutRef.current) clearTimeout(autoReminderTimeoutRef.current);
      if (autoFlashAnimRef.current) autoFlashAnimRef.current.stop();
      if (autoCountdownIntervalRef.current) clearInterval(autoCountdownIntervalRef.current);
    };
  }, []);

  // Start flash animation when auto timer expires
  const startAutoFlash = () => {
    setAutoReminderActive(true);
    // Haptic feedback to alert user
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    // Start pulsing animation - fast and attention-grabbing
    autoFlashAnimRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(autoFlashAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(autoFlashAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: false,
        }),
      ])
    );
    autoFlashAnimRef.current.start();
  };

  // Start auto countdown timer (starts on first auto interaction)
  const startAutoCountdown = () => {
    // Only start if not already running
    if (autoStartTimeRef.current === null) {
      autoStartTimeRef.current = Date.now();
      setAutoCountdown(20);

      autoCountdownIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - autoStartTimeRef.current) / 1000);
        const remaining = Math.max(0, 20 - elapsed);
        setAutoCountdown(remaining);

        if (remaining === 0) {
          clearInterval(autoCountdownIntervalRef.current);
          // Start flashing when timer hits 0
          startAutoFlash();
        }
      }, 100);
    }
  };

  // Start auto reminder timer (resets on each auto field change)
  const startAutoReminderTimer = () => {
    // Start countdown on first auto interaction
    startAutoCountdown();
  };

  // Stop auto reminder when collapsed or TeleOp is used
  const stopAutoReminder = () => {
    if (autoReminderTimeoutRef.current) clearTimeout(autoReminderTimeoutRef.current);
    if (autoFlashAnimRef.current) autoFlashAnimRef.current.stop();
    setAutoReminderActive(false);
    autoFlashAnim.setValue(0);
  };

  useEffect(() => {
    const loadExistingMatchData = async () => {
      if (route.params?.matchNum) {
        const csvURI = `${FileSystem.documentDirectory}match${route.params.matchNum}.csv`;

        try {
          const fileInfo = await FileSystem.getInfoAsync(csvURI);
          if (!fileInfo.exists) {
            console.log("No existing data file found for match", route.params.matchNum);
            return;
          }

          const data = await FileSystem.readAsStringAsync(csvURI);
          console.log("Raw data loaded:", data);

          const values = parseCSV(data);
          console.log("Parsed values:", values);

          if (!values) {
            console.error("Failed to parse CSV data");
            return;
          }

          // Load comment from index 6 (shared with Pregame)
          if (values.length > 6) {
            setCommentValue(values[6] || '');
          }

          // Load scores - new structure with passes
          // Index 7: Auto Fuel, 8: Auto Passes, 9: TeleOp Fuel, 10: TeleOp Passes, 11: Questions
          if (values.length >= 11) {
            const autoFuel = parseInt(values[7]);
            const autoPas = parseInt(values[8]);
            const teleOpFuel = parseInt(values[9]);
            const teleOpPas = parseInt(values[10]);

            if (!isNaN(autoFuel)) setAutoFuelScored(autoFuel);
            if (!isNaN(autoPas)) setAutoPasses(autoPas);
            if (!isNaN(teleOpFuel)) setTeleOpFuelScored(teleOpFuel);
            if (!isNaN(teleOpPas)) setTeleOpPasses(teleOpPas);

            // Questions at index 11
            if (values.length > 11) {
              setQuestionValue(values[11] || '');
            }

            console.log("Successfully loaded match data (new format)");
          } else if (values.length >= 9) {
            // Legacy format support: 7: Auto Fuel, 8: TeleOp Fuel, 9: Questions
            const auto = parseInt(values[7]);
            const teleOp = parseInt(values[8]);

            if (!isNaN(auto)) setAutoFuelScored(auto);
            if (!isNaN(teleOp)) setTeleOpFuelScored(teleOp);

            if (values.length > 9) {
              setQuestionValue(values[9] || '');
            }

            console.log("Successfully loaded match data (legacy format)");
          }
        } catch (error) {
          console.error('Error loading match data:', error);
        }
      }
    };

    loadExistingMatchData();
  }, [route.params?.matchNum]);


  const updateAutoFuel = (amount) => {
    const newValue = autoFuelScored + amount;
    if (newValue >= 0) {
      setAutoFuelScored(newValue);
      // Accumulate the change
      setRecentAutoChange(prev => (prev || 0) + amount);

      // Clear previous timeout
      if (autoTimeoutRef.current) clearTimeout(autoTimeoutRef.current);

      // Reset and start timer animation
      autoTimerAnim.setValue(1);
      Animated.timing(autoTimerAnim, {
        toValue: 0,
        duration: 10000,
        useNativeDriver: false,
      }).start();

      // Set new timeout to hide after 10 seconds
      autoTimeoutRef.current = setTimeout(() => {
        setRecentAutoChange(null);
      }, 10000);

      // Start auto reminder timer
      startAutoReminderTimer();
    }
  };

  const updateTeleOpFuel = (amount) => {
    const newValue = teleOpFuelScored + amount;
    if (newValue >= 0) {
      setTeleOpFuelScored(newValue);
      // Accumulate the change
      setRecentTeleOpChange(prev => (prev || 0) + amount);

      // Clear previous timeout
      if (teleOpTimeoutRef.current) clearTimeout(teleOpTimeoutRef.current);

      // Reset and start timer animation
      teleOpTimerAnim.setValue(1);
      Animated.timing(teleOpTimerAnim, {
        toValue: 0,
        duration: 10000,
        useNativeDriver: false,
      }).start();

      // Set new timeout to hide after 10 seconds
      teleOpTimeoutRef.current = setTimeout(() => {
        setRecentTeleOpChange(null);
      }, 10000);

      // Stop auto reminder - user is in teleop now
      stopAutoReminder();
    }
  };

  const updateAutoPasses = (amount) => {
    const newValue = autoPasses + amount;
    if (newValue >= 0) {
      setAutoPasses(newValue);
      setRecentAutoPassesChange(prev => (prev || 0) + amount);

      if (autoPassesTimeoutRef.current) clearTimeout(autoPassesTimeoutRef.current);

      autoPassesTimerAnim.setValue(1);
      Animated.timing(autoPassesTimerAnim, {
        toValue: 0,
        duration: 10000,
        useNativeDriver: false,
      }).start();

      autoPassesTimeoutRef.current = setTimeout(() => {
        setRecentAutoPassesChange(null);
      }, 10000);

      // Start auto reminder timer
      startAutoReminderTimer();
    }
  };

  const updateTeleOpPasses = (amount) => {
    const newValue = teleOpPasses + amount;
    if (newValue >= 0) {
      setTeleOpPasses(newValue);
      setRecentTeleOpPassesChange(prev => (prev || 0) + amount);

      if (teleOpPassesTimeoutRef.current) clearTimeout(teleOpPassesTimeoutRef.current);

      teleOpPassesTimerAnim.setValue(1);
      Animated.timing(teleOpPassesTimerAnim, {
        toValue: 0,
        duration: 10000,
        useNativeDriver: false,
      }).start();

      teleOpPassesTimeoutRef.current = setTimeout(() => {
        setRecentTeleOpPassesChange(null);
      }, 10000);

      // Stop auto reminder - user is in teleop now
      stopAutoReminder();
    }
  };

  const saveMatchData = async () => {
    try {
      const match = route.params.matchNum;
      const csvURI = `${FileSystem.documentDirectory}match${match}.csv`;
      let currData = await FileSystem.readAsStringAsync(csvURI);

      // Parse existing data properly (handles quoted fields with commas)
      const values = parseCSV(currData);
      if (!values || values.length < 7) {
        console.error("Failed to parse existing CSV data");
        return null;
      }

      // Rebuild CSV with shared comment field at index 6
      // New structure: Team, Match, TMA Key, Position, Alliance, Scout, Comments,
      //                Auto Fuel, Auto Passes, TeleOp Fuel, TeleOp Passes, Questions
      const newData = [
        values[0], // Team
        values[1], // Match
        values[2], // TMA Key
        values[3], // Position
        values[4], // Alliance
        values[5], // Scout
        escapeCSVField(commentValue || ''), // Shared comment (editable in both Pregame and Match)
        autoFuelScored,
        autoPasses,
        teleOpFuelScored,
        teleOpPasses,
        escapeCSVField(questionValue || ''),
      ].join(',');

      await FileSystem.writeAsStringAsync(csvURI, newData);
      console.log("Saved data:", newData);
      return newData;
    } catch (error) {
      console.error("Error saving data:", error);
      return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={async () => {
              await saveMatchData();
              navigation.goBack();
            }}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.questionButton}
              onPress={() => setIsQuestionModalVisible(true)}
            >
              <MaterialIcons name="live-help" size={28} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.commentButton}
              onPress={() => setIsCommentModalVisible(true)}
            >
              <MaterialIcons name="chat-bubble" size={28} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Match & Team Info */}
      <View style={styles.matchInfoContainer}>
        <Text style={styles.matchNumber}>Match {route.params.matchNum}</Text>
        <View style={[
          styles.teamBadge,
          driverStation?.charAt(0) === 'R' && styles.teamBadgeRed,
          driverStation?.charAt(0) === 'B' && styles.teamBadgeBlue,
        ]}>
          <Text style={styles.teamNumber}>Team {route.params.teamNum}</Text>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.mainContent}>
          {/* Auto Section */}
          <Animated.View style={[
            styles.section,
            styles.autoSection,
            autoReminderActive && {
              backgroundColor: autoFlashAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['#3d3520', '#8B0000'],
              }),
              borderColor: '#ff0000',
              borderWidth: 4,
            }
          ]}>
            <TouchableOpacity
              style={[styles.sectionHeader, styles.autoHeader]}
              onPress={() => {
                setAutoExpanded(!autoExpanded);
                if (autoExpanded) stopAutoReminder(); // Stop reminder when collapsing
              }}
            >
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>Auto</Text>
                {autoCountdown !== null && (
                  <View style={[
                    styles.countdownBadge,
                    autoCountdown === 0 && styles.countdownBadgeExpired
                  ]}>
                    <Text style={[
                      styles.countdownText,
                      autoCountdown === 0 && styles.countdownTextExpired
                    ]}>
                      {autoCountdown === 0 ? 'DONE' : `${autoCountdown}s`}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.sectionHeaderRight}>
                <Text style={[styles.sectionSummary, isTablet && styles.sectionSummaryTablet]}>
                  {autoFuelScored} fuel, {autoPasses} passes
                </Text>
                <Text style={styles.expandIcon}>{autoExpanded ? '−' : '+'}</Text>
              </View>
            </TouchableOpacity>

            {autoExpanded && (
              <>
                {/* Auto Fuel */}
                <View style={styles.subsectionHeader}>
                  <Text style={[styles.subsectionTitle, isTablet && styles.subsectionTitleTablet]}>Fuel Scored</Text>
                </View>
                <View style={[styles.subsectionContent, isTablet && styles.subsectionContentTablet]}>
                  <FuelCounter
                    value={autoFuelScored}
                    onUpdate={updateAutoFuel}
                    isTablet={isTablet}
                    recentChange={recentAutoChange}
                    timerAnim={autoTimerAnim}
                  />
                </View>

                {/* Auto Passes */}
                <View style={styles.subsectionHeader}>
                  <Text style={[styles.subsectionTitle, isTablet && styles.subsectionTitleTablet]}>Passes</Text>
                </View>
                <View style={[styles.subsectionContent, styles.subsectionContentLast, isTablet && styles.subsectionContentTablet]}>
                  <FuelCounter
                    value={autoPasses}
                    onUpdate={updateAutoPasses}
                    isTablet={isTablet}
                    recentChange={recentAutoPassesChange}
                    timerAnim={autoPassesTimerAnim}
                  />
                </View>
              </>
            )}
          </Animated.View>

          {/* TeleOp Section */}
          <View style={[styles.section, styles.teleOpSection]}>
            <TouchableOpacity
              style={[styles.sectionHeader, styles.teleOpHeader]}
              onPress={() => setTeleOpExpanded(!teleOpExpanded)}
            >
              <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>TeleOp</Text>
              <View style={styles.sectionHeaderRight}>
                <Text style={[styles.sectionSummary, isTablet && styles.sectionSummaryTablet]}>
                  {teleOpFuelScored} fuel, {teleOpPasses} passes
                </Text>
                <Text style={styles.expandIcon}>{teleOpExpanded ? '−' : '+'}</Text>
              </View>
            </TouchableOpacity>

            {teleOpExpanded && (
              <>
                {/* TeleOp Fuel */}
                <View style={styles.subsectionHeader}>
                  <Text style={[styles.subsectionTitle, isTablet && styles.subsectionTitleTablet]}>Fuel Scored</Text>
                </View>
                <View style={[styles.subsectionContent, isTablet && styles.subsectionContentTablet]}>
                  <FuelCounter
                    value={teleOpFuelScored}
                    onUpdate={updateTeleOpFuel}
                    isTablet={isTablet}
                    recentChange={recentTeleOpChange}
                    timerAnim={teleOpTimerAnim}
                  />
                </View>

                {/* TeleOp Passes */}
                <View style={styles.subsectionHeader}>
                  <Text style={[styles.subsectionTitle, isTablet && styles.subsectionTitleTablet]}>Passes</Text>
                </View>
                <View style={[styles.subsectionContent, styles.subsectionContentLast, isTablet && styles.subsectionContentTablet]}>
                  <FuelCounter
                    value={teleOpPasses}
                    onUpdate={updateTeleOpPasses}
                    isTablet={isTablet}
                    recentChange={recentTeleOpPassesChange}
                    timerAnim={teleOpPassesTimerAnim}
                  />
                </View>
              </>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={async () => {
              const data = await saveMatchData();
              if (data) {
                await Clipboard.setStringAsync(data);
                navigation.navigate("QRCode", {
                  matchNum: route.params.matchNum,
                  data: data,
                });
              }
            }}
          >
            <Text style={styles.buttonText}>Submit Match</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Comment Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isCommentModalVisible}
        onRequestClose={() => setIsCommentModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Match Comments</Text>
                <TextInput
                  style={styles.modalInput}
                  multiline
                  value={commentValue}
                  onChangeText={setCommentValue}
                  placeholder={"Enter match comments..."}
                  placeholderTextColor="rgba(255, 215, 0, 0.5)"
                  autoFocus={true}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton, { flex: 1 }]}
                    onPress={() => setIsCommentModalVisible(false)}
                  >
                    <Text style={styles.modalButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Question Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isQuestionModalVisible}
        onRequestClose={() => setIsQuestionModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Questions/Clarifications</Text>
                <TextInput
                  style={styles.modalInput}
                  multiline
                  value={questionValue}
                  onChangeText={setQuestionValue}
                  placeholder="Enter questions or clarifications..."
                  placeholderTextColor="rgba(255, 215, 0, 0.5)"
                  autoFocus={true}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton, { flex: 1 }]}
                    onPress={() => setIsQuestionModalVisible(false)}
                  >
                    <Text style={styles.modalButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

// Animated button component with press scale and haptic feedback
const AnimatedButton = ({ onPress, style, children, isTablet }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 8,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], flex: 1 }}>
      <TouchableOpacity
        style={style}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Fuel counter component with -10, -1, value, +1, +10 buttons
const FuelCounter = ({ value, onUpdate, isTablet, recentChange, timerAnim }) => {
  const valueScaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const prevRecentChange = useRef(recentChange);

  // Bounce animation when value changes
  useEffect(() => {
    Animated.sequence([
      Animated.timing(valueScaleAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(valueScaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 12,
      }),
    ]).start();
  }, [value]);

  // Fade in/out for recent change
  useEffect(() => {
    if (recentChange !== null && prevRecentChange.current === null) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else if (recentChange === null && prevRecentChange.current !== null) {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else if (recentChange !== null) {
      // Keep visible
      fadeAnim.setValue(1);
    }
    prevRecentChange.current = recentChange;
  }, [recentChange]);

  return (
    <View style={styles.fuelCounterContainer}>
      <View style={styles.fuelCounterRow}>
        <AnimatedButton
          style={[styles.fuelButton, styles.decrementButton, isTablet && styles.fuelButtonTablet]}
          onPress={() => onUpdate(-10)}
          isTablet={isTablet}
        >
          <Text style={[styles.fuelButtonText, isTablet && styles.fuelButtonTextTablet]}>-10</Text>
        </AnimatedButton>
        <AnimatedButton
          style={[styles.fuelButton, styles.decrementButton, isTablet && styles.fuelButtonTablet]}
          onPress={() => onUpdate(-1)}
          isTablet={isTablet}
        >
          <Text style={[styles.fuelButtonText, isTablet && styles.fuelButtonTextTablet]}>-1</Text>
        </AnimatedButton>
        <View style={[styles.fuelValueContainer, isTablet && styles.fuelValueContainerTablet]}>
          <Animated.Text
            style={[
              styles.fuelValue,
              isTablet && styles.fuelValueTablet,
              { transform: [{ scale: valueScaleAnim }] }
            ]}
          >
            {value}
          </Animated.Text>
        </View>
        <AnimatedButton
          style={[styles.fuelButton, styles.incrementButton, isTablet && styles.fuelButtonTablet]}
          onPress={() => onUpdate(1)}
          isTablet={isTablet}
        >
          <Text style={[styles.fuelButtonText, isTablet && styles.fuelButtonTextTablet]}>+1</Text>
        </AnimatedButton>
        <AnimatedButton
          style={[styles.fuelButton, styles.incrementButton, isTablet && styles.fuelButtonTablet]}
          onPress={() => onUpdate(10)}
          isTablet={isTablet}
        >
          <Text style={[styles.fuelButtonText, isTablet && styles.fuelButtonTextTablet]}>+10</Text>
        </AnimatedButton>
      </View>
      {/* Recent change indicator */}
      <View style={[styles.recentChangeContainer, isTablet && styles.recentChangeContainerTablet]}>
        <Animated.Text style={[
          styles.recentChangeText,
          isTablet && styles.recentChangeTextTablet,
          recentChange > 0 ? styles.recentChangePositive : styles.recentChangeNegative,
          { opacity: fadeAnim }
        ]}>
          {recentChange !== null ? (recentChange > 0 ? `+${recentChange}` : recentChange) : ' '}
        </Animated.Text>
      </View>
      {/* Timer bar */}
      {recentChange !== null && (
        <View style={styles.timerBarContainer}>
          <Animated.View
            style={[
              styles.timerBar,
              {
                width: timerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  headerContainer: {
    backgroundColor: colors.background,
    borderBottomWidth: 2,
    borderBottomColor: colors.black,
    height: Platform.OS === "android" ?
      StatusBar.currentHeight + 70 :
      80,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 10 : 25,
  },

  backButton: {
    backgroundColor: colors.black,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  backButtonText: {
    fontSize: 27,
    color: colors.primary,
    fontWeight: '900',
    lineHeight: 48,
    width: 48,
    textAlign: 'center',
    textAlignVertical: 'center',
  },

  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  questionButton: {
    backgroundColor: colors.black,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  commentButton: {
    backgroundColor: colors.black,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollViewContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },

  mainContent: {
    flex: 1,
  },

  matchInfoContainer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.background,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },

  matchNumber: {
    fontSize: 22,
    fontFamily: 'Cooper-Black',
    color: colors.black,
  },

  teamBadge: {
    backgroundColor: colors.black,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },

  teamBadgeRed: {
    backgroundColor: '#cc2222',
  },

  teamBadgeBlue: {
    backgroundColor: '#2255cc',
  },

  teamNumber: {
    fontSize: 20,
    fontFamily: 'Cooper-Black',
    color: colors.white,
  },

  section: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },

  autoSection: {
    backgroundColor: '#3d3520',
  },

  teleOpSection: {
    backgroundColor: '#202535',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },

  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  sectionSummary: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  sectionSummaryTablet: {
    fontSize: 16,
  },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  countdownBadge: {
    backgroundColor: '#ff6b00',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  countdownBadgeExpired: {
    backgroundColor: '#cc0000',
  },

  countdownText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  countdownTextExpired: {
    color: '#fff',
  },

  autoHeader: {
    backgroundColor: '#5a4a25',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },

  teleOpHeader: {
    backgroundColor: '#2a3550',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: colors.textPrimary,
  },

  sectionTitleTablet: {
    fontSize: 28,
  },

  sectionContent: {
    padding: 16,
  },

  sectionContentTablet: {
    padding: 30,
  },

  // Collapsible subsection styles
  subsectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },

  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  subsectionTitleTablet: {
    fontSize: 20,
  },

  subsectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  subsectionValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    minWidth: 30,
    textAlign: 'right',
  },

  subsectionValueTablet: {
    fontSize: 24,
    minWidth: 40,
  },

  expandIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textSecondary,
    width: 20,
    textAlign: 'center',
  },

  subsectionContent: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },

  subsectionContentLast: {
    borderBottomWidth: 0,
  },

  subsectionContentTablet: {
    padding: 24,
  },

  // Fuel counter styles
  fuelCounterContainer: {
    alignItems: 'center',
    width: '100%',
  },

  fuelCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },

  fuelButton: {
    flex: 1,
    height: 50,
    marginHorizontal: 3,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },

  fuelButtonTablet: {
    height: 80,
    marginHorizontal: 8,
    borderRadius: 8,
  },

  decrementButton: {
    backgroundColor: colors.redlight,
  },

  incrementButton: {
    backgroundColor: colors.greenlight,
  },

  fuelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.black,
  },

  fuelButtonTextTablet: {
    fontSize: 26,
  },

  fuelValueContainer: {
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },

  fuelValueContainerTablet: {
    minWidth: 100,
    marginHorizontal: 16,
  },

  fuelValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },

  fuelValueTablet: {
    fontSize: 56,
  },

  recentChangeContainer: {
    height: 24,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  recentChangeContainerTablet: {
    height: 36,
    marginTop: 12,
  },

  recentChangeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },

  recentChangeTextTablet: {
    fontSize: 26,
  },

  recentChangePositive: {
    color: '#22aa22',
  },

  recentChangeNegative: {
    color: '#cc4444',
  },

  timerBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: colors.surfaceBorder,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },

  timerBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },

  submitButton: {
    backgroundColor: colors.buttonPrimary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 20,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },

  buttonText: {
    color: colors.textOnPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },

  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    zIndex: 1000,
  },

  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    elevation: 5,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1001,
    borderWidth: 2,
    borderColor: colors.primary,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: colors.textPrimary,
  },

  modalInput: {
    backgroundColor: colors.surfaceLight,
    color: colors.textPrimary,
    borderRadius: 8,
    padding: 16,
    height: 300,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },

  modalButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },

  cancelButton: {
    backgroundColor: colors.buttonSecondary,
  },

  modalButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MatchScreen;
