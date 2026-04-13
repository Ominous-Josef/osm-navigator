import { fetchRoute, geocode, GeocodeResult, Route } from '@osm-navigator/core';
import { LngLat, MapView } from '@osm-navigator/native-map';
import { ManeuverType, NavigationBanner } from '@osm-navigator/ui-navigation';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const BERLIN_CENTER: LngLat = [13.4050, 52.5200];

export default function App() {
  const [destination, setDestination] = useState<LngLat | undefined>(undefined);
  const [routeData, setRouteData] = useState<Route | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  
  // Navigation & Simulation State
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [simPos, setSimPos] = useState<LngLat | undefined>(undefined);
  const [bearing, setBearing] = useState(0);
  const [isArrived, setIsArrived] = useState(false);

  const [destQuery, setDestQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [showUserLocation, setShowUserLocation] = useState(false);

  // Initial location permission check
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setShowUserLocation(true);
      }
    })();
  }, []);

  const searchLocations = async (q: string) => {
    setDestQuery(q);
    if (q.length < 3) {
      setResults([]);
      return;
    }

    try {
      const res = await geocode({ query: q, limit: 5 });
      setResults(res);
    } catch (e) {
      console.error(e);
    }
  };

  const selectResult = (item: GeocodeResult) => {
    setDestination(item.coordinates);
    setDestQuery(item.name);
    setResults([]);
    Keyboard.dismiss();
  };

  const calculateBearing = (start: LngLat, end: LngLat) => {
    const lat1 = (start[1] * Math.PI) / 180;
    const lat2 = (end[1] * Math.PI) / 180;
    const lon1 = (start[0] * Math.PI) / 180;
    const lon2 = (end[0] * Math.PI) / 180;

    const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    const θ = Math.atan2(y, x);
    const brng = ((θ * 180) / Math.PI + 360) % 360; // in degrees
    return brng;
  };

  // Simulation Engine
  useEffect(() => {
    let interval: any;
    if (isNavigating && routeData) {
      setIsArrived(false);
      interval = setInterval(() => {
        setSimPos((current) => {
          if (!current) return routeData.geometry[0];
          
          const currentIndex = routeData.geometry.findIndex(g => g === current);
          const nextIndex = currentIndex + 1;
          
          if (nextIndex >= routeData.geometry.length) {
            clearInterval(interval);
            setIsArrived(true);
            Speech.speak('You have arrived at your destination.');
            return current;
          }

          const nextPos = routeData.geometry[nextIndex];

          // Calculate bearing for driver mode
          const newBearing = calculateBearing(current, nextPos);
          setBearing(newBearing);

          // Find current maneuver step
          const currentManeuver = routeData.steps.findIndex((s, i) => {
            const nextManeuver = routeData.steps[i+1];
            if (!nextManeuver) return true;
            return nextIndex < routeData.geometry.findIndex(g => g === nextManeuver.startLocation);
          });
          
          if (currentManeuver !== currentStepIndex) {
            setCurrentStepIndex(currentManeuver);
            const instruction = routeData.steps[currentManeuver]?.instruction;
            if (instruction) Speech.speak(instruction);
          }

          return nextPos;
        });
      }, 500); 
    }
    return () => clearInterval(interval);
  }, [isNavigating, routeData, currentStepIndex]);

  const startNavigation = async () => {
    if (!destination) return;
    
    try {
      setLoading(true);
      // ALWAYS START FROM ACTUAL CURRENT LOCATION
      const location = await Location.getCurrentPositionAsync({});
      const currentPos: LngLat = [location.coords.longitude, location.coords.latitude];
      
      const result = await fetchRoute({
        origin: currentPos,
        destination: destination,
        costing: 'auto',
      });
      
      setRouteData(result);
      setCurrentStepIndex(0);
      setSimPos(result.geometry[0]);
      setBearing(0); // Reset bearing
      setIsNavigating(true);
      Speech.speak('Starting navigation to ' + destQuery);
    } catch (error: any) {
      Alert.alert('Navigation Error', 'Could not determine your current location to start navigation.');
    } finally {
      setLoading(false);
    }
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    setSimPos(undefined);
    setBearing(0);
    setIsArrived(false);
    Speech.stop();
  };

  const currentStep = routeData?.steps[currentStepIndex];
  const nextStep = routeData?.steps[currentStepIndex + 1];

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialCamera={{
          latitude: 52.5200,
          longitude: 13.4050,
          zoom: 12,
        }}
        camera={simPos ? {
          latitude: simPos[1],
          longitude: simPos[0],
          zoom: 17,
          pitch: 60,
          bearing: bearing, // Driver mode rotation
        } : undefined}
        onPress={(coords) => {
          if (isNavigating) return;
          setDestination(coords);
          setDestQuery(`${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}`);
        }}
        route={routeData?.geometry}
        showUserLocation={showUserLocation}
      />

      {!isNavigating ? (
        <View style={styles.searchPanel}>
          <Text style={styles.title}>OSM Navigation</Text>
          <TextInput
            style={styles.input}
            placeholder="Search destination..."
            value={destQuery}
            onChangeText={searchLocations}
          />

          {results.length > 0 && (
            <View style={styles.resultsContainer}>
              <FlatList
                data={results}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.resultItem} onPress={() => selectResult(item)}>
                    <Text style={styles.resultName}>{item.name}</Text>
                    <Text style={styles.resultAddr} numberOfLines={1}>{item.address}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {destination && (
            <TouchableOpacity style={styles.navigateButton} onPress={startNavigation}>
              <Text style={styles.navigateButtonText}>Start Navigation</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.navigationOverlay}>
          <NavigationBanner
            instruction={currentStep?.instruction || 'Drive straight'}
            distanceToManeuver={currentStep?.distance || 0}
            maneuverType={(currentStep?.maneuverType as ManeuverType) || 'straight'}
            nextInstruction={nextStep?.instruction}
          />
          
          {isArrived && (
            <View style={styles.arrivalCard}>
              <Text style={styles.arrivalTitle}>🏁 Destination Reached</Text>
              <Text style={styles.arrivalText}>You have arrived at your chosen point.</Text>
            </View>
          )}

          <TouchableOpacity style={styles.stopButton} onPress={stopNavigation}>
            <Text style={styles.stopButtonText}>Exit Navigation</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#007bff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  searchPanel: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  navigationOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    bottom: 40,
    justifyContent: 'space-between',
  },
  input: {
    height: 52,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 16,
  },
  resultsContainer: {
    maxHeight: 300,
    marginTop: 8,
  },
  resultItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  resultAddr: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  navigateButton: {
    backgroundColor: '#007bff',
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  navigateButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  stopButton: {
    backgroundColor: '#ff3b30',
    borderRadius: 28,
    height: 54,
    width: 200,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  arrivalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  arrivalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a1a',
  },
  arrivalText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
