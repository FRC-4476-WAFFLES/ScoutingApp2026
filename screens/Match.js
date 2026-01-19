import { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    TouchableOpacity,
    Image,
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
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from "../components/colors";

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

  // Simplified state - just fuel scored
  const [autoFuelScored, setAutoFuelScored] = useState(0);
  const [teleOpFuelScored, setTeleOpFuelScored] = useState(0);

  const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
  const [commentValue, setCommentValue] = useState('');

  const [isQuestionModalVisible, setIsQuestionModalVisible] = useState(false);
  const [questionValue, setQuestionValue] = useState('');

  const [driverStation, setDriverStation] = useState(null);
  const [isTablet, setIsTablet] = useState(false);

  // Recent change tracking
  const [recentAutoChange, setRecentAutoChange] = useState(null);
  const [recentTeleOpChange, setRecentTeleOpChange] = useState(null);
  const autoTimeoutRef = useRef(null);
  const teleOpTimeoutRef = useRef(null);
  const autoTimerAnim = useRef(new Animated.Value(0)).current;
  const teleOpTimerAnim = useRef(new Animated.Value(0)).current;

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
    };
  }, []);

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

          const values = data.split(',').map(val => val.replace(/^"|"$/g, ''));
          console.log("Split values:", values);

          // Load fuel scores (indices 7 and 8)
          if (values.length >= 9) {
            const auto = parseInt(values[7]);
            const teleOp = parseInt(values[8]);

            if (!isNaN(auto)) setAutoFuelScored(auto);
            if (!isNaN(teleOp)) setTeleOpFuelScored(teleOp);

            // Comments & Questions (indices 9-10)
            if (values.length > 9) {
              setCommentValue(values[9] || '');
            }
            if (values.length > 10) {
              setQuestionValue(values[10] || '');
            }

            console.log("Successfully loaded match data");
          }
        } catch (error) {
          console.error('Error loading match data:', error);
        }
      }
    };

    loadExistingMatchData();
  }, [route.params?.matchNum]);

  useEffect(() => {
    const loadDriverStation = async () => {
      try {
        const settingsFileUri = `${FileSystem.documentDirectory}ScoutingAppSettings.json`;
        let settingsJSON = await JSON.parse(
          await FileSystem.readAsStringAsync(settingsFileUri)
        );
        setDriverStation(settingsJSON["Settings"]["driverStation"]);
      } catch (err) {
        console.log("Error loading driver station:", err);
      }
    };

    loadDriverStation();
  }, []);

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
    }
  };

  const saveMatchData = async () => {
    try {
      const match = route.params.matchNum;
      const csvURI = `${FileSystem.documentDirectory}match${match}.csv`;
      let currData = await FileSystem.readAsStringAsync(csvURI);

      // Split and get team info (first 7 fields)
      const values = currData.split(',');
      const teamInfo = values.slice(0, 7).join(',');

      // Build the new data string
      const newData = [
        teamInfo,
        autoFuelScored,
        teleOpFuelScored,
        `"${commentValue || ''}"`,
        `"${questionValue || ''}"`,
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
          <Text style={styles.title}>Match {route.params.matchNum}</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.questionButton}
              onPress={() => setIsQuestionModalVisible(true)}
            >
              <MaterialIcons name="help" size={30} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.commentButton}
              onPress={() => setIsCommentModalVisible(true)}
            >
              <Image
                source={require("../assets/images/comment-icon.png")}
                style={styles.commentIcon}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Team Number Header */}
      <View style={[
        styles.teamHeaderContainer,
        driverStation && { backgroundColor: getAllianceColor(driverStation) }
      ]}>
        <Text style={[
          styles.teamHeader,
          { color: getAllianceTextColor(driverStation) }
        ]}>
          Team {route.params.teamNum}
        </Text>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.mainContent}>
          {/* Auto Fuel Section */}
          <View style={[styles.section, styles.autoSection]}>
            <View style={[styles.sectionHeader, styles.autoHeader]}>
              <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>Auto Fuel Scored</Text>
            </View>
            <View style={[styles.sectionContent, isTablet && styles.sectionContentTablet]}>
              <FuelCounter
                value={autoFuelScored}
                onUpdate={updateAutoFuel}
                isTablet={isTablet}
                recentChange={recentAutoChange}
                timerAnim={autoTimerAnim}
              />
            </View>
          </View>

          {/* TeleOp Fuel Section */}
          <View style={[styles.section, styles.teleOpSection]}>
            <View style={[styles.sectionHeader, styles.teleOpHeader]}>
              <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>TeleOp Fuel Scored</Text>
            </View>
            <View style={[styles.sectionContent, isTablet && styles.sectionContentTablet]}>
              <FuelCounter
                value={teleOpFuelScored}
                onUpdate={updateTeleOpFuel}
                isTablet={isTablet}
                recentChange={recentTeleOpChange}
                timerAnim={teleOpTimerAnim}
              />
            </View>
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

