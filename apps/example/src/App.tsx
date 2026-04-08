import { initOSMNavigator } from "@osm-navigator/core";
import { MapView, MapViewRef } from "@osm-navigator/native-map";
import { ManeuverIcon, RouteProgressBar, TurnByTurnOverlay } from "@osm-navigator/ui-navigation";
import { useRef, useState } from "react";
import { Button, StyleSheet, View } from "react-native";

const osm = initOSMNavigator();

export default function App() {
  const mapRef = useRef<MapViewRef>(null);
  const [route, setRoute] = useState<any>(null);
  const [progress, setProgress] = useState(0);

  async function handleRoute() {
    const res = await osm.valhalla.route({
      locations: [
        { lat: 52.5, lon: 13.4 },
        { lat: 52.6, lon: 13.5 },
      ],
      costing: "auto",
    });
    setRoute(res.trip);
    setProgress(0);
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: 52.5,
          longitude: 13.4,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        tileSourceUrl="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Button title="Route" onPress={handleRoute} />
      {route && (
        <TurnByTurnOverlay
          maneuvers={route.legs?.[0]?.maneuvers?.map((m: any) => ({
            instruction: m.instruction,
            distance: m.length,
            icon: <ManeuverIcon type={m.type} />,
          })) || []}
          currentStep={0}
        />
      )}
      <RouteProgressBar progress={progress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});
