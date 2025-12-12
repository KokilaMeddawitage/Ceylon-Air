import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.defaultThresholds = {
      aqi: 150,
      uv: 8
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Configure handler to show alerts when foregrounded
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      // Request permissions
      // In Expo Go, remote push is unsupported; still request local perms but avoid noisy logs
      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;
      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.warn('Notification permission not granted');
      }

      // Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('ceylon-air-alerts', {
          name: 'CeylonAir Health Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          vibrationPattern: [0, 300],
          lightColor: '#FF6B6B',
        });
      }

      this.isInitialized = true;
      console.log('Notification service initialized');
    } catch (error) {
      console.error('Error initializing notification service:', error);
    }
  }

  async getThresholds() {
    try {
      const stored = await AsyncStorage.getItem('notification_thresholds');
      if (stored) {
        return JSON.parse(stored);
      }
      return this.defaultThresholds;
    } catch (error) {
      console.error('Error getting notification thresholds:', error);
      return this.defaultThresholds;
    }
  }

  async setThresholds(thresholds) {
    try {
      await AsyncStorage.setItem('notification_thresholds', JSON.stringify(thresholds));
      console.log('Notification thresholds updated:', thresholds);
    } catch (error) {
      console.error('Error setting notification thresholds:', error);
    }
  }

  async checkAndSendAlerts(weatherData) {
    try {
      await this.initialize();
      
      const thresholds = await this.getThresholds();
      const alerts = [];

      // Check AQI threshold
      if (weatherData.aqi && weatherData.aqi.value > thresholds.aqi) {
        const aqiRecommendations = weatherData.recommendations?.aqi || 
                                 (Array.isArray(weatherData.recommendations) ? weatherData.recommendations : []);
        alerts.push({
          type: 'aqi',
          level: weatherData.aqi.category,
          value: weatherData.aqi.value,
          threshold: thresholds.aqi,
          recommendations: aqiRecommendations
        });
      }

      // Check UV threshold
      if (weatherData.uv && weatherData.uv.value > thresholds.uv) {
        const uvRecommendations = weatherData.recommendations?.uv || 
                                (Array.isArray(weatherData.recommendations) ? weatherData.recommendations : []);
        alerts.push({
          type: 'uv',
          level: weatherData.uv.category,
          value: weatherData.uv.value,
          threshold: thresholds.uv,
          recommendations: uvRecommendations
        });
      }

      // Send notifications for each alert
      for (const alert of alerts) {
        await this.sendAlert(alert);
      }

      return alerts;
    } catch (error) {
      console.error('Error checking and sending alerts:', error);
      return [];
    }
  }

  async sendAlert(alert) {
    try {
      let title, message, soundName;

      if (alert.type === 'aqi') {
        title = '🚨 Air Quality Alert';
        message = `Air Quality Index is ${alert.value} (${alert.level}). This exceeds the safe threshold of ${alert.threshold}.`;
        soundName = 'default';
      } else if (alert.type === 'uv') {
        title = '☀️ UV Index Alert';
        message = `UV Index is ${alert.value} (${alert.level}). This exceeds the safe threshold of ${alert.threshold}.`;
        soundName = 'default';
      }

      // Append up to first 3 health recommendations if available
      if (alert.recommendations && alert.recommendations.length > 0) {
        const recs = alert.recommendations.slice(0, 3).map(r => `• ${r}`).join('\n');
        message += `\n\nHealth recommendations:\n${recs}`;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: message,
          sound: soundName,
          subtitle: 'CeylonAir Health Alert',
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null, // fire immediately
      });

      console.log(`Alert sent: ${alert.type} - ${alert.value}`);
    } catch (error) {
      console.error('Error sending alert:', error);
    }
  }

  async sendTestNotification() {
    try {
      await this.initialize();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'CeylonAir Test',
          body: 'This is a test notification from CeylonAir',
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null,
      });

      console.log('Test notification sent');
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }

  async schedulePeriodicCheck() {
    try {
      // Expo Notifications doesn't support arbitrary repeat time; use seconds repeat for Android/iOS
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'CeylonAir Health Check',
          body: 'Checking your local air quality and UV conditions...',
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: { seconds: 60 * 60, repeats: true },
      });

      console.log('Periodic health check scheduled');
    } catch (error) {
      console.error('Error scheduling periodic check:', error);
    }
  }

  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling notifications:', error);
    }
  }

  // Get notification history
  async getNotificationHistory() {
    try {
      const history = await AsyncStorage.getItem('notification_history');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error getting notification history:', error);
      return [];
    }
  }

  // Save notification to history
  async saveToHistory(alert) {
    try {
      const history = await this.getNotificationHistory();
      const notification = {
        ...alert,
        timestamp: Date.now(),
        read: false
      };
      
      history.unshift(notification);
      
      // Keep only last 50 notifications
      if (history.length > 50) {
        history.splice(50);
      }
      
      await AsyncStorage.setItem('notification_history', JSON.stringify(history));
    } catch (error) {
      console.error('Error saving to notification history:', error);
    }
  }
}

export default new NotificationService();
