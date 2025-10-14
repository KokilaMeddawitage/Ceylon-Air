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

const { width, height } = Dimensions.get('window');

const AirQualityMapView = () => {
  const [region, setRegion] = useState({
    latitude: 6.9271,
    longitude: 79.8612,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [userLocation, setUserLocation] = useState(null);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNightMode, setIsNightMode] = useState(false);

  useEffect(() => {
    initializeMap();
    checkTimeAndSetMapStyle();
    
    // Update map style every hour
    const interval = setInterval(checkTimeAndSetMapStyle, 3600000); // 1 hour
    return () => clearInterval(interval);
  }, []);

  const checkTimeAndSetMapStyle = () => {
    const currentHour = new Date().getHours();
    // Night mode: 6 PM to 6 AM (18:00 - 06:00)
    const isNight = currentHour >= 18 || currentHour < 6;
    setIsNightMode(isNight);
    console.log(`Current hour: ${currentHour}, Night mode: ${isNight}`);
  };

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

  const loadNearbyStations = async (location) => {
    try {
      // Mock station data for Sri Lanka
      const mockStations = [
        {
          id: '1',
          name: 'Colombo Central',
          latitude: 6.9271,
          longitude: 79.8612,
          aqi: 85,
          category: 'Moderate',
          lastUpdate: new Date().toISOString(),
          distance: 0
        },
        {
          id: '2',
          name: 'Kandy',
          latitude: 7.2906,
          longitude: 80.6337,
          aqi: 72,
          category: 'Moderate',
          lastUpdate: new Date().toISOString(),
          distance: 115
        },
        {
          id: '3',
          name: 'Galle',
          latitude: 6.0329,
          longitude: 80.2170,
          aqi: 95,
          category: 'Moderate',
          lastUpdate: new Date().toISOString(),
          distance: 120
        },
        {
          id: '4',
          name: 'Jaffna',
          latitude: 9.6615,
          longitude: 80.0255,
          aqi: 68,
          category: 'Moderate',
          lastUpdate: new Date().toISOString(),
          distance: 400
        },
        {
          id: '5',
          name: 'Anuradhapura',
          latitude: 8.3114,
          longitude: 80.4037,
          aqi: 110,
          category: 'Unhealthy for Sensitive Groups',
          lastUpdate: new Date().toISOString(),
          distance: 200
        }
      ];

      // Calculate distances and filter nearby stations
      const nearbyStations = mockStations
        .map(station => ({
          ...station,
          distance: LocationService.calculateDistance(
            location.latitude,
            location.longitude,
            station.latitude,
            station.longitude
          )
        }))
        .filter(station => station.distance <= 500) // Within 500km
        .sort((a, b) => a.distance - b.distance);

      setStations(nearbyStations);
    } catch (error) {
      console.error('Error loading stations:', error);
    }
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

  // Google Maps Night Mode Style
  const nightMapStyle = [
    {
      "elementType": "geometry",
      "stylers": [{"color": "#242f3e"}]
    },
    {
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#746855"}]
    },
    {
      "elementType": "labels.text.stroke",
      "stylers": [{"color": "#242f3e"}]
    },
    {
      "featureType": "administrative.locality",
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#d59563"}]
    },
    {
      "featureType": "poi",
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#d59563"}]
    },
    {
      "featureType": "poi.park",
      "elementType": "geometry",
      "stylers": [{"color": "#263c3f"}]
    },
    {
      "featureType": "poi.park",
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#6b9a76"}]
    },
    {
      "featureType": "road",
      "elementType": "geometry",
      "stylers": [{"color": "#38414e"}]
    },
    {
      "featureType": "road",
      "elementType": "geometry.stroke",
      "stylers": [{"color": "#212a37"}]
    },
    {
      "featureType": "road",
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#9ca5b3"}]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry",
      "stylers": [{"color": "#746855"}]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry.stroke",
      "stylers": [{"color": "#1f2835"}]
    },
    {
      "featureType": "road.highway",
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#f3d19c"}]
    },
    {
      "featureType": "transit",
      "elementType": "geometry",
      "stylers": [{"color": "#2f3948"}]
    },
    {
      "featureType": "transit.station",
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#d59563"}]
    },
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [{"color": "#17263c"}]
    },
    {
      "featureType": "water",
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#515c6d"}]
    },
    {
      "featureType": "water",
      "elementType": "labels.text.stroke",
      "stylers": [{"color": "#17263c"}]
    }
  ];

  const renderUserLocationCircle = () => {
    if (!userLocation) return null;

    // Adjust circle colors based on map style
    const strokeColor = isNightMode ? "#64B5F6" : "#2196F3";
    const fillColor = isNightMode ? "rgba(100, 181, 246, 0.15)" : "rgba(33, 150, 243, 0.1)";

    return (
      <Circle
        center={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        }}
        radius={20000} // 20km radius
        strokeColor={strokeColor}
        strokeWidth={2}
        fillColor={fillColor}
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
        customMapStyle={isNightMode ? nightMapStyle : []}
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
    backgroundColor: '#121212', // Dark background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212', // Dark background
  },
  loadingText: {
    fontSize: 18,
    color: '#E0E0E0', // Light text
  },
  header: {
    backgroundColor: '#1A1A1A', // Dark header
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
    backgroundColor: '#2A2A2A', // Dark card background
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#404040', // Dark border
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E0E0E0', // Light text
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
    color: '#B0B0B0', // Muted light text
  },
});

export default AirQualityMapView;
