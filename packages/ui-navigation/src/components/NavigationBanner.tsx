import React from 'react';
import { StyleSheet, View, Text, ViewProps } from 'react-native';
import { ManeuverIcon, ManeuverType } from './ManeuverIcons';

export interface NavigationBannerProps extends ViewProps {
  instruction: string;
  distanceToManeuver: number; // in meters
  maneuverType: ManeuverType;
  nextInstruction?: string;
}

export const NavigationBanner: React.FC<NavigationBannerProps> = ({
  instruction,
  distanceToManeuver,
  maneuverType,
  nextInstruction,
  style,
  ...props
}) => {
  const formatDistance = (m: number) => {
    if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
    return `${Math.round(m)} m`;
  };

  return (
    <View style={[styles.container, style]} {...props}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <ManeuverIcon type={maneuverType} size={48} color="#fff" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.distanceText}>{formatDistance(distanceToManeuver)}</Text>
          <Text style={styles.instructionText} numberOfLines={2}>
            {instruction}
          </Text>
        </View>
      </View>
      {nextInstruction && (
        <View style={styles.nextContainer}>
          <Text style={styles.nextLabel}>THEN: </Text>
          <Text style={styles.nextText} numberOfLines={1}>{nextInstruction}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  distanceText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0A84FF',
  },
  instructionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
  },
  nextContainer: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#3A3A3C',
    alignItems: 'center',
  },
  nextLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8E8E93',
  },
  nextText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#AEAEB2',
  },
});
