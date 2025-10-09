import PushNotification from 'react-native-push-notification';
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
      // Configure push notifications
      PushNotification.configure({
        onRegister: function (token) {
          console.log('TOKEN:', token);
        },

        onNotification: function (notification) {
          console.log('NOTIFICATION:', notification);
        },

        onAction: function (notification) {
          console.log('ACTION:', notification.action);
          console.log('NOTIFICATION:', notification);
        },

        onRegistrationError: function(err) {
          console.error(err.message, err);
        },

        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },

        popInitialNotification: true,
        requestPermissions: true,
      });

      // Create notification channel for Android
      PushNotification.createChannel(
        {
          channelId: "ceylon-air-alerts",
          channelName: "CeylonAir Health Alerts",
          channelDescription: "Air quality and UV index health alerts",
          playSound: true,
          soundName: "default",
          importance: 4,
          vibrate: true,
        },
        (created) => console.log(`createChannel returned '${created}'`)
      );

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
        alerts.push({
          type: 'aqi',
          level: weatherData.aqi.category,
          value: weatherData.aqi.value,
          threshold: thresholds.aqi
        });
      }

      // Check UV threshold
      if (weatherData.uv && weatherData.uv.value > thresholds.uv) {
        alerts.push({
          type: 'uv',
          level: weatherData.uv.category,
          value: weatherData.uv.value,
          threshold: thresholds.uv
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
        message = `UV Index is ${alert.value} (${alert.level}). This exceeds the safe threshold of ${alert.uv}.`;
        soundName = 'default';
      }

      PushNotification.localNotification({
        channelId: "ceylon-air-alerts",
        title: title,
        message: message,
        soundName: soundName,
        vibrate: true,
        vibration: 300,
        priority: "high",
        importance: "high",
        autoCancel: true,
        largeIcon: "ic_launcher",
        smallIcon: "ic_notification",
        bigText: message,
        subText: "CeylonAir Health Alert",
        color: "#FF6B6B",
        actions: ["View Details", "Dismiss"],
        invokeApp: true,
      });

      console.log(`Alert sent: ${alert.type} - ${alert.value}`);
    } catch (error) {
      console.error('Error sending alert:', error);
    }
  }

  async sendTestNotification() {
    try {
      await this.initialize();
      
      PushNotification.localNotification({
        channelId: "ceylon-air-alerts",
        title: "CeylonAir Test",
        message: "This is a test notification from CeylonAir",
        soundName: "default",
        vibrate: true,
        priority: "high",
        importance: "high",
        autoCancel: true,
      });

      console.log('Test notification sent');
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }

  async schedulePeriodicCheck() {
    try {
      // Cancel any existing scheduled notifications
      PushNotification.cancelAllLocalNotifications();

      // Schedule periodic checks (every hour)
      PushNotification.localNotificationSchedule({
        channelId: "ceylon-air-alerts",
        title: "CeylonAir Health Check",
        message: "Checking your local air quality and UV conditions...",
        date: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        soundName: "default",
        repeatType: "time",
        repeatTime: 60 * 60 * 1000, // Repeat every hour
      });

      console.log('Periodic health check scheduled');
    } catch (error) {
      console.error('Error scheduling periodic check:', error);
    }
  }

  async cancelAllNotifications() {
    try {
      PushNotification.cancelAllLocalNotifications();
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
