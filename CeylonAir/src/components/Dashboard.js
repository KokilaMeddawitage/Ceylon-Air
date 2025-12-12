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
import { Ionicons } from '@expo/vector-icons';
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

  const getCardIcon = (type) => {
    switch (type) {
      case 'aqi': return 'cloud-outline';
      case 'uv': return 'sunny-outline';
      case 'atmosphere': return 'leaf-outline';
      default: return 'information-circle-outline';
    }
  };

  const getSeverityIcon = (category) => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes('good') || lowerCategory.includes('low')) return 'checkmark-circle';
    if (lowerCategory.includes('moderate')) return 'alert-circle';
    if (lowerCategory.includes('unhealthy') || lowerCategory.includes('high')) return 'warning';
    if (lowerCategory.includes('hazardous') || lowerCategory.includes('very')) return 'close-circle';
    return 'information-circle';
  };

  const getSeverityIconColor = (category) => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes('good') || lowerCategory.includes('low')) return '#4CAF50';
    if (lowerCategory.includes('moderate')) return '#FF9800';
    if (lowerCategory.includes('unhealthy') || lowerCategory.includes('high')) return '#F44336';
    if (lowerCategory.includes('hazardous') || lowerCategory.includes('very')) return '#9C27B0';
    return '#2196F3';
  };

  const getTextColor = (backgroundColor) => {
    // Convert hex to RGB to calculate luminance
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return dark text for light backgrounds, white text for dark backgrounds
    return luminance > 0.7 ? '#333333' : '#FFFFFF';
  };

  const renderMetricCard = (title, value, unit, category, type, description) => {
    const cardColor = getCardColor(value, type);
    const cardIcon = getCardIcon(type);
    const severityIcon = getSeverityIcon(category);
    const severityIconColor = getSeverityIconColor(category);
    const isFullWidth = type === 'atmosphere';
    const textColor = getTextColor(cardColor);

    return (
      <View key={title} style={isFullWidth ? null : styles.metricCardContainer}>
        <LinearGradient
          colors={[cardColor, cardColor + '90']}
          style={[styles.metricCard, isFullWidth && styles.atmosphereCardStyle]}
        >
          {isFullWidth ? (
            // Full-width horizontal layout for atmosphere score
            <View style={styles.atmosphereLayout}>
              <View style={styles.atmosphereLeft}>
                <View style={styles.cardHeader}>
                  <Ionicons name={cardIcon} size={28} color="#000000" style={styles.cardIcon} />
                  <Text style={[styles.metricTitle, { fontSize: 18, color: '#000000' }]}>{title}</Text>
                </View>
                <Text style={[styles.metricDescription, { color: '#000000', opacity: 0.8 }]}>{description}</Text>
              </View>

              <View style={styles.atmosphereRight}>
                <View style={styles.valueContainer}>
                  <Text style={[styles.metricValue, { fontSize: 42, color: '#000000' }]}>{value}</Text>
                  <Text style={[styles.metricUnit, { fontSize: 16, color: '#000000', opacity: 0.9 }]}>{unit}</Text>
                </View>

                <View style={[styles.severityBadge, styles.atmosphereBadge]}>
                  <Ionicons
                    name={severityIcon}
                    size={22}
                    color={severityIconColor}
                    style={styles.severityIcon}
                  />
                  <Text style={[styles.metricCategory, { color: severityIconColor, fontSize: 15 }]}>
                    {category.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            // Regular vertical layout for other cards
            <>
              {/* Header with icon and title */}
              <View style={styles.cardHeader}>
                <Ionicons name={cardIcon} size={24} color="#000000" style={styles.cardIcon} />
                <Text style={[styles.metricTitle, { color: '#000000' }]}>{title}</Text>
              </View>

              {/* Main value display */}
              <View style={styles.valueContainer}>
                <Text style={[styles.metricValue, { color: '#000000' }]}>{value}</Text>
                <Text style={[styles.metricUnit, { color: '#000000', opacity: 0.9 }]}>{unit}</Text>
              </View>

              {/* Prominent severity badge */}
              <View style={styles.severityBadge}>
                <Ionicons
                  name={severityIcon}
                  size={18}
                  color={severityIconColor}
                  style={styles.severityIcon}
                />
                <Text style={[styles.metricCategory, { color: severityIconColor }]}>
                  {category.toUpperCase()}
                </Text>
              </View>

              {/* Description */}
              <Text style={[styles.metricDescription, { color: '#000000', opacity: 0.8 }]}>{description}</Text>
            </>
          )}
        </LinearGradient>
      </View>
    );
  };

  const renderRecommendations = () => {
    if (!weatherData || !weatherData.recommendations || weatherData.recommendations.length === 0) {
      return null;
    }

    return (
      <View style={styles.recommendationsCard}>
        <View style={styles.recommendationsHeader}>
          <Ionicons name="medical-outline" size={24} color="#4CAF50" style={styles.recommendationsIcon} />
          <Text style={styles.recommendationsTitle}>Health Recommendations</Text>
        </View>
        {weatherData.recommendations?.all.map((recommendation, index) => (
          <View key={index} style={styles.recommendationRow}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={styles.bulletIcon} />
            <Text style={styles.recommendationItem}>{recommendation}</Text>
          </View>
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
          </View>

          <View style={styles.fullWidthCard}>
            <View style={styles.atmosphereCard}>
              {renderMetricCard(
                'Atmosphere Score',
                weatherData.atmosphereScore,
                '%',
                weatherData.riskLevel.replace('_', ' ').toUpperCase(),
                'atmosphere',
                'Overall health score based on combined metrics'
              )}
            </View>
          </View>

          {renderRecommendations()}

          <View style={styles.dataInfo}>
            <View style={styles.dataInfoHeader}>
              <Ionicons name="information-circle-outline" size={20} color="#2196F3" style={styles.dataInfoIcon} />
              <Text style={styles.dataInfoTitle}>Data Sources</Text>
            </View>
            <Text style={styles.dataInfoText}>
              {weatherData.sources.join(', ')}
            </Text>
            <View style={styles.timestampContainer}>
              <Ionicons name="time-outline" size={16} color="#999" style={styles.timestampIcon} />
              <Text style={styles.dataInfoTimestamp}>
                Last updated: {new Date(weatherData.timestamp).toLocaleString()}
              </Text>
            </View>
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
    fontSize: 20,
    color: 'white',
    opacity: 0.9,
    fontWeight: '600',
  },
  locationContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  locationText: {
    fontSize: 16,
    color: 'white',
    opacity: 0.8,
    fontWeight: '500',
  },
  accuracyText: {
    fontSize: 13,
    color: 'white',
    opacity: 0.7,
    marginTop: 2,
  },
  defaultLocationText: {
    fontSize: 13,
    color: 'white',
    opacity: 0.7,
    marginTop: 2,
    fontStyle: 'italic',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    justifyContent: 'space-between',
  },
  fullWidthCard: {
    padding: 15,
    paddingTop: 0,
  },
  atmosphereCard: {
    width: '100%',
  },
  atmosphereCardStyle: {
    minHeight: 140,
    padding: 25,
  },
  atmosphereLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  atmosphereLeft: {
    flex: 1,
    paddingRight: 20,
  },
  atmosphereRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  atmosphereBadge: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  metricCardContainer: {
    width: (width - 40) / 2,
    marginBottom: 15,
  },
  metricCard: {
    padding: 20,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.5,
    minHeight: 200,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardIcon: {
    marginRight: 8,
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  valueContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  metricValue: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  metricUnit: {
    fontSize: 14,
    fontWeight: '600',
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  severityIcon: {
    marginRight: 6,
  },
  metricCategory: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  metricDescription: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  recommendationsCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  recommendationsIcon: {
    marginRight: 10,
  },
  recommendationsTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bulletIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  recommendationItem: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    flex: 1,
  },
  dataInfo: {
    backgroundColor: 'white',
    margin: 15,
    padding: 18,
    borderRadius: 20,
    marginBottom: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2.5,
  },
  dataInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dataInfoIcon: {
    marginRight: 8,
  },
  dataInfoTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  dataInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestampIcon: {
    marginRight: 6,
  },
  dataInfoTimestamp: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
});

export default Dashboard;
