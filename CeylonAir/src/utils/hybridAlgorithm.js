import LocationService from '../services/LocationService';

class HybridAlgorithm {
  constructor() {
    this.weights = {
      // Distance-based weights for IQAir vs OpenWeather
      distanceWeights: {
        close: { iqAir: 0.9, openWeather: 0.1 }, // < 2km
        medium: { iqAir: 0.7, openWeather: 0.3 }, // 2-10km
        far: { iqAir: 0.3, openWeather: 0.7 }     // > 10km
      },
      // Time-based weights (data freshness)
      timeWeights: {
        fresh: 1.0,    // < 1 hour
        stale: 0.5,    // 1-6 hours
        old: 0.2       // > 6 hours
      }
    };
  }

  // Main hybrid processing function
  processWeatherData(weatherData, userLocation) {
    try {
      console.log('Processing weather data with hybrid algorithm');
      
      const processedData = {
        aqi: this.calculateHybridAQI(weatherData, userLocation),
        uv: this.calculateHybridUV(weatherData),
        atmosphereScore: 0,
        riskLevel: 'good',
        recommendations: [],
        timestamp: Date.now(),
        sources: this.getDataSources(weatherData)
      };

      // Calculate overall atmosphere health score
      processedData.atmosphereScore = this.calculateAtmosphereScore(
        processedData.aqi, 
        processedData.uv
      );

      // Determine risk level
      processedData.riskLevel = this.determineRiskLevel(
        processedData.aqi, 
        processedData.uv
      );

      // Generate recommendations
      processedData.recommendations = this.generateRecommendations(
        processedData.aqi, 
        processedData.uv
      );

      console.log('Hybrid algorithm processing complete:', processedData);
      return processedData;
    } catch (error) {
      console.error('Error in hybrid algorithm:', error);
      throw error;
    }
  }

  // Calculate hybrid AQI using distance and time-based weighting
  calculateHybridAQI(weatherData, userLocation) {
    const { iqAir, openWeather } = weatherData;
    
    if (!iqAir && !openWeather) {
      return { value: 50, category: 'Good', source: 'default' };
    }

    let iqAirWeight = 0;
    let openWeatherWeight = 0;

    // Determine weights based on data availability and quality
    if (iqAir && iqAir.data) {
      const iqAirLocation = iqAir.data.location;
      if (iqAirLocation && iqAirLocation.coordinates) {
        const distance = LocationService.calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          iqAirLocation.coordinates[1], // latitude
          iqAirLocation.coordinates[0]  // longitude
        );

        // Apply distance-based weighting
        if (distance < 2) {
          iqAirWeight = this.weights.distanceWeights.close.iqAir;
        } else if (distance <= 10) {
          iqAirWeight = this.weights.distanceWeights.medium.iqAir;
        } else {
          iqAirWeight = this.weights.distanceWeights.far.iqAir;
        }

        // Apply time-based weighting
        const dataAge = this.calculateDataAge(iqAir.data.current.pollution.ts);
        iqAirWeight *= this.getTimeWeight(dataAge);
      } else {
        iqAirWeight = 0.5; // Default weight if no location data
      }
    }

    if (openWeather && openWeather.list && openWeather.list[0]) {
      openWeatherWeight = 1 - iqAirWeight;
      const dataAge = this.calculateDataAge(openWeather.list[0].dt * 1000);
      openWeatherWeight *= this.getTimeWeight(dataAge);
    }

    // Calculate weighted AQI
    let finalAQI = 0;
    let source = 'hybrid';

    if (iqAirWeight > 0 && openWeatherWeight > 0) {
      const iqAirAQI = iqAir.data.current.pollution.aqius;
      const openWeatherAQI = this.convertOpenWeatherAQI(openWeather.list[0].main.aqi);
      
      finalAQI = (iqAirAQI * iqAirWeight + openWeatherAQI * openWeatherWeight) / (iqAirWeight + openWeatherWeight);
      source = 'hybrid';
    } else if (iqAirWeight > 0) {
      finalAQI = iqAir.data.current.pollution.aqius;
      source = 'iqair';
    } else if (openWeatherWeight > 0) {
      finalAQI = this.convertOpenWeatherAQI(openWeather.list[0].main.aqi);
      source = 'openweather';
    }

