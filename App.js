import AppStack from './navigation/AppStack';
import { SettingsProvider } from './contexts/SettingsContext';

export default function App() {
  return (
    <SettingsProvider>
      <AppStack />
    </SettingsProvider>
  );
}

