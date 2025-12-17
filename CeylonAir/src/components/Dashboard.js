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
import Svg, { Circle, Path } from 'react-native-svg';
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
    // Return clear/transparent gradients for better gauge visibility
    return ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']; // Light transparent gradient
  };

  const getRiskLevelColor = (category, type, value) => {
    if (type === 'aqi') {
      if (category?.toLowerCase().includes('good')) return '#2E7D32';
      if (category?.toLowerCase().includes('moderate')) return '#F9A825';
      if (category?.toLowerCase().includes('unhealthy for sensitive') || category?.toLowerCase().includes('sensitive')) return '#E65100';
      if (category?.toLowerCase().includes('unhealthy')) return '#C62828';
      if (category?.toLowerCase().includes('very unhealthy')) return '#6A1B9A';
      if (category?.toLowerCase().includes('hazardous')) return '#4A148C';
    } else if (type === 'uv') {
      if (category?.toLowerCase().includes('low')) return '#2E7D32';
      if (category?.toLowerCase().includes('moderate')) return '#F9A825';
      if (category?.toLowerCase().includes('high') && !category?.toLowerCase().includes('very')) return '#E65100';
      if (category?.toLowerCase().includes('very high')) return '#C62828';
      if (category?.toLowerCase().includes('extreme')) return '#6A1B9A';
    } else if (type === 'atmosphere') {
      if (category?.toLowerCase().includes('low')) return '#C62828';
      if (category?.toLowerCase().includes('moderate')) return '#F9A825';
      if (category?.toLowerCase().includes('high')) return '#00695C';
    }
    return '#666666'; // Default gray
  };

  const getRiskLevelSymbol = (category, type) => {
    if (type === 'aqi') {
      if (category?.toLowerCase().includes('good')) return '🟢';
      if (category?.toLowerCase().includes('moderate')) return '⚠️';
      if (category?.toLowerCase().includes('unhealthy for sensitive') || category?.toLowerCase().includes('sensitive')) return '🔶';
      if (category?.toLowerCase().includes('unhealthy') && !category?.toLowerCase().includes('very')) return '🚨';
      if (category?.toLowerCase().includes('very unhealthy')) return '🔶';
      if (category?.toLowerCase().includes('hazardous')) return '🚨';
    } else if (type === 'uv') {
      if (category?.toLowerCase().includes('low')) return '🟢';
      if (category?.toLowerCase().includes('moderate')) return '⚠️';
      if (category?.toLowerCase().includes('high') && !category?.toLowerCase().includes('very')) return '☢️';
      if (category?.toLowerCase().includes('very high')) return '🔶';
      if (category?.toLowerCase().includes('extreme')) return '🚨';
    } else if (type === 'atmosphere') {
      if (category?.toLowerCase().includes('low')) return '🚨';
      if (category?.toLowerCase().includes('moderate')) return '⚠️';
      if (category?.toLowerCase().includes('high')) return '🟢';
    }
    return '⚪'; // Default symbol
  };

  const getGaugeColor = (value, type) => {
    if (type === 'aqi') {
      if (value <= 50) return '#1cba51';
      if (value <= 100) return '#f9f100';
      if (value <= 150) return '#F57C00';
      if (value <= 200) return '#f32d2d';
      return '#8E24AA';
    } else if (type === 'uv') {
      if (value <= 2) return '#1cba51';
      if (value <= 5) return '#f9f100';
      if (value <= 7) return '#F57C00';
      if (value <= 10) return '#f32d2d';
      return '#8E24AA';
    } else if (type === 'atmosphere') {
      if (value >= 80) return '#1cba51';
      if (value >= 60) return '#FBC02D';
      if (value >= 40) return '#F57C00';
      return '#f32d2d';
    }
    return '#1976D2';
  };

  const getMaxValue = (type) => {
    if (type === 'aqi') return 300;
    if (type === 'uv') return 15;
    if (type === 'atmosphere') return 100;
    return 100;
  };

  const GaugeChart = ({ value, type, isHalfWidth = false }) => {
    const size = isHalfWidth ? 80 : 100;
    const strokeWidth = isHalfWidth ? 8 : 10;
    const radius = (size - strokeWidth) / 2;
    const maxValue = getMaxValue(type);
    const percentage = Math.min(value / maxValue, 1);
    const gaugeColor = getGaugeColor(value, type);

    // Determine if this should be a half circle gauge
    const isHalfCircle = type === 'aqi' || type === 'uv';
    
    if (isHalfCircle) {
      // Half circle gauge for AQI and UV
      const circumference = Math.PI * radius; // Half circle circumference
      const strokeDasharray = `${circumference * percentage} ${circumference}`;
      
      return (
        <View style={[styles.gaugeContainer, isHalfWidth && styles.halfWidthGaugeContainer]}>
          <Svg width={size} height={size / 2 + 20} style={styles.gauge}>
            {/* Background arc */}
            <Path
              d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
              fill="none"
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Progress arc */}
            <Path
              d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
              fill="none"
              stroke={gaugeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={0} // Start from leftmost position (9 o'clock)
            />
          </Svg>
          <View style={[styles.gaugeValueContainer, isHalfWidth && styles.halfWidthGaugeValueContainer, styles.halfCircleValueContainer]}>
            <Text style={[styles.gaugeValue, isHalfWidth && styles.halfWidthGaugeValue]}>{value}</Text>
          </View>
        </View>
      );
    } else {
      // Full circle gauge for atmosphere
      const circumference = 2 * Math.PI * radius;
      const strokeDasharray = `${circumference * percentage} ${circumference}`;
      
      return (
        <View style={[styles.gaugeContainer, isHalfWidth && styles.halfWidthGaugeContainer]}>
          <Svg width={size} height={size} style={styles.gauge}>
            {/* Background circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth={strokeWidth}
            />
            {/* Progress circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={gaugeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={-circumference / 4} // Start from top by offsetting by quarter circle
              transform={`rotate(0 ${size / 2} ${size / 2})`}
            />
          </Svg>
          <View style={[styles.gaugeValueContainer, isHalfWidth && styles.halfWidthGaugeValueContainer]}>
            <Text style={[styles.gaugeValue, isHalfWidth && styles.halfWidthGaugeValue]}>{value}</Text>
          </View>
        </View>
      );
    }
  };

  const renderMetricCard = (title, value, unit, category, type, description, isHalfWidth = false) => {
    const gradientColors = getCardGradient(value, type);
    
    // Get appropriate icon component for each card type
    const getCardIcon = (cardType) => {
      const iconSize = isHalfWidth ? 20 : 24;
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
        style={[styles.metricCard, isHalfWidth && styles.halfWidthCard]}
      >
        <View style={styles.cardContent}>
          <Text style={[styles.metricTitle, isHalfWidth && styles.halfWidthTitle]}>{title}</Text>
          
          {/* Conditional rendering: Gauge for atmosphere, colored values for AQI and UV */}
            <GaugeChart value={value} type={type} isHalfWidth={isHalfWidth} />
          <Text style={[styles.metricUnit, isHalfWidth && styles.halfWidthUnit]}>{unit}</Text>
          
          {/* Risk Level Badge with colored text and symbol */}
          <View style={[styles.riskLevelBadge, isHalfWidth && styles.halfWidthRiskBadge]}>
            <Text style={[
              styles.riskLevelText, 
              isHalfWidth && styles.halfWidthRiskText,
              { color: getRiskLevelColor(category, type, value) }
            ]}>
              {getRiskLevelSymbol(category, type)} {category}
            </Text>
          </View>
          
          <Text style={[styles.metricDescription, isHalfWidth && styles.halfWidthDescription]}>{description}</Text>
          <View style={[styles.cardIcon, isHalfWidth && styles.halfWidthIcon]}>
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
        <View style={styles.recommendationsTitleRow}>
          <MaterialIcons name="health-and-safety" size={24} color="#E0E0E0" style={styles.recommendationsTitleIcon} />
          <Text style={styles.recommendationsTitle}>Health Recommendations</Text>
        </View>
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
        {/* App Title with Icon */}
        <View style={styles.titleRow}>
          <Ionicons name="leaf" size={40} color="#64B5F6" style={styles.titleIcon} />
          <Text style={styles.headerTitle}>CeylonAir</Text>
        </View>
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
            {/* Full width card for Atmosphere Score at the top */}
            {renderMetricCard(
              'Atmosphere Score',
              weatherData.atmosphereScore,
              '%',
              weatherData.riskLevel.replace('_', ' ').toUpperCase(),
              'atmosphere',
              'Overall health score'
            )}
            
            {/* Side by side cards for AQI and UV below */}
            <View style={styles.halfWidthRow}>
              {renderMetricCard(
                'Air Quality Index',
                weatherData.aqi.value,
                'AQI',
                weatherData.aqi.category.toUpperCase(),
                'aqi',
                `Source: ${weatherData.aqi.source}`,
                true // isHalfWidth flag
              )}
              
              {renderMetricCard(
                'UV Index',
                weatherData.uv.value,
                'UVI',
                weatherData.uv.category.toUpperCase(),
                'uv',
                `Source: ${weatherData.uv.source}`,
                true // isHalfWidth flag
              )}
            </View>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleIcon: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#64B5F6',
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
  halfWidthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)', // Clear background with subtle tint
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)', // Subtle border for definition
  },
  halfWidthCard: {
    width: (width - 65) / 2, // Half width minus padding and gap
    marginBottom: 0,
    minHeight: 160, // Slightly taller for better proportions
    backgroundColor: 'rgba(255, 255, 255, 0.08)', // Clear background with subtle tint
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)', // Subtle border for definition
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
    color: '#FFFFFF', // White text for better visibility on clear background
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
    color: '#000000', // Black text for values
    marginRight: 8,
  },
  metricUnit: {
    fontSize: 16,
    color: '#FFFFFF', // White text for better visibility on clear background
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
    color: '#E0E0E0', // Light gray text for better visibility on clear background
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
  // Half-width card specific styles
  halfWidthTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  halfWidthValue: {
    fontSize: 36,
  },
  halfWidthUnit: {
    fontSize: 14,
  },
  halfWidthCategory: {
    fontSize: 12,
    marginBottom: 6,
  },
  halfWidthDescription: {
    fontSize: 10,
  },
  halfWidthIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    bottom: 10,
    right: 10,
  },
  // Risk Level Badge Styles
  riskLevelBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  riskLevelText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    // Color will be set dynamically based on risk level
  },
  halfWidthRiskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginVertical: 6,
  },
  halfWidthRiskText: {
    fontSize: 12,
  },
  // Gauge Chart Styles
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    position: 'relative',
  },
  halfWidthGaugeContainer: {
    marginVertical: 8,
  },
  gauge: {
    // No rotation needed for full circle
  },
  gaugeValueContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halfWidthGaugeValueContainer: {
    // Same positioning for half-width gauges
  },
  halfCircleValueContainer: {
    position: 'absolute',
    bottom: -5,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text for better visibility on clear background
  },
  halfWidthGaugeValue: {
    fontSize: 20,
  },
  recommendationsCard: {
    backgroundColor: '#2A2A2A', 
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  recommendationsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  recommendationsTitleIcon: {
    marginRight: 8,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E0E0E0', 
  },
  recommendationItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recommendationIcon: {
    fontSize: 16,
    marginRight: 10,
    marginTop: 2,
    minWidth: 20,
  },
  recommendationItem: {
    fontSize: 14,
    color: '#B0B0B0', // Muted light text
    lineHeight: 20,
    flex: 1,
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
