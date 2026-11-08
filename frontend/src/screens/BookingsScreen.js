import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';

export const BookingsScreen = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      const data = await api.getBookings();
      setBookings(data);
    } catch (err) {
      console.warn('Error fetching bookings:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const handleCancelBooking = (booking) => {
    Alert.alert(
      'Cancel Reservation?',
      `Are you sure you want to cancel booking #${booking.id} for vehicle ${booking.vehicle_plate}?`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.cancelBooking(booking.id);
              Alert.alert('Cancelled', 'Your reservation was cancelled and the slot has been freed.');
              fetchBookings();
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not cancel');
            }
          },
        },
      ]
    );
  };

  const renderBookingItem = ({ item }) => {
    const isCancelled = item.status === 'cancelled';

    return (
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bookingId}>Booking #{item.id}</Text>
            <Text style={styles.spotName}>{item.spot?.name || `Spot #${item.spot_id}`}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isCancelled ? '#FEE2E2' : '#DCFCE7' },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: isCancelled ? '#B91C1C' : '#15803D' },
              ]}
            >
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Date and Time Slot Banner */}
        <View style={styles.dateSlotBanner}>
          <Ionicons name="calendar" size={14} color="#2563EB" style={{ marginRight: 6 }} />
          <Text style={styles.dateSlotText}>
            {item.booking_date || 'Today'} • Slot: {item.start_time || 'Now'} ({item.duration_hours} hr{item.duration_hours > 1 ? 's' : ''})
          </Text>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Driver</Text>
            <Text style={styles.infoValue}>{item.user_name}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Vehicle Plate</Text>
            <Text style={styles.infoValue}>{item.vehicle_plate}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Duration</Text>
            <Text style={styles.infoValue}>{item.duration_hours} hour{item.duration_hours > 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Total Paid</Text>
            <Text style={[styles.infoValue, { color: '#2563EB', fontWeight: '700' }]}>
              ₹{Math.round(item.total_price)}
            </Text>
          </View>
        </View>

        {!isCancelled && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => handleCancelBooking(item)}
          >
            <Ionicons name="close-circle-outline" size={16} color="#DC2626" style={{ marginRight: 4 }} />
            <Text style={styles.cancelBtnText}>Cancel Reservation</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading your reservations...</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={54} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No reservations yet</Text>
              <Text style={styles.emptySub}>
                Browse spots or use our Gemini AI to reserve your first parking space!
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  listContent: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookingId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  spotName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateSlotBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    marginBottom: 10,
  },
  dateSlotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginBottom: 12,
  },
  infoCol: {
    width: '45%',
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  cancelBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});

