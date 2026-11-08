import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { authState } from '../services/auth';
import { getUserLocation } from '../services/location';

export const OwnerDashboard = () => {
  const [spots, setSpots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('spots'); // 'spots' or 'bookings'

  // Edit Pricing Modal State
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editHourly, setEditHourly] = useState('');
  const [editDaily, setEditDaily] = useState('');
  const [editDiscount, setEditDiscount] = useState('');
  const [saving, setSaving] = useState(false);

  // Add Spot Modal State
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newHourly, setNewHourly] = useState('30');
  const [newDaily, setNewDaily] = useState('200');
  const [newDiscount, setNewDiscount] = useState('15');
  const [newSlots, setNewSlots] = useState('20');
  const [newIsCovered, setNewIsCovered] = useState(false);
  const [newType, setNewType] = useState('standard');
  const [creating, setCreating] = useState(false);

  const currentUser = authState.getUser();

  const fetchData = useCallback(async () => {
    try {
      const [spotsData, bookingsData] = await Promise.all([
        api.getOwnerSpots().catch(() => []),
        api.getOwnerBookings().catch(() => []),
      ]);
      setSpots(spotsData);
      setBookings(bookingsData);
    } catch (err) {
      console.warn('Owner data load error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleOpenEdit = (spot) => {
    setSelectedSpot(spot);
    setEditHourly(spot.hourly_rate.toString());
    setEditDaily((spot.daily_rate || 200).toString());
    setEditDiscount((spot.weekly_discount_percent || 15).toString());
    setEditModalVisible(true);
  };

  const handleSavePricing = async () => {
    if (!selectedSpot) return;
    try {
      setSaving(true);
      await api.updateSpotPricing(selectedSpot.id, {
        hourly_rate: parseFloat(editHourly) || selectedSpot.hourly_rate,
        daily_rate: parseFloat(editDaily) || selectedSpot.daily_rate,
        weekly_discount_percent: parseFloat(editDiscount) || selectedSpot.weekly_discount_percent,
      });
      setSaving(false);
      setEditModalVisible(false);
      Alert.alert('Updated 🎉', 'Rates and weekly discounts updated successfully!');
      fetchData();
    } catch (err) {
      setSaving(false);
      Alert.alert('Update Failed', err.message || 'Could not update pricing');
    }
  };

  const handleCreateSpot = async () => {
    if (!newName.trim() || !newLocation.trim()) {
      Alert.alert('Required', 'Please enter parking facility name and location');
      return;
    }

    try {
      setCreating(true);
      const coords = await getUserLocation();
      const payload = {
        name: newName.trim(),
        location: newLocation.trim(),
        latitude: coords ? coords.latitude : 12.9591,
        longitude: coords ? coords.longitude : 77.6974,
        hourly_rate: parseFloat(newHourly) || 30.0,
        daily_rate: parseFloat(newDaily) || 200.0,
        weekly_discount_percent: parseFloat(newDiscount) || 15.0,
        total_slots: parseInt(newSlots, 10) || 20,
        available_slots: parseInt(newSlots, 10) || 20,
        spot_type: newType,
        is_covered: newIsCovered,
      };

      await api.createOwnerSpot(payload);
      setCreating(false);
      setAddModalVisible(false);
      Alert.alert('Created 🎉', `"${newName}" has been listed for drivers!`);
      setNewName('');
      setNewLocation('');
      fetchData();
    } catch (err) {
      setCreating(false);
      Alert.alert('Error', err.message || 'Could not create parking spot');
    }
  };

  const totalRevenue = bookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((sum, b) => sum + (b.total_price || 0), 0);

  const totalSlots = spots.reduce((sum, s) => sum + s.total_slots, 0);
  const availableSlots = spots.reduce((sum, s) => sum + s.available_slots, 0);

  return (
    <View style={styles.container}>
      {/* Owner Header Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.statsTopRow}>
          <View>
            <Text style={styles.ownerTitle}>Owner Admin Portal</Text>
            <Text style={styles.ownerSub}>{currentUser?.name || 'Parking Place Owner'}</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#15803D" />
            <Text style={styles.verifiedText}>Admin</Text>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Total Revenue</Text>
            <Text style={styles.kpiValue}>₹{Math.round(totalRevenue)}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Reservations</Text>
            <Text style={styles.kpiValue}>{bookings.length}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Open Slots</Text>
            <Text style={[styles.kpiValue, { color: '#15803D' }]}>{availableSlots}/{totalSlots}</Text>
          </View>
        </View>
      </View>

      {/* Sub Tabs + Add Spot Action */}
      <View style={styles.topActionBar}>
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.subTab, activeTab === 'spots' && styles.subTabActive]}
            onPress={() => setActiveTab('spots')}
          >
            <Text style={[styles.subTabText, activeTab === 'spots' && styles.subTabTextActive]}>
              My Facilities ({spots.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTab, activeTab === 'bookings' && styles.subTabActive]}
            onPress={() => setActiveTab('bookings')}
          >
            <Text style={[styles.subTabText, activeTab === 'bookings' && styles.subTabTextActive]}>
              Bookings ({bookings.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'spots' && (
          <TouchableOpacity
            style={styles.addSpotBtn}
            onPress={() => setAddModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={18} color="#FFFFFF" />
            <Text style={styles.addSpotBtnText}>Add Facility</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading owner records...</Text>
        </View>
      ) : activeTab === 'spots' ? (
        <FlatList
          data={spots}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 50 }}
          renderItem={({ item }) => (
            <View style={styles.spotCard}>
              <View style={styles.spotHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.spotName}>{item.name}</Text>
                  <Text style={styles.spotLocation}>{item.location}</Text>
                </View>
                <View style={styles.slotPill}>
                  <Text style={styles.slotPillText}>
                    {item.available_slots} / {item.total_slots} open
                  </Text>
                </View>
              </View>

              {/* Pricing & Concession Grid */}
              <View style={styles.ratesGrid}>
                <View style={styles.rateCol}>
                  <Text style={styles.rateTitle}>Hourly Rate</Text>
                  <Text style={styles.rateVal}>₹{Math.round(item.hourly_rate)}/hr</Text>
                </View>
                <View style={styles.rateCol}>
                  <Text style={styles.rateTitle}>Daily Rate</Text>
                  <Text style={styles.rateVal}>₹{Math.round(item.daily_rate || 200)}/day</Text>
                </View>
                <View style={styles.rateCol}>
                  <Text style={styles.rateTitle}>Weekly Concession</Text>
                  <Text style={[styles.rateVal, { color: '#15803D' }]}>
                    {item.weekly_discount_percent || 15}% OFF
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => handleOpenEdit(item)}
                activeOpacity={0.8}
              >
                <Ionicons name="pricetag-outline" size={15} color="#2563EB" style={{ marginRight: 6 }} />
                <Text style={styles.editBtnText}>Edit Rates & Concessions</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="business-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No parking facilities listed yet</Text>
              <Text style={styles.emptySub}>
                Tap "+ Add Facility" above to register your parking space, set rates, and start earning from drivers!
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 50 }}
          renderItem={({ item }) => (
            <View style={styles.bookingCard}>
              <View style={styles.bookingTop}>
                <View>
                  <Text style={styles.bookingId}>Booking #{item.id} • {item.vehicle_plate}</Text>
                  <Text style={styles.driverName}>{item.user_name}</Text>
                </View>
                <Text style={styles.paidAmount}>₹{Math.round(item.total_price)}</Text>
              </View>

              <View style={styles.bookingDetailsRow}>
                <Ionicons
                  name={item.booking_type === 'daily' ? 'calendar' : 'time'}
                  size={14}
                  color="#2563EB"
                />
                <Text style={styles.bookingDetailsText}>
                  {item.booking_type === 'daily'
                    ? `${item.from_date} ➔ ${item.to_date} (${item.total_days} Days)`
                    : `${item.booking_date} • ${item.start_time} (${item.duration_hours} hrs)`}
                </Text>
              </View>

              {item.discount_applied > 0 && (
                <View style={styles.discountBadge}>
                  <Ionicons name="gift" size={13} color="#15803D" />
                  <Text style={styles.discountBadgeText}>
                    Weekly Long-Stay Concession: -₹{Math.round(item.discount_applied)} ({item.discount_percent}%)
                  </Text>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No customer bookings yet</Text>
              <Text style={styles.emptySub}>Incoming reservations from drivers will appear here in real time.</Text>
            </View>
          }
        />
      )}

      {/* 1. Edit Pricing & Concessions Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Pricing & Discounts</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Hourly Rate (₹ / hour)</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={editHourly}
                onChangeText={setEditHourly}
                placeholder="30"
              />

              <Text style={styles.inputLabel}>Daily Rate (₹ / day for 24 hrs)</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={editDaily}
                onChangeText={setEditDaily}
                placeholder="200"
              />

              <Text style={styles.inputLabel}>Weekly Concession Discount (%)</Text>
              <Text style={styles.inputTip}>Automatically deducted if driver reserves for ≥ 7 days</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={editDiscount}
                onChangeText={setEditDiscount}
                placeholder="15"
              />

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSavePricing}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save & Apply to Public</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 2. Add Parking Facility Modal */}
      <Modal visible={addModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register Parking Facility</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Facility Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Marathahalli Prime Parking"
                value={newName}
                onChangeText={setNewName}
              />

              <Text style={styles.inputLabel}>Full Address / Landmark</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Near Innovative Multiplex, Outer Ring Road"
                value={newLocation}
                onChangeText={setNewLocation}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Hourly Rate (₹)</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={newHourly}
                    onChangeText={setNewHourly}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Daily Rate (₹)</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={newDaily}
                    onChangeText={setNewDaily}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Total Slots</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={newSlots}
                    onChangeText={setNewSlots}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Weekly Discount %</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={newDiscount}
                    onChangeText={setNewDiscount}
                  />
                </View>
              </View>

              {/* Toggles */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  style={[styles.toggleBtn, newIsCovered && styles.toggleBtnActive]}
                  onPress={() => setNewIsCovered(!newIsCovered)}
                >
                  <Ionicons name="shield-checkmark" size={16} color={newIsCovered ? '#FFFFFF' : '#64748B'} />
                  <Text style={[styles.toggleText, newIsCovered && styles.toggleTextActive]}>Covered Garage</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggleBtn, newType === 'ev_charging' && styles.toggleBtnActive]}
                  onPress={() => setNewType(newType === 'ev_charging' ? 'standard' : 'ev_charging')}
                >
                  <Ionicons name="flash" size={16} color={newType === 'ev_charging' ? '#FFFFFF' : '#64748B'} />
                  <Text style={[styles.toggleText, newType === 'ev_charging' && styles.toggleTextActive]}>EV Charging</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, creating && { opacity: 0.7 }]}
                onPress={handleCreateSpot}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Publish Parking Space</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
    paddingTop: 10,
  },
  statsCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
  },
  statsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  ownerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ownerSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
  },
  kpiBox: {
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  topActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
  },
  subTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  subTabActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  subTabTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  addSpotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    gap: 5,
  },
  addSpotBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  spotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  spotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  spotName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  spotLocation: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  slotPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  slotPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  ratesGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  rateCol: {
    alignItems: 'center',
  },
  rateTitle: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  rateVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  editBtnText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 13,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bookingTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bookingId: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  driverName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  paidAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#15803D',
  },
  bookingDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  bookingDetailsText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 5,
  },
  discountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  loadingText: {
    marginTop: 10,
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  editModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
    marginTop: 10,
  },
  inputTip: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 10,
    gap: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#2563EB',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  saveBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
