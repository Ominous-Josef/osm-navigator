import { fetchRoute, geocode, GeocodeResult, Route } from '@osm-navigator/core';
import { LngLat, MapView } from '@osm-navigator/native-map';
import { ManeuverType, NavigationBanner } from '@osm-navigator/ui-navigation';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

/** Safe wrapper around Speech.speak — swallows errors from unavailable TTS engines. */
function safeSpeech(text: string): void {
  try {
    Speech.speak(text);
  } catch {
    // TTS not available — silent fallback
  }
}

export default function App() {
  const [destination, setDestination] = useState<LngLat | undefined>(undefined);
  const [routeData, setRouteData] = useState<Route | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  
  // Navigation & Simulation State
  const [isNavigating, setIsNavigating] = useState(false);
  const [geometryIndex, setGeometryIndex] = useState(0);
  const [bearing, setBearing] = useState(0);
  const [isArrived, setIsArrived] = useState(false);

  // Use ref for currentStepIndex to avoid stale closures in the interval
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const stepIndexRef = useRef(0);

  const [destQuery, setDestQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [showUserLocation, setShowUserLocation] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Debounce timer ref
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial location permission check
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setShowUserLocation(true);
        setLocationDenied(false);
      } else {
        setLocationDenied(true);
      }
    })();
  }, []);

  // Keep stepIndexRef in sync
  useEffect(() => {
    stepIndexRef.current = currentStepIndex;
  }, [currentStepIndex]);

  const searchLocations = useCallback((q: string) => {
    setDestQuery(q);
    setSearchError(null);

    if (q.length < 3) {
      setResults([]);
      return;
    }

    // Debounce: clear previous timer
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await geocode({ query: q, limit: 5 });
        // Only update if the query hasn't changed since we started
        setResults(res);
      } catch (e) {
        console.error(e);
        setSearchError('Search failed. Check your connection.');
        setResults([]);
      }
    }, 300);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  const selectResult = (item: GeocodeResult) => {
    setDestination(item.coordinates);
    setDestQuery(item.name);
    setResults([]);
    setSearchError(null);
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

  // Simulation Engine — driven by geometryIndex advancement
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isNavigating && routeData) {
      setIsArrived(false);

      interval = setInterval(() => {
        setGeometryIndex((prevIndex) => {
          const nextIndex = prevIndex + 1;

          if (nextIndex >= routeData.geometry.length) {
            clearInterval(interval);
            return prevIndex; // stay at last point
          }

          return nextIndex;
        });
      }, 500);
    }

    return () => clearInterval(interval);
  }, [isNavigating, routeData]);

  // Side-effect reactor: update bearing, step index, and speech whenever geometryIndex changes
  useEffect(() => {
    if (!isNavigating || !routeData || geometryIndex <= 0) return;

    const currentPos = routeData.geometry[geometryIndex];
    const prevPos = routeData.geometry[geometryIndex - 1];

    if (!currentPos || !prevPos) return;

    // Update bearing for driver-mode camera rotation
    setBearing(calculateBearing(prevPos, currentPos));

    // Check if we've arrived at the end
    if (geometryIndex >= routeData.geometry.length - 1) {
      setIsArrived(true);
      safeSpeech('You have arrived at your destination.');
      return;
    }

    // Determine which maneuver step we're on by comparing geometryIndex
    // against the begin_shape_index of each step's startLocation
    let newStepIndex = stepIndexRef.current;
    for (let i = routeData.steps.length - 1; i >= 0; i--) {
      const stepStart = routeData.geometry.indexOf(routeData.steps[i].startLocation);
      if (stepStart !== -1 && geometryIndex >= stepStart) {
        newStepIndex = i;
        break;
      }
    }

    if (newStepIndex !== stepIndexRef.current) {
      setCurrentStepIndex(newStepIndex);
      const instruction = routeData.steps[newStepIndex]?.instruction;
      if (instruction) safeSpeech(instruction);
    }
  }, [geometryIndex, isNavigating, routeData]);

  const startNavigation = async () => {
    if (!destination) return;
    
    if (locationDenied) {
      Alert.alert(
        'Location Permission Required',
        'Please enable location access in your device settings to start navigation.',
      );
      return;
    }

    try {
      setLoading(true);
      // Get actual current location
      const location = await Location.getCurrentPositionAsync({});
      const currentPos: LngLat = [location.coords.longitude, location.coords.latitude];
      
      const result = await fetchRoute({
        origin: currentPos,
        destination: destination,
        costing: 'auto',
      });
      
      setRouteData(result);
      setCurrentStepIndex(0);
      stepIndexRef.current = 0;
      setGeometryIndex(0);
      setBearing(0);
      setIsNavigating(true);
      safeSpeech('Starting navigation to ' + destQuery);
    } catch (error: any) {
      const message = error?.message || 'Unknown error';
      Alert.alert(
        'Navigation Error',
        `Could not start navigation: ${message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    setGeometryIndex(0);
    setBearing(0);
    setIsArrived(false);
    Speech.stop();
  };

  const currentStep = routeData?.steps[currentStepIndex];
  const nextStep = routeData?.steps[currentStepIndex + 1];
  const simPos = routeData?.geometry[geometryIndex];

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialCamera={{
          latitude: BERLIN_CENTER[1],
          longitude: BERLIN_CENTER[0],
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

          {locationDenied && (
            <Text style={styles.warningText}>
              ⚠️ Location access denied. Navigation requires location permission.
            </Text>
          )}

          <TextInput
            style={styles.input}
            placeholder="Search destination..."
            value={destQuery}
            onChangeText={searchLocations}
          />

          {searchError && (
            <Text style={styles.errorText}>{searchError}</Text>
          )}

          {results.length > 0 && (
            <View style={styles.resultsContainer}>
              <FlatList
                data={results}
                keyExtractor={(item, index) => `${item.name}-${index}`}
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
  warningText: {
    fontSize: 13,
    color: '#e67e00',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#ff3b30',
    marginTop: 4,
  },
});
