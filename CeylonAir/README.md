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

- **React Native** with Expo managed workflow (SDK 54)
- **Navigation**: React Navigation v6
- **Maps**: react-native-maps (mobile only)
- **Charts**: react-native-chart-kit, victory-native
- **Location**: expo-location + react-native-geolocation-service
- **Storage**: @react-native-async-storage/async-storage
- **Notifications**: expo-notifications
- **Background Tasks**: expo-background-fetch + expo-task-manager

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
      - Create a `.env` file in the project root with the following keys (Expo reads `EXPO_PUBLIC_*` at build time):
     
           ```env
           EXPO_PUBLIC_IQAIR_API_KEY=your_iqair_key
           EXPO_PUBLIC_OPENWEATHER_API_KEY=your_owm_key
           EXPO_PUBLIC_WEATHERAPI_API_KEY=your_weatherapi_key
           EXPO_PUBLIC_IQAIR_BASE_URL=https://api.airvisual.com/v2
           EXPO_PUBLIC_OPENWEATHER_BASE_URL=https://api.openweathermap.org
           EXPO_PUBLIC_WEATHERAPI_BASE_URL=https://api.weatherapi.com/v1
           ```
      - The app reads these via `src/config/environment.js`, used by `src/services/ApiService.js`.

4. **Run the App**
   ```bash
   npm start
   ```
     - In the Expo CLI, press `a` to open Android, `w` to open web.
     - Note: Maps are supported on mobile; the web build has limited map support.

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
 - **Expo Go Limitation**: Background tasks are skipped in Expo Go. Use a development build or a production build to test background fetch and scheduled notifications.

## Permissions

The app requires the following permissions:

### Android
- `ACCESS_FINE_LOCATION` - For GPS location
- `ACCESS_COARSE_LOCATION` - For network-based location
- `POST_NOTIFICATIONS` - For push notifications
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

### API Integration
1. **IQAir**: Air quality data with station information
2. **OpenWeatherMap**: Air quality and UV index data
3. **WeatherAPI**: UV index and weather conditions

### Testing
- Use Expo Go for rapid UI testing; use a Development Build for background fetch/notifications
- Test location permissions and GPS accuracy (Settings → App permissions)
- Verify notification functionality (Android 13+ requires runtime permission)
- Test offline scenarios with cached data (disable network to confirm cache rendering)

### Quick Share (Dev Tunnel)
- Share your running dev build via the Expo tunnel link shown in the CLI (e.g., `exp.direct`).
- Recipients install Expo Go and open the link; for background features, share a development build instead.

## Future Enhancements

- Real-time data streaming
- Machine learning for predictive analytics
- Social features for sharing air quality updates
- Integration with health apps
- Voice alerts and accessibility features
- Multi-language support for Sri Lankan languages

## Known Limitations
- `react-native-maps` is a native-only module; full functionality is available on Android/iOS. The web build provides limited or fallback behavior for maps.
- Background fetch and scheduled notifications do not run in Expo Go; use a dev or production build.
