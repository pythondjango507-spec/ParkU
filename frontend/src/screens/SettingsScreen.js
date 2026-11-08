import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getApiUrl, setApiUrl } from '../config';
import { api } from '../services/api';
import { authState } from '../services/auth';

export const SettingsScreen = () => {
  const [url, setUrl] = useState(getApiUrl());
  const [checking, setChecking] = useState(false);
  const [serverInfo, setServerInfo] = useState(null);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(authState.getUser());

  // Change Password Modal state
  const [changeModalVisible, setChangeModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const unsubscribe = authState.subscribe((newUser) => {
      setUser(newUser);
    });
    return unsubscribe;
  }, []);

  const checkConnection = async (targetUrl = null) => {
    try {
      setChecking(true);
      setError(null);
      setServerInfo(null);
      if (targetUrl) {
        setApiUrl(targetUrl);
        setUrl(targetUrl);
      }
      const data = await api.checkHealth();
      setServerInfo(data);
    } catch (err) {
      setError(err.message || 'Cannot reach server');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleSave = () => {
    if (!url.trim()) {
      Alert.alert('Required', 'Please enter your backend URL');
      return;
    }
    const cleanUrl = setApiUrl(url);
    setUrl(cleanUrl);
    checkConnection(cleanUrl);
  };

  const setPreset = (presetUrl) => {
    setUrl(presetUrl);
    setApiUrl(presetUrl);
    checkConnection(presetUrl);
  };

  const calculatePasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: '#CBD5E1' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Za-z]/.test(pass) && /[0-9!@#$%^&*(),.?":{}|<>]/.test(pass)) score += 1;
    if (pass.length >= 10 && /[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;

    if (score === 1) return { score: 1, label: 'Weak (min 8 chars & numbers needed)', color: '#DC2626' };
    if (score === 2) return { score: 2, label: 'Good (meets policy)', color: '#D97706' };
    return { score: 3, label: 'Strong (high security)', color: '#16A34A' };
  };

  const handleChangePasswordSubmit = async () => {
    if (!currentPassword) {
      Alert.alert('Required', 'Please enter your current password.');
      return;
    }
    if (!newPassword) {
      Alert.alert('Required', 'Please enter your new password.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Password Too Short', 'Your new password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New password and confirm password do not match.');
      return;
    }

    try {
      setChangeLoading(true);
      const res = await api.changePassword(currentPassword, newPassword);
      setChangeLoading(false);
      Alert.alert('Success 🎉', res.message || 'Password changed successfully!');
      setChangeModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setChangeLoading(false);
      Alert.alert('Change Password Failed', err.message || 'Could not update password. Please check your current password.');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your ParkU account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            authState.logout();
            Alert.alert('Signed Out', 'You have been signed out successfully.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* User Account & Security Card */}
      {user && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-checkmark" size={20} color="#2563EB" />
            <Text style={styles.cardTitle}>Account & Security</Text>
          </View>

          <View style={styles.profileRow}>
            <View style={[styles.avatarCircle, user.role === 'owner' && styles.avatarCircleOwner]}>
              <Ionicons
                name={user.role === 'owner' ? 'business' : 'person'}
                size={24}
                color={user.role === 'owner' ? '#B45309' : '#2563EB'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
              <View style={[styles.roleBadge, user.role === 'owner' && styles.roleBadgeOwner]}>
                <Text style={[styles.roleBadgeText, user.role === 'owner' && styles.roleBadgeTextOwner]}>
                  {user.role === 'owner' ? 'Parking Place Owner (Admin)' : 'Driver / Vehicle Owner'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Security Action Buttons */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setChangeModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconBox}>
                <Ionicons name="key-outline" size={18} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.menuTitle}>Change Password</Text>
                <Text style={styles.menuSubtitle}>Update your account security password</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { marginTop: 6 }]}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="log-out-outline" size={18} color="#DC2626" />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: '#DC2626' }]}>Sign Out</Text>
                <Text style={styles.menuSubtitle}>Securely sign out of this device</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      )}

      {/* Backend API Connection Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="wifi" size={20} color="#2563EB" />
          <Text style={styles.cardTitle}>Backend Connection</Text>
        </View>

        <Text style={styles.label}>Server Base URL</Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder="http://192.168.1.7:8000"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* 1-Tap Connect to Laptop Wi-Fi */}
        <TouchableOpacity
          style={styles.presetChip}
          onPress={() => setPreset('http://192.168.1.7:8000')}
          activeOpacity={0.8}
        >
          <Ionicons name="laptop-outline" size={16} color="#1D4ED8" />
          <Text style={styles.presetChipText}>Auto-Set: http://192.168.1.7:8000</Text>
        </TouchableOpacity>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.btn, styles.primaryBtn]}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Text style={styles.btnText}>Save & Apply</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.secondaryBtn]}
            onPress={() => checkConnection(url)}
            disabled={checking}
            activeOpacity={0.8}
          >
            {checking ? (
              <ActivityIndicator color="#2563EB" size="small" />
            ) : (
              <Text style={styles.secondaryBtnText}>Test Ping</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Connection Status Box */}
      {serverInfo && (
        <View style={styles.statusBoxSuccess}>
          <View style={styles.statusHeader}>
            <Ionicons name="checkmark-circle" size={22} color="#15803D" />
            <Text style={styles.statusTitleSuccess}>Connected Successfully</Text>
          </View>
          <Text style={styles.statusSubSuccess}>
            ParkU backend is online and ready (JWT & rate-limiting protected).
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.statusBoxError}>
          <View style={styles.statusHeader}>
            <Ionicons name="alert-circle" size={22} color="#B91C1C" />
            <Text style={styles.statusTitleError}>Cannot Connect to Server</Text>
          </View>
          <Text style={styles.errorDetails}>
            Make sure your backend is running on your laptop (`run.py`) and your phone is on the same Wi-Fi network.
          </Text>
        </View>
      )}

      {/* Change Password Modal */}
      <Modal visible={changeModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.keyBadge}>
                  <Ionicons name="key" size={20} color="#2563EB" />
                </View>
                <Text style={styles.modalTitle}>Change Password</Text>
              </View>
              <TouchableOpacity onPress={() => setChangeModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Current Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter current password"
                    placeholderTextColor="#94A3B8"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry={!showCurrentPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* New Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password (min 8 characters)</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="shield-outline" size={18} color="#94A3B8" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter new password"
                    placeholderTextColor="#94A3B8"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </View>

                {newPassword.length > 0 && (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthBarRow}>
                      <View
                        style={[
                          styles.strengthBar,
                          {
                            backgroundColor:
                              calculatePasswordStrength(newPassword).score >= 1
                                ? calculatePasswordStrength(newPassword).color
                                : '#E2E8F0',
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.strengthBar,
                          {
                            backgroundColor:
                              calculatePasswordStrength(newPassword).score >= 2
                                ? calculatePasswordStrength(newPassword).color
                                : '#E2E8F0',
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.strengthBar,
                          {
                            backgroundColor:
                              calculatePasswordStrength(newPassword).score >= 3
                                ? calculatePasswordStrength(newPassword).color
                                : '#E2E8F0',
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.strengthLabel,
                        { color: calculatePasswordStrength(newPassword).color },
                      ]}
                    >
                      Strength: {calculatePasswordStrength(newPassword).label}
                    </Text>
                  </View>
                )}
              </View>

              {/* Confirm New Password */}
              <View style={styles.inputGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={styles.inputLabel}>Confirm New Password</Text>
                  {confirmPassword.length > 0 && (
                    <Text
                      style={[
                        styles.matchIndicator,
                        newPassword === confirmPassword ? styles.matchSuccess : styles.matchError,
                      ]}
                    >
                      {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Do not match'}
                    </Text>
                  )}
                </View>
                <View style={styles.inputBox}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#94A3B8" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Re-enter new password"
                    placeholderTextColor="#94A3B8"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.btn, styles.primaryBtn, { marginTop: 14 }]}
                onPress={handleChangePasswordSubmit}
                disabled={changeLoading}
                activeOpacity={0.85}
              >
                {changeLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.btnText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <View style={{ height: 60 }} />
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
    paddingBottom: 60,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  avatarCircleOwner: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  profileEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 1,
  },
  roleBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  roleBadgeOwner: {
    backgroundColor: '#FEF3C7',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  roleBadgeTextOwner: {
    color: '#B45309',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  menuSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 10,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    backgroundColor: '#2563EB',
  },
  secondaryBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryBtnText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 14,
  },
  statusBoxSuccess: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 14,
  },
  statusBoxError: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 14,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  statusTitleSuccess: {
    fontSize: 15,
    fontWeight: '700',
    color: '#15803D',
  },
  statusTitleError: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B91C1C',
  },
  statusSubSuccess: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
  },
  errorDetails: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  keyBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#0F172A',
  },
  eyeBtn: {
    padding: 6,
  },
  strengthContainer: {
    marginTop: 6,
  },
  strengthBarRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  matchIndicator: {
    fontSize: 11,
    fontWeight: '600',
  },
  matchSuccess: {
    color: '#16A34A',
  },
  matchError: {
    color: '#DC2626',
  },
});
