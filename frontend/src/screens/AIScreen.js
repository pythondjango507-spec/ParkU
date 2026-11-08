import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { getUserLocation } from '../services/location';
import { BookingModal } from '../components/BookingModal';

export const AIScreen = () => {
  const [destination, setDestination] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [duration, setDuration] = useState('2');
  const [needsEv, setNeedsEv] = useState(false);
  const [needsCovered, setNeedsCovered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);

  const quickPrompts = [
    { label: '⚡ EV Charging', ev: true, covered: false, dest: 'Nearest EV Station' },
    { label: '🛡️ Covered Lot', ev: false, covered: true, dest: 'Covered Garage' },
    { label: '💰 Lowest Rate', ev: false, covered: false, dest: 'Budget Parking', budget: '3' },
  ];

  const applyQuickPrompt = (p) => {
    setNeedsEv(p.ev);
    setNeedsCovered(p.covered);
    setDestination(p.dest);
    if (p.budget) setMaxBudget(p.budget);
  };

  const handleAskAI = async () => {
    try {
      setLoading(true);
      setResult(null);

      const locInfo = await getUserLocation();

      const criteria = {
        destination: destination.trim() || 'Closest available parking',
        max_budget: maxBudget ? parseFloat(maxBudget) : null,
        duration_hours: parseInt(duration, 10) || 1,
        needs_ev: needsEv,
        needs_covered: needsCovered,
      };

      if (locInfo) {
        criteria.user_lat = locInfo.latitude;
        criteria.user_lon = locInfo.longitude;
        if (locInfo.areaName) criteria.user_area = locInfo.areaName;
      }

      const res = await api.getAIRecommendations(criteria);
      setResult(res);
    } catch (err) {
      Alert.alert('AI Error', err.message || 'Could not fetch recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleBookRecommended = async (rec) => {
    try {
      const coords = await getUserLocation();
      const params = coords ? { user_lat: coords.latitude, user_lon: coords.longitude } : {};
      const spots = await api.getSpots(params);
      const match = spots.find((s) => s.id === rec.spot_id);
      if (match) {
        setSelectedSpot(match);
        setBookingModalVisible(true);
      } else {
        Alert.alert('Not Found', 'Could not locate spot details.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to retrieve spot information.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Banner */}
      <View style={styles.banner}>
        <Ionicons name="sparkles" size={20} color="#7C3AED" style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Gemini AI Parking Matcher</Text>
          <Text style={styles.bannerSub}>Find the closest and best-value spot near you</Text>
        </View>
      </View>

      {/* Quick Filter Chips */}
      <View style={styles.quickRow}>
        {quickPrompts.map((q, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.quickChip}
            onPress={() => applyQuickPrompt(q)}
            activeOpacity={0.8}
          >
            <Text style={styles.quickText}>{q.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Input Form */}
      <View style={styles.formCard}>
        <Text style={styles.label}>Destination / Area</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Shopping Mall, Hospital, Metro Gate"
          placeholderTextColor="#9CA3AF"
          value={destination}
          onChangeText={setDestination}
        />

        <View style={styles.inlineRow}>
          <View style={{ flex: 1, marginRight: 6 }}>
            <Text style={styles.label}>Max Budget ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 5"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={maxBudget}
              onChangeText={setMaxBudget}
            />
          </View>

          <View style={{ flex: 1, marginLeft: 6 }}>
            <Text style={styles.label}>Duration (Hours)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={duration}
              onChangeText={setDuration}
            />
          </View>
        </View>

        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, needsEv && styles.toggleBtnActive]}
            onPress={() => setNeedsEv(!needsEv)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={needsEv ? 'flash' : 'flash-outline'}
              size={16}
              color={needsEv ? '#FFFFFF' : '#10B981'}
            />
            <Text style={[styles.toggleText, needsEv && styles.toggleTextActive]}>
              EV Charging
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, needsCovered && styles.toggleBtnActive]}
            onPress={() => setNeedsCovered(!needsCovered)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={needsCovered ? 'shield-checkmark' : 'shield-outline'}
              size={16}
              color={needsCovered ? '#FFFFFF' : '#8B5CF6'}
            />
            <Text style={[styles.toggleText, needsCovered && styles.toggleTextActive]}>
              Covered Lot
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.askBtn, loading && styles.disabledBtn]}
          onPress={handleAskAI}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="sparkles" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.askBtnText}>Find Best Match</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* AI Recommendations */}
      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultHeading}>Top Matches for You</Text>

          {result.summary_advice ? (
            <View style={styles.adviceBox}>
              <Ionicons name="information-circle" size={18} color="#2563EB" style={{ marginRight: 6 }} />
              <Text style={styles.adviceText}>{result.summary_advice}</Text>
            </View>
          ) : null}

          {result.recommendations?.map((rec, index) => (
            <View key={index} style={styles.recCard}>
              <View style={styles.recHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recName}>{rec.name}</Text>
                  <Text style={styles.recCost}>Est. Cost: ₹{Math.round(rec.estimated_cost)}</Text>
                </View>
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreText}>{rec.score}% Match</Text>
                </View>
              </View>

              <Text style={styles.recReason}>{rec.reason}</Text>

              <TouchableOpacity
                style={styles.bookMatchBtn}
                onPress={() => handleBookRecommended(rec)}
                activeOpacity={0.8}
              >
                <Text style={styles.bookMatchText}>Reserve This Spot</Text>
                <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      <View style={{ height: 40 }} />

      <BookingModal
        visible={bookingModalVisible}
        spot={selectedSpot}
        onClose={() => setBookingModalVisible(false)}
        onBookingSuccess={() => setBookingModalVisible(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6D28D9',
  },
  bannerSub: {
    fontSize: 12,
    color: '#7C3AED',
    marginTop: 2,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quickChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 12,
  },
  inlineRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 14,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  askBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledBtn: {
    backgroundColor: '#93C5FD',
  },
  askBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  resultContainer: {
    marginTop: 4,
  },
  resultHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  adviceBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  adviceText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  recCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  recCost: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 2,
  },
  scoreBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  recReason: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 12,
  },
  bookMatchBtn: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  bookMatchText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
