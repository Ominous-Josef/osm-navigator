import React from 'react';
import Svg, { Path, G } from 'react-native-svg';

export type ManeuverType = 'straight' | 'left' | 'right' | 'slight-left' | 'slight-right' | 'u-turn' | 'arrive';

interface ManeuverIconProps {
  type: ManeuverType;
  color?: string;
  size?: number;
}

export const ManeuverIcon: React.FC<ManeuverIconProps> = ({ type, color = '#fff', size = 32 }) => {
  const renderPath = () => {
    switch (type) {
      case 'left':
        return <Path d="M20 32l-12-12 12-12v7h12v10h-12v7z" fill={color} />;
      case 'right':
        return <Path d="M20 8l12 12-12 12v-7h-12v-10h12v-7z" fill={color} />;
      case 'slight-left':
        return <Path d="M15 15l2-10 10 10-7 7-5-7z" fill={color} />;
      case 'slight-right':
        return <Path d="M25 15l-2-10-10 10 7 7 5-7z" fill={color} />;
      case 'u-turn':
        return <Path d="M28 20c0-6.6-5.4-12-12-12s-12 5.4-12 12v12h10v-12c0-1.1.9-2 2-2s2 .9 2 2v12h10v-12z" fill={color} />;
      case 'arrive':
        return <Path d="M12 2c-5.5 0-10 4.5-10 10s4.5 10 10 10 10-4.5 10-10-4.5-10-10-10zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill={color} />;
      case 'straight':
      default:
        return <Path d="M14 32v-17h-7l10-12 10 12h-7v17h-6z" fill={color} />;
    }
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {renderPath()}
    </Svg>
  );
};