// Fuel counter component with -10, -1, value, +1, +10 buttons
const FuelCounter = ({ value, onUpdate, isTablet, recentChange, timerAnim }) => (
  <View style={styles.fuelCounterContainer}>
    <View style={styles.fuelCounterRow}>
      <TouchableOpacity
        style={[styles.fuelButton, styles.decrementButton, isTablet && styles.fuelButtonTablet]}
        onPress={() => onUpdate(-10)}
      >
        <Text style={[styles.fuelButtonText, isTablet && styles.fuelButtonTextTablet]}>-10</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.fuelButton, styles.decrementButton, isTablet && styles.fuelButtonTablet]}
        onPress={() => onUpdate(-1)}
      >
        <Text style={[styles.fuelButtonText, isTablet && styles.fuelButtonTextTablet]}>-1</Text>
      </TouchableOpacity>
      <View style={[styles.fuelValueContainer, isTablet && styles.fuelValueContainerTablet]}>
        <Text style={[styles.fuelValue, isTablet && styles.fuelValueTablet]}>{value}</Text>
      </View>
      <TouchableOpacity
        style={[styles.fuelButton, styles.incrementButton, isTablet && styles.fuelButtonTablet]}
        onPress={() => onUpdate(1)}
      >
        <Text style={[styles.fuelButtonText, isTablet && styles.fuelButtonTextTablet]}>+1</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.fuelButton, styles.incrementButton, isTablet && styles.fuelButtonTablet]}
        onPress={() => onUpdate(10)}
      >
        <Text style={[styles.fuelButtonText, isTablet && styles.fuelButtonTextTablet]}>+10</Text>
      </TouchableOpacity>
    </View>
    {/* Recent change indicator */}
    <View style={[styles.recentChangeContainer, isTablet && styles.recentChangeContainerTablet]}>
      {recentChange !== null && (
        <Text style={[
          styles.recentChangeText,
          isTablet && styles.recentChangeTextTablet,
          recentChange > 0 ? styles.recentChangePositive : styles.recentChangeNegative
        ]}>
          {recentChange > 0 ? `+${recentChange}` : recentChange}
        </Text>
      )}
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

  title: {
    flex: 1,
    fontSize: 28,
    fontFamily: 'Cooper-Black',
    color: colors.black,
    textAlign: "center",
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

  commentIcon: {
    width: 30,
    height: 30,
    tintColor: colors.primary,
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

  teamHeaderContainer: {
    padding: 15,
    borderBottomWidth: 2,
    borderBottomColor: colors.black,
    backgroundColor: colors.surface,
    zIndex: 1,
  },

  teamHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: colors.textPrimary,
  },

  section: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },

  autoSection: {
    backgroundColor: colors.surface,
  },

  teleOpSection: {
    backgroundColor: colors.surface,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },

  autoHeader: {
    backgroundColor: 'rgba(255, 180, 50, 0.3)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  teleOpHeader: {
    backgroundColor: colors.surfaceLight,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    borderRadius: 10,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  fuelButtonTablet: {
    height: 80,
    marginHorizontal: 8,
    borderRadius: 16,
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
    borderRadius: 12,
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
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },

  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
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
    borderRadius: 12,
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
    borderRadius: 12,
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