    return {
      value: Math.round(finalAQI),
      category: this.getAQICategory(finalAQI),
      source: source,
      confidence: Math.max(iqAirWeight, openWeatherWeight)
    };
  }

  // Calculate hybrid UV Index
  calculateHybridUV(weatherData) {
    const { openWeather, weatherApi } = weatherData;
    
    if (!openWeather && !weatherApi) {
      return { value: 3, category: 'Moderate', source: 'default' };
    }

    let uvValues = [];

    if (openWeather && openWeather.uv) {
      uvValues.push({
        value: openWeather.uv.value,
        source: 'openweather'
      });
    }

    if (weatherApi && weatherApi.current) {
      uvValues.push({
        value: weatherApi.current.uv,
        source: 'weatherapi'
      });
    }

    if (uvValues.length === 0) {
      return { value: 3, category: 'Moderate', source: 'default' };
    }

    // Average UV values from available sources
    const avgUV = uvValues.reduce((sum, uv) => sum + uv.value, 0) / uvValues.length;

    return {
      value: Math.round(avgUV),
      category: this.getUVCategory(avgUV),
      source: uvValues.length > 1 ? 'hybrid' : uvValues[0].source
    };
  }

  // Calculate overall atmosphere health score (0-100)
  calculateAtmosphereScore(aqi, uv) {
    const aqiScore = this.getAQIScore(aqi.value);
    const uvScore = this.getUVScore(uv.value);
    
    // Weighted combination (AQI is more important for health)
    const atmosphereScore = (aqiScore * 0.7) + (uvScore * 0.3);
    
    return Math.round(atmosphereScore);
  }

  // Determine overall risk level
  determineRiskLevel(aqi, uv) {
    const aqiRisk = this.getAQIRiskLevel(aqi.value);
    const uvRisk = this.getUVRiskLevel(uv.value);
    
    // Return the higher risk level
    const riskLevels = ['good', 'moderate', 'unhealthy_sensitive', 'unhealthy', 'very_unhealthy'];
    const aqiRiskIndex = riskLevels.indexOf(aqiRisk);
    const uvRiskIndex = riskLevels.indexOf(uvRisk);
    
    return riskLevels[Math.max(aqiRiskIndex, uvRiskIndex)];
  }

  // Generate health recommendations
  generateRecommendations(aqi, uv) {
    const recommendations = [];

    // AQI-based recommendations
    if (aqi.value > 150) {
      recommendations.push('Avoid outdoor activities');
      recommendations.push('Keep windows and doors closed');
      recommendations.push('Use air purifiers if available');
    } else if (aqi.value > 100) {
      recommendations.push('Limit outdoor activities');
      recommendations.push('Sensitive groups should avoid outdoor exercise');
    }

    // UV-based recommendations
    if (uv.value > 8) {
      recommendations.push('Avoid sun exposure during peak hours (10 AM - 4 PM)');
      recommendations.push('Use sunscreen with SPF 30+');
      recommendations.push('Wear protective clothing and hat');
    } else if (uv.value > 6) {
      recommendations.push('Use sunscreen and seek shade during midday');
    }

    return recommendations;
  }

  // Helper functions
  calculateDataAge(timestamp) {
    const now = Date.now();
    const dataTime = new Date(timestamp).getTime();
    return (now - dataTime) / (1000 * 60 * 60); // Age in hours
  }

  getTimeWeight(ageInHours) {
    if (ageInHours < 1) return this.weights.timeWeights.fresh;
    if (ageInHours < 6) return this.weights.timeWeights.stale;
    return this.weights.timeWeights.old;
  }

  convertOpenWeatherAQI(aqi) {
    const conversion = { 1: 50, 2: 100, 3: 150, 4: 200, 5: 300 };
    return conversion[aqi] || 50;
  }

  getAQICategory(value) {
    if (value <= 50) return 'Good';
    if (value <= 100) return 'Moderate';
    if (value <= 150) return 'Unhealthy for Sensitive Groups';
    if (value <= 200) return 'Unhealthy';
    if (value <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  }

  getUVCategory(value) {
    if (value <= 2) return 'Low';
    if (value <= 5) return 'Moderate';
    if (value <= 7) return 'High';
    if (value <= 10) return 'Very High';
    return 'Extreme';
  }

  getAQIScore(value) {
    // Convert AQI to score (higher AQI = lower score)
    return Math.max(0, 100 - (value / 5));
  }

  getUVScore(value) {
    // Convert UV to score (higher UV = lower score)
    return Math.max(0, 100 - (value * 8));
  }

  getAQIRiskLevel(value) {
    if (value <= 50) return 'good';
    if (value <= 100) return 'moderate';
    if (value <= 150) return 'unhealthy_sensitive';
    if (value <= 200) return 'unhealthy';
    return 'very_unhealthy';
  }

  getUVRiskLevel(value) {
    if (value <= 2) return 'good';
    if (value <= 5) return 'moderate';
    if (value <= 7) return 'unhealthy_sensitive';
    if (value <= 10) return 'unhealthy';
    return 'very_unhealthy';
  }

  getDataSources(weatherData) {
    const sources = [];
    if (weatherData.iqAir) sources.push('IQAir');
    if (weatherData.openWeather) sources.push('OpenWeatherMap');
    if (weatherData.weatherApi) sources.push('WeatherAPI');
    return sources;
  }
}

export default new HybridAlgorithm();
