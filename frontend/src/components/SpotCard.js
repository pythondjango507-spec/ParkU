import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const SpotCard = ({ spot, onBook }) => {
  const isAvailable = spot.available_slots > 0;

  const getSpotTypeIcon = (type) => {
    switch (type) {
      case 'ev_charging':
        return { name: 'flash', color: '#10B981', label: 'EV Charging' };
      case 'accessible':
        return { name: 'body', color: '#3B82F6', label: 'Accessible' };
      case 'compact':
        return { name: 'car-sport', color: '#F59E0B', label: 'Compact' };
      default:
        return { name: 'car', color: '#6B7280', label: 'Standard' };
    }
  };

  const typeInfo = getSpotTypeIcon(spot.spot_type);

  const handleOpenNavigation = () => {
    const lat = spot.latitude;
    const lon = spot.longitude;
    const label = encodeURIComponent(spot.name);
    const navUrl = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lon}`,
      android: `google.navigation:q=${lat},${lon}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
    });
    const webFallback = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;

    Linking.canOpenURL(navUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(navUrl);
        } else {
          Linking.openURL(webFallback);
        }
      })
      .catch(() => Linking.openURL(webFallback));
  };

  return (
    <View style={styles.card}>
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.titleContainer}
          onPress={handleOpenNavigation}
          activeOpacity={0.7}
        >
          <Text style={styles.name}>{spot.name}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={14} color="#6B7280" />
            <Text style={styles.location}>{spot.location}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.rateBadge}>
          <Text style={styles.rateAmount}>₹{Math.round(spot.hourly_rate)}</Text>
          <Text style={styles.rateUnit}>/hr</Text>
        </View>
      </View>

      {/* Feature & Distance Badges */}
      <View style={styles.tagsRow}>
        {spot.distance_km !== undefined && spot.distance_km !== null && (
          <TouchableOpacity
            style={styles.distanceBadge}
            onPress={handleOpenNavigation}
            activeOpacity={0.7}
          >
            <Ionicons name="navigate" size={12} color="#1D4ED8" />
            <Text style={styles.distanceText}>
              {spot.distance_km < 1
                ? `${Math.round(spot.distance_km * 1000)} m away`
                : `${spot.distance_km} km away`}
            </Text>
          </TouchableOpacity>
        )}

        <View style={[styles.tag, { backgroundColor: typeInfo.color + '18' }]}>
          <Ionicons name={typeInfo.name} size={13} color={typeInfo.color} />
          <Text style={[styles.tagText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
        </View>

        {spot.is_covered && (
          <View style={[styles.tag, { backgroundColor: '#8B5CF618' }]}>
            <Ionicons name="shield-checkmark" size={13} color="#8B5CF6" />
            <Text style={[styles.tagText, { color: '#8B5CF6' }]}>Covered</Text>
          </View>
        )}

        <View style={[
          styles.slotsBadge,
          { backgroundColor: isAvailable ? '#DCFCE7' : '#FEE2E2' }
        ]}>
          <Text style={[
            styles.slotsText,
            { color: isAvailable ? '#15803D' : '#B91C1C' }
          ]}>
            {isAvailable ? `${spot.available_slots} open` : 'Full'}
          </Text>
        </View>
      </View>

      {/* Dual Actions: Directions (Navigation) & Reserve Spot */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={handleOpenNavigation}
          activeOpacity={0.8}
        >
          <Ionicons name="navigate-outline" size={16} color="#2563EB" style={{ marginRight: 5 }} />
          <Text style={styles.navButtonText}>Directions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bookButton, !isAvailable && styles.disabledButton]}
          disabled={!isAvailable}
          onPress={() => onBook(spot)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isAvailable ? 'calendar' : 'close-circle'}
            size={16}
            color="#FFFFFF"
            style={{ marginRight: 5 }}
          />
          <Text style={styles.bookButtonText}>
            {isAvailable ? 'Reserve Spot' : 'Full'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  titleContainer: {
    flex: 1,
    marginRight: 10,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  location: {
    fontSize: 13,
    color: '#64748B',
    marginLeft: 3,
  },
  rateBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
  },
  rateAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },
  rateUnit: {
    fontSize: 11,
    color: '#3B82F6',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
    alignItems: 'center',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  slotsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  slotsText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  navButton: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 14,
  },
  bookButton: {
    flex: 1.2,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#94A3B8',
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
