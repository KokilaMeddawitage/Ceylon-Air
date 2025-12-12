# CeylonAir - Air Quality & UV Index Monitor

A cross-platform React Native mobile application that monitors Air Quality Index (AQI) and UV Index (UVI) for users in Sri Lanka. The app demonstrates mobile computing concepts including context-awareness, mobility, edge processing, and sensor integration.

## Features

### Core Functionality
- **GPS Location Detection**: Automatically detects user location for accurate local air quality data
- **Multi-Source Data Integration**: Combines data from IQAir, OpenWeatherMap, and WeatherAPI
- **Hybrid Edge Algorithm**: Intelligent data fusion based on distance and freshness
- **Real-time Monitoring**: Hourly background data fetching and updates
- **Smart Notifications**: Context-aware alerts when air quality or UV levels exceed safe thresholds

### User Interface
- **Dashboard**: Color-coded cards showing AQI, UV Index, and Atmosphere Health Score
- **Interactive Map**: Shows nearby air quality stations with real-time data
- **Historical Charts**: Trend analysis with line charts and distribution graphs
- **Settings**: Customizable alert thresholds and notification preferences

### Mobile Computing Concepts Demonstrated
1. **Context-Awareness**: Location-based data fetching and personalized recommendations
2. **Mobility**: GPS integration and location tracking
3. **Edge Processing**: Local data processing and hybrid algorithm implementation
4. **Sensor Integration**: GPS sensor integration for location services

## Architecture

```
GPS Sensor → API Layer (IQAir, OWM, WeatherAPI)
     ↓
Edge Processing (Hybrid AQI + UV logic)
     ↓
Local Storage (AsyncStorage)
     ↓
Alert Engine (Thresholds + Notifications)
     ↓
User Interface (Dashboard, Map, Charts)
```

## Tech Stack

- **React Native** with Expo framework
- **Navigation**: React Navigation v6
- **Maps**: React Native Maps
- **Charts**: React Native Chart Kit
- **Location**: React Native Geolocation Service
- **Storage**: AsyncStorage
- **Notifications**: React Native Push Notification
- **Background Tasks**: React Native Background Fetch

## Installation

1. **Prerequisites**
   - Node.js (v16 or higher)
   - npm or yarn
   - Expo CLI
   - Android Studio (for Android development)
   - Xcode (for iOS development, macOS only)

2. **Clone and Install**
   ```bash
   cd CeylonAir
   npm install
   ```

3. **API Keys Setup**
   - Replace placeholder API keys in `src/services/ApiService.js`:
     - IQAir API key
     - OpenWeatherMap API key
     - WeatherAPI key

4. **Run the App**
   ```bash
   npm start
   ```

## Project Structure

```
src/
├── services/
│   ├── LocationService.js      # GPS location management
│   ├── ApiService.js           # API integrations
│   ├── NotificationService.js  # Push notifications
│   └── BackgroundFetchService.js # Background data fetching
├── components/
│   ├── Dashboard.js           # Main dashboard
│   ├── MapView.js            # Station map view
│   ├── Charts.js             # Historical data charts
│   └── Settings.js           # App settings
├── utils/
│   └── hybridAlgorithm.js    # Data fusion algorithm
└── navigation/
    └── AppNavigator.js       # Navigation setup
```

## Hybrid Algorithm

The app uses a sophisticated hybrid algorithm to process air quality data:

### Distance-Based Weighting
- **< 2km**: IQAir 90%, OpenWeather 10%
- **2-10km**: IQAir 70%, OpenWeather 30%
- **> 10km**: IQAir 30%, OpenWeather 70%

### Time-Based Weighting
- **Fresh data (< 1 hour)**: Full weight (1.0)
- **Stale data (1-6 hours)**: Reduced weight (0.5)
- **Old data (> 6 hours)**: Minimal weight (0.2)

### Risk Assessment
- **AQI Categories**: Good (0-50), Moderate (51-100), Unhealthy for Sensitive Groups (101-150), Unhealthy (151-200), Very Unhealthy (200+)
- **UV Categories**: Low (0-2), Moderate (3-5), High (6-7), Very High (8-10), Extreme (11+)
- **Atmosphere Score**: 0-100 based on weighted AQI and UV factors

## Background Processing

- **Hourly Data Fetching**: Automatic background updates
- **Smart Caching**: Local storage with freshness validation
- **Alert System**: Threshold-based notifications
- **Battery Optimization**: Efficient background processing

## Permissions

The app requires the following permissions:

### Android
- `ACCESS_FINE_LOCATION` - For GPS location
- `ACCESS_COARSE_LOCATION` - For network-based location
- `RECEIVE_BOOT_COMPLETED` - For background tasks
- `VIBRATE` - For notifications
- `WAKE_LOCK` - For background processing

### iOS
- `NSLocationWhenInUseUsageDescription` - Location access
- `NSLocationAlwaysAndWhenInUseUsageDescription` - Background location
- `UIBackgroundModes` - Background fetch

## Configuration

### Notification Thresholds
- Default AQI threshold: 150 (Unhealthy for Sensitive Groups)
- Default UV threshold: 8 (Very High)
- Customizable in Settings

### Data Fetching
- Default interval: 1 hour
- Configurable: 15 minutes to 3 hours
- Smart caching prevents unnecessary API calls

## Development Notes

### Mock Data
The app currently uses mock data for demonstration purposes. Replace the mock implementations in `ApiService.js` with actual API calls for production use.

### API Integration
1. **IQAir**: Air quality data with station information
2. **OpenWeatherMap**: Air quality and UV index data
3. **WeatherAPI**: UV index and weather conditions

### Testing
- Use Expo Go app for testing on physical devices
- Test location permissions and background processing
- Verify notification functionality
- Test offline scenarios with cached data

## Future Enhancements

- Real-time data streaming
- Machine learning for predictive analytics
- Social features for sharing air quality updates
- Integration with health apps
- Voice alerts and accessibility features
- Multi-language support for Sri Lankan languages
