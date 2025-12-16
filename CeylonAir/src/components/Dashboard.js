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
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
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

  // Helper function to get relative time
  const getRelativeTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} mins ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  const getCardGradient = (value, type) => {
    if (type === 'aqi') {
      if (value <= 50) return ['#2E7D32', '#388E3C']; // Dark green gradient
      if (value <= 100) return ['#F9A825', '#FBC02D']; // Dark yellow gradient
      if (value <= 150) return ['#E65100', '#F57C00']; // Dark orange gradient
      if (value <= 200) return ['#C62828', '#D32F2F']; // Dark red gradient
      return ['#6A1B9A', '#8E24AA']; // Dark purple gradient
    } else if (type === 'uv') {
      if (value <= 2) return ['#2E7D32', '#388E3C']; // Dark green gradient
      if (value <= 5) return ['#F9A825', '#FBC02D']; // Dark yellow gradient
      if (value <= 7) return ['#E65100', '#F57C00']; // Dark orange gradient
      if (value <= 10) return ['#C62828', '#D32F2F']; // Dark red gradient
      return ['#6A1B9A', '#8E24AA']; // Dark purple gradient
    } else if (type === 'atmosphere') {
      if (value >= 80) return ['#00695C', '#00796B']; // Dark teal gradient
      if (value >= 60) return ['#F9A825', '#FBC02D']; // Dark yellow gradient
      if (value >= 40) return ['#E65100', '#F57C00']; // Dark orange gradient
      return ['#C62828', '#D32F2F']; // Dark red gradient
    }
    return ['#1565C0', '#1976D2']; // Dark blue gradient
  };

  const renderMetricCard = (title, value, unit, category, type, description) => {
    const gradientColors = getCardGradient(value, type);
    
    // Get appropriate icon component for each card type
    const getCardIcon = (cardType) => {
      const iconSize = 24;
      const iconColor = '#FFFFFF';
      
      switch (cardType) {
        case 'aqi':
          return <MaterialIcons name="air" size={iconSize} color={iconColor} />;
        case 'uv':
          return <Ionicons name="sunny" size={iconSize} color={iconColor} />;
        case 'atmosphere':
          return <FontAwesome5 name="shield-alt" size={iconSize} color={iconColor} />;
        default:
          return <MaterialIcons name="health-and-safety" size={iconSize} color={iconColor} />;
      }
    };
    
    return (
      <LinearGradient
        key={title}
        colors={gradientColors}
        style={styles.metricCard}
      >
        <View style={styles.cardContent}>
          <Text style={styles.metricTitle}>{title}</Text>
          <Text style={styles.metricValue}>{value}</Text>
          <Text style={styles.metricUnit}>{unit}</Text>
          <Text style={styles.metricCategory}>{category}</Text>
          <Text style={styles.metricDescription}>{description}</Text>
          <View style={styles.cardIcon}>
            {getCardIcon(type)}
          </View>
        </View>
      </LinearGradient>
    );
  };

  const renderRecommendations = () => {
    if (!weatherData || !weatherData.recommendations?.all || weatherData.recommendations.all.length === 0) {
      return null;
    }

    return (
      <View style={styles.recommendationsCard}>
        <Text style={styles.recommendationsTitle}>Health Recommendations</Text>
        {weatherData.recommendations.all.map((recommendation, index) => (
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
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <LinearGradient
        colors={['#1A1A1A', '#2D2D2D', '#404040']} // Dark gradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Weather Icon */}
        <View style={styles.headerIconContainer}>
          <Ionicons name="leaf" size={40} color="white" />
        </View>
        
        {/* App Title */}
        <Text style={styles.headerTitle}>CeylonAir</Text>
        <Text style={styles.headerSubtitle}>Air Quality Monitor</Text>
        
        {/* Location Info */}
        <View style={styles.locationContainer}>
          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={16} color="white" />
            <Text style={styles.locationText}>
              {location?.isDefault 
                ? 'Colombo, Sri Lanka' 
                : (location?.fullAddress || 
                  (location?.city && location?.country 
                    ? `${location.city}, ${location.country}` 
                    : `${location?.latitude?.toFixed(4)}, ${location?.longitude?.toFixed(4)}`
                  )
                  )
              }
            </Text>
          </View>
          
          {/* Last Updated Info */}
          {weatherData && (
            <View style={styles.updateInfoContainer}>
              <Text style={styles.updateText}>
                Updated: {getRelativeTime(weatherData.timestamp)}
              </Text>
              {location?.accuracy && (
                <Text style={styles.accuracyText}>
                  • GPS ±{Math.round(location.accuracy)}m
                </Text>
              )}
            </View>
          )}
        </View>
      </LinearGradient>

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
    backgroundColor: '#121212', // Dark background
  },
  scrollContent: {
    paddingBottom: 120, 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212', // Dark background
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E0E0E0', // Light text
    marginBottom: 10,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#B0B0B0', // Muted light text
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212', // Dark background
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B', // Light red for dark theme
    textAlign: 'center',
    marginBottom: 20,
  },
  retryText: {
    fontSize: 16,
    color: '#3b57d5', 
    fontWeight: 'bold',
  },
  header: {
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconContainer: {
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
    marginBottom: 20,
    fontWeight: '400',
  },
  locationContainer: {
    alignItems: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
    marginLeft: 4,
  },
  updateInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  updateText: {
    fontSize: 13,
    color: 'white',
    opacity: 0.8,
  },
  accuracyText: {
    fontSize: 13,
    color: 'white',
    opacity: 0.8,
    marginLeft: 4,
  },
  metricsGrid: {
    padding: 25,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricCard: {
    marginBottom: 15,
    borderRadius: 20,
    width: (width - 50) ,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    minHeight: 140,
  },
  cardContent: {
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    position: 'relative',
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E0E0E0', // Light text for dark theme
    textAlign: 'center',
    marginBottom: 15,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 10,
  },
  metricValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text for values
    marginRight: 8,
  },
  metricUnit: {
    fontSize: 16,
    color: '#E0E0E0', // Light text
    fontWeight: '600',
  },
  metricCategory: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text for category
    textAlign: 'center',
    marginBottom: 8,
  },
  metricDescription: {
    fontSize: 12,
    color: '#B0B0B0', // Muted light text
    textAlign: 'center',
    fontStyle: 'italic',
  },
  cardIcon: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Darker icon background
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
  },
  recommendationsCard: {
    backgroundColor: '#2A2A2A', 
    margin: 15,
    padding: 20,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E0E0E0', 
    marginBottom: 15,
  },
  recommendationItem: {
    fontSize: 14,
    color: '#B0B0B0', // Muted light text
    marginBottom: 8,
    lineHeight: 20,
  },
  dataInfo: {
    backgroundColor: '#2A2A2A', // Dark card background
    margin: 15,
    padding: 15,
    borderRadius: 20,
    marginBottom: 10,
  },
  dataInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E0E0E0', // Light text
    marginBottom: 10,
  },
  dataInfoText: {
    fontSize: 14,
    color: '#B0B0B0', // Muted light text
    marginBottom: 5,
  },
  dataInfoTimestamp: {
    fontSize: 12,
    color: '#888888', // Lighter muted text
    fontStyle: 'italic',
  },
});

export default Dashboard;
