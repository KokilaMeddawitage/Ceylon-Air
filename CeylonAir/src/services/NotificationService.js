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
      console.log('🔔 Initializing notification service...');

      // Configure handler to show alerts when foregrounded
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      // Request permissions with more explicit handling
      const { status: existing } = await Notifications.getPermissionsAsync();
      console.log('📱 Current notification permission status:', existing);

      let finalStatus = existing;
      if (existing !== 'granted') {
        console.log('🔒 Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: false,
          },
        });
        finalStatus = status;
        console.log('📝 Permission request result:', status);
      }

      if (finalStatus !== 'granted') {
        console.warn('⚠️ Notification permission not granted:', finalStatus);
        // Continue initialization even without permissions for local notifications
      } else {
        console.log('✅ Notification permissions granted');
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
      console.log(`📨 Sending ${alerts.length} alert(s)`);
      for (const alert of alerts) {
        try {
          await this.sendAlert(alert);
          await this.saveToHistory(alert);
        } catch (error) {
          console.error('❌ Failed to send individual alert:', error);
        }
      }

      if (alerts.length > 0) {
        console.log(`✅ Successfully processed ${alerts.length} alerts`);
      }

      return alerts;
    } catch (error) {
      console.error('Error checking and sending alerts:', error);
      return [];
    }
  }

  async sendAlert(alert) {
    try {
      console.log(`🔔 Preparing to send alert:`, alert.type, alert.value);

      let title, message, soundName;

      if (alert.type === 'aqi') {
        title = '🚨 Air Quality Alert';
        message = `Air Quality Index is ${alert.value} (${alert.level}). This exceeds your threshold of ${alert.threshold}.`;
        soundName = 'default';
      } else if (alert.type === 'uv') {
        title = '☀️ UV Index Alert';
        message = `UV Index is ${alert.value} (${alert.level}). This exceeds your threshold of ${alert.threshold}.`;
        soundName = 'default';
      } else {
        title = '⚠️ Health Alert';
        message = `${alert.type} level is ${alert.value} (${alert.level}).`;
        soundName = 'default';
      }

      // Append health recommendations if available (limit message length)
      if (alert.recommendations && alert.recommendations.length > 0) {
        const recs = alert.recommendations.slice(0, 2).map(r => `• ${r}`).join('\n');
        if (message.length + recs.length < 200) { // Keep under notification limits
          message += `\n\n${recs}`;
        }
      }

      console.log(`📤 Sending notification: ${title}`);

      const notificationConfig = {
        content: {
          title,
          body: message,
          sound: soundName,
          subtitle: 'CeylonAir Health Alert',
          data: { alertType: alert.type, value: alert.value },
        },
        trigger: null, // fire immediately
      };

      // Add Android-specific settings
      if (Platform.OS === 'android') {
        notificationConfig.content.priority = Notifications.AndroidNotificationPriority.MAX;
        notificationConfig.content.channelId = 'ceylon-air-alerts';
      }

      const result = await Notifications.scheduleNotificationAsync(notificationConfig);
      console.log(`✅ Alert sent successfully: ${alert.type} - ${alert.value}, ID: ${result}`);

      return result;
    } catch (error) {
      console.error('❌ Error sending alert:', error);
      throw error;
    }
  }

  async sendTestNotification() {
    try {
      console.log('🧪 Sending test notification...');
      await this.initialize();

      const notificationConfig = {
        content: {
          title: '🧪 CeylonAir Test',
          body: 'This is a test notification from CeylonAir. If you see this, notifications are working!',
          sound: 'default',
          data: { test: true },
        },
        trigger: null,
      };

      if (Platform.OS === 'android') {
        notificationConfig.content.priority = Notifications.AndroidNotificationPriority.MAX;
        notificationConfig.content.channelId = 'ceylon-air-alerts';
      }

      const result = await Notifications.scheduleNotificationAsync(notificationConfig);
      console.log('✅ Test notification sent successfully, ID:', result);
      return result;
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
      throw error;
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
      console.log('📝 Saved notification to history');
    } catch (error) {
      console.error('❌ Error saving to notification history:', error);
    }
  }

  // Check if notifications are enabled and working
  async checkNotificationStatus() {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      const isInitialized = this.isInitialized;

      return {
        permissionStatus: status,
        isInitialized,
        canSendNotifications: status === 'granted' && isInitialized
      };
    } catch (error) {
      console.error('❌ Error checking notification status:', error);
      return {
        permissionStatus: 'unknown',
        isInitialized: false,
        canSendNotifications: false
      };
    }
  }
}

export default new NotificationService();
