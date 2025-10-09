import * as Location from 'expo-location';
import { Platform } from 'react-native';

class LocationService {
  constructor() {
    this.currentLocation = null;
    this.locationPermissionGranted = false;
  }

  async requestLocationPermission() {
    try {
      console.log('Requesting location permission...');
      
      // Request foreground location permission
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      console.log('Location permission status:', status);
      
      if (status !== 'granted') {
        console.warn('Location permission denied');
        this.locationPermissionGranted = false;
        return false;
      }

      this.locationPermissionGranted = true;
      console.log('Location permission granted');
      return true;
    } catch (err) {
      console.error('Location permission error:', err);
      this.locationPermissionGranted = false;
      return false;
    }
  }

  async getCurrentLocation() {
    try {
      if (!this.locationPermissionGranted) {
        throw new Error('Location permission not granted');
      }

      console.log('Getting current GPS location...');

      // Get current position using Expo Location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000,
        maximumAge: 60000, // Cache for 1 minute
      });

      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp
      };
      
      console.log('GPS location obtained:', this.currentLocation);
      return this.currentLocation;
      
    } catch (error) {
      console.error('GPS location error:', error);
      throw error;
    }
  }

  async getLocationForSriLanka() {
    try {
      console.log('getLocationForSriLanka: Starting location fetch...');
      
      // First ensure we have permission
      if (!this.locationPermissionGranted) {
        console.log('No permission yet, requesting...');
        const hasPermission = await this.requestLocationPermission();
        if (!hasPermission) {
          console.warn('Location permission denied, using default location');
          return this.getDefaultLocation();
        }
      }

      // Try to get actual GPS location
      try {
        console.log('Attempting to get GPS location...');
        const location = await this.getCurrentLocation();
        console.log('✅ Successfully got GPS location:', location);
        return location;
      } catch (error) {
        console.error('❌ GPS failed, using default location. Error:', error.message);
        return this.getDefaultLocation();
      }
      
    } catch (error) {
      console.error('Location service error:', error);
      return this.getDefaultLocation();
    }
  }

  getDefaultLocation() {
    console.log('Using default Colombo location');
    return {
      latitude: 6.9271,
      longitude: 79.8612,
      accuracy: null,
      timestamp: Date.now(),
      isDefault: true // Flag to indicate this is default location
    };
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }

  deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  getCurrentLocationSync() {
    return this.currentLocation;
  }
}

export default new LocationService();
