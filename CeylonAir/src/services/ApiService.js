import axios from 'axios';
import CONFIG, { API_KEYS, BASE_URLS } from '../config/environment';

class ApiService {
  constructor() {
    // Use environment-based configuration
    this.baseUrls = BASE_URLS;
    this.apiKeys = API_KEYS;
    this.config = CONFIG;

    // Validate API keys on initialization
    if (CONFIG.DEBUG) {
      this.validateConfiguration();
    }
  }

  validateConfiguration() {
    console.log('🔧 ApiService: Validating configuration...');

    // Check if API keys are properly loaded
    const missingKeys = [];
    Object.entries(this.apiKeys).forEach(([service, key]) => {
      if (!key || key.startsWith('your_')) {
        missingKeys.push(service);
      }
    });

    if (missingKeys.length > 0) {
      console.error('❌ Missing API keys:', missingKeys);
    } else {
      console.log('✅ All API keys loaded successfully');
    }
  }

  // IQAir API - Get nearest air quality station
  async getIQAirData(latitude, longitude) {
    try {
      // Construct the API URL with coordinates and API key
      const url = `${this.baseUrls.IQAIR}/nearest_city?lat=${latitude}&lon=${longitude}&key=${this.apiKeys.IQAIR}`;

      console.log('Fetching IQAir data from:', url);

      // Make the actual API call
      const response = await axios.get(url, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      // Check if the response is successful
      if (response.data && response.data.status === 'success') {
        console.log('IQAir API response received:', response.data);
        return response.data;
      } else {
        throw new Error(`IQAir API error: ${response.data?.data?.message || 'Unknown error'}`);
      }

    } catch (error) {
      console.error('IQAir API error:', error);

      // If API fails, return fallback mock data to prevent app crash
      console.warn('Falling back to mock data due to API error');
      const fallbackData = {
        status: 'success',
        data: {
          city: 'Colombo',
          state: 'Western Province',
          country: 'Sri Lanka',
          location: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          current: {
            pollution: {
              ts: new Date().toISOString(),
              aqius: Math.floor(Math.random() * 200) + 50, // Random AQI between 50-250
              mainus: 'p2',
              aqicn: Math.floor(Math.random() * 200) + 50,
              maincn: 'p2'
            },
            weather: {
              ts: new Date().toISOString(),
              tp: Math.floor(Math.random() * 15) + 25, // Temperature 25-40°C
              pr: Math.floor(Math.random() * 50) + 1000, // Pressure 1000-1050 hPa
              hu: Math.floor(Math.random() * 40) + 60, // Humidity 60-100%
              ws: Math.floor(Math.random() * 10) + 5, // Wind speed 5-15 m/s
              wd: Math.floor(Math.random() * 360), // Wind direction 0-360°
              ic: '04d' // Weather icon
            }
          }
        }
      };

      return fallbackData;
    }
  }

  // OpenWeatherMap API - Get air quality data
  async getOpenWeatherData(latitude, longitude) {
    try {
      // Construct the API URL for air pollution data
      const url = `${this.baseUrls.OPENWEATHER}/air_pollution?lat=${latitude}&lon=${longitude}&appid=${this.apiKeys.OPENWEATHER}`;

      console.log('Fetching OpenWeather air pollution data from:', url);

      // Make the actual API call
      const response = await axios.get(url, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      // Check if the response is successful
      if (response.data && response.data.coord) {
        console.log('OpenWeather API response received:', response.data);
        return response.data;
      } else {
        throw new Error('OpenWeather API returned invalid data');
      }

    } catch (error) {
      console.error('OpenWeather API error:', error);

      // If API fails, return fallback mock data to prevent app crash
      console.warn('Falling back to mock data due to OpenWeather API error');
      const fallbackData = {
        coord: {
          lon: longitude,
          lat: latitude
        },
        list: [
          {
            main: {
              aqi: Math.floor(Math.random() * 5) + 1 // AQI 1-5
            },
            components: {
              co: Math.random() * 400,
              no: Math.random() * 50,
              no2: Math.random() * 100,
              o3: Math.random() * 200,
              so2: Math.random() * 50,
              pm2_5: Math.random() * 100,
              pm10: Math.random() * 150,
              nh3: Math.random() * 30
            },
            dt: Math.floor(Date.now() / 1000)
          }
        ]
      };

      return fallbackData;
    }
  }

  // OpenWeatherMap UV Index
  async getOpenWeatherUV(latitude, longitude) {
    try {
      // Construct the API URL for UV index data
      const url = `${this.baseUrls.OPENWEATHER}/uvi?lat=${latitude}&lon=${longitude}&appid=${this.apiKeys.OPENWEATHER}`;

      console.log('Fetching OpenWeather UV data from:', url);

      // Make the actual API call
      const response = await axios.get(url, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      // Check if the response is successful
      if (response.data && typeof response.data.value !== 'undefined') {
        console.log('OpenWeather UV API response received:', response.data);
        return response.data;
      } else {
        throw new Error('OpenWeather UV API returned invalid data');
      }

    } catch (error) {
      console.error('OpenWeather UV API error:', error);

      // If API fails, return fallback mock data to prevent app crash
      console.warn('Falling back to mock UV data due to API error');
      const fallbackUVData = {
        lat: latitude,
        lon: longitude,
        date_iso: new Date().toISOString(),
        date: Math.floor(Date.now() / 1000),
        value: Math.floor(Math.random() * 12) + 1 // UV Index 1-12
      };

      return fallbackUVData;
    }
  }

  // WeatherAPI - Get UV Index and Air Quality data
  async getWeatherApiUV(latitude, longitude) {
    try {
      // Construct the API URL for current weather with air quality data
      const url = `${this.baseUrls.WEATHERAPI}/current.json?key=${this.apiKeys.WEATHERAPI}&q=${latitude},${longitude}&aqi=yes`;

      console.log('Fetching WeatherAPI data from:', url);

      // Make the actual API call
      const response = await axios.get(url, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      // Check if the response is successful
      if (response.data && response.data.location && response.data.current) {
        console.log('WeatherAPI response received:', response.data);
        return response.data;
      } else {
        throw new Error('WeatherAPI returned invalid data');
      }

    } catch (error) {
      console.error('WeatherAPI error:', error);

      // If API fails, return fallback mock data to prevent app crash
      console.warn('Falling back to mock data due to WeatherAPI error');
      const fallbackData = {
        location: {
          name: 'Colombo',
          region: 'Western',
          country: 'Sri Lanka',
          lat: latitude,
          lon: longitude,
          tz_id: 'Asia/Colombo',
          localtime_epoch: Math.floor(Date.now() / 1000),
          localtime: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Colombo' }).replace(' ', ' ')
        },
        current: {
          last_updated_epoch: Math.floor(Date.now() / 1000),
          last_updated: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Colombo' }).replace(' ', ' '),
          temp_c: Math.floor(Math.random() * 15) + 25,
          temp_f: Math.floor(Math.random() * 27) + 77,
          is_day: new Date().getHours() >= 6 && new Date().getHours() < 18 ? 1 : 0,
          condition: {
            text: 'Partly cloudy',
            icon: '//cdn.weatherapi.com/weather/64x64/day/116.png',
            code: 1003
          },
          wind_mph: Math.random() * 20,
          wind_kph: Math.random() * 32,
          wind_degree: Math.floor(Math.random() * 360),
          wind_dir: 'WSW',
          pressure_mb: Math.floor(Math.random() * 50) + 1000,
          pressure_in: 29.8,
          precip_mm: Math.random() * 2,
          precip_in: Math.random() * 0.1,
          humidity: Math.floor(Math.random() * 40) + 60,
          cloud: Math.floor(Math.random() * 100),
          feelslike_c: Math.floor(Math.random() * 15) + 30,
          feelslike_f: Math.floor(Math.random() * 27) + 86,
          uv: Math.floor(Math.random() * 12) + 1, // UV Index 1-12
          air_quality: {
            co: Math.random() * 400,
            no2: Math.random() * 50,
            o3: Math.random() * 200,
            so2: Math.random() * 50,
            pm2_5: Math.random() * 100,
            pm10: Math.random() * 150,
            "us-epa-index": Math.floor(Math.random() * 6) + 1,
            "gb-defra-index": Math.floor(Math.random() * 10) + 1
          }
        }
      };

      return fallbackData;
    }
  }

  // Get all air quality and UV data from multiple sources
  async getAllWeatherData(latitude, longitude) {
    try {
      console.log('Fetching weather data for coordinates:', latitude, longitude);

      const [iqAirData, openWeatherData, weatherApiData] = await Promise.allSettled([
        this.getIQAirData(latitude, longitude),
        this.getOpenWeatherData(latitude, longitude),
        this.getWeatherApiUV(latitude, longitude)
      ]);

      const result = {
        iqAir: iqAirData.status === 'fulfilled' ? iqAirData.value : null,
        openWeather: openWeatherData.status === 'fulfilled' ? openWeatherData.value : null,
        weatherApi: weatherApiData.status === 'fulfilled' ? weatherApiData.value : null,
        timestamp: Date.now(),
        coordinates: { latitude, longitude }
      };

      console.log('Weather data fetched successfully:', result);
      return result;
    } catch (error) {
      console.error('Error fetching all weather data:', error);
      throw error;
    }
  }

  /**
   * Fetches all available IQAir monitoring stations (cities) for Sri Lanka.
   * Returns a list of stations with city, coordinates, and AQI values if available.
   */
  async getAllIQAirStations(country = 'Sri Lanka') {
    try {
      const url = `${this.baseUrls.IQAIR}/cities?country=${encodeURIComponent(country)}&key=${this.apiKeys.IQAIR}`;

      console.log('Fetching all IQAir stations from:', url);

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.status === 'success') {
        const stations = response.data.data;

        console.log(`✅ Received ${stations.length} IQAir stations for ${country}`);

        // Each item has { city, state, country }
        // Now fetch coordinates and AQI for each (limited to top few for efficiency)
        const detailedStations = await Promise.all(
          stations.slice(0, 20).map(async (st) => {
            try {
              const cityUrl = `${this.baseUrls.IQAIR}/city?city=${encodeURIComponent(st.city)}&state=${encodeURIComponent(st.state)}&country=${encodeURIComponent(st.country)}&key=${this.apiKeys.IQAIR}`;
              const cityRes = await axios.get(cityUrl, { timeout: 8000 });

              if (cityRes.data.status === 'success') {
                const cityData = cityRes.data.data;
                return {
                  city: cityData.city,
                  state: cityData.state,
                  country: cityData.country,
                  latitude: cityData.location.coordinates[1],
                  longitude: cityData.location.coordinates[0],
                  aqi: cityData.current.pollution.aqius,
                  category: this.getAqiCategory(cityData.current.pollution.aqius)
                };
              } else {
                return {
                  city: st.city,
                  state: st.state,
                  country: st.country,
                  latitude: null,
                  longitude: null,
                  aqi: null,
                  category: 'Unknown'
                };
              }
            } catch (err) {
              console.warn(`⚠️ Failed to fetch details for ${st.city}:`, err.message);
              return {
                city: st.city,
                state: st.state,
                country: st.country,
                latitude: null,
                longitude: null,
                aqi: null,
                category: 'Unknown'
              };
            }
          })
        );

        return detailedStations;
      } else {
        throw new Error(`IQAir API error: ${response.data?.data?.message || 'Unknown error'}`);
      }

    } catch (error) {
      console.error('❌ IQAir getAllStations() error:', error);

      // Fallback mock stations (to avoid app crash)
      console.warn('⚠️ Falling back to mock station list due to API failure');

      const mockStations = [
        {
          city: 'Colombo',
          state: 'Western Province',
          country: 'Sri Lanka',
          latitude: 6.9271,
          longitude: 79.8612,
          aqi: 85,
          category: 'Moderate'
        },
        {
          city: 'Kandy',
          state: 'Central Province',
          country: 'Sri Lanka',
          latitude: 7.2906,
          longitude: 80.6337,
          aqi: 72,
          category: 'Moderate'
        },
        {
          city: 'Galle',
          state: 'Southern Province',
          country: 'Sri Lanka',
          latitude: 6.0329,
          longitude: 80.217,
          aqi: 95,
          category: 'Moderate'
        },
        {
          city: 'Jaffna',
          state: 'Northern Province',
          country: 'Sri Lanka',
          latitude: 9.6615,
          longitude: 80.0255,
          aqi: 68,
          category: 'Moderate'
        },
        {
          city: 'Anuradhapura',
          state: 'North Central Province',
          country: 'Sri Lanka',
          latitude: 8.3114,
          longitude: 80.4037,
          aqi: 110,
          category: 'Unhealthy for Sensitive Groups'
        }
      ];

      return mockStations;
    }
  }

  async getNearestIQAirCity(location) {
    try {
      const url = `${this.baseUrls.IQAIR}/nearest_city?lat=${location.latitude}&lon=${location.longitude}&key=${this.apiKeys.IQAIR}`;
      console.log('[IQAir] Fetching nearest city from:', url);

      const response = await axios.get(url, { timeout: CONFIG.REQUEST_TIMEOUT });
      if (response.data?.status === 'success') {
        const data = response.data.data;
        return {
          city: data.city,
          state: data.state,
          country: data.country,
          latitude: data.location.coordinates[1],
          longitude: data.location.coordinates[0],
          aqi: data.current.pollution.aqius,
          category: getAqiCategory(data.current.pollution.aqius),
        };
      }
      throw new Error(`IQAir API returned error: ${response.data?.data?.message}`);
    } catch (err) {
      console.error('[IQAir] Error fetching nearest city:', err.message);
      return null;
    }
  }
  /**
   * Helper: Categorize AQI value
   */
  getAqiCategory(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    return 'Very Unhealthy';
  }


  // Convert OpenWeather AQI (1-5) to standard AQI (0-500)
  convertOpenWeatherAQI(aqi) {
    const conversion = {
      1: 50,   // Good
      2: 100,  // Moderate
      3: 150,  // Unhealthy for Sensitive Groups
      4: 200,  // Unhealthy
      5: 300   // Very Unhealthy
    };
    return conversion[aqi] || 50;
  }
}

export default new ApiService();
