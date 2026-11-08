import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authState } from '../services/auth';

export const AuthModal = ({ visible, onClose, onSuccess }) => {
  const [tab, setTab] = useState('login'); // 'login' or 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('driver'); // 'driver' or 'owner'
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter your email and password');
      return;
    }

    try {
      setLoading(true);
      let user;
      if (tab === 'login') {
        user = await authState.login(email.trim(), password.trim());
        Alert.alert('Welcome Back 👋', `Logged in as ${user.name} (${user.role === 'owner' ? 'Owner Admin' : 'Driver'})`);
      } else {
        if (!name.trim()) {
          Alert.alert('Required', 'Please enter your full name');
          setLoading(false);
          return;
        }
        user = await authState.register(
          name.trim(),
          email.trim(),
          password.trim(),
          role,
          phone.trim()
        );
        Alert.alert('Account Created 🎉', `Registered successfully as ${user.role === 'owner' ? 'Parking Place Owner' : 'Driver'}`);
      }
      setLoading(false);
      onClose();
      if (onSuccess) onSuccess(user);
    } catch (err) {
      setLoading(false);
      Alert.alert('Auth Error', err.message || 'Authentication failed');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          <View style={styles.topBar}>
            <Text style={styles.headerTitle}>
              {tab === 'login' ? 'Secure Sign In' : 'Create Account'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#4B5563" />
            </TouchableOpacity>
          </View>

          {/* Tab Switcher */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'login' && styles.tabBtnActive]}
              onPress={() => setTab('login')}
            >
              <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, tab === 'register' && styles.tabBtnActive]}
              onPress={() => setTab('register')}
            >
              <Text style={[styles.tabText, tab === 'register' && styles.tabTextActive]}>
                Register
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {tab === 'register' && (
              <>
                {/* Role Switcher */}
                <Text style={styles.label}>I am a:</Text>
                <View style={styles.roleRow}>
                  <TouchableOpacity
                    style={[styles.roleCard, role === 'driver' && styles.roleCardActive]}
                    onPress={() => setRole('driver')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="car"
                      size={20}
                      color={role === 'driver' ? '#2563EB' : '#64748B'}
                    />
                    <Text style={[styles.roleTitle, role === 'driver' && styles.roleTextActive]}>
                      Driver
                    </Text>
                    <Text style={styles.roleSub}>Book parking spots</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.roleCard, role === 'owner' && styles.roleCardActive]}
                    onPress={() => setRole('owner')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="business"
                      size={20}
                      color={role === 'owner' ? '#2563EB' : '#64748B'}
                    />
                    <Text style={[styles.roleTitle, role === 'owner' && styles.roleTextActive]}>
                      Place Owner
                    </Text>
                    <Text style={styles.roleSub}>Manage rates & discounts</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Ramesh Kumar"
                  placeholderTextColor="#9CA3AF"
                  value={name}
                  onChangeText={setName}
                />
              </>
            )}

            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. user@example.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={true}
              value={password}
              onChangeText={setPassword}
            />

            {tab === 'register' && (
              <>
                <Text style={styles.label}>Phone Number (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. +91 9876543210"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.disabledBtn]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {tab === 'login' ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  roleCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  roleCardActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  roleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 4,
  },
  roleTextActive: {
    color: '#2563EB',
  },
  roleSub: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  disabledBtn: {
    backgroundColor: '#93C5FD',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
