import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LocationService from './LocationService';
import ApiService from './ApiService';
import HybridAlgorithm from '../utils/hybridAlgorithm';
import NotificationService from './NotificationService';

const BACKGROUND_FETCH_TASK = 'CEYLON_AIR_BACKGROUND_FETCH_TASK';

class BackgroundFetchService {
  constructor() {
    this.isInitialized = false;
    this.lastFetchTime = null;
    this.fetchInterval = 60 * 60 * 1000; // 1 hour in milliseconds
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Skip background task registration in Expo Go (unsupported)
      if (Constants?.appOwnership === 'expo') {
        console.warn('Background fetch is not supported in Expo Go. Use a development build.');
      } else {
      // Define background task (idempotent)
      if (!TaskManager.isTaskDefined(BACKGROUND_FETCH_TASK)) {
        TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
          try {
            console.log('[BackgroundFetch] task fired');
            await this.performBackgroundFetch();
            return BackgroundFetch.Result.NewData;
          } catch (e) {
            console.error('Background task error:', e);
            return BackgroundFetch.Result.Failed;
          }
        });
      }

      // Register background fetch with minimum interval 60 minutes
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
      if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
          minimumInterval: 60 * 60, // seconds
          stopOnTerminate: false,
          startOnBoot: true,
        });
      }

      // Also set global minimum interval (best-effort on platforms that support it)
      try {
        await BackgroundFetch.setMinimumIntervalAsync(60 * 60); // seconds
      } catch (e) {
        // noop if not supported on platform
      }
      }

      // Initialize notification service
      await NotificationService.initialize();

      this.isInitialized = true;
      console.log('Background fetch service initialized');
    } catch (error) {
      console.error('Error initializing background fetch service:', error);
    }
  }

  async performBackgroundFetch() {
    try {
      console.log('Performing background fetch...');
      
      // Check if enough time has passed since last fetch
      const now = Date.now();
      if (this.lastFetchTime && (now - this.lastFetchTime) < this.fetchInterval) {
        console.log('Background fetch skipped - too soon since last fetch');
        return;
      }

      // Get user location
      const location = await LocationService.getLocationForSriLanka();
      
      // Fetch weather data from APIs
      const weatherData = await ApiService.getAllWeatherData(
        location.latitude, 
        location.longitude
      );

      // Process data with hybrid algorithm
      const processedData = HybridAlgorithm.processWeatherData(weatherData, location);

      // Cache the processed data
      await this.cacheWeatherData(processedData);

      // Check for alerts and send notifications
      const alerts = await NotificationService.checkAndSendAlerts(processedData);
      
      if (alerts.length > 0) {
        console.log('Alerts triggered:', alerts);
        // Save alerts to history
        for (const alert of alerts) {
          await NotificationService.saveToHistory(alert);
        }
      }

      this.lastFetchTime = now;
      console.log('Background fetch completed successfully');

    } catch (error) {
      console.error('Error in background fetch:', error);
    }
  }

  async cacheWeatherData(data) {
    try {
      const cacheKey = 'weather_data_cache';
      const cacheData = {
        ...data,
        cachedAt: Date.now()
      };
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('Weather data cached successfully');
    } catch (error) {
      console.error('Error caching weather data:', error);
    }
  }

  async getCachedWeatherData() {
    try {
      const cacheKey = 'weather_data_cache';
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (cached) {
        const data = JSON.parse(cached);
        const cacheAge = Date.now() - data.cachedAt;
        
        // Return cached data if it's less than 2 hours old
        if (cacheAge < 2 * 60 * 60 * 1000) {
          console.log('Returning cached weather data');
          return data;
        } else {
          console.log('Cached data is too old, will fetch fresh data');
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting cached weather data:', error);
      return null;
    }
  }

  async startPeriodicFetch() {
    try {
      await this.initialize();
      // Nothing else needed; task is registered in initialize()
      console.log('Periodic background fetch ensured registered');
      
    } catch (error) {
      console.error('Error starting periodic fetch:', error);
    }
  }

  async stopPeriodicFetch() {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
      if (isRegistered) {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
      }
      console.log('Periodic background fetch unregistered');
    } catch (error) {
      console.error('Error stopping periodic fetch:', error);
    }
  }

  async getFetchStatus() {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
      return {
        status: isRegistered ? 'registered' : 'not_registered',
        isInitialized: this.isInitialized,
        lastFetchTime: this.lastFetchTime,
        fetchInterval: this.fetchInterval
      };
    } catch (error) {
      console.error('Error getting fetch status:', error);
      return {
        status: 'unknown',
        isInitialized: false,
        lastFetchTime: null,
        fetchInterval: this.fetchInterval
      };
    }
  }

  // Manual fetch for immediate data update
  async manualFetch() {
    try {
      console.log('Manual fetch triggered');
      await this.performBackgroundFetch();
    } catch (error) {
      console.error('Error in manual fetch:', error);
    }
  }

  // Set custom fetch interval
  async setFetchInterval(minutes) {
    try {
      this.fetchInterval = minutes * 60 * 1000;
      await AsyncStorage.setItem('fetch_interval', this.fetchInterval.toString());
      console.log(`Fetch interval set to ${minutes} minutes`);
    } catch (error) {
      console.error('Error setting fetch interval:', error);
    }
  }

  // Get fetch interval from storage
  async loadFetchInterval() {
    try {
      const stored = await AsyncStorage.getItem('fetch_interval');
      if (stored) {
        this.fetchInterval = parseInt(stored);
        console.log(`Loaded fetch interval: ${this.fetchInterval}ms`);
      }
    } catch (error) {
      console.error('Error loading fetch interval:', error);
    }
  }
}

export default new BackgroundFetchService();
