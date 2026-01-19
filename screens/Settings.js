import { useState, useEffect } from "react";
import {
  Alert,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import Constants from "expo-constants";
import { colors } from "../components/colors";
import { useSettings } from "../contexts/SettingsContext";

const SettingsScreen = (props) => {
  const { navigation } = props;

  // Get settings from context
  const settings = useSettings();

  const [codeText, setCodeText] = useState();
  const [showScheduleCheckmark, setShowScheduleCheckmark] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [loadedEventCode, setLoadedEventCode] = useState(null);

  // Local editing state (initialized from context)
  const [nameText, setNameText] = useState();
  const [driverstation, setDriverstation] = useState();
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const scheduleFileUri = `${FileSystem.documentDirectory}MatchSchedule.json`;

  // Initialize local state from context when settings are loaded
  useEffect(() => {
    if (settings.isLoaded && !isInitialized) {
      setNameText(settings.scoutName);
      setDriverstation(settings.driverStation);
      setIsPracticeMode(settings.isPracticeMode);
      setIsInitialized(true);
    }
  }, [settings.isLoaded, isInitialized]);

  // Check for match schedule file on mount
  useEffect(() => {
    const checkMatchScheduleExists = async () => {
      const fileInfo = await FileSystem.getInfoAsync(scheduleFileUri);
      if (fileInfo.exists) {
        try {
          const scheduleData = await FileSystem.readAsStringAsync(scheduleFileUri);
          const parsedData = JSON.parse(scheduleData);
          const eventCode = parsedData.eventCode || parsedData.Schedule?.[0]?.eventCode;
          setLoadedEventCode(eventCode);
        } catch (err) {
          console.log("Error reading event code:", err);
        }
      }
    };
    checkMatchScheduleExists();
  }, []);

  // Save settings to context (which persists to file)
  async function handleSaveSettings() {
    await settings.saveSettings({
      scoutName: nameText,
      driverStation: driverstation,
      isPracticeMode: isPracticeMode,
    });
  }

  // Save match schedule to file
  async function downloadMatchSchedule() {
    if (!codeText) {
      alert("Please enter an event code.");
      return;
    }

    try {
      setShowScheduleCheckmark(false);
      const data = await getMatchSchedule();

      if (!data) {
        alert(
          "Failed to download match schedule. Please check the event code and try again."
        );
        return;
      }

      try {
        const parsedData = JSON.parse(data);
        parsedData.eventCode = codeText;
        const formattedJSON = JSON.stringify(parsedData, null, "\t");

        await FileSystem.writeAsStringAsync(scheduleFileUri, formattedJSON);
        setShowScheduleCheckmark(true);
        setLoadedEventCode(codeText);
        console.log("Match schedule saved successfully");
      } catch (e) {
        alert("Invalid data received from the server. Please try again.");
        console.error("JSON parsing error:", e);
      }
    } catch (error) {
      alert(
        "Error downloading match schedule. Please check your connection and try again."
      );
      console.error("Download error:", error);
    }
  }

  // Get match schedule from FIRST API
  async function getMatchSchedule() {
    try {
      if (!codeText || codeText.length < 8) {
        throw new Error(
          "Invalid event code format. Expected format: YYYYevent (e.g., 2024onwat)"
        );
      }

      const year = codeText.substring(0, 4);
      const eventCode = codeText.substring(4);

      var base64 = require("base-64");
      var username = Constants.expoConfig?.extra?.firstApiUsername;
      var password = Constants.expoConfig?.extra?.firstApiPassword;

      if (!username || !password) {
        throw new Error(
          "FIRST API credentials not configured. Please set FIRST_API_USERNAME and FIRST_API_PASSWORD in .env"
        );
      }

      var requestOptions = {
        method: "GET",
        headers: {
          Authorization: "Basic " + base64.encode(username + ":" + password),
          "If-Modified-Since": "",
        },
        redirect: "follow",
      };

      const response = await fetch(
        `https://frc-api.firstinspires.org/v3.0/${year}/schedule/${eventCode}?tournamentLevel=qual`,
        requestOptions
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.text();
      return data;
    } catch (error) {
      console.error("Error in getMatchSchedule:", error);
      return null;
    }
  }

  // Update scout name
  const handleNameChange = (text) => {
    setNameText(text);
    setHasUnsavedChanges(
      text !== settings.scoutName ||
        driverstation !== settings.driverStation ||
        isPracticeMode !== settings.isPracticeMode
    );
  };

  // Update driver station
  const handleDriverstationChange = (station) => {
    setDriverstation(station);
    setShowPicker(false);
    setHasUnsavedChanges(
      nameText !== settings.scoutName ||
        station !== settings.driverStation ||
        isPracticeMode !== settings.isPracticeMode
    );
  };

  // Update if app is in practice mode
  const handlePracticeModeChange = (value) => {
    setIsPracticeMode((prev) => !prev);
    setHasUnsavedChanges(
      nameText !== settings.scoutName ||
        driverstation !== settings.driverStation ||
        value !== settings.isPracticeMode
    );
  };

  // Show alert if there are unsaved changes when user presses back button
  const handleBackPress = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Are you sure you want to go back?",
        [
          {
            text: "Stay",
            style: "cancel",
          },
          {
            text: "Discard Changes",
            style: "destructive",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  // Clear match data from filesystem
  const clearAllMatchData = async () => {
    try {
      // Get all files in the document directory
      const files = await FileSystem.readDirectoryAsync(
        FileSystem.documentDirectory
      );

      // Filter for match CSV files
      const matchFiles = files.filter(
        (file) => file.startsWith("match") && file.endsWith(".csv")
      );

      // Delete each match file
      for (const file of matchFiles) {
        await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${file}`);
      }

      Alert.alert("Success", `Cleared data for ${matchFiles.length} matches`, [
        { text: "OK" },
      ]);
    } catch (error) {
      console.error("Error clearing match data:", error);
      Alert.alert("Error", "Failed to clear match data", [{ text: "OK" }]);
    }
  };

  // Show alert before clearing match data
  const confirmClearData = () => {
    Alert.alert(
      "Clear All Match Data",
      "Are you sure you want to delete all saved match data? This cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear",
          onPress: clearAllMatchData,
          style: "destructive",
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Sticky Header */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        {/* Import Match Schedule Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Import Match Schedule</Text>
          <Text style={styles.warning}>DO NOT TOUCH IF AT EVENT</Text>

          {loadedEventCode && (
            <View style={styles.eventCodeDisplay}>
              <Text style={styles.eventCodeLabel}>Current Event:</Text>
              <Text style={[styles.smallerButtonText, styles.blackText]}>
                {loadedEventCode}
              </Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              onChangeText={setCodeText}
              value={codeText}
              placeholder="Enter Event Code (e.g., 2024onwat)"
              placeholderTextColor="rgba(255, 215, 0, 0.5)"
            />
            {showScheduleCheckmark && (
              <Image
                style={styles.checkmark}
                source={require("../assets/images/checkmark-icon.png")}
              />
            )}
          </View>

          <Text style={styles.helperText}>
            Format: YYYYeventcode (e.g., 2024onwat)
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={downloadMatchSchedule}
          >
            <Text style={[styles.smallerButtonText, styles.yellowText]}>
              Import Using Event Code
            </Text>
          </TouchableOpacity>
        </View>

        {/* Scout Name Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scout Name</Text>
          <Text style={styles.warning}>*MUST SET</Text>
          <TextInput
            style={styles.input}
            onChangeText={handleNameChange}
            value={nameText == "undefined" ? undefined : nameText}
            placeholder="Scout Name"
            placeholderTextColor="rgba(255, 215, 0, 0.5)"
          />
        </View>

        {/* Driver Station Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Driver Station</Text>
          <Text style={styles.warning}>*MUST SET</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setShowPicker(!showPicker)}
          >
            <Text style={[styles.smallerButtonText, styles.yellowText]}>
              {driverstation ? driverstation : "Select Driver Station..."}
            </Text>
          </TouchableOpacity>

          {showPicker && (
            <View style={styles.stationPicker}>
              <View style={[styles.stations, styles.redStations]}>
                {["R1", "R2", "R3"].map((station) => (
                  <TouchableOpacity
                    key={station}
                    style={styles.stationOption}
                    onPress={() => handleDriverstationChange(station)}
                  >
                    <Text style={[styles.biggerButtonText, styles.blackText]}>
                      {station}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={[styles.stations, styles.blueStations]}>
                {["B1", "B2", "B3"].map((station) => (
                  <TouchableOpacity
                    key={station}
                    style={styles.stationOption}
                    onPress={() => handleDriverstationChange(station)}
                  >
                    <Text style={[styles.biggerButtonText, styles.blackText]}>
                      {station}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Practice Mode Section */}
        <View style={styles.section}>
          <View style={styles.sectionFlexRow}>
            <Text style={styles.sectionTitle}>Practice Mode</Text>
            <Switch
              trackColor={{ false: colors.buttonSecondary, true: colors.black }}
              thumbColor={isPracticeMode ? colors.primary : colors.graylight}
              onValueChange={handlePracticeModeChange}
              value={isPracticeMode}
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={async () => {
            await handleSaveSettings();
            setHasUnsavedChanges(false);
            navigation.navigate("Home");
          }}
        >
          <Text style={[styles.biggerButtonText, styles.yellowText]}>
            Save Settings
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Clear Match Data Section */}
      <View style={styles.dangerZone}>
        <Text style={[styles.warning, styles.dangerZoneTitle]}>
          Danger Zone
        </Text>
        <TouchableOpacity
          style={styles.clearDataButton}
          onPress={confirmClearData}
        >
          <Text style={[styles.smallerButtonText, styles.whiteText]}>
            Clear All Match Data
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Settings stylesheet
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  headerContainer: {
    borderBottomWidth: 2,
    borderBottomColor: colors.black,
    height: Platform.OS === "android" ? StatusBar.currentHeight + 70 : 80,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    bottom: 15,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 10 : 25,
  },

  scrollView: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  scrollViewContent: {
    paddingBottom: 20,
  },

  title: {
    flex: 1,
    fontSize: 28,
    fontFamily: "Cooper-Black",
    color: colors.black,
    textAlign: "center",
    marginRight: 32,
  },

  backButton: {
    backgroundColor: colors.black,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: 30,
    color: colors.primary,
    fontWeight: "900",
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },

  section: {
    marginBottom: 24,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },

  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 5,
  },

  sectionFlexRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  warning: {
    fontSize: 14,
    color: "#FF0000",
    fontWeight: "bold",
    marginBottom: 10,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  input: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    color: colors.textPrimary,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },

  checkmark: {
    width: 24,
    height: 24,
    marginLeft: 10,
  },

  button: {
    backgroundColor: colors.buttonPrimary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },

  smallerButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },

  biggerButtonText: {
    fontSize: 18,
    fontWeight: "bold",
  },

  whiteText: {
    color: colors.white,
  },

  blackText: {
    color: colors.textOnPrimary,
  },

  yellowText: {
    color: colors.textOnPrimary,
  },

  stationPicker: {
    marginTop: 10,
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },

  stations: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 16,
  },

  redStations: {
    backgroundColor: colors.redAlliance,
  },

  blueStations: {
    backgroundColor: colors.blueAlliance,
  },

  stationOption: {
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    minWidth: 60,
    alignItems: "center",
  },

  saveButton: {
    marginTop: 20,
  },

  eventCodeDisplay: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  eventCodeLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginRight: 8,
  },

  helperText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 10,
  },

  dangerZone: {
    marginTop: 20,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#ff0000",
  },

  dangerZoneTitle: {
    fontSize: 18,
  },

  clearDataButton: {
    backgroundColor: "#ff0000",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
});

export default SettingsScreen;
