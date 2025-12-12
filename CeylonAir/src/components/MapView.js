import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Dimensions
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import LocationService from '../services/LocationService';
import ApiService from '../services/ApiService';
import CONFIG from '../config/environment';

const { width, height } = Dimensions.get('window');

const AirQualityMapView = () => {
  const [region, setRegion] = useState({
    latitude: CONFIG.DEFAULT_LOCATION.latitude,
    longitude: CONFIG.DEFAULT_LOCATION.longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [userLocation, setUserLocation] = useState(null);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeMap();
  }, []);

  // 1. Initialize Map and Load Station Data
  const initializeMap = async () => {
    try {
      // Get user location
      const location = await LocationService.getLocationForSriLanka();
      setUserLocation(location);

      // Set map region to user location
      setRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });

      // Load nearby stations (mock data for demonstration)
      await loadNearbyStations(location);

      setLoading(false);
    } catch (error) {
      console.error('Error initializing map:', error);
      Alert.alert('Error', 'Failed to load map data');
      setLoading(false);
    }
  };
  // 2. Fetch All Required Data
  const loadNearbyStations = async (location) => {
    try {
      const iqAirStations = await ApiService.getAllIQAirStations('Sri Lanka');

      // (b) Get current AQI/UVI data for user's current location
      const [iqAirCurrent, openWeatherCurrent, weatherApiCurrent] = await Promise.all([
        ApiService.getNearestIQAirCity(location),
        ApiService.getOpenWeatherAQI(location),
        ApiService.getWeatherAPIUV(location),
      ]);

      // 3. Calculate distance from user → each IQAir station
      // -----------------------------------------------------------------
      const processedStations = iqAirStations.map(st => ({
        id: st.city || st.id,
        name: st.city,
        latitude: st.latitude,
        longitude: st.longitude,
        distance: LocationService.calculateDistance(
          location.latitude,
          location.longitude,
          st.latitude,
          st.longitude
        ),
        aqi: st.aqi || null,
        category: st.category || null,
        source: 'IQAir',
      }));

      // Sort by distance ascending
      processedStations.sort((a, b) => a.distance - b.distance);

      // 4. Create priority stations list
      // -----------------------------------------------------------------
      const liveStations = [];

      if (iqAirCurrent) {
        liveStations.push({
          id: 'live_iqair',
          name: `Current (IQAir - ${iqAirCurrent.city})`,
          latitude: iqAirCurrent.latitude,
          longitude: iqAirCurrent.longitude,
          aqi: iqAirCurrent.aqi,
          category: getAqiCategory(iqAirCurrent.aqi),
          distance: 0,
          source: 'IQAir',
        });
      }

      if (openWeatherCurrent) {
        liveStations.push({
          id: 'live_openweather',
          name: 'Current (OpenWeather)',
          latitude: location.latitude,
          longitude: location.longitude,
          aqi: openWeatherCurrent.aqi,
          category: getAqiCategory(openWeatherCurrent.aqi),
          distance: 0,
          source: 'OpenWeather',
        });
      }

      if (weatherApiCurrent) {
        liveStations.push({
          id: 'live_weatherapi',
          name: 'Current (WeatherAPI)',
          latitude: location.latitude,
          longitude: location.longitude,
          aqi: null,
          uvIndex: weatherApiCurrent.uv,
          category: getUvCategory(weatherApiCurrent.uv),
          distance: 0,
          source: 'WeatherAPI',
        });
      }

      // Combine live + nearby stations
      const allStations = [...liveStations, ...processedStations];

      setStations(allStations);

    } catch (error) {
      console.error('Error loading stations:', error);
    }
  };

  // 5. Utility functions
  // -------------------------------------------------------------------
  const getAqiCategory = (aqi) => {
    if (aqi == null) return 'Unknown';
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    return 'Very Unhealthy';
  };

  const getUvCategory = (uv) => {
    if (uv == null) return 'Unknown';
    if (uv < 3) return 'Low';
    if (uv < 6) return 'Moderate';
    if (uv < 8) return 'High';
    if (uv < 11) return 'Very High';
    return 'Extreme';
  };

  const getMarkerColor = (aqi) => {
    if (aqi <= 50) return '#4CAF50'; // Green
    if (aqi <= 100) return '#FFEB3B'; // Yellow
    if (aqi <= 150) return '#FF9800'; // Orange
    if (aqi <= 200) return '#F44336'; // Red
    return '#9C27B0'; // Purple
  };

  const getMarkerSize = (aqi) => {
    if (aqi <= 50) return 20;
    if (aqi <= 100) return 25;
    if (aqi <= 150) return 30;
    if (aqi <= 200) return 35;
    return 40;
  };

  const renderStationMarker = (station) => {
    const color = getMarkerColor(station.aqi);
    const size = getMarkerSize(station.aqi);

    return (
      <Marker
        key={station.id}
        coordinate={{
          latitude: station.latitude,
          longitude: station.longitude,
        }}
        title={station.name}
        description={`AQI: ${station.aqi} (${station.category})\nDistance: ${station.distance.toFixed(1)} km`}
        pinColor={color}
      />
    );
  };

  const renderUserLocationCircle = () => {
    if (!userLocation) return null;

    return (
      <Circle
        center={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        }}
        radius={50000} // 50km radius
        strokeColor="#2196F3"
        strokeWidth={2}
        fillColor="rgba(33, 150, 243, 0.1)"
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Air Quality Stations</Text>
        <Text style={styles.headerSubtitle}>
          Showing {stations.length} nearby stations
        </Text>
      </View>

      <MapView
        style={styles.map}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
      >
        {userLocation && renderUserLocationCircle()}
        {stations.map(renderStationMarker)}
      </MapView>

      <View style={styles.legend}>
        <Text style={styles.legendTitle}>AQI Legend</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Good (0-50)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#FFEB3B' }]} />
            <Text style={styles.legendText}>Moderate (51-100)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.legendText}>Unhealthy SG (101-150)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#F44336' }]} />
            <Text style={styles.legendText}>Unhealthy (151-200)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#9C27B0' }]} />
            <Text style={styles.legendText}>Very Unhealthy (200+)</Text>
          </View>
        </View>
      </View>
    </View>
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
    color: '#333',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 15,
    paddingTop: 50,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
  },
  map: {
    flex: 1,
    width: width,
    height: height - 200,
  },
  legend: {
    backgroundColor: 'white',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    width: '48%',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
});

export default AirQualityMapView;
