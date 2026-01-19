import React, { createContext, useContext, useState, useEffect } from "react";
import * as FileSystem from "expo-file-system/legacy";

const SettingsContext = createContext(null);

const SETTINGS_FILE_URI = `${FileSystem.documentDirectory}ScoutingAppSettings.json`;

const DEFAULT_SETTINGS = {
  scoutName: "",
  driverStation: "",
  isPracticeMode: false,
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from file on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(SETTINGS_FILE_URI);
      if (fileInfo.exists) {
        const data = await FileSystem.readAsStringAsync(SETTINGS_FILE_URI);
        const parsed = JSON.parse(data);
        setSettings({
          scoutName: parsed.Settings?.scoutName || "",
          driverStation: parsed.Settings?.driverStation || "",
          isPracticeMode: parsed.Settings?.isPracticeMode || false,
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveSettings = async (newSettings) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);

    try {
      const json = JSON.stringify(
        {
          Settings: {
            scoutName: merged.scoutName,
            driverStation: merged.driverStation,
            isPracticeMode: merged.isPracticeMode,
          },
        },
        null,
        2
      );
      await FileSystem.writeAsStringAsync(SETTINGS_FILE_URI, json);
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  const updateScoutName = async (name) => {
    await saveSettings({ scoutName: name });
  };

  const updateDriverStation = async (station) => {
    await saveSettings({ driverStation: station });
  };

  const updatePracticeMode = async (enabled) => {
    await saveSettings({ isPracticeMode: enabled });
  };

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        isLoaded,
        saveSettings,
        updateScoutName,
        updateDriverStation,
        updatePracticeMode,
        reloadSettings: loadSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
