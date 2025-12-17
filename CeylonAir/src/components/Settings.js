import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import NotificationService from '../services/NotificationService';
import BackgroundFetchService from '../services/BackgroundFetchService';

const Settings = ({ navigation }) => {
  const [thresholds, setThresholds] = useState({
    aqi: 150,
    uv: 8
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [fetchInterval, setFetchInterval] = useState(60);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load notification thresholds
      const notificationThresholds = await NotificationService.getThresholds();
      setThresholds(notificationThresholds);

      // Load fetch interval
      await BackgroundFetchService.loadFetchInterval();
      const status = await BackgroundFetchService.getFetchStatus();
      setFetchInterval(status.fetchInterval / (60 * 1000)); // Convert to minutes

      setLoading(false);
    } catch (error) {
      console.error('Error loading settings:', error);
      setLoading(false);
    }
  };

  const saveThresholds = async () => {
    try {
      await NotificationService.setThresholds(thresholds);
      Alert.alert('Success', 'Notification thresholds updated successfully');
    } catch (error) {
      console.error('Error saving thresholds:', error);
      Alert.alert('Error', 'Failed to save notification thresholds');
    }
  };

  const saveFetchInterval = async () => {
    try {
      await BackgroundFetchService.setFetchInterval(fetchInterval);
      Alert.alert('Success', 'Fetch interval updated successfully');
    } catch (error) {
      console.error('Error saving fetch interval:', error);
      Alert.alert('Error', 'Failed to save fetch interval');
    }
  };

  const testNotification = async () => {
    try {
      await NotificationService.sendTestNotification();
      Alert.alert('Success', 'Test notification sent');
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  const toggleNotifications = async () => {
    try {
      setNotificationsEnabled(!notificationsEnabled);
      if (notificationsEnabled) {
        await NotificationService.cancelAllNotifications();
        Alert.alert('Notifications Disabled', 'All notifications have been disabled');
      } else {
        await NotificationService.initialize();
        Alert.alert('Notifications Enabled', 'Notifications have been enabled');
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      Alert.alert('Error', 'Failed to toggle notifications');
    }
  };

  const renderThresholdPicker = (type, value, onChange, options) => (
    <View style={styles.pickerContainer}>
      <Text style={styles.pickerLabel}>
        {type === 'aqi' ? 'Air Quality Index (AQI)' : 'UV Index'} Threshold
      </Text>
      <Picker
        selectedValue={value}
        onValueChange={onChange}
        style={styles.picker}
      >
        {options.map((option) => (
          <Picker.Item
            key={option.value}
            label={option.label}
            value={option.value}
          />
        ))}
      </Picker>
    </View>
  );

  const renderFetchIntervalPicker = () => (
    <View style={styles.pickerContainer}>
      <Text style={styles.pickerLabel}>Data Fetch Interval</Text>
      <Picker
        selectedValue={fetchInterval}
        onValueChange={setFetchInterval}
        style={styles.picker}
      >
        <Picker.Item label="15 minutes" value={15} />
        <Picker.Item label="30 minutes" value={30} />
        <Picker.Item label="1 hour" value={60} />
        <Picker.Item label="2 hours" value={120} />
        <Picker.Item label="3 hours" value={180} />
      </Picker>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  const aqiOptions = [
    { label: 'Good (50)', value: 50 },
    { label: 'Moderate (100)', value: 100 },
    { label: 'Unhealthy for Sensitive Groups (150)', value: 150 },
    { label: 'Unhealthy (200)', value: 200 },
    { label: 'Very Unhealthy (300)', value: 300 },
  ];

  const uvOptions = [
    { label: 'Low (2)', value: 2 },
    { label: 'Moderate (5)', value: 5 },
    { label: 'High (7)', value: 7 },
    { label: 'Very High (10)', value: 10 },
    { label: 'Extreme (12)', value: 12 },
  ];

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Alerts</Text>
        
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Enable Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: '#767577', true: '#64B5F6' }}
            thumbColor={notificationsEnabled ? '#E0E0E0' : '#888888'}
          />
        </View>

        {notificationsEnabled && (
          <>
            {renderThresholdPicker(
              'aqi',
              thresholds.aqi,
              (value) => setThresholds({ ...thresholds, aqi: value }),
              aqiOptions
            )}

            {renderThresholdPicker(
              'uv',
              thresholds.uv,
              (value) => setThresholds({ ...thresholds, uv: value }),
              uvOptions
            )}

            <TouchableOpacity style={styles.saveButton} onPress={saveThresholds}>
              <Text style={styles.saveButtonText}>Save Thresholds</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.testButton} onPress={testNotification}>
              <Text style={styles.testButtonText}>Send Test Notification</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Fetching</Text>
        
        {renderFetchIntervalPicker()}

        <TouchableOpacity style={styles.saveButton} onPress={saveFetchInterval}>
          <Text style={styles.saveButtonText}>Save Fetch Interval</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutContainer}>
          <Text style={styles.aboutText}>
            CeylonAir v1.0.0
          </Text>
          <Text style={styles.aboutText}>
            Air Quality & UV Index Monitor for Sri Lanka
          </Text>
          <Text style={styles.aboutSubtext}>
            This app uses hybrid algorithms to provide accurate air quality data 
            by combining multiple data sources including IQAir, OpenWeatherMap, 
            and WeatherAPI.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', 
  },
  scrollContent: {
    paddingBottom: 120, 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212', 
  },
  loadingText: {
    fontSize: 18,
    color: '#E0E0E0', 
  },
  header: {
    backgroundColor: '#1A1A1A', 
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  section: {
    backgroundColor: '#2A2A2A',
    margin: 10,
    padding: 20,
    borderRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2.22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E0E0E0', 
    marginBottom: 15,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 16,
    color: '#E0E0E0',
  },
  pickerContainer: {
    marginBottom: 20,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E0E0E0',
    marginBottom: 10,
  },
  picker: {
    backgroundColor: '#404040',
    color: '#E0E0E0',
    borderRadius: 10,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testButton: {
    backgroundColor: '#64B5F6', // Light blue for dark theme
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  testButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
  },
  aboutContainer: {
    marginTop: 10,
  },
  aboutText: {
    fontSize: 16,
    color: '#E0E0E0', // Light text
    marginBottom: 5,
    fontWeight: 'bold',
  },
  aboutSubtext: {
    fontSize: 14,
    color: '#B0B0B0', // Muted light text
    lineHeight: 20,
    marginTop: 10,
  },
});

export default Settings;
