import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Dimensions,
  ScrollView
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
  const [lastKnownLocation, setLastKnownLocation] = useState(null);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloadingStations, setReloadingStations] = useState(false);
  const [isNightMode, setIsNightMode] = useState(false);

  // Minimum distance threshold (in kilometers) before reloading stations
  const LOCATION_CHANGE_THRESHOLD = 2; // 2km

  useEffect(() => {
    initializeMap();
    checkTimeAndSetMapStyle();
    
    // Start location watching
    const locationCleanup = startLocationWatching();
    
    // Update map style every hour
    const styleInterval = setInterval(checkTimeAndSetMapStyle, 3600000); // 1 hour
    
    return () => {
      clearInterval(styleInterval);
      if (locationCleanup) locationCleanup();
    };
  }, []);

  // Watch for location changes and reload stations when significant change detected
  const startLocationWatching = () => {
    const locationInterval = setInterval(async () => {
      try {
        const currentLocation = await LocationService.getLocationForSriLanka();
        
        if (lastKnownLocation && userLocation) {
          const distance = LocationService.calculateDistance(
            lastKnownLocation.latitude,
            lastKnownLocation.longitude,
            currentLocation.latitude,
            currentLocation.longitude
          );
          
          // If user moved more than threshold distance, reload stations
          if (distance >= LOCATION_CHANGE_THRESHOLD) {
            console.log(`Location changed by ${distance.toFixed(2)}km, reloading stations...`);
            setReloadingStations(true);
            setUserLocation(currentLocation);
            setLastKnownLocation(currentLocation);
            
            // Update map region
            setRegion({
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            });
            
            // Reload stations
            await loadNearbyStations(currentLocation);
            setReloadingStations(false);
          }
        } else {
          // First time getting location
          setLastKnownLocation(currentLocation);
        }
      } catch (error) {
        console.warn('Error watching location:', error);
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(locationInterval);
  };

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
      setLastKnownLocation(location);

      // Set map region to user location
      setRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });

      // Load nearby stations
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
      const API_KEY = process.env.EXPO_PUBLIC_IQAIR_API_KEY;
      const stations = [];
      
      const coordinateOffsets = [
        { lat: 0, lon: 0 },                    // Current location (0km)
        
        // Inner circle - ~5km radius (0.045°)
        { lat: 0.045, lon: 0 },               // North 5km
        { lat: -0.045, lon: 0 },              // South 5km
        { lat: 0, lon: 0.045 },               // East 5km
        { lat: 0, lon: -0.045 },              // West 5km
        
        // Mid circle - ~10km radius (0.09°)
        { lat: 0.064, lon: 0.064 },           // Northeast 10km
        { lat: -0.064, lon: 0.064 },          // Southeast 10km
        { lat: 0.064, lon: -0.064 },          // Northwest 10km
        { lat: -0.064, lon: -0.064 },         // Southwest 10km
        { lat: 0.09, lon: 0 },                // North 10km
        { lat: -0.09, lon: 0 },               // South 10km
        { lat: 0, lon: 0.09 },                // East 10km
        { lat: 0, lon: -0.09 },               // West 10km
        
        // Outer circle - ~15km radius (0.136°)
        { lat: 0.096, lon: 0.096 },           // Northeast 15km
        { lat: -0.096, lon: 0.096 },          // Southeast 15km
        { lat: 0.096, lon: -0.096 },          // Northwest 15km
        { lat: -0.096, lon: -0.096 },         // Southwest 15km
        
        // Far circle - ~20km radius (0.18°)
        { lat: 0.18, lon: 0 },                // North 20km
        { lat: -0.18, lon: 0 },               // South 20km
        { lat: 0, lon: 0.18 },                // East 20km
        { lat: 0, lon: -0.18 },               // West 20km
        { lat: 0.127, lon: 0.127 },           // Northeast 20km
        { lat: -0.127, lon: 0.127 },          // Southeast 20km
        { lat: 0.127, lon: -0.127 },          // Northwest 20km
        { lat: -0.127, lon: -0.127 }          // Southwest 20km
      ];

      for (let i = 0; i < coordinateOffsets.length; i++) {
        try {
          const offset = coordinateOffsets[i];
          const lat = location.latitude + offset.lat;
          const lon = location.longitude + offset.lon;
          
          const response = await fetch(
            `https://api.airvisual.com/v2/nearest_city?lat=${lat}&lon=${lon}&key=${API_KEY}`
          );
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.status === 'success' && data.data) {
              const cityData = data.data;
              const pollution = cityData.current?.pollution;
              
              if (pollution) {
                // Get AQI category based on US AQI standards
                const getAQICategory = (aqi) => {
                  if (aqi <= 50) return 'Good';
                  if (aqi <= 100) return 'Moderate';
                  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
                  if (aqi <= 200) return 'Unhealthy';
                  if (aqi <= 300) return 'Very Unhealthy';
                  return 'Hazardous';
                };

                const station = {
                  id: `station_${i + 1}`,
                  name: `${cityData.city}, ${cityData.state}`,
                  latitude: lat,
                  longitude: lon,
                  aqi: pollution.aqius || 0,
                  category: getAQICategory(pollution.aqius || 0),
                  lastUpdate: pollution.ts || new Date().toISOString(),
                  distance: LocationService.calculateDistance(
                    location.latitude,
                    location.longitude,
                    lat,
                    lon
                  )
                };
                
                stations.push(station);
              }
            }
          }
        } catch (fetchError) {
          console.warn(`Failed to fetch data for offset ${i}:`, fetchError);
        }
        
        // Add small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Always display stations regardless of count
      if (stations.length > 0) {
        // Remove duplicates based on city name and sort by distance
        const uniqueStations = stations.filter((station, index, self) =>
          index === self.findIndex(s => s.name === station.name)
        ).sort((a, b) => a.distance - b.distance);
        
        console.log(`Found ${uniqueStations.length} unique stations from API`);
        setStations(uniqueStations);
      } else {
        // Fallback to mock data if API calls fail
        console.warn('No stations found from API calls, using fallback mock data');
        const mockStations = [
          {
            id: '1',
            name: 'Current Location (Fallback)',
            latitude: location.latitude,
            longitude: location.longitude,
            aqi: 50,
            category: 'Good',
            lastUpdate: new Date().toISOString(),
            distance: 0
          }
        ];
        setStations(mockStations);
      }
    } catch (error) {
      console.error('Error loading stations:', error);
      // Fallback to mock data on any error
      const mockStations = [
        {
          id: '1',
          name: 'Current Location',
          latitude: location.latitude,
          longitude: location.longitude,
          aqi: 50,
          category: 'Good',
          lastUpdate: new Date().toISOString(),
          distance: 0
        }
      ];
      setStations(mockStations);
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
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Air Quality Stations</Text>
        <Text style={styles.headerSubtitle}>
          {reloadingStations ? 'Updating stations...' : `Showing ${stations.length} nearby stations`}
        </Text>
      </View>

      <View style={styles.mapContainer}>
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
      </View>

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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // Dark background
  },
  scrollContent: {
    paddingBottom: 40, // Add space for tab navigator
  },
  mapContainer: {
    height: height * 0.675, // 60% of screen height for better proportions
    width: width,
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
    minHeight: 120, // Ensure minimum height for legend content
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
