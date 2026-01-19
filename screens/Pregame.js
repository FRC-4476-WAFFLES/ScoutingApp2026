import { useState, useEffect } from "react";
import {
  Dimensions,
  Image,
  Keyboard,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { colors } from "../components/colors";

const PregameScreen = (props) => {
  const { navigation, route } = props;

  const [matchNum, setMatchNum] = useState();
  const [teamNum, setTeamNum] = useState();
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const updateLayout = () => {
      const dim = Dimensions.get('screen');
      setIsTablet(Math.min(dim.width, dim.height) >= 600);
    };
    updateLayout();
    const subscription = Dimensions.addEventListener('change', updateLayout);
    return () => subscription.remove();
  }, []);

  const [scoutName, setScoutName] = useState();
  const [driverStation, setDriverStation] = useState();
  const [isPracticeMode, setIsPracticeMode] = useState(false);

  const [isNameModalVisible, setIsNameModalVisible] = useState(false);
  const [tempScoutName, setTempScoutName] = useState("");

  const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
  const [commentValue, setCommentValue] = useState("");

  const [isInitialized, setIsInitialized] = useState(false);

  const [maxMatchNum, setMaxMatchNum] = useState(0);
  const [minMatchNum, setMinMatchNum] = useState(1);

  const scheduleFileUri = `${
    FileSystem.documentDirectory
  }${"MatchSchedule.json"}`;
  const scheduleCsvUri = `${
    FileSystem.documentDirectory
  }${"MatchScheduleCsv.json"}`;
  const settingsFileUri = `${
    FileSystem.documentDirectory
  }${"ScoutingAppSettings.json"}`;

  const apiStations = {
    R1: "Red1",
    R2: "Red2",
    R3: "Red3",
    B1: "Blue1",
    B2: "Blue2",
    B3: "Blue3",
  };

  // Update match number, update team number, and clear comment on mount
  useEffect(() => {
    if (route.params?.matchNum) {
      setMatchNum(route.params.matchNum);
      setCommentValue("");
      if (!isPracticeMode) {
        findMatch();
      } else {
        setTeamNum(undefined);
      }
    }
  }, [route.params]);

  // Read from settings file and set scout info on mount
  useEffect(() => {
    const loadScoutInfo = async () => {
      try {
        let settingsJSON = await JSON.parse(
          await FileSystem.readAsStringAsync(settingsFileUri)
        );
        setScoutName(settingsJSON["Settings"]["scoutName"]);
        setDriverStation(settingsJSON["Settings"]["driverStation"]);
        setIsPracticeMode(settingsJSON["Settings"]["isPracticeMode"]);
      } catch (err) {
        console.log("No Settings File Saved.");
      }
    };

    loadScoutInfo();
  }, []);

  // Determine the range of matches for the event on mount
  useEffect(() => {
    const loadMatchRange = async () => {
      try {
        let tmp = await FileSystem.getInfoAsync(scheduleCsvUri);

        if (!tmp.exists) {
          let tmp1 = await FileSystem.getInfoAsync(scheduleFileUri);
          if (tmp1.exists) {
            let jsontext = await FileSystem.readAsStringAsync(scheduleFileUri);
            let matchjson = await JSON.parse(jsontext);
            setMaxMatchNum(matchjson["Schedule"].length);
          }
        } else {
          let jsontext = await FileSystem.readAsStringAsync(scheduleCsvUri);
          let matchjson = await JSON.parse(jsontext);
          setMaxMatchNum(matchjson["Schedule"].length);
        }
      } catch (error) {
        console.error("Error loading match range:", error);
      }
    };

    loadMatchRange();
  }, []);

  // Load saved comments from filesystem when match number changes
  useEffect(() => {
    const loadExistingComment = async () => {
      if (!isInitialized && matchNum) {
        try {
          const csvURI = `${FileSystem.documentDirectory}match${matchNum}.csv`;
          const exists = await FileSystem.getInfoAsync(csvURI);

          if (exists.exists) {
            const data = await FileSystem.readAsStringAsync(csvURI);
            const values = data.split(",");
            const existingComment = values[values.length - 1];

            if (existingComment && existingComment !== `""`) {
              setCommentValue(existingComment.replace(/^"|"$/g, ""));
            } else {
              setCommentValue("");
            }
          } else {
            setCommentValue("");
          }

          setIsInitialized(true);
        } catch (error) {
          console.error("Error loading existing comment:", error);
          setCommentValue("");
        }
      }
    };

    loadExistingComment();
  }, [matchNum, isInitialized]);

  // Clear comments when match number changes
  useEffect(() => {
    setCommentValue("");
    setIsInitialized(false);
  }, [matchNum]);

  // Return red or blue depending on the alliance
  const getAllianceColor = (driverStation) => {
    if (!driverStation) return null;
    return driverStation.charAt(0) === "R"
      ? colors.redAlliance
      : colors.blueAlliance;
  };

  const getAllianceTextColor = (driverStation) => {
    if (!driverStation) return colors.textPrimary;
    return driverStation.charAt(0) === "R"
      ? colors.redAllianceText
      : colors.blueAllianceText;
  };

  const openNameModal = () => {
    setTempScoutName(scoutName || "");
    setIsNameModalVisible(true);
  };

  const saveNameAndClose = async () => {
    await updateScoutName(tempScoutName);
    setIsNameModalVisible(false);
  };

  // Save scout name to settings file
  const updateScoutName = async (newName) => {
    try {
      let settingsJSON = await JSON.parse(
        await FileSystem.readAsStringAsync(settingsFileUri)
      );
      settingsJSON["Settings"]["scoutName"] = newName;
      await FileSystem.writeAsStringAsync(
        settingsFileUri,
        JSON.stringify(settingsJSON, null, 2)
      );
      setScoutName(newName);
    } catch (err) {
      console.log("Error updating scout name:", err);
      alert("Failed to save scout name. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }}>
        {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.backButtonText}>←</Text>
              </TouchableOpacity>
              <Text style={[styles.title, { marginHorizontal: 32 }]}>
                Pre-Game
              </Text>
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

          <ScrollView
            style={[styles.scrollView, isTablet && styles.scrollViewTablet]}
            contentContainerStyle={[styles.scrollViewContent, isTablet && styles.scrollViewContentTablet]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* Match Info Row */}
            <View style={[styles.rowContainer, isTablet && styles.rowContainerTablet]}>
              {/* Match Number Section */}
              <View style={[styles.section, isTablet && styles.sectionTablet, styles.halfSection, isTablet && styles.halfSectionTablet]}>
                <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>Match Number</Text>
                <TextInput
                  style={[styles.input, isTablet && styles.inputTablet]}
                  onChangeText={(text) => {
                    const num = parseInt(text);
                    if (!text) {
                      setMatchNum(undefined);
                      setCommentValue("");
                    } else if (num >= minMatchNum && num <= maxMatchNum) {
                      setMatchNum(num);
                      setCommentValue("");
                    }
                  }}
                  value={matchNum ? String(matchNum) : undefined}
                  placeholder={`Enter match (${minMatchNum}-${maxMatchNum})...`}
                  placeholderTextColor="rgba(255, 215, 0, 0.5)"
                  keyboardType="numeric"
                />

                {/* Find Match Button */}
                {!isPracticeMode && (
                  <TouchableOpacity
                    style={[styles.button, isTablet && styles.buttonTablet]}
                    onPress={async () => await findMatch()}
                  >
                    <Text style={[styles.smallerButtonText, isTablet && styles.smallerButtonTextTablet]}>Find Match</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Team Display Section */}
              <View style={[styles.section, isTablet && styles.sectionTablet, styles.halfSection, isTablet && styles.halfSectionTablet]}>
                <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>Team Number</Text>
                {/* Text input in practice mode, normal text otherwise */}
                {isPracticeMode ? (
                  <TextInput
                    style={[styles.input, isTablet && styles.inputTablet]}
                    onChangeText={(text) => {
                      const num = parseInt(text);
                      if (!text) {
                        setTeamNum(undefined);
                      } else {
                        setTeamNum(num);
                      }
                    }}
                    value={teamNum ? String(teamNum) : undefined}
                    placeholder={`Enter team number...`}
                    placeholderTextColor="rgba(255, 215, 0, 0.5)"
                    keyboardType="numeric"
                  />
                ) : (
                  <View
                    style={[
                      styles.teamContainer,
                      driverStation && {
                        backgroundColor: getAllianceColor(driverStation),
                      },
                    ]}
                  >
                    {teamNum ? (
                      <Text
                        style={[
                          styles.teamNumber,
                          { color: getAllianceTextColor(driverStation) },
                        ]}
                      >
                        {teamNum}
                      </Text>
                    ) : (
                      <View>
                        <Text style={styles.label}>
                          Enter match number and press Find Match
                        </Text>
                        <Text style={styles.matchRangeText}>
                          Valid matches: {minMatchNum}-{maxMatchNum}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>

            {/* Scout Info Section */}
            <View style={[styles.section, isTablet && styles.sectionTablet, { marginBottom: isTablet ? 24 : 12 }]}>
              <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>Scout Information</Text>

              {/* Scout Name Button */}
              <TouchableOpacity
                style={[styles.scoutNameButton, isTablet && styles.scoutNameButtonTablet]}
                onPress={openNameModal}
              >
                <Text style={[styles.biggerButtonText, isTablet && styles.biggerButtonTextTablet]}>
                  {scoutName || "Set Scout Name..."}
                </Text>
              </TouchableOpacity>

              {/* Driver Station Display */}
              <View
                style={[
                  styles.stationDisplay,
                  isTablet && styles.stationDisplayTablet,
                  driverStation && { backgroundColor: getAllianceColor(driverStation) },
                ]}
              >
                <Text
                  style={[
                    styles.biggerButtonText,
                    isTablet && styles.biggerButtonTextTablet,
                    { color: getAllianceTextColor(driverStation) },
                  ]}
                >
                  {driverStation || "Driver Station Not Set"}
                </Text>
              </View>
            </View>

            {/* Scout Name Edit Modal */}
            <Modal
              animationType="fade"
              transparent={true}
              visible={isNameModalVisible}
              onRequestClose={() => setIsNameModalVisible(false)}
            >
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.modalOverlay}>
                  <TouchableWithoutFeedback>
                    <View style={[styles.modalContent, { marginTop: "10%" }]}>
                      <Text style={styles.modalTitle}>Edit Scout Name</Text>
                      <TextInput
                        style={styles.nameModalInput}
                        value={tempScoutName}
                        onChangeText={setTempScoutName}
                        placeholder="Enter scout name..."
                        placeholderTextColor="rgba(255, 215, 0, 0.5)"
                        textAlign="center"
                        autoFocus={true}
                      />
                      <View style={styles.modalButtons}>
                        <TouchableOpacity
                          style={[styles.modalButton, styles.cancelButton]}
                          onPress={() => setIsNameModalVisible(false)}
                        >
                          <Text style={[styles.smallerButtonText, styles.cancelButtonText]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.modalButton, styles.saveButton]}
                          onPress={saveNameAndClose}
                        >
                          <Text style={[styles.smallerButtonText, styles.saveButtonText]}>Save</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </TouchableWithoutFeedback>
            </Modal>

            {/* Start Match Button */}
            <TouchableOpacity
              style={[
                styles.button,
                isTablet && styles.buttonTablet,
                styles.submitButton,
                (!matchNum || !teamNum) && styles.submitButtonDisabled,
              ]}
              onPress={async () => {
                if (!matchNum || !teamNum) {
                  alert("Please enter a match number and find your team first");
                  return;
                }
                try {
                  await submitPrematch();
                  navigation.navigate("Match", {
                    matchNum: matchNum,
                    teamNum: teamNum,
                  });
                } catch (error) {
                  console.error("Error in submitPrematch:", error);
                  alert(
                    "Error starting match. Please check your settings and try again."
                  );
                }
              }}
            >
              <Text style={[styles.smallerButtonText, isTablet && styles.smallerButtonTextTablet]}>Start Match</Text>
            </TouchableOpacity>
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
                    <Text style={styles.modalTitle}>Pre-Game Comments</Text>
                    <TextInput
                      style={styles.modalInput}
                      multiline
                      value={commentValue}
                      onChangeText={setCommentValue}
                      placeholder="Enter pre-game comments..."
                      placeholderTextColor="rgba(255, 215, 0, 0.5)"
                      autoFocus={true}
                    />
                    <View style={styles.modalButtons}>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.cancelButton]}
                        onPress={() => setIsCommentModalVisible(false)}
                      >
                        <Text style={[styles.smallerButtonText, styles.cancelButtonText]}>Close</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.saveButton]}
                        onPress={() => setIsCommentModalVisible(false)}
                      >
                        <Text style={[styles.smallerButtonText, styles.saveButtonText]}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        </View>
    </SafeAreaView>
  );

  // Get the team nummber from the match schedule file based on the match number and driver statino
  async function findMatch() {
    if (!matchNum) {
      alert("Please enter a match number");
      return;
    }

    if (matchNum < minMatchNum || matchNum > maxMatchNum) {
      alert(
        `Invalid match number. Please enter a match number between ${minMatchNum} and ${maxMatchNum}`
      );
      setTeamNum(undefined);
      return;
    }

    let settingsJSON = await JSON.parse(
      await FileSystem.readAsStringAsync(settingsFileUri)
    );

    let position = await settingsJSON["Settings"]["driverStation"];

    let tmp = await FileSystem.getInfoAsync(scheduleCsvUri);

    if (!tmp.exists) {
      let tmp1 = await FileSystem.getInfoAsync(scheduleFileUri);
      if (!tmp1.exists) {
        navigation.navigate("Settings");
        return;
      }

      let jsontext = await FileSystem.readAsStringAsync(scheduleFileUri);
      let matchjson = await JSON.parse(jsontext);
      if (!matchNum) return;

      let teams;

      try {
        teams = await matchjson["Schedule"][matchNum - 1]["teams"];
      } catch (e) {
        setTeamNum(undefined);
        console.warn(e);
        return;
      }

      await teams.forEach((team) => {
        if (team["station"] == apiStations[position]) {
          setTeamNum(parseInt(team["teamNumber"]));
          return;
        }
      });

      return;
    }

    let jsontext = await FileSystem.readAsStringAsync(scheduleCsvUri);
    let matchjson = await JSON.parse(jsontext);

    if (!matchNum) return;

    let teams;
    try {
      teams = await matchjson["Schedule"][matchNum - 1]["Teams"];
    } catch (e) {
      setTeamNum(undefined);
      console.warn(e);
      return;
    }

    await teams.forEach((team) => {
      if (team["station"] == position) {
        setTeamNum(parseInt(team["teamNumber"]));
        console.log(team["teamNumber"]);
        return;
      }
    });

    setIsInitialized(false);
  }

  // Save prematch settings to file
  async function submitPrematch() {
    let settingsJSON = await JSON.parse(
      await FileSystem.readAsStringAsync(settingsFileUri)
    );

    let team = teamNum;
    let match = matchNum;
    let position = await settingsJSON["Settings"]["driverStation"];
    let alliance = await settingsJSON["Settings"]["driverStation"].charAt(0);
    let allianceKey = `${await alliance}${match}`;
    let scout = await settingsJSON["Settings"]["scoutName"];

    let tmaKey = `${team}-${allianceKey}`;

    let csvText = `${team},${match},${tmaKey},${position},${alliance},${scout},${commentValue === `` ? `""` : `"${commentValue}"`}`;

    let csvURI = `${FileSystem.documentDirectory}match${match}.csv`;
    await FileSystem.writeAsStringAsync(csvURI, csvText);
    console.log(`CSV Text: ${await FileSystem.readAsStringAsync(csvURI)}`);
  }
};

