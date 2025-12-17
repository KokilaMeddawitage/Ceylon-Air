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
      
      // Load current fetch interval from user settings
      await this.loadFetchInterval();
      
      // Check if enough time has passed since last fetch
      const now = Date.now();
      if (this.lastFetchTime && (now - this.lastFetchTime) < this.fetchInterval) {
        console.log(`Background fetch skipped - too soon since last fetch (${Math.round((now - this.lastFetchTime) / 60000)} minutes ago, interval: ${Math.round(this.fetchInterval / 60000)} minutes)`);
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

      // Cache the processed data for Charts component
      await this.saveHistoricalData(processedData, location);

      // Also cache for general weather data cache
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
      console.log(`Background fetch completed successfully. Next fetch in ${Math.round(this.fetchInterval / 60000)} minutes`);

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

  // Save data in the format expected by Charts.js component
  async saveHistoricalData(weatherData, location) {
    try {
      const newEntry = {
        timestamp: Date.now(),
        latitude: location?.latitude || 6.9271, // Default to Colombo
        longitude: location?.longitude || 79.8612,
        locationName: location?.name || 'Colombo',
        aqi: weatherData?.aqi?.value || weatherData?.airQuality?.aqi || 0,
        uv: weatherData?.uv?.index || weatherData?.uvIndex || 0,
        atmosphereScore: weatherData?.atmosphereScore || weatherData?.overallScore || 0,
        // Additional data for context
        aqiCategory: this.getAQICategory(weatherData?.aqi?.value || weatherData?.airQuality?.aqi || 0),
        uvCategory: this.getUVCategory(weatherData?.uv?.index || weatherData?.uvIndex || 0)
      };

      // Load existing historical data
      const cached = await AsyncStorage.getItem('ceylon_air_historical_data');
      let existingData = cached ? JSON.parse(cached) : [];

      // Add new entry
      existingData.push(newEntry);

      // Remove entries older than 7 days to keep storage manageable
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      existingData = existingData.filter(item => item.timestamp >= sevenDaysAgo);

      // Save updated data
      await AsyncStorage.setItem('ceylon_air_historical_data', JSON.stringify(existingData));
      
      console.log(`Historical data saved to cache. Total entries: ${existingData.length}`);
      console.log(`New entry: AQI=${newEntry.aqi}, UV=${newEntry.uv}, Score=${newEntry.atmosphereScore}`);
    } catch (error) {
      console.error('Error saving historical data:', error);
    }
  }

  // Helper method to get AQI category
  getAQICategory(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  }

  // Helper method to get UV category
  getUVCategory(uv) {
    if (uv <= 2) return 'Low';
    if (uv <= 5) return 'Moderate';
    if (uv <= 7) return 'High';
    if (uv <= 10) return 'Very High';
    return 'Extreme';
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

  // Force fetch for Charts component (bypasses time interval check)
  async fetchForCharts() {
    try {
      console.log('Fetching fresh data for charts...');
      
      // Get user location
      const location = await LocationService.getLocationForSriLanka();
      
      // Fetch weather data from APIs
      const weatherData = await ApiService.getAllWeatherData(
        location.latitude, 
        location.longitude
      );

      // Process data with hybrid algorithm
      const processedData = HybridAlgorithm.processWeatherData(weatherData, location);

      // Save to historical data for charts
      await this.saveHistoricalData(processedData, location);

      this.lastFetchTime = Date.now();
      console.log('Fresh data fetched and saved for charts');
      return processedData;
    } catch (error) {
      console.error('Error fetching for charts:', error);
      throw error;
    }
  }

  // Get historical data for charts
  async getHistoricalData() {
    try {
      const cached = await AsyncStorage.getItem('ceylon_air_historical_data');
      if (cached) {
        const data = JSON.parse(cached);
        // Filter out old data beyond 7 days
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const filteredData = data.filter(item => item.timestamp >= sevenDaysAgo);
        console.log(`Retrieved ${filteredData.length} historical data points`);
        return filteredData;
      }
      return [];
    } catch (error) {
      console.error('Error getting historical data:', error);
      return [];
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
        console.log(`Loaded fetch interval: ${this.fetchInterval}ms (${Math.round(this.fetchInterval / 60000)} minutes)`);
      } else {
        // Set default to 60 minutes if not found
        this.fetchInterval = 60 * 60 * 1000;
        console.log('No fetch interval found, using default: 60 minutes');
      }
    } catch (error) {
      console.error('Error loading fetch interval:', error);
      // Fallback to default
      this.fetchInterval = 60 * 60 * 1000;
    }
  }
}

export default new BackgroundFetchService();
