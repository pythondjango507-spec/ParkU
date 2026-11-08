import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { setManualLocation, getUserLocation } from '../services/location';

export const LocationPickerModal = ({ visible, onClose, onLocationSelect }) => {
  const [customSearch, setCustomSearch] = useState('');

  const popularHubs = [
    {
      name: 'Current Live GPS',
      area: 'My Current Location',
      icon: 'navigate-circle',
      isGps: true,
    },
    {
      name: 'Marathahalli',
      area: 'Marathahalli, Bengaluru',
      lat: 12.9591,
      lon: 77.6974,
      icon: 'business',
    },
    {
      name: 'Bellandur (Outer Ring Road)',
      area: 'Bellandur, Bengaluru',
      lat: 12.9304,
      lon: 77.6784,
      icon: 'business',
    },
    {
      name: 'Whitefield (ITPL)',
      area: 'Whitefield, Bengaluru',
      lat: 12.9698,
      lon: 77.7500,
      icon: 'business',
    },
    {
      name: 'Indiranagar',
      area: 'Indiranagar, Bengaluru',
      lat: 12.9784,
      lon: 77.6408,
      icon: 'cafe',
    },
    {
      name: 'Koramangala',
      area: 'Koramangala, Bengaluru',
      lat: 12.9352,
      lon: 77.6245,
      icon: 'storefront',
    },
  ];

  const handleSelectHub = async (hub) => {
    if (hub.isGps) {
      const loc = await getUserLocation(true);
      onLocationSelect(loc);
      onClose();
      return;
    }

    const loc = setManualLocation(hub.lat, hub.lon, hub.area);
    onLocationSelect(loc);
    onClose();
  };

  const handleCustomSearchSubmit = () => {
    if (!customSearch.trim()) return;
    // Default to Marathahalli vicinity offset with user's named query
    const loc = setManualLocation(12.9591, 77.6974, customSearch.trim());
    onLocationSelect(loc);
    setCustomSearch('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="location" size={20} color="#2563EB" />
              <Text style={styles.title}>Select Parking Area</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Quick Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="search" size={16} color="#9CA3AF" />
            <TextInput
              style={styles.input}
              placeholder="Type area or landmark name..."
              placeholderTextColor="#9CA3AF"
              value={customSearch}
              onChangeText={setCustomSearch}
              onSubmitEditing={handleCustomSearchSubmit}
              returnKeyType="search"
            />
            {customSearch.length > 0 && (
              <TouchableOpacity onPress={handleCustomSearchSubmit}>
                <Ionicons name="arrow-forward-circle" size={22} color="#2563EB" />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.subhead}>Popular Areas</Text>

          <ScrollView style={{ maxHeight: 260 }}>
            {popularHubs.map((hub, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.hubItem, hub.isGps && styles.gpsItem]}
                onPress={() => handleSelectHub(hub)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, hub.isGps && styles.gpsCircle]}>
                  <Ionicons
                    name={hub.icon}
                    size={18}
                    color={hub.isGps ? '#15803D' : '#2563EB'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.hubName, hub.isGps && styles.gpsText]}>
                    {hub.name}
                  </Text>
                  <Text style={styles.hubSub}>{hub.area}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  subhead: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  hubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  gpsItem: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  gpsCircle: {
    backgroundColor: '#DCFCE7',
  },
  hubName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  gpsText: {
    color: '#15803D',
  },
  hubSub: {
    fontSize: 12,
    color: '#64748B',
  },
});