// Pregame stylesheet
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
    paddingHorizontal: 10,
    paddingTop: 12,
  },

  scrollViewTablet: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  scrollViewContent: {
    paddingBottom: 12,
  },

  scrollViewContentTablet: {
    paddingBottom: 20,
  },

  title: {
    flex: 1,
    fontSize: 28,
    fontFamily: "Cooper-Black",
    color: colors.black,
    textAlign: "center",
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
    fontSize: 27,
    color: colors.primary,
    fontWeight: "900",
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },

  section: {
    marginBottom: 4,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },

  sectionTablet: {
    borderRadius: 20,
    padding: 24,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 8,
  },

  sectionTitleTablet: {
    fontSize: 24,
    marginBottom: 16,
  },

  input: {
    backgroundColor: colors.surfaceLight,
    color: colors.textPrimary,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    marginBottom: 10,
    textAlign: "center",
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },

  inputTablet: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },

  button: {
    backgroundColor: colors.buttonPrimary,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },

  buttonTablet: {
    padding: 16,
    borderRadius: 12,
  },

  smallerButtonText: {
    color: colors.textOnPrimary,
    fontSize: 14,
    fontWeight: "bold",
  },

  smallerButtonTextTablet: {
    fontSize: 16,
  },

  biggerButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },

  biggerButtonTextTablet: {
    fontSize: 18,
  },

  label: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 8,
  },

  teamNumber: {
    fontSize: 36,
    fontWeight: "bold",
    textAlign: "center",
    color: colors.textPrimary,
  },

  submitButton: {
    marginTop: 20,
  },

  submitButtonDisabled: {
    backgroundColor: colors.buttonDisabled,
  },

  scoutNameButton: {
    backgroundColor: colors.surfaceLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },

  scoutNameButtonTablet: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
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
    borderRadius: 12,
    padding: 16,
    height: 300,
    fontSize: 16,
    textAlignVertical: "top",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },

  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  modalButton: {
    flex: 0.48,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  cancelButton: {
    backgroundColor: colors.buttonSecondary,
  },

  cancelButtonText: {
    color: colors.textPrimary,
  },

  saveButton: {
    backgroundColor: colors.buttonPrimary,
  },

  saveButtonText: {
    color: colors.textOnPrimary,
  },

  stationDisplay: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },

  stationDisplayTablet: {
    padding: 16,
    borderRadius: 12,
  },

  rowContainer: {
    flexDirection: "column",
    marginBottom: 0,
  },

  rowContainerTablet: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  halfSection: {
    marginBottom: 12,
  },

  halfSectionTablet: {
    flex: 0.48,
    marginBottom: 0,
  },

  teamContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 100,
    borderRadius: 12,
    padding: 10,
    backgroundColor: colors.surfaceLight,
  },

  commentButton: {
    backgroundColor: colors.black,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  commentIcon: {
    width: 30,
    height: 30,
    tintColor: colors.primary,
  },

  nameModalInput: {
    backgroundColor: colors.surfaceLight,
    color: colors.textPrimary,
    borderRadius: 12,
    padding: 16,
    height: 50,
    fontSize: 16,
    textAlignVertical: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },

  matchRangeText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },

  });

export default PregameScreen;
