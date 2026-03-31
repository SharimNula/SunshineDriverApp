import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '@/constants/theme';
import { TeamMember } from '@/types/relay';
import { formatCoordinates, formatRelativeTime } from '@/utils/formatters';
import {
  getLiveMapCoordinateKey,
  getLiveMapLatestUpdate,
  getLiveMapMarkerLabel,
  getLiveMapMarkerTitle,
  getLiveMapMembers,
} from '@/utils/live-map';
import {
  escapeMapHtml,
  getGoogleMapsWebApiKey,
  loadGoogleMapsWebApi,
} from '@/utils/google-maps-web';

type LiveMapBoardProps = {
  members: TeamMember[];
  currentUserId?: string;
};

type WebLiveMapMember = ReturnType<typeof getLiveMapMembers>[number];

function buildMarkerIcon(color: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48" fill="none">
      <path fill="${color}" d="M20 0C8.954 0 0 8.954 0 20c0 13.667 17.325 27.573 18.063 28.157a3 3 0 0 0 3.874 0C22.675 47.573 40 33.667 40 20 40 8.954 31.046 0 20 0Z"/>
      <circle cx="20" cy="20" r="8" fill="#F8FDFF"/>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildInfoWindowContent(member: WebLiveMapMember, isCurrentUser: boolean) {
  return `
    <div style="min-width: 180px; color: #10222B; font-family: Arial, sans-serif;">
      <div style="font-size: 14px; font-weight: 700; margin-bottom: 6px;">
        ${escapeMapHtml(getLiveMapMarkerTitle(member))}${isCurrentUser ? ' (You)' : ''}
      </div>
      <div style="font-size: 12px; margin-bottom: 4px;">${escapeMapHtml(member.role)}</div>
      <div style="font-size: 12px; line-height: 1.5; margin-bottom: 6px;">
        ${escapeMapHtml(member.location.address ?? 'Address unavailable')}
      </div>
      <div style="font-size: 11px; color: #425A65;">
        ${escapeMapHtml(formatCoordinates(member.location.latitude, member.location.longitude))}
      </div>
      <div style="font-size: 11px; color: #425A65; margin-top: 2px;">
        Updated ${escapeMapHtml(formatRelativeTime(member.location.updatedAt))}
      </div>
    </div>
  `.trim();
}

export function LiveMapBoard({ members, currentUserId }: LiveMapBoardProps) {
  const vehicleMarkers = getLiveMapMembers(members);
  const latestUpdate = getLiveMapLatestUpdate(vehicleMarkers);
  const coordinateKey = getLiveMapCoordinateKey(vehicleMarkers);
  const markerStateKey = vehicleMarkers
    .map(
      (member) =>
        `${member.id}:${member.vehicleName ?? ''}:${member.location.address ?? ''}:${member.location.updatedAt}`
    )
    .join('|');
  const webMapsApiKey = getGoogleMapsWebApiKey();
  const mapHostRef = useRef<HTMLElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRefs = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const [mapHostReady, setMapHostReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapRetryNonce, setMapRetryNonce] = useState(0);

  const clearMapArtifacts = useCallback(() => {
    markerRefs.current.forEach((marker) => marker.setMap(null));
    markerRefs.current = [];
    infoWindowRef.current?.close?.();
    infoWindowRef.current = null;
    mapInstanceRef.current = null;
  }, []);

  const setMapHost = useCallback((node: unknown) => {
    const nextHost = node as HTMLElement | null;

    if (mapHostRef.current === nextHost) {
      return;
    }

    mapHostRef.current = nextHost;
    setMapHostReady(Boolean(nextHost));
  }, []);

  useEffect(() => {
    return () => {
      clearMapArtifacts();
    };
  }, [clearMapArtifacts]);

  useEffect(() => {
    if (!vehicleMarkers.length) {
      clearMapArtifacts();
      setMapReady(false);
      setMapError(null);
      return;
    }

    if (!webMapsApiKey) {
      clearMapArtifacts();
      setMapReady(false);
      setMapError(null);
      return;
    }

    const mapHostElement = mapHostRef.current;

    if (!mapHostElement) {
      setMapReady(false);
      return;
    }

    const readyMapHost = mapHostElement;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    setMapReady(false);
    setMapError(null);

    async function renderMap(attempt = 0) {
      try {
        await loadGoogleMapsWebApi(webMapsApiKey);

        if (cancelled) {
          return;
        }

        const googleMaps = (window as Window & { google?: { maps?: any } }).google?.maps;

        if (!googleMaps) {
          throw new Error('Google Maps JavaScript API was not available.');
        }

        if (
          !readyMapHost.isConnected ||
          readyMapHost.clientWidth === 0 ||
          readyMapHost.clientHeight === 0
        ) {
          if (attempt < 8) {
            retryTimer = setTimeout(() => {
              void renderMap(attempt + 1);
            }, 150);
            return;
          }

          throw new Error('The browser map container was not ready.');
        }

        if (!mapInstanceRef.current) {
          const firstLocation = vehicleMarkers[0].location;

          mapInstanceRef.current = new googleMaps.Map(readyMapHost, {
            center: {
              lat: firstLocation.latitude,
              lng: firstLocation.longitude,
            },
            zoom: vehicleMarkers.length === 1 ? 13 : 5,
            backgroundColor: '#081B22',
            clickableIcons: false,
            fullscreenControl: false,
            mapTypeControl: false,
            streetViewControl: false,
            gestureHandling: 'cooperative',
          });

          infoWindowRef.current = new googleMaps.InfoWindow();
        }

        const map = mapInstanceRef.current;
        googleMaps.event.trigger(map, 'resize');
        markerRefs.current.forEach((marker) => marker.setMap(null));

        markerRefs.current = vehicleMarkers.map((member) => {
          const marker = new googleMaps.Marker({
            map,
            position: {
              lat: member.location.latitude,
              lng: member.location.longitude,
            },
            title: getLiveMapMarkerTitle(member),
            label: {
              text: member.name.charAt(0).toUpperCase(),
              color: '#10222B',
              fontSize: '12px',
              fontWeight: '700',
            },
            icon: {
              url: buildMarkerIcon(member.id === currentUserId ? AppTheme.accent : member.accent),
            },
          });

          marker.addListener('click', () => {
            infoWindowRef.current?.setContent(
              buildInfoWindowContent(member, member.id === currentUserId)
            );
            infoWindowRef.current?.open({
              anchor: marker,
              map,
            });
          });

          return marker;
        });

        if (vehicleMarkers.length === 1) {
          const location = vehicleMarkers[0].location;
          map.setCenter({
            lat: location.latitude,
            lng: location.longitude,
          });
          map.setZoom(13);
        } else {
          const bounds = new googleMaps.LatLngBounds();

          vehicleMarkers.forEach((member) => {
            bounds.extend({
              lat: member.location.latitude,
              lng: member.location.longitude,
            });
          });

          map.fitBounds(bounds, 72);
        }

        setMapError(null);
        setMapReady(true);
      } catch {
        if (!cancelled && attempt < 2) {
          retryTimer = setTimeout(() => {
            void renderMap(attempt + 1);
          }, 400);
          return;
        }

        if (!cancelled) {
          setMapError('The browser map could not be loaded right now.');
          setMapReady(false);
        }
      }
    }

    void renderMap();

    return () => {
      cancelled = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [
    clearMapArtifacts,
    coordinateKey,
    currentUserId,
    mapHostReady,
    mapRetryNonce,
    markerStateKey,
    vehicleMarkers,
    webMapsApiKey,
  ]);

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

  return (
    <View style={styles.board}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Vehicle Map</Text>
        <Text style={styles.subtitle}>{vehicleMarkers.length} active markers</Text>
      </View>

      {!webMapsApiKey ? (
        <View style={styles.noticeCard}>
          <MaterialIcons name="map" size={18} color={AppTheme.accentSoft} />
          <Text style={styles.noticeText}>
            Add EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY with a browser-restricted Maps JavaScript API
            key to enable the live web map.
          </Text>
        </View>
      ) : (
        <View style={styles.mapSurface}>
          <View ref={setMapHost} style={styles.mapCanvas} />
          {!mapReady || mapError ? (
            <View style={styles.mapOverlay}>
              <Text style={styles.mapOverlayText}>
                {mapError ?? 'Loading live vehicle map...'}
              </Text>
              {mapError ? (
                <Pressable
                  onPress={() => {
                    clearMapArtifacts();
                    setMapError(null);
                    setMapReady(false);
                    setMapRetryNonce((value) => value + 1);
                  }}
                  style={styles.retryButton}>
                  <MaterialIcons name="refresh" size={16} color={AppTheme.canvas} />
                  <Text style={styles.retryButtonText}>Retry map</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      )}

      <View style={styles.list}>
        {vehicleMarkers.map((member) => (
          <View key={member.id} style={styles.driverCard}>
            <View style={styles.driverTop}>
              <View style={styles.driverNameRow}>
                <View style={[styles.driverAccent, { backgroundColor: member.accent }]} />
                <Text style={styles.driverName}>
                  {getLiveMapMarkerLabel(member)}
                  {member.id === currentUserId ? ' (You)' : ''}
                </Text>
              </View>
              <Text style={styles.driverMeta}>{formatRelativeTime(member.location.updatedAt)}</Text>
            </View>

            <Text style={styles.driverAddress}>
              {member.location.address ?? 'Address unavailable'}
            </Text>
            <Text style={styles.driverMeta}>
              {formatCoordinates(member.location.latitude, member.location.longitude)}
            </Text>
          </View>
        ))}
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
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(116, 166, 181, 0.24)',
    backgroundColor: '#081B22',
    padding: 14,
  },
  noticeText: {
    flex: 1,
    color: AppTheme.text,
    fontSize: 13,
    lineHeight: 19,
  },
  mapSurface: {
    minHeight: 320,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(116, 166, 181, 0.24)',
    backgroundColor: '#081B22',
    position: 'relative',
  },
  mapCanvas: {
    flex: 1,
    minHeight: 320,
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 27, 34, 0.26)',
    paddingHorizontal: 20,
    gap: 12,
  },
  mapOverlayText: {
    color: AppTheme.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: AppTheme.accentSoft,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: AppTheme.canvas,
    fontSize: 13,
    fontWeight: '700',
  },
  list: {
    gap: 10,
  },
  driverCard: {
    gap: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(116, 166, 181, 0.24)',
    backgroundColor: '#081B22',
    padding: 14,
  },
  driverTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  driverAccent: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  driverName: {
    flex: 1,
    color: AppTheme.text,
    fontSize: 15,
    fontWeight: '700',
  },
  driverAddress: {
    color: AppTheme.text,
    fontSize: 13,
    lineHeight: 19,
  },
  driverMeta: {
    color: AppTheme.mutedText,
    fontSize: 12,
    fontWeight: '600',
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
