import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar
} from "react-native";
import QRCode from "react-qr-code";
import * as MediaLibrary from 'expo-media-library';
import ViewShot from "react-native-view-shot";
import { captureRef } from 'react-native-view-shot';
import { colors } from "../components/colors";

const CSV_HEADERS = "Team Number,Match Number,TMA Key,Driver Station,Alliance,Scout Name,Pre-Game Comment,Auto Fuel Scored,TeleOp Fuel Scored,Match Comments,Questions/Clarifications";

export const getCSVHeaders = () => CSV_HEADERS;

const QRCodeScreen = props => {
  const { navigation, route } = props;
  const csvData = route.params.data;
  const [isDataExpanded, setIsDataExpanded] = useState(false);

  const ref = React.useRef(null);

  React.useEffect(() => {
    const getPermissions = async () => {
      const permission = await MediaLibrary.requestPermissionsAsync()
      if (!permission) {
        // Do something
      }
    }

    getPermissions();
  }, []);

  function getFormattedDataTable(csvData) {
    if (!csvData) return null;
    const values = CSVtoArray(csvData);
    if (!values) return null;

    // Headers in exact order matching the CSV data structure
    const dataMapping = [
      { header: 'Team Number', index: 0 },
      { header: 'Match Number', index: 1 },
      { header: 'TMA Key', index: 2 },
      { header: 'Driver Station', index: 3 },
      { header: 'Alliance', index: 4 },
      { header: 'Scout Name', index: 5 },
      { header: 'Pre-Game Comment', index: 6 },
      { header: 'Auto Fuel Scored', index: 7 },
      { header: 'TeleOp Fuel Scored', index: 8 },
      { header: 'Match Comments', index: 9 },
      { header: 'Questions/Clarifications', index: 10 }
    ];

    return (
      <View style={styles.tableContainer}>
        <Text style={styles.tableTitle}>Match Data Details</Text>
        {dataMapping.map(({ header, index }) => (
          <View key={`${header}-${index}`} style={styles.tableRow}>
            <Text style={styles.tableHeader}>{header}:</Text>
            <Text style={styles.tableValue}>
              {values[index]?.replace(/^"|"$/g, '') || '-'}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  function getQRInfo(csvData) {
    if (!csvData) return null;
    const values = CSVtoArray(csvData);
    if (!values) return null;
    
    return {
      teamNumber: values[0],
      matchNumber: values[1],
      scoutName: values[5],
      driverStation: values[3]
    };
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>QR Code</Text>
          <View style={{width: 32}} />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        <View ref={ref} style={styles.qrcodeContainer}>
          <View style={styles.qrInfoSection}>
            {csvData && getQRInfo(csvData) && (
              <>
                <Text style={styles.matchNumberText}>Match {getQRInfo(csvData).matchNumber}</Text>
                <Text style={styles.qrInfoText}>Team: {getQRInfo(csvData).teamNumber}</Text>
                <Text style={styles.qrInfoText}>Scout: {getQRInfo(csvData).scoutName}</Text>
                <Text style={styles.qrInfoText}>Station: {getQRInfo(csvData).driverStation}</Text>
              </>
            )}
          </View>
          <View style={styles.qrCodeWrapper}>
            <QRCode 
              value={csvData || ' '}
              size={400}
              style={styles.qrCode}
            />
          </View>
        </View>

        <View style={styles.dataContainer}>
          <Text style={styles.dataLabel}>Raw Data:</Text>
          <Text style={styles.csvText} numberOfLines={3} ellipsizeMode="tail">
            {csvData || ''}
          </Text>
        </View>

        <View style={styles.dataContainer}>
          <TouchableOpacity 
            style={styles.dataHeader}
            onPress={() => setIsDataExpanded(!isDataExpanded)}
          >
            <Text style={styles.dataLabel}>Match Data Details</Text>
            <Text style={styles.expandButton}>
              {isDataExpanded ? '−' : '+'}
            </Text>
          </TouchableOpacity>
          {isDataExpanded && getFormattedDataTable(csvData)}
        </View>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={async () => await captureQR()}
        >
          <Text style={styles.buttonText}>Save QR Code</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => nextMatch()}
        >
          <Text style={styles.buttonText}>Next Match</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  async function captureQR() {
    try {
      const result = await captureRef(ref, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      await MediaLibrary.saveToLibraryAsync(result);
      alert('QR Code saved to photo gallery!');
    } catch (e) {
      console.log(e);
      alert('Failed to save QR Code. Please try again.');
    }
  }

  function nextMatch() {
    navigation.navigate("Pregame", {
      matchNum: route.params.matchNum + 1,
    });
  }

  function getDataFormatted(data) {
    if (!data) return '';
    let arr = CSVtoArray(data);
    if (!arr) return '';
    let match = arr[1];
    return match ? `Match: ${match}` : '';
  }

  // Return array of string values, or NULL if CSV string not well formed.
  function CSVtoArray(text) {
    var re_valid = /^\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*(?:,\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*)*$/;
    var re_value = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;
    if (!re_valid.test(text)) return null;
    var a = [];
    text.replace(re_value,
      function(m0, m1, m2, m3) {
        if (m1 !== undefined) a.push(m1.replace(/\\'/g, "'"));
        else if (m2 !== undefined) a.push(m2.replace(/\\"/g, '"'));
        else if (m3 !== undefined) a.push(m3);
        return '';
      });
    if (/,\s*$/.test(text)) a.push('');
    return a;
  }
}

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
    fontSize: 30,
    color: colors.primary,
    fontWeight: '900',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    marginTop: Platform.OS === 'ios' ? -3 : 0,
  },

  title: {
    flex: 1,
    fontSize: 28,
    fontFamily: 'Cooper-Black',
    color: colors.black,
    textAlign: "center",
  },

  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollViewContent: {
    padding: 20,
    alignItems: 'center',
  },

  // Keep white background for QR code readability
  qrcodeContainer: {
    backgroundColor: colors.white,
    padding: 25,
    borderRadius: 20,
    marginVertical: 20,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
    width: '100%',
    alignItems: 'center',
  },

  qrCodeWrapper: {
    backgroundColor: colors.white,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },

  qrCode: {
    padding: 15,
  },

  dataContainer: {
    backgroundColor: colors.surface,
    width: '100%',
    padding: 20,
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

  dataLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: colors.textPrimary,
  },

  dataText: {
    fontSize: 16,
    marginBottom: 10,
    color: colors.textPrimary,
  },

  csvText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 10,
  },

  actionButton: {
    backgroundColor: colors.buttonPrimary,
    padding: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
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

  tableContainer: {
    backgroundColor: colors.surface,
    padding: 20,
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

  tableTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: colors.textPrimary,
  },

  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },

  tableHeader: {
    flex: 1.2,
    fontSize: 16,
    fontWeight: 'bold',
    paddingRight: 10,
    color: colors.textPrimary,
  },

  tableValue: {
    flex: 0.8,
    fontSize: 16,
    textAlign: 'right',
    color: colors.textPrimary,
  },

  dataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  expandButton: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },

  // Keep white background for QR info section for contrast with QR
  qrInfoSection: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
    width: '100%',
  },

  matchNumberText: {
    fontSize: 54,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: colors.black,
  },

  qrInfoText: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 5,
    textAlign: 'center',
    color: colors.black,
  },
});

export default QRCodeScreen;
