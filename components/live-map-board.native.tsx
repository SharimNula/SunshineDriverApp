import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { AppTheme } from '@/constants/theme';
import { TeamMember } from '@/types/relay';
import { formatCoordinates, formatRelativeTime } from '@/utils/formatters';
import {
  type LiveMapMember,
  getLiveMapCoordinateKey,
  getLiveMapLatestUpdate,
  getLiveMapMarkerTitle,
  getLiveMapMembers,
} from '@/utils/live-map';

type LiveMapBoardProps = {
  members: TeamMember[];
  currentUserId?: string;
};

const FALLBACK_REGION: Region = {
  latitude: 39.8283,
  longitude: -98.5795,
  latitudeDelta: 28,
  longitudeDelta: 28,
};

const EDGE_PADDING = {
  top: 72,
  right: 64,
  bottom: 48,
  left: 64,
};

function buildRegion(vehicleMarkers: LiveMapMember[]): Region {
  if (!vehicleMarkers.length) {
    return FALLBACK_REGION;
  }

  if (vehicleMarkers.length === 1) {
    const location = vehicleMarkers[0].location;
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }

  const latitudes = vehicleMarkers.map((member) => member.location.latitude);
  const longitudes = vehicleMarkers.map((member) => member.location.longitude);

  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta: Math.max((maxLatitude - minLatitude) * 1.7, 0.08),
    longitudeDelta: Math.max((maxLongitude - minLongitude) * 1.7, 0.08),
  };
}

export function LiveMapBoard({ members, currentUserId }: LiveMapBoardProps) {
  const mapRef = useRef<MapView | null>(null);
  const previousCoordinateKeyRef = useRef('');
  const [mapReady, setMapReady] = useState(false);
  const vehicleMarkers = getLiveMapMembers(members);

  useEffect(() => {
    if (!mapReady || !mapRef.current) {
      return;
    }

    const nextVehicleMarkers = getLiveMapMembers(members);

    if (!nextVehicleMarkers.length) {
      previousCoordinateKeyRef.current = '';
      return;
    }

    const nextCoordinateKey = getLiveMapCoordinateKey(nextVehicleMarkers);

    if (nextCoordinateKey === previousCoordinateKeyRef.current) {
      return;
    }

    previousCoordinateKeyRef.current = nextCoordinateKey;

    const coordinates = nextVehicleMarkers.map((member) => ({
      latitude: member.location.latitude,
      longitude: member.location.longitude,
    }));

    if (coordinates.length === 1) {
      mapRef.current.animateToRegion(
        {
          latitude: coordinates[0].latitude,
          longitude: coordinates[0].longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        },
        450
      );
      return;
    }

    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: EDGE_PADDING,
      animated: true,
    });
  }, [mapReady, members]);

  if (!vehicleMarkers.length) {
    return (
      <View style={styles.board}>
        <View style={styles.header}>
          <Text style={styles.title}>Live Vehicle Map</Text>
          <Text style={styles.subtitle}>No active driver or guide markers</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.caption}>
            Driver and guide markers appear here when live location sharing is active.
          </Text>
        </View>
      </View>
    );
  }

  const latestUpdate = getLiveMapLatestUpdate(vehicleMarkers);

  return (
    <View style={styles.board}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Vehicle Map</Text>
        <Text style={styles.subtitle}>{vehicleMarkers.length} active markers</Text>
      </View>

      <View style={styles.mapSurface}>
        <MapView
          initialRegion={buildRegion(vehicleMarkers)}
          loadingEnabled
          onMapReady={() => {
            setMapReady(true);
          }}
          pitchEnabled={false}
          ref={mapRef}
          rotateEnabled={false}
          showsCompass={false}
          showsMyLocationButton={false}
          style={styles.map}
          toolbarEnabled={false}>
          {vehicleMarkers.map((member) => {
            const isCurrentUser = member.id === currentUserId;
            const markerSubtitle = member.location.address
              ? `${member.location.address}\nUpdated ${formatRelativeTime(member.location.updatedAt)}`
              : `${formatCoordinates(member.location.latitude, member.location.longitude)}\nUpdated ${formatRelativeTime(member.location.updatedAt)}`;

            return (
              <Marker
                coordinate={{
                  latitude: member.location.latitude,
                  longitude: member.location.longitude,
                }}
                description={markerSubtitle}
                key={member.id}
                pinColor={isCurrentUser ? AppTheme.accent : member.accent}
                title={getLiveMapMarkerTitle(member)}
              />
            );
          })}
        </MapView>
      </View>

      <Text style={styles.caption}>Updated {formatRelativeTime(latestUpdate)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: AppTheme.text,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: AppTheme.mutedText,
    fontSize: 12,
  },
  mapSurface: {
    height: 280,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(116, 166, 181, 0.24)',
    backgroundColor: '#081B22',
  },
  map: {
    flex: 1,
  },
  caption: {
    color: AppTheme.mutedText,
    fontSize: 12,
  },
  emptyState: {
    minHeight: 180,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(116, 166, 181, 0.24)',
    backgroundColor: '#081B22',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
});
