import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LocationService from '../services/LocationService';
import ApiService from '../services/ApiService';
import HybridAlgorithm from '../utils/hybridAlgorithm';
import BackgroundFetchService from '../services/BackgroundFetchService';
import NotificationService from '../services/NotificationService';

const { width } = Dimensions.get('window');

const Dashboard = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Request location permission
      const permissionGranted = await LocationService.requestLocationPermission();
      if (!permissionGranted) {
        setError('Location permission is required for accurate air quality data');
        return;
      }

      // Initialize background fetch service
      await BackgroundFetchService.initialize();
      
      // Load cached data first
      const cachedData = await BackgroundFetchService.getCachedWeatherData();
      if (cachedData) {
        setWeatherData(cachedData);
        setLoading(false);
      }

      // Fetch fresh data
      await fetchWeatherData();
      
    } catch (error) {
      console.error('Error initializing app:', error);
      setError('Failed to initialize the app');
      setLoading(false);
    }
  };

  const fetchWeatherData = async () => {
    try {
      setRefreshing(true);
      setError(null);

      // Get user location
      console.log('Fetching user location...');
      const userLocation = await LocationService.getLocationForSriLanka();
      console.log('User location received:', userLocation);
      
      setLocation(userLocation);

      // Fetch weather data from APIs
      const apiData = await ApiService.getAllWeatherData(
        userLocation.latitude,
        userLocation.longitude
      );

      // Process data with hybrid algorithm
      const processedData = HybridAlgorithm.processWeatherData(apiData, userLocation);

      // Cache the processed data
      await BackgroundFetchService.cacheWeatherData(processedData);

      setWeatherData(processedData);
      setLoading(false);

      // Check thresholds and send notifications based on user preferences
      try {
        await NotificationService.checkAndSendAlerts(processedData);
      } catch (notifyErr) {
        console.error('Notification error:', notifyErr);
      }
      
    } catch (error) {
      console.error('Error fetching weather data:', error);
      setError('Failed to fetch weather data. Please check your internet connection.');
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    fetchWeatherData();
  };

  const getCardColor = (value, type) => {
    if (type === 'aqi') {
      if (value <= 50) return '#4CAF50'; // Green
      if (value <= 100) return '#FFEB3B'; // Yellow
      if (value <= 150) return '#FF9800'; // Orange
      if (value <= 200) return '#F44336'; // Red
      return '#9C27B0'; // Purple
    } else if (type === 'uv') {
      if (value <= 2) return '#4CAF50'; // Green
      if (value <= 5) return '#FFEB3B'; // Yellow
      if (value <= 7) return '#FF9800'; // Orange
      if (value <= 10) return '#F44336'; // Red
      return '#9C27B0'; // Purple
    } else if (type === 'atmosphere') {
      if (value >= 80) return '#4CAF50'; // Green
      if (value >= 60) return '#FFEB3B'; // Yellow
      if (value >= 40) return '#FF9800'; // Orange
      return '#F44336'; // Red
    }
    return '#2196F3'; // Default blue
  };

  const renderMetricCard = (title, value, unit, category, type, description) => {
    const cardColor = getCardColor(value, type);
    
    return (
      <LinearGradient
        key={title}
        colors={[cardColor, cardColor + '80']}
        style={styles.metricCard}
      >
        <Text style={styles.metricTitle}>{title}</Text>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricUnit}>{unit}</Text>
        <Text style={styles.metricCategory}>{category}</Text>
        <Text style={styles.metricDescription}>{description}</Text>
      </LinearGradient>
    );
  };

  const renderRecommendations = () => {
    if (!weatherData || !weatherData.recommendations || weatherData.recommendations.length === 0) {
      return null;
    }

    return (
      <View style={styles.recommendationsCard}>
        <Text style={styles.recommendationsTitle}>Health Recommendations</Text>
        {weatherData.recommendations?.all.map((recommendation, index) => (
          <Text key={index} style={styles.recommendationItem}>
            • {recommendation}
          </Text>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading air quality data...</Text>
        <Text style={styles.loadingSubtext}>Getting your location and fetching latest data</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retryText} onPress={onRefresh}>
          Tap to retry
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CeylonAir</Text>
        <Text style={styles.headerSubtitle}>Air Quality Monitor</Text>
        {location && location.latitude && location.longitude ? (
          <View style={styles.locationContainer}>
            <Text style={styles.locationText}>
              {location.isDefault ? '📍🏠' : '📍📱'} {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </Text>
            {location.accuracy && (
              <Text style={styles.accuracyText}>
                GPS Accuracy: ±{Math.round(location.accuracy)}m
              </Text>
            )}
            {location.isDefault && (
              <Text style={styles.defaultLocationText}>
                Using default Colombo location
              </Text>
            )}
          </View>
        ) : (
          <Text style={styles.locationText}>
            📍 Getting your location...
          </Text>
        )}
      </View>

      {weatherData && (
        <>
          <View style={styles.metricsGrid}>
            {renderMetricCard(
              'Air Quality Index',
              weatherData.aqi.value,
              'AQI',
              weatherData.aqi.category,
              'aqi',
              `Source: ${weatherData.aqi.source}`
            )}
            
            {renderMetricCard(
              'UV Index',
              weatherData.uv.value,
              'UVI',
              weatherData.uv.category,
              'uv',
              `Source: ${weatherData.uv.source}`
            )}
            
            {renderMetricCard(
              'Atmosphere Score',
              weatherData.atmosphereScore,
              '%',
              weatherData.riskLevel.replace('_', ' ').toUpperCase(),
              'atmosphere',
              'Overall health score'
            )}
          </View>

          {renderRecommendations()}

          <View style={styles.dataInfo}>
            <Text style={styles.dataInfoTitle}>Data Sources</Text>
            <Text style={styles.dataInfoText}>
              {weatherData.sources.join(', ')}
            </Text>
            <Text style={styles.dataInfoTimestamp}>
              Last updated: {new Date(weatherData.timestamp).toLocaleString()}
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
  },
  locationContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  locationText: {
    fontSize: 12,
    color: 'white',
    opacity: 0.8,
  },
  accuracyText: {
    fontSize: 10,
    color: 'white',
    opacity: 0.6,
    marginTop: 2,
  },
  defaultLocationText: {
    fontSize: 10,
    color: 'white',
    opacity: 0.6,
    marginTop: 2,
    fontStyle: 'italic',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    justifyContent: 'space-between',
  },
  metricCard: {
    width: (width - 30) / 2,
    margin: 5,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  metricUnit: {
    fontSize: 12,
    color: 'white',
    opacity: 0.9,
    marginBottom: 5,
  },
  metricCategory: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 5,
  },
  metricDescription: {
    fontSize: 10,
    color: 'white',
    opacity: 0.8,
    textAlign: 'center',
  },
  recommendationsCard: {
    backgroundColor: 'white',
    margin: 10,
    padding: 20,
    borderRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  recommendationItem: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    lineHeight: 20,
  },
  dataInfo: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  dataInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  dataInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  dataInfoTimestamp: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
});

export default Dashboard;
