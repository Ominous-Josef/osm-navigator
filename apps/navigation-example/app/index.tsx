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

/** Calculate bearing between two points in degrees */
function calculateBearing(start: LngLat, end: LngLat): number {
  const lat1 = (start[1] * Math.PI) / 180;
  const lat2 = (end[1] * Math.PI) / 180;
  const lon1 = (start[0] * Math.PI) / 180;
  const lon2 = (end[0] * Math.PI) / 180;

  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

/** Calculate distance between two coordinates in meters using Haversine */
function haversineDistance(a: LngLat, b: LngLat): number {
  const R = 6371000;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Find the nearest geometry index for a given position */
function findNearestGeometryIndex(pos: LngLat, geometry: LngLat[]): number {
  let minDist = Infinity;
  let minIdx = 0;
  for (let i = 0; i < geometry.length; i++) {
    const d = haversineDistance(pos, geometry[i]);
    if (d < minDist) {
      minDist = d;
      minIdx = i;
    }
  }
  return minIdx;
}

export default function App() {
  const [destination, setDestination] = useState<LngLat | undefined>(undefined);
  const [routeData, setRouteData] = useState<Route | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  
  // Navigation state
  const [isNavigating, setIsNavigating] = useState(false);
  const [userPosition, setUserPosition] = useState<LngLat | undefined>(undefined);
  const [bearing, setBearing] = useState(0);
  const [isArrived, setIsArrived] = useState(false);

  // Use ref for currentStepIndex to avoid stale closures
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const stepIndexRef = useRef(0);

  const [destQuery, setDestQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [showUserLocation, setShowUserLocation] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Refs
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const prevPositionRef = useRef<LngLat | undefined>(undefined);

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

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await geocode({ query: q, limit: 5 });
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

  // ─── Real GPS tracking during navigation ───────────────────────────
  // When isNavigating flips to true, we subscribe to live GPS updates.
  // Each update: move camera, update bearing, check maneuver progress.
  useEffect(() => {
    if (!isNavigating || !routeData) return;

    let sub: Location.LocationSubscription | null = null;

    (async () => {
      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,   // at most once per second
          distanceInterval: 5,  // or every 5 metres
        },
        (location) => {
          const pos: LngLat = [location.coords.longitude, location.coords.latitude];
          const prevPos = prevPositionRef.current;

          setUserPosition(pos);

          // Calculate bearing from previous position
          if (prevPos) {
            const dist = haversineDistance(prevPos, pos);
            if (dist > 2) { // Only update bearing if we've moved > 2m (avoids jitter)
              setBearing(calculateBearing(prevPos, pos));
            }
          }
          prevPositionRef.current = pos;

          // Check arrival (within 30m of destination)
          const destCoord = routeData.geometry[routeData.geometry.length - 1];
          if (haversineDistance(pos, destCoord) < 30) {
            setIsArrived(true);
            safeSpeech('You have arrived at your destination.');
            return;
          }

          // Find nearest point on route to determine current maneuver
          const nearestIdx = findNearestGeometryIndex(pos, routeData.geometry);

          // Determine which step we're in
          let newStepIndex = stepIndexRef.current;
          for (let i = routeData.steps.length - 1; i >= 0; i--) {
            const stepStart = routeData.geometry.indexOf(routeData.steps[i].startLocation);
            if (stepStart !== -1 && nearestIdx >= stepStart) {
              newStepIndex = i;
              break;
            }
          }

          if (newStepIndex !== stepIndexRef.current) {
            setCurrentStepIndex(newStepIndex);
            const instruction = routeData.steps[newStepIndex]?.instruction;
            if (instruction) safeSpeech(instruction);
          }
        }
      );

      locationSubRef.current = sub;
    })();

    return () => {
      if (locationSubRef.current) {
        locationSubRef.current.remove();
        locationSubRef.current = null;
      }
    };
  }, [isNavigating, routeData]);

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
      setUserPosition(currentPos);
      prevPositionRef.current = currentPos;
      setBearing(0);
      setIsArrived(false);
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
    setUserPosition(undefined);
    prevPositionRef.current = undefined;
    setBearing(0);
    setIsArrived(false);
    Speech.stop();
    // Location subscription is cleaned up by the useEffect return
  };

  const currentStep = routeData?.steps[currentStepIndex];
  const nextStep = routeData?.steps[currentStepIndex + 1];

  // Calculate remaining distance to next maneuver
  const distanceToNextManeuver = (() => {
    if (!userPosition || !routeData || !nextStep) return currentStep?.distance || 0;
    const nextStepStart = nextStep.startLocation;
    if (!nextStepStart) return currentStep?.distance || 0;
    return haversineDistance(userPosition, nextStepStart);
  })();

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialCamera={{
          latitude: BERLIN_CENTER[1],
          longitude: BERLIN_CENTER[0],
          zoom: 12,
        }}
        camera={isNavigating && userPosition ? {
          latitude: userPosition[1],
          longitude: userPosition[0],
          zoom: 17,
          pitch: 60,
          bearing: bearing,
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
          <Text style={styles.title}>🧭 OSM Navigation</Text>

          {locationDenied && (
            <Text style={styles.warningText}>
              ⚠️ Location access denied. Navigation requires location permission.
            </Text>
          )}

          <TextInput
            style={styles.input}
            placeholder="Where do you want to go?"
            placeholderTextColor="#999"
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
              <Text style={styles.navigateButtonText}>🚗 Start Navigation</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.navigationOverlay}>
          <NavigationBanner
            instruction={currentStep?.instruction || 'Follow the road'}
            distanceToManeuver={Math.round(distanceToNextManeuver)}
            maneuverType={(currentStep?.maneuverType as ManeuverType) || 'straight'}
            nextInstruction={nextStep?.instruction}
          />
          
          {isArrived && (
            <View style={styles.arrivalCard}>
              <Text style={styles.arrivalTitle}>🏁 Destination Reached</Text>
              <Text style={styles.arrivalText}>You have arrived at your destination.</Text>
            </View>
          )}

          <TouchableOpacity style={styles.stopButton} onPress={stopNavigation}>
            <Text style={styles.stopButtonText}>✕ Exit Navigation</Text>
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
