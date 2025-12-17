import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundFetchService from '../services/BackgroundFetchService';

const { width } = Dimensions.get('window');

const ChartsView = () => {
  const [historicalData, setHistoricalData] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [fetchInterval, setFetchInterval] = useState(60); // Default 1 hour

  useEffect(() => {
    initializeChartsData();
  }, []);

  const initializeChartsData = async () => {
    await loadUserSettings();
    await loadHistoricalData();
    
    // If no data exists, fetch some initial data
    if (historicalData.length === 0) {
      console.log('No historical data found, fetching initial data...');
      await fetchFreshData();
    }
  };

  const loadUserSettings = async () => {
    try {
      // Load user's data fetch interval preference
      await BackgroundFetchService.loadFetchInterval();
      const status = await BackgroundFetchService.getFetchStatus();
      setFetchInterval(status.fetchInterval / (60 * 1000)); // Convert to minutes
      
      console.log(`Charts: User fetch interval set to ${status.fetchInterval / (60 * 1000)} minutes`);
      
      // Ensure background fetch service is running with current settings
      await BackgroundFetchService.initialize();
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  };

  const loadHistoricalData = async () => {
    try {
      console.log('=== CHARTS LOADING START ===');
      
      // Use BackgroundFetchService to get historical data
      const data = await BackgroundFetchService.getHistoricalData();
      console.log(`Loaded ${data.length} historical data points`);
      
      if (data.length > 0) {
        console.log('Sample data:', data[0]);
        setHistoricalData(data);
      } else {
        console.log('No historical data found');
        setHistoricalData([]);
      }
      
      setLoading(false);
      console.log('=== CHARTS LOADING END ===');
    } catch (error) {
      console.error('Error loading historical data:', error);
      setHistoricalData([]);
      setLoading(false);
    }
  };

  // Fetch fresh data from APIs and update charts
  const fetchFreshData = async () => {
    try {
      setLoading(true);
      console.log('Fetching fresh data for charts...');
      
      await BackgroundFetchService.fetchForCharts();
      
      await loadHistoricalData();
      
      console.log('Fresh data fetched and charts updated');
    } catch (error) {
      console.error('Error fetching fresh data:', error);
      // Fall back to mock data if API fails
      await addMockDataForTesting();
    } finally {
      setLoading(false);
    }
  };

  // TEMPORARY: Add mock data for testing charts
  const addMockDataForTesting = async () => {
    const mockData = [];
    const now = Date.now();
    
    for (let i = 0; i < 12; i++) {
      mockData.push({
        timestamp: now - (i * 10 * 60 * 1000), // 10 minutes apart
        latitude: 6.9271,
        longitude: 79.8612,
        locationName: 'Colombo',
        aqi: Math.floor(45 + Math.random() * 40), // Random AQI 45-85
        uv: Math.floor(3 + Math.random() * 5), // Random UV 3-8
        atmosphereScore: Math.floor(60 + Math.random() * 30), // Random score 60-90
        aqiCategory: 'Good',
        uvCategory: 'Moderate'
      });
    }
    
    await AsyncStorage.setItem('ceylon_air_historical_data', JSON.stringify(mockData));
    console.log('✅ Mock data added for testing! Added', mockData.length, 'entries');
    setHistoricalData(mockData);
  };

  // Function to save new weather data to historical cache
  const saveWeatherDataToCache = async (weatherData, location) => {
    try {
      const newEntry = {
        timestamp: Date.now(),
        latitude: location?.latitude || 0,
        longitude: location?.longitude || 0,
        locationName: location?.name || 'Unknown',
        aqi: weatherData?.aqi?.value || 0,
        uv: weatherData?.uv?.value || 0,
        atmosphereScore: weatherData?.atmosphereScore || 0,
        // Additional data for context
        aqiCategory: weatherData?.aqi?.category || 'Unknown',
        uvCategory: weatherData?.uv?.category || 'Unknown'
      };

      // Load existing data
      const cached = await AsyncStorage.getItem('ceylon_air_historical_data');
      let existingData = cached ? JSON.parse(cached) : [];

      // Add new entry
      existingData.push(newEntry);

      // Remove entries older than 7 days
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      existingData = existingData.filter(item => item.timestamp >= sevenDaysAgo);

      // Save updated data
      await AsyncStorage.setItem('ceylon_air_historical_data', JSON.stringify(existingData));
      
      // Update state
      setHistoricalData(existingData);
      
      console.log(`Saved weather data to cache. Total entries: ${existingData.length}`);
    } catch (error) {
      console.error('Error saving weather data to cache:', error);
    }
  };

  const filterDataByPeriod = (period) => {
    const now = Date.now();
    let hoursBack = 24;
    
    switch (period) {
      case '6h':
        hoursBack = 6;
        break;
      case '24h':
        hoursBack = 24;
        break;
      case '7d':
        hoursBack = 24 * 7;
        break;
      default:
        hoursBack = 24;
    }
    
    const cutoffTime = now - (hoursBack * 60 * 60 * 1000);
    return historicalData.filter(item => item.timestamp >= cutoffTime);
  };

  const formatTimeLabel = (timestamp) => {
    const date = new Date(timestamp);
    if (selectedPeriod === '7d') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getAQIColor = (value) => {
    if (value <= 50) return '#4CAF50';
    if (value <= 100) return '#FFEB3B';
    if (value <= 150) return '#FF9800';
    if (value <= 200) return '#F44336';
    return '#9C27B0';
  };

  const getUVColor = (value) => {
    if (value <= 2) return '#4CAF50';
    if (value <= 5) return '#FFEB3B';
    if (value <= 7) return '#FF9800';
    if (value <= 10) return '#F44336';
    return '#9C27B0';
  };

  const renderAQIChart = () => {
    const filteredData = filterDataByPeriod(selectedPeriod);
    console.log(`🔍 Rendering AQI Chart - Period: ${selectedPeriod}, Data points: ${filteredData.length}`);
    
    if (filteredData.length === 0) {
      console.log('❌ No AQI data - showing no data message');
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Air Quality Index Trend</Text>
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No AQI data available for selected period</Text>
            <Text style={styles.noDataSubtext}>Data will appear as it's collected based on your fetch interval settings</Text>
          </View>
        </View>
      );
    }

    const chartData = {
      labels: filteredData.map((_, index) => 
        index % Math.ceil(filteredData.length / 6) === 0 ? formatTimeLabel(filteredData[index].timestamp) : ''
      ),
      datasets: [
        {
          data: filteredData.map(item => item.aqi || 0),
          color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
          strokeWidth: 3
        }
      ]
    };

    const avgAqi = filteredData.reduce((sum, item) => sum + (item.aqi || 0), 0) / filteredData.length;
    const maxAqi = Math.max(...filteredData.map(item => item.aqi || 0));
    const minAqi = Math.min(...filteredData.map(item => item.aqi || 0));
    
    console.log('✅ AQI data found - rendering chart with stats:', { avgAqi: avgAqi.toFixed(1), maxAqi, minAqi });

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Air Quality Index Trend</Text>
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>Avg: {avgAqi.toFixed(1)} | Max: {maxAqi} | Min: {minAqi}</Text>
        </View>
        <LineChart
          data={chartData}
          width={width - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#2A2A2A',
            backgroundGradientFrom: '#2A2A2A',
            backgroundGradientTo: '#2A2A2A',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(100, 181, 246, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(224, 224, 224, ${opacity})`,
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: '#2196F3'
            }
          }}
          bezier
          style={styles.chart}
        />
      </View>
    );
  };

  const renderUVChart = () => {
    const filteredData = filterDataByPeriod(selectedPeriod);
    
    if (filteredData.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>UV Index Trend</Text>
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No UV data available for selected period</Text>
            <Text style={styles.noDataSubtext}>Data will appear as it's collected based on your fetch interval settings</Text>
          </View>
        </View>
      );
    }

    const chartData = {
      labels: filteredData.map((_, index) => 
        index % Math.ceil(filteredData.length / 6) === 0 ? formatTimeLabel(filteredData[index].timestamp) : ''
      ),
      datasets: [
        {
          data: filteredData.map(item => item.uv || 0),
          color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
          strokeWidth: 3
        }
      ]
    };

    const avgUv = filteredData.reduce((sum, item) => sum + (item.uv || 0), 0) / filteredData.length;
    const maxUv = Math.max(...filteredData.map(item => item.uv || 0));
    const minUv = Math.min(...filteredData.map(item => item.uv || 0));

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>UV Index Trend</Text>
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>Avg: {avgUv.toFixed(1)} | Max: {maxUv} | Min: {minUv}</Text>
        </View>
        <LineChart
          data={chartData}
          width={width - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#2A2A2A',
            backgroundGradientFrom: '#2A2A2A',
            backgroundGradientTo: '#2A2A2A',
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(224, 224, 224, ${opacity})`,
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: '#FF9800'
            }
          }}
          bezier
          style={styles.chart}
        />
      </View>
    );
  };

  const renderAtmosphereChart = () => {
    const filteredData = filterDataByPeriod(selectedPeriod);
    
    if (filteredData.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Atmospheric Score Trend</Text>
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No atmospheric data available for selected period</Text>
            <Text style={styles.noDataSubtext}>Data will appear as it's collected based on your fetch interval settings</Text>
          </View>
        </View>
      );
    }

    const chartData = {
      labels: filteredData.map((_, index) => 
        index % Math.ceil(filteredData.length / 6) === 0 ? formatTimeLabel(filteredData[index].timestamp) : ''
      ),
      datasets: [
        {
          data: filteredData.map(item => item.atmosphereScore || 0),
          color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
          strokeWidth: 3
        }
      ]
    };

    const avgScore = filteredData.reduce((sum, item) => sum + (item.atmosphereScore || 0), 0) / filteredData.length;
    const maxScore = Math.max(...filteredData.map(item => item.atmosphereScore || 0));
    const minScore = Math.min(...filteredData.map(item => item.atmosphereScore || 0));

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Atmospheric Score Trend</Text>
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>Avg: {avgScore.toFixed(1)} | Max: {maxScore} | Min: {minScore}</Text>
        </View>
        <LineChart
          data={chartData}
          width={width - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#2A2A2A',
            backgroundGradientFrom: '#2A2A2A',
            backgroundGradientTo: '#2A2A2A',
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(224, 224, 224, ${opacity})`,
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: '#4CAF50'
            }
          }}
          bezier
          style={styles.chart}
        />
      </View>
    );
  };

  const renderAQIDistribution = () => {
    const filteredData = filterDataByPeriod(selectedPeriod);
    
    if (filteredData.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>AQI Distribution</Text>
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No AQI data available for distribution analysis</Text>
            <Text style={styles.noDataSubtext}>Data will appear as it's collected based on your fetch interval settings</Text>
          </View>
        </View>
      );
    }

    // Categorize AQI values using the actual aqi field
    const categories = {
      'Good': filteredData.filter(item => (item.aqi || 0) <= 50).length,
      'Moderate': filteredData.filter(item => (item.aqi || 0) > 50 && (item.aqi || 0) <= 100).length,
      'Unhealthy SG': filteredData.filter(item => (item.aqi || 0) > 100 && (item.aqi || 0) <= 150).length,
      'Unhealthy': filteredData.filter(item => (item.aqi || 0) > 150 && (item.aqi || 0) <= 200).length,
      'Very Unhealthy': filteredData.filter(item => (item.aqi || 0) > 200).length,
    };

    const pieData = Object.entries(categories)
      .filter(([_, count]) => count > 0)
      .map(([category, count]) => ({
        name: category,
        population: count,
        color: getAQIColor(category === 'Good' ? 25 : category === 'Moderate' ? 75 : category === 'Unhealthy SG' ? 125 : category === 'Unhealthy' ? 175 : 250),
        legendFontColor: '#E0E0E0',
        legendFontSize: 12,
      }));

    if (pieData.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>AQI Distribution</Text>
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No valid AQI data for distribution analysis</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>AQI Distribution</Text>
        <Text style={styles.statsText}>Based on {filteredData.length} data points</Text>
        <PieChart
          data={pieData}
          width={width - 40}
          height={220}
          chartConfig={{
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          style={styles.chart}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading charts...</Text>
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
        <Text style={styles.headerTitle}>Historical Data</Text>
        <Text style={styles.dataCountText}>Data Points: {historicalData.length}</Text>
        <Text style={styles.intervalText}>
          Fetch Interval: {fetchInterval} minutes
        </Text>
        
        {/* Refresh button to fetch fresh data */}
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={fetchFreshData}
          disabled={loading}
        >
          <Text style={styles.refreshButtonText}>
            {loading ? 'Fetching...' : 'Refresh Data'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.periodSelector}>
        {['6h', '24h', '7d'].map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonActive
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.periodButtonTextActive
            ]}>
              {period}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {renderAQIChart()}
      {renderUVChart()}
      {renderAtmosphereChart()}
      {renderAQIDistribution()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // Dark background
  },
  scrollContent: {
    paddingBottom: 120, // Add space for tab navigator
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
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#2A2A2A', // Dark card background
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 10,
  },
  periodButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#404040', // Darker button background
  },
  periodButtonActive: {
    backgroundColor: '#64B5F6', // Light blue for dark theme
  },
  periodButtonText: {
    color: '#E0E0E0', // Light text
    fontWeight: 'bold',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  chartContainer: {
    backgroundColor: '#2A2A2A', // Dark card background
    margin: 10,
    padding: 20,
    borderRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2.22,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E0E0E0', // Light text
    marginBottom: 15,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
    marginBottom: 8,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#808080',
    textAlign: 'center',
    lineHeight: 20,
  },
  statsContainer: {
    marginBottom: 10,
    alignItems: 'center',
  },
  statsText: {
    fontSize: 14,
    color: '#B0B0B0',
    textAlign: 'center',
  },
  dataCountText: {
    fontSize: 14,
    color: '#B0B0B0',
    marginTop: 5,
  },
  intervalText: {
    fontSize: 12,
    color: '#888',
    marginTop: 3,
    fontStyle: 'italic',
  },
  refreshButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

// Export the saveWeatherDataToCache function for use by other components
export { ChartsView as default };

// Export helper function for saving data from Dashboard
export const saveWeatherDataToCache = async (weatherData, location) => {
  try {
    const newEntry = {
      timestamp: Date.now(),
      latitude: location?.latitude || 0,
      longitude: location?.longitude || 0,
      locationName: location?.name || 'Unknown',
      aqi: weatherData?.aqi?.value || 0,
      uv: weatherData?.uv?.value || 0,
      atmosphereScore: weatherData?.atmosphereScore || 0,
      aqiCategory: weatherData?.aqi?.category || 'Unknown',
      uvCategory: weatherData?.uv?.category || 'Unknown'
    };

    const cached = await AsyncStorage.getItem('ceylon_air_historical_data');
    let existingData = cached ? JSON.parse(cached) : [];

    existingData.push(newEntry);

    // Remove entries older than 7 days
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    existingData = existingData.filter(item => item.timestamp >= sevenDaysAgo);

    await AsyncStorage.setItem('ceylon_air_historical_data', JSON.stringify(existingData));
    
    console.log(`Saved weather data to cache. Total entries: ${existingData.length}`);
    return true;
  } catch (error) {
    console.error('Error saving weather data to cache:', error);
    return false;
  }
};
