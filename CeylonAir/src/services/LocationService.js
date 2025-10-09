import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';

class LocationService {
  constructor() {
    this.currentLocation = null;
    this.locationPermissionGranted = false;
  }

  async requestLocationPermission() {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'CeylonAir needs access to your location to provide air quality data for your area.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          this.locationPermissionGranted = true;
          return true;
        } else {
          this.locationPermissionGranted = false;
          return false;
        }
      } else {
        // iOS permissions are handled in app.json
        this.locationPermissionGranted = true;
        return true;
      }
    } catch (err) {
      console.warn('Location permission error:', err);
      return false;
    }
  }

  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!this.locationPermissionGranted) {
        reject(new Error('Location permission not granted'));
        return;
      }

      Geolocation.getCurrentPosition(
        (position) => {
          this.currentLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          
          console.log('Current location:', this.currentLocation);
          resolve(this.currentLocation);
        },
        (error) => {
          console.error('Location error:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000
        }
      );
    });
  }

  async getLocationForSriLanka() {
    try {
      // If we can't get GPS location, default to Colombo, Sri Lanka
      const defaultLocation = {
        latitude: 6.9271,
        longitude: 79.8612,
        accuracy: null,
        timestamp: Date.now()
      };

      try {
        const location = await this.getCurrentLocation();
        return location;
      } catch (error) {
        console.warn('Using default Colombo location due to GPS error:', error);
        return defaultLocation;
      }
    } catch (error) {
      console.error('Location service error:', error);
      throw error;
    }
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
