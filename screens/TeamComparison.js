import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  TextInput,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from "../components/colors";
import { parseCSV, escapeCSVField } from "../utils/csv";

const COMPARISON_OPTIONS = [
  { label: "Way Better", value: 2, color: "#1a5c1a" },
  { label: "Better", value: 1, color: "#2d7a2d" },
  { label: "About the Same", value: 0, color: "#444444" },
  { label: "Worse", value: -1, color: "#7a2d2d" },
  { label: "Way Worse", value: -2, color: "#5c1a1a" },
];

const SCOUT_HISTORY_FILE = FileSystem.documentDirectory + "scoutHistory.json";

const TeamComparisonScreen = (props) => {
  const { navigation, route } = props;
  const { matchNum, data, currentTeam, previousTeam, scoutName } = route.params;

  const [selectedOption, setSelectedOption] = useState(null);
  const [isQuestionModalVisible, setIsQuestionModalVisible] = useState(false);

  // Initialize questionValue from existing data (index 11)
  const initialQuestion = (() => {
    const values = parseCSV(data);
    return values && values.length > 11 ? values[11] : '';
  })();
  const [questionValue, setQuestionValue] = useState(initialQuestion);

  const saveScoutHistory = async () => {
    try {
      const history = { scoutName, teamNum: currentTeam, timestamp: Date.now() };
      await FileSystem.writeAsStringAsync(SCOUT_HISTORY_FILE, JSON.stringify(history));
    } catch (error) {
      console.error("Error saving scout history:", error);
    }
  };

  const handleSelect = (value) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOption(value);
  };

  const handleContinue = async () => {
    if (selectedOption === null) {
      Alert.alert("Select an Option", "Please select how this team compared to the previous team.");
      return;
    }

    // Update the question field (index 11) in the data before adding comparison
    const values = parseCSV(data);
    if (values && values.length >= 12) {
      values[11] = escapeCSVField(questionValue || '');
    }
    const dataWithQuestion = values ? values.join(',') : data;

    // CSV format: currentTeam,previousTeam,result (3 separate fields)
    const updatedData = `${dataWithQuestion},${currentTeam},${previousTeam},${selectedOption}`;
    const csvURI = `${FileSystem.documentDirectory}match${matchNum}.csv`;
    await FileSystem.writeAsStringAsync(csvURI, updatedData);

    // Save scout history now that comparison is complete
    await saveScoutHistory();

    navigation.navigate("QRCode", {
      matchNum: matchNum,
      data: updatedData,
    });
  };

  const handleSkip = () => {
    Alert.alert(
      "Skip Comparison?",
      "Are you sure? Brennan might be disappointed in you...",
      [
        { text: "Go Back", style: "cancel" },
        {
          text: "Skip Anyway",
          style: "destructive",
          onPress: async () => {
            // Update the question field (index 11) in the data before adding comparison
            const values = parseCSV(data);
            if (values && values.length >= 12) {
              values[11] = escapeCSVField(questionValue || '');
            }
            const dataWithQuestion = values ? values.join(',') : data;

            // CSV format: currentTeam,previousTeam,result (3 separate fields)
            const updatedData = `${dataWithQuestion},${currentTeam},${previousTeam},skipped`;
            const csvURI = `${FileSystem.documentDirectory}match${matchNum}.csv`;
            await FileSystem.writeAsStringAsync(csvURI, updatedData);

            // Save scout history now that comparison is complete (even if skipped)
            await saveScoutHistory();

            navigation.navigate("QRCode", {
              matchNum: matchNum,
              data: updatedData,
            });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.statusBarBackground}>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.headerContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Compare Teams</Text>
          <TouchableOpacity
            style={styles.questionButton}
            onPress={() => setIsQuestionModalVisible(true)}
          >
            <MaterialIcons name="live-help" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Teams Side by Side */}
        <View style={styles.teamsContainer}>
          <View style={styles.teamCard}>
            <Text style={styles.teamLabel}>Current</Text>
            <Text style={styles.teamNumber}>{currentTeam}</Text>
          </View>

          <Text style={styles.vsText}>vs</Text>

          <View style={[styles.teamCard, styles.previousTeamCard]}>
            <Text style={styles.teamLabel}>Previous</Text>
            <Text style={styles.teamNumber}>{previousTeam}</Text>
          </View>
        </View>

        {/* Question */}
        <Text style={styles.questionText}>
          How was {currentTeam} compared to {previousTeam}?
        </Text>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {COMPARISON_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionButton,
                { backgroundColor: option.color },
                selectedOption === option.value && styles.optionButtonSelected,
              ]}
              onPress={() => handleSelect(option.value)}
            >
              {selectedOption === option.value && <Text style={styles.checkmark}>✓</Text>}
              <Text style={styles.optionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.continueButton, selectedOption === null && styles.continueButtonDisabled]}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
                    style={[styles.modalButton, styles.closeButton]}
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
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  statusBarBackground: {
    flex: 1,
    backgroundColor: colors.black,
  },

  safeArea: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  headerContainer: {
    backgroundColor: colors.black,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    height: Platform.OS === "android" ? StatusBar.currentHeight + 75 : 85,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 15,
    zIndex: 10,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "absolute",
    bottom: 18,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 10 : 25,
  },

  backButton: {
    backgroundColor: colors.surface,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.primary,
  },

  backButtonText: {
    fontSize: 27,
    color: colors.primary,
    fontWeight: "900",
  },

  questionButton: {
    backgroundColor: colors.surface,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.primary,
  },

  title: {
    fontSize: 24,
    fontFamily: "Cooper-Black",
    color: colors.primary,
    textAlign: "center",
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  teamsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    gap: 16,
  },

  teamCard: {
    flex: 1,
    backgroundColor: colors.black,
    padding: 20,
    borderRadius: 8,
    alignItems: "center",
  },

  previousTeamCard: {
    backgroundColor: "#333333",
  },

  teamLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
  },

  teamNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.primary,
  },

  vsText: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.black,
  },

  questionText: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.black,
    textAlign: "center",
    marginBottom: 24,
  },

  optionsContainer: {
    marginBottom: 32,
    gap: 10,
  },

  optionButton: {
    padding: 18,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 4,
    borderColor: "transparent",
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },

  optionButtonSelected: {
    borderColor: "#ffffff",
    transform: [{ scale: 1.02 }],
  },

  optionText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },

  checkmark: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
  },

  buttonsContainer: {
    gap: 12,
  },

  continueButton: {
    backgroundColor: colors.black,
    padding: 18,
    borderRadius: 8,
    alignItems: "center",
  },

  continueButtonDisabled: {
    opacity: 0.4,
  },

  continueButtonText: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: "bold",
  },

  skipButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.black,
  },

  skipButtonText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: "600",
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 60 : 40,
  },

  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    maxHeight: "80%",
    borderWidth: 2,
    borderColor: colors.primary,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: "center",
  },

  modalInput: {
    backgroundColor: colors.surfaceLight,
    color: colors.textPrimary,
    borderRadius: 8,
    padding: 16,
    height: 200,
    fontSize: 16,
    textAlignVertical: "top",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },

  modalButtons: {
    flexDirection: "row",
    justifyContent: "center",
  },

  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  closeButton: {
    backgroundColor: colors.buttonSecondary,
  },

  modalButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default TeamComparisonScreen;
