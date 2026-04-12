import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ActivityIndicator, 
  Alert, 
  TextInput, 
  TouchableOpacity, 
  FlatList,
  Keyboard,
  Platform,
  Dimensions
} from 'react-native';
import { MapView, LngLat } from '@osm-navigator/native-map';
import { fetchRoute, geocode, reverseGeocode, GeocodeResult, Route } from '@osm-navigator/core';
import { NavigationBanner, ManeuverType } from '@osm-navigator/ui-navigation';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';

const { width } = Dimensions.get('window');
const BERLIN_CENTER: LngLat = [13.4050, 52.5200];

export default function App() {
  const [startPoint, setStartPoint] = useState<LngLat | undefined>(BERLIN_CENTER);
  const [destination, setDestination] = useState<LngLat | undefined>(undefined);
  const [routeData, setRouteData] = useState<Route | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  
  // Navigation State
  const [isNavigating, setIsNavigating] = useState(false);
  const [simStep, setSimStep] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [simPos, setSimPos] = useState<LngLat | undefined>(undefined);
  const [isArrived, setIsArrived] = useState(false);

  const [startQuery, setStartQuery] = useState('Berlin Center');
  const [destQuery, setDestQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [activeTarget, setActiveTarget] = useState<'start' | 'dest' | null>(null);
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

  const searchLocations = async (q: string, target: 'start' | 'dest') => {
    if (target === 'start') setStartQuery(q);
    else setDestQuery(q);
    
    if (q.length < 3) {
      setResults([]);
      return;
    }

    try {
      const res = await geocode({ query: q, limit: 5 });
      setResults(res);
      setActiveTarget(target);
    } catch (e) {
      console.error(e);
    }
  };

  const selectResult = (item: GeocodeResult) => {
    if (activeTarget === 'start') {
      setStartPoint(item.coordinates);
      setStartQuery(item.name);
    } else {
      setDestination(item.coordinates);
      setDestQuery(item.name);
    }
    setResults([]);
    setActiveTarget(null);
    Keyboard.dismiss();
  };

  const calculateRoute = useCallback(async () => {
    if (!startPoint || !destination) return;
    
    try {
      setLoading(true);
      const result = await fetchRoute({
        origin: startPoint,
        destination: destination,
        costing: 'auto',
      });
      setRouteData(result);
    } catch (error: any) {
      Alert.alert('Routing Error', error.message || 'Failed to fetch route');
    } finally {
      setLoading(false);
    }
  }, [startPoint, destination]);

  useEffect(() => {
    calculateRoute();
  }, [startPoint, destination]);

  // Simulation Engine
  useEffect(() => {
    let interval: any;
    if (isNavigating && routeData) {
      setIsArrived(false);
      interval = setInterval(() => {
        setSimStep((prev) => {
          const nextStep = prev + 1;
          if (nextStep >= routeData.geometry.length) {
            clearInterval(interval);
            setIsArrived(true);
            Speech.speak('You have arrived at your destination.');
            return prev;
          }

          const currentPos = routeData.geometry[nextStep];
          setSimPos(currentPos);

          // Find current maneuver step
          const currentManeuver = routeData.steps.findIndex((s, i) => {
            const nextManeuver = routeData.steps[i+1];
            if (!nextManeuver) return true; // Final step
            // Approximate check if we've passed this maneuver in the geometry
            return nextStep < routeData.geometry.findIndex(g => g === nextManeuver.startLocation);
          });
          
          if (currentManeuver !== currentStepIndex) {
            setCurrentStepIndex(currentManeuver);
            const instruction = routeData.steps[currentManeuver]?.instruction;
            if (instruction) Speech.speak(instruction);
          }

          return nextStep;
        });
      }, 500); // 2 steps per second for "at work" simulation speed
    }
    return () => clearInterval(interval);
  }, [isNavigating, routeData, currentStepIndex]);

  const startNavigation = () => {
    if (!routeData) return;
    setIsNavigating(true);
    setSimStep(0);
    setCurrentStepIndex(0);
    setSimPos(routeData.geometry[0]);
    Speech.speak('Starting navigation to ' + destQuery);
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    setSimPos(undefined);
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
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="From: Berlin Center"
              value={startQuery}
              onChangeText={(t) => searchLocations(t, 'start')}
              onFocus={() => setActiveTarget('start')}
            />
          </View>

          <View style={styles.divider} />

          <TextInput
            style={styles.input}
            placeholder="To: Select destination..."
            value={destQuery}
            onChangeText={(t) => searchLocations(t, 'dest')}
            onFocus={() => setActiveTarget('dest')}
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

          {routeData && (
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
              <Text style={styles.arrivalTitle}>Destined Reached</Text>
              <Text style={styles.arrivalText}>You have arrived at {destQuery}</Text>
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
    backgroundColor: '#fff',
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
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  navigationOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    bottom: 40,
    justifyContent: 'space-between',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 4,
  },
  resultsContainer: {
    maxHeight: 250,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  resultItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f9f9f9',
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  resultAddr: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  navigateButton: {
    backgroundColor: '#007bff',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  navigateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 24,
    height: 48,
    width: 180,
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
    fontSize: 15,
    fontWeight: '700',
  },
  arrivalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  arrivalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  arrivalText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
});