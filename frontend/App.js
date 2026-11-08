import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SpotsScreen } from './src/screens/SpotsScreen';
import { AIScreen } from './src/screens/AIScreen';
import { BookingsScreen } from './src/screens/BookingsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { OwnerDashboard } from './src/screens/OwnerDashboard';
import { AuthScreen } from './src/screens/AuthScreen';
import { LocationPickerModal } from './src/components/LocationPickerModal';
import { authState } from './src/services/auth';

function MainApp() {
  const [user, setUser] = useState(authState.getUser());
  const [activeTab, setActiveTab] = useState('spots');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [locationLabel, setLocationLabel] = useState('Marathahalli');
  const [refreshKey, setRefreshKey] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsubscribe = authState.subscribe((newUser) => {
      setUser(newUser);
      if (newUser?.role === 'owner') {
        setActiveTab('owner');
      } else if (newUser?.role === 'driver') {
        setActiveTab('spots');
      }
    });
    return unsubscribe;
  }, []);

  // If user is not authenticated, display full-screen AuthScreen first
  if (!user) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <AuthScreen
          onLoginSuccess={(loggedInUser) => {
            setUser(loggedInUser);
            if (loggedInUser.role === 'owner') {
              setActiveTab('owner');
            } else {
              setActiveTab('spots');
            }
          }}
        />
      </View>
    );
  }

  const isOwner = user?.role === 'owner';

  const handleLocationSelect = (loc) => {
    if (loc && loc.areaName) {
      const shortName = loc.areaName.split(',')[0].trim();
      setLocationLabel(shortName || 'Nearby');
    }
    setRefreshKey((prev) => prev + 1);
  };

  const handleUserPress = () => {
    Alert.alert(
      `Signed In: ${user.name}`,
      `Role: ${isOwner ? 'Parking Place Owner (Admin)' : 'Driver'}\nEmail: ${user.email}`,
      [
        { text: 'Close', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            authState.logout();
            setUser(null);
            setActiveTab('spots');
            Alert.alert('Signed Out', 'You have been signed out successfully.');
          },
        },
      ]
    );
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'spots':
        return <SpotsScreen key={refreshKey} onOpenPicker={() => setPickerVisible(true)} />;
      case 'ai':
        return <AIScreen key={refreshKey} />;
      case 'bookings':
        return <BookingsScreen />;
      case 'owner':
        return <OwnerDashboard />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return isOwner ? <OwnerDashboard /> : <SpotsScreen key={refreshKey} onOpenPicker={() => setPickerVisible(true)} />;
    }
  };

  const tabs = isOwner
    ? [
        { id: 'owner', label: 'Owner Admin', icon: 'business-outline', activeIcon: 'business' },
        { id: 'spots', label: 'All Lots', icon: 'car-outline', activeIcon: 'car' },
        { id: 'settings', label: 'Settings', icon: 'settings-outline', activeIcon: 'settings' },
      ]
    : [
        { id: 'spots', label: 'Lots', icon: 'car-outline', activeIcon: 'car' },
        { id: 'ai', label: 'AI Guide', icon: 'sparkles-outline', activeIcon: 'sparkles' },
        { id: 'bookings', label: 'Bookings', icon: 'receipt-outline', activeIcon: 'receipt' },
        { id: 'settings', label: 'Settings', icon: 'settings-outline', activeIcon: 'settings' },
      ];

  const safeBottomPadding = Math.max(insets.bottom, 16);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <Ionicons name="car" size={18} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.brandTitle}>Park<Text style={{ color: '#2563EB' }}>U</Text></Text>
            <Text style={styles.brandSubtitle}>
              {isOwner ? 'Owner Administration' : 'Smart Parking & AI Mobility'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRightRow}>
          {/* Location Badge (Driver only) */}
          {!isOwner && (
            <TouchableOpacity
              style={styles.locationBadge}
              onPress={() => setPickerVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="location" size={13} color="#15803D" />
              <Text style={styles.locationBadgeText} numberOfLines={1}>{locationLabel}</Text>
            </TouchableOpacity>
          )}

          {/* User Account / Sign Out Pill */}
          <TouchableOpacity
            style={[styles.authPill, isOwner && styles.ownerPill]}
            onPress={handleUserPress}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isOwner ? 'business' : 'person-circle'}
              size={15}
              color={isOwner ? '#B45309' : '#1D4ED8'}
            />
            <Text style={[styles.authPillText, isOwner && styles.ownerPillText]} numberOfLines={1}>
              {user.name.split(' ')[0]}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Screen Body */}
      <View style={styles.contentContainer}>
        {renderScreen()}
      </View>

      {/* Modals */}
      <LocationPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onLocationSelect={handleLocationSelect}
      />

      {/* Elevated Bottom Navigation Bar */}
      <View style={[
        styles.bottomNav,
        {
          paddingBottom: safeBottomPadding,
          height: 56 + safeBottomPadding,
        }
      ]}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.navItem}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrapper, isActive && styles.iconWrapperActive]}>
                <Ionicons
                  name={isActive ? tab.activeIcon : tab.icon}
                  size={21}
                  color={isActive ? '#2563EB' : '#64748B'}
                />
              </View>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 3,
    maxWidth: 105,
  },
  locationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  authPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  authPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  ownerPill: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  ownerPillText: {
    color: '#B45309',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 3,
  },
  iconWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  iconWrapperActive: {
    backgroundColor: '#EFF6FF',
  },
  navLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  navLabelActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
});
