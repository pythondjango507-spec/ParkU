import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { getUserLocation } from '../services/location';
import { SpotCard } from '../components/SpotCard';
import { BookingModal } from '../components/BookingModal';

export const SpotsScreen = ({ onOpenPicker }) => {
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState(null);
  const [hasLocation, setHasLocation] = useState(true);
  const [locationName, setLocationName] = useState('Marathahalli, Bengaluru');

  const fetchSpots = useCallback(async () => {
    try {
      setError(null);

      // Get user's live device location (instant cached return)
      const locInfo = await getUserLocation();
      const params = {};
      if (locInfo) {
        setHasLocation(true);
        setLocationName(locInfo.areaName || 'Marathahalli, Bengaluru');
        params.user_lat = locInfo.latitude;
        params.user_lon = locInfo.longitude;
        if (locInfo.areaName) params.user_area = locInfo.areaName;
      }

      if (search.trim()) params.query = search.trim();
      if (selectedFilter === 'ev_charging') params.spot_type = 'ev_charging';
      if (selectedFilter === 'accessible') params.spot_type = 'accessible';
      if (selectedFilter === 'compact') params.spot_type = 'compact';
      if (selectedFilter === 'covered') params.is_covered = true;

      const data = await api.getSpots(params);
      setSpots(data);
    } catch (err) {
      setError(err.message || 'Could not connect to backend');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedFilter]);

  // Fast responsive auto-search as user types
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSpots();
    }, 180);
    return () => clearTimeout(timer);
  }, [search, selectedFilter, fetchSpots]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSpots();
  };

  const handleBookPress = (spot) => {
    setSelectedSpot(spot);
    setModalVisible(true);
  };

  const handleBookingSuccess = () => {
    setModalVisible(false);
    fetchSpots();
  };

  const filters = [
    { id: 'all', label: 'All', icon: 'grid-outline' },
    { id: 'ev_charging', label: 'EV Charging', icon: 'flash-outline' },
    { id: 'covered', label: 'Covered', icon: 'shield-outline' },
    { id: 'accessible', label: 'Accessible', icon: 'body-outline' },
  ];

  return (
    <View style={styles.container}>
      {/* Live Location Status Indicator (Tap to Change Location) */}
      <TouchableOpacity
        style={styles.locationBanner}
        onPress={onOpenPicker}
        activeOpacity={0.7}
      >
        <Ionicons name="navigate-circle" size={17} color="#15803D" />
        <Text style={styles.locationBannerText} numberOfLines={1}>
          📍 {locationName} • Closest spots first
        </Text>
        <Ionicons name="chevron-forward" size={14} color="#15803D" />
      </TouchableOpacity>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search location or parking lot name..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={fetchSpots}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[
              styles.filterChip,
              selectedFilter === f.id && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter(f.id)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={f.icon}
              size={13}
              color={selectedFilter === f.id ? '#FFFFFF' : '#475569'}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.filterText,
                selectedFilter === f.id && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Spots List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Finding closest parking spots...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Cannot Connect to Backend</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchSpots}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={spots}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <SpotCard spot={item} onBook={handleBookPress} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="car-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No parking spots found</Text>
              <Text style={styles.emptySub}>Try adjusting your search filter.</Text>
            </View>
          }
        />
      )}

      {/* Booking Modal */}
      <BookingModal
        visible={modalVisible}
        spot={selectedSpot}
        onClose={() => setModalVisible(false)}
        onBookingSuccess={handleBookingSuccess}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginBottom: 10,
    gap: 6,
  },
  locationBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 10,
  },
  errorSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  retryBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
});
