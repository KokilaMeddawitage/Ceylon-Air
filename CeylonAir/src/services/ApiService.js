import axios from 'axios';

// API Keys - Replace with actual keys in production
const API_KEYS = {
  IQAIR: 'your_iqair_api_key_here',
  OPENWEATHER: 'your_openweather_api_key_here',
  WEATHERAPI: 'your_weatherapi_key_here'
};

class ApiService {
  constructor() {
    this.baseUrls = {
      IQAIR: 'https://api.airvisual.com/v2',
      OPENWEATHER: 'https://api.openweathermap.org/data/2.5',
      WEATHERAPI: 'https://api.weatherapi.com/v1'
    };
  }

  // IQAir API - Get nearest air quality station
  async getIQAirData(latitude, longitude) {
    try {
      // Mock data for demonstration - replace with actual API call
      const mockData = {
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

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return mockData;
    } catch (error) {
      console.error('IQAir API error:', error);
      throw error;
    }
  }

  // OpenWeatherMap API - Get air quality and weather data
  async getOpenWeatherData(latitude, longitude) {
    try {
      // Mock data for demonstration - replace with actual API call
      const mockData = {
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

      // Also get UV index from OpenWeatherMap
      const uvData = await this.getOpenWeatherUV(latitude, longitude);
      mockData.uv = uvData;

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return mockData;
    } catch (error) {
      console.error('OpenWeather API error:', error);
      throw error;
    }
  }

  // OpenWeatherMap UV Index
  async getOpenWeatherUV(latitude, longitude) {
    try {
      // Mock UV data
      const mockUVData = {
        lat: latitude,
        lon: longitude,
        date_iso: new Date().toISOString(),
        date: Math.floor(Date.now() / 1000),
        value: Math.floor(Math.random() * 12) + 1 // UV Index 1-12
      };

      return mockUVData;
    } catch (error) {
      console.error('OpenWeather UV API error:', error);
      throw error;
    }
  }

  // WeatherAPI - Get UV Index
  async getWeatherApiUV(latitude, longitude) {
    try {
      // Mock data for WeatherAPI UV
      const mockData = {
        location: {
          name: 'Colombo',
          region: 'Western',
          country: 'Sri Lanka',
          lat: latitude,
          lon: longitude,
          tz_id: 'Asia/Colombo',
          localtime_epoch: Math.floor(Date.now() / 1000),
          localtime: new Date().toISOString()
        },
        current: {
          uv: Math.floor(Math.random() * 12) + 1, // UV Index 1-12
          last_updated_epoch: Math.floor(Date.now() / 1000),
          last_updated: new Date().toISOString(),
          temp_c: Math.floor(Math.random() * 15) + 25,
          temp_f: Math.floor(Math.random() * 27) + 77,
          condition: {
            text: 'Partly cloudy',
            icon: '//cdn.weatherapi.com/weather/64x64/day/116.png',
            code: 1003
          }
        }
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 600));
      
      return mockData;
    } catch (error) {
      console.error('WeatherAPI error:', error);
      throw error;
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
