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

const { width } = Dimensions.get('window');

const ChartsView = () => {
  const [historicalData, setHistoricalData] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('24h');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistoricalData();
  }, []);

  const loadHistoricalData = async () => {
    try {
      // Load cached historical data or generate mock data
      const cached = await AsyncStorage.getItem('historical_weather_data');
      
      if (cached) {
        setHistoricalData(JSON.parse(cached));
      } else {
        // Generate mock historical data for demonstration
        const mockData = generateMockHistoricalData();
        setHistoricalData(mockData);
        await AsyncStorage.setItem('historical_weather_data', JSON.stringify(mockData));
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading historical data:', error);
      setLoading(false);
    }
  };

  const generateMockHistoricalData = () => {
    const data = [];
    const now = Date.now();
    
    // Generate 24 hours of data
    for (let i = 23; i >= 0; i--) {
      const timestamp = now - (i * 60 * 60 * 1000); // Each hour
      data.push({
        timestamp,
        aqi: Math.floor(Math.random() * 100) + 50,
        uv: Math.floor(Math.random() * 10) + 1,
        temperature: Math.floor(Math.random() * 10) + 25,
        humidity: Math.floor(Math.random() * 30) + 60,
        pressure: Math.floor(Math.random() * 20) + 1000
      });
    }
    
    return data;
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
    
    if (filteredData.length === 0) return null;

    const chartData = {
      labels: filteredData.map((_, index) => 
        index % Math.ceil(filteredData.length / 6) === 0 ? formatTimeLabel(filteredData[index].timestamp) : ''
      ),
      datasets: [
        {
          data: filteredData.map(item => item.aqi),
          color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
          strokeWidth: 3
        }
      ]
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Air Quality Index Trend</Text>
        <LineChart
          data={chartData}
          width={width - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
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
    
    if (filteredData.length === 0) return null;

    const chartData = {
      labels: filteredData.map((_, index) => 
        index % Math.ceil(filteredData.length / 6) === 0 ? formatTimeLabel(filteredData[index].timestamp) : ''
      ),
      datasets: [
        {
          data: filteredData.map(item => item.uv),
          color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
          strokeWidth: 3
        }
      ]
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>UV Index Trend</Text>
        <LineChart
          data={chartData}
          width={width - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
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

  const renderTemperatureChart = () => {
    const filteredData = filterDataByPeriod(selectedPeriod);
    
    if (filteredData.length === 0) return null;

    const chartData = {
      labels: filteredData.map((_, index) => 
        index % Math.ceil(filteredData.length / 6) === 0 ? formatTimeLabel(filteredData[index].timestamp) : ''
      ),
      datasets: [
        {
          data: filteredData.map(item => item.temperature),
          color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`,
          strokeWidth: 3
        }
      ]
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Temperature Trend</Text>
        <LineChart
          data={chartData}
          width={width - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: '#F44336'
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
    
    if (filteredData.length === 0) return null;

    // Categorize AQI values
    const categories = {
      'Good': filteredData.filter(item => item.aqi <= 50).length,
      'Moderate': filteredData.filter(item => item.aqi > 50 && item.aqi <= 100).length,
      'Unhealthy SG': filteredData.filter(item => item.aqi > 100 && item.aqi <= 150).length,
      'Unhealthy': filteredData.filter(item => item.aqi > 150 && item.aqi <= 200).length,
      'Very Unhealthy': filteredData.filter(item => item.aqi > 200).length,
    };

    const pieData = Object.entries(categories)
      .filter(([_, count]) => count > 0)
      .map(([category, count]) => ({
        name: category,
        population: count,
        color: getAQIColor(category === 'Good' ? 25 : category === 'Moderate' ? 75 : category === 'Unhealthy SG' ? 125 : category === 'Unhealthy' ? 175 : 250),
        legendFontColor: '#333',
        legendFontSize: 12,
      }));

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>AQI Distribution</Text>
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Historical Data</Text>
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
      {renderTemperatureChart()}
      {renderAQIDistribution()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
  },
  header: {
    backgroundColor: '#2196F3',
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
    backgroundColor: 'white',
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 10,
  },
  periodButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  periodButtonActive: {
    backgroundColor: '#2196F3',
  },
  periodButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  chartContainer: {
    backgroundColor: 'white',
    margin: 10,
    padding: 20,
    borderRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});

export default ChartsView;
