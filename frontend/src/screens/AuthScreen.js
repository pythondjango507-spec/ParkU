import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authState } from '../services/auth';
import { getApiUrl, setApiUrl } from '../config';
import { api } from '../services/api';

export const AuthScreen = ({ onLoginSuccess }) => {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('login'); // 'login' or 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('driver'); // 'driver' or 'owner'
  const [loading, setLoading] = useState(false);

  // Connection settings modal state
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [serverUrl, setServerUrl] = useState(getApiUrl());
  const [serverStatus, setServerStatus] = useState('checking'); // 'connected', 'offline', 'checking'

  // Forgot / Reset Password state
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1 = Enter Email, 2 = Verify Code & Set New Password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [generatedCodeHint, setGeneratedCodeHint] = useState(null);

  // Security & UX enhancements: Eye toggles, Strength meter, Rate-limit cooldown
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // 60-second OTP cooldown ticker
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

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

  const pingServer = async (testUrl = null) => {
    try {
      setServerStatus('checking');
      if (testUrl) {
        setApiUrl(testUrl);
        setServerUrl(testUrl);
      }
      await api.checkHealth();
      setServerStatus('connected');
    } catch (err) {
      setServerStatus('offline');
    }
  };

  useEffect(() => {
    pingServer();
  }, []);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter your email and password.');
      return;
    }

    try {
      setLoading(true);
      let user;
      if (tab === 'login') {
        user = await authState.login(email.trim(), password.trim());
        Alert.alert(
          'Welcome to ParkU 👋',
          `Signed in as ${user.name} (${user.role === 'owner' ? 'Parking Place Owner' : 'Driver'})`
        );
      } else {
        if (!name.trim()) {
          Alert.alert('Required Field', 'Please enter your full name.');
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
        Alert.alert(
          'Account Created 🎉',
          `Welcome to ParkU! Registered as ${user.role === 'owner' ? 'Parking Place Owner (Admin)' : 'Driver'}.`
        );
      }
      setLoading(false);
      if (onLoginSuccess) onLoginSuccess(user);
    } catch (err) {
      setLoading(false);
      const isConnError = err.message?.includes('fetch') || err.message?.includes('Network');
      Alert.alert(
        'Authentication Error',
        isConnError
          ? `Could not reach backend at ${getApiUrl()}.\n\nMake sure the backend is running on your laptop with:\ncd backend\nvenv\\Scripts\\python run.py`
          : err.message || 'Authentication failed. Please verify your credentials.'
      );
    }
  };

  const handleSaveServerUrl = () => {
    if (!serverUrl.trim()) return;
    const clean = setApiUrl(serverUrl);
    setServerUrl(clean);
    pingServer(clean);
    setServerModalVisible(false);
  };

  // --- Forgot Password Handlers ---
  const handleOpenForgotModal = () => {
    setForgotEmail(email.trim());
    setForgotStep(1);
    setForgotCode('');
    setNewPassword('');
    setConfirmPassword('');
    setGeneratedCodeHint(null);
    setForgotModalVisible(true);
  };

  const handleCloseForgotModal = () => {
    setForgotModalVisible(false);
    setForgotStep(1);
    setForgotCode('');
    setNewPassword('');
    setConfirmPassword('');
    setGeneratedCodeHint(null);
  };

  const handleRequestResetCode = async () => {
    if (!forgotEmail.trim()) {
      Alert.alert('Required Field', 'Please enter your registered email address.');
      return;
    }

    if (resendCooldown > 0) {
      Alert.alert('Please Wait', `You can request a new verification code in ${resendCooldown} seconds.`);
      return;
    }

    try {
      setForgotLoading(true);
      const res = await api.forgotPassword(forgotEmail.trim());
      setForgotLoading(false);
      setResendCooldown(60);
      setGeneratedCodeHint(res.reset_code);
      if (res.reset_code) {
        setForgotCode(res.reset_code);
      }
      setForgotStep(2);
      Alert.alert(
        'Verification Code Generated',
        `A 6-digit verification code has been issued for ${forgotEmail.trim()}:\n\n👉  ${res.reset_code}  👈\n\nEnter this code and your new password to complete the reset.`
      );
    } catch (err) {
      setForgotLoading(false);
      Alert.alert('Error', err.message || 'Could not generate reset code. Please check your email address.');
    }
  };

  const handleResetPassword = async () => {
    if (!forgotCode.trim()) {
      Alert.alert('Required Field', 'Please enter the 6-digit verification code.');
      return;
    }
    if (forgotCode.trim().length !== 6) {
      Alert.alert('Invalid Code', 'The verification code must be exactly 6 digits.');
      return;
    }
    if (!newPassword) {
      Alert.alert('Required Field', 'Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Password Too Short', 'Your new password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'New password and confirm password do not match. Please verify both fields.');
      return;
    }

    try {
      setForgotLoading(true);
      const res = await api.resetPassword(forgotEmail.trim(), forgotCode.trim(), newPassword);
      setForgotLoading(false);
      Alert.alert(
        'Password Reset Successful 🎉',
        'Your password has been securely updated. You can now sign in with your new password.',
        [
          {
            text: 'Sign In Now',
            onPress: () => {
              handleCloseForgotModal();
              setEmail(forgotEmail.trim());
              setPassword('');
              setTab('login');
            },
          },
        ]
      );
    } catch (err) {
      setForgotLoading(false);
      Alert.alert('Reset Failed', err.message || 'Invalid or expired verification code. Please try again.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Brand */}
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <Ionicons name="car" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.appTitle}>ParkU</Text>
            <Text style={styles.appSubtitle}>Smart Parking & Mobility Platform</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* Tabs */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tabBtn, tab === 'login' && styles.tabBtnActive]}
                onPress={() => setTab('login')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, tab === 'register' && styles.tabBtnActive]}
                onPress={() => setTab('register')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, tab === 'register' && styles.tabTextActive]}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            {/* Role Selector (When Registering) */}
            {tab === 'register' && (
              <View style={styles.roleSection}>
                <Text style={styles.inputLabel}>I am registering as:</Text>
                <View style={styles.roleGrid}>
                  <TouchableOpacity
                    style={[styles.roleCard, role === 'driver' && styles.roleCardActive]}
                    onPress={() => setRole('driver')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="car-sport"
                      size={24}
                      color={role === 'driver' ? '#2563EB' : '#64748B'}
                    />
                    <Text style={[styles.roleTitle, role === 'driver' && styles.roleTitleActive]}>
                      Driver
                    </Text>
                    <Text style={styles.roleDesc}>Find & book parking spots</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.roleCard, role === 'owner' && styles.roleCardActive]}
                    onPress={() => setRole('owner')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="business"
                      size={24}
                      color={role === 'owner' ? '#2563EB' : '#64748B'}
                    />
                    <Text style={[styles.roleTitle, role === 'owner' && styles.roleTitleActive]}>
                      Parking Owner
                    </Text>
                    <Text style={styles.roleDesc}>List lots & manage pricing</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Name (Register only) */}
            {tab === 'register' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="person-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your full name"
                    placeholderTextColor="#94A3B8"
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              </View>
            )}

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputBox}>
                <Ionicons name="mail-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="your.email@example.com"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Phone (Register only) */}
            {tab === 'register' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="call-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="+91 98765 43210"
                    placeholderTextColor="#94A3B8"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            )}

            {/* Password */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.inputLabel}>Password</Text>
                {tab === 'login' && (
                  <TouchableOpacity onPress={handleOpenForgotModal} activeOpacity={0.7}>
                    <Text style={styles.forgotPasswordLink}>Forgot Password?</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.inputBox}>
                <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder={tab === 'register' ? 'Min 8 chars, letters & numbers' : 'Enter password'}
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={19}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>

              {/* Real-time Password Strength Meter on Register */}
              {tab === 'register' && password.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBarRow}>
                    <View
                      style={[
                        styles.strengthBar,
                        {
                          backgroundColor:
                            calculatePasswordStrength(password).score >= 1
                              ? calculatePasswordStrength(password).color
                              : '#E2E8F0',
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.strengthBar,
                        {
                          backgroundColor:
                            calculatePasswordStrength(password).score >= 2
                              ? calculatePasswordStrength(password).color
                              : '#E2E8F0',
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.strengthBar,
                        {
                          backgroundColor:
                            calculatePasswordStrength(password).score >= 3
                              ? calculatePasswordStrength(password).color
                              : '#E2E8F0',
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.strengthLabel,
                      { color: calculatePasswordStrength(password).color },
                    ]}
                  >
                    Strength: {calculatePasswordStrength(password).label}
                  </Text>
                </View>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.submitBtnContent}>
                  <Text style={styles.submitBtnText}>
                    {tab === 'login' ? 'Sign In' : 'Create Account'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Backend Connection Status Pill */}
          <TouchableOpacity
            style={styles.connectionPill}
            onPress={() => setServerModalVisible(true)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.statusDot,
                serverStatus === 'connected'
                  ? styles.statusDotGreen
                  : serverStatus === 'offline'
                  ? styles.statusDotRed
                  : styles.statusDotYellow,
              ]}
            />
            <Text style={styles.connectionText} numberOfLines={1}>
              {serverStatus === 'connected'
                ? `Backend Online (${getApiUrl()})`
                : serverStatus === 'offline'
                ? `Backend Offline (${getApiUrl()}) - Tap to Configure`
                : `Checking ${getApiUrl()}...`}
            </Text>
            <Ionicons name="settings-outline" size={14} color="#64748B" />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ==================================================== */}
      {/* FORGOT & RESET PASSWORD MODAL                        */}
      {/* ==================================================== */}
      <Modal visible={forgotModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.forgotModalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.forgotHeaderLeft}>
                <View style={styles.keyIconBadge}>
                  <Ionicons name="key" size={20} color="#2563EB" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Reset Password</Text>
                  <Text style={styles.forgotStepIndicator}>
                    {forgotStep === 1 ? 'Step 1 of 2: Request Code' : 'Step 2 of 2: Verify & Reset'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleCloseForgotModal} style={styles.closeIconBtn}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* STEP 1: Enter Email to Get 6-Digit Code */}
            {forgotStep === 1 && (
              <View style={styles.forgotStepContent}>
                <Text style={styles.forgotInstruction}>
                  Enter your registered ParkU account email. We will issue a secure 6-digit verification code to reset your password.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Registered Email Address</Text>
                  <View style={styles.inputBox}>
                    <Ionicons name="mail-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="your.email@example.com"
                      placeholderTextColor="#94A3B8"
                      value={forgotEmail}
                      onChangeText={setForgotEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoFocus={true}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, { marginTop: 12 }]}
                  onPress={handleRequestResetCode}
                  disabled={forgotLoading}
                  activeOpacity={0.85}
                >
                  {forgotLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <View style={styles.submitBtnContent}>
                      <Text style={styles.submitBtnText}>Get Verification Code</Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 2: Enter 6-Digit Code + New Password */}
            {forgotStep === 2 && (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.forgotStepContent}>
                  {/* Verified Email Banner */}
                  <View style={styles.emailBanner}>
                    <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                    <Text style={styles.emailBannerText} numberOfLines={1}>
                      Code issued for <Text style={{ fontWeight: '700' }}>{forgotEmail}</Text>
                    </Text>
                  </View>

                  {/* Generated Code Quick Hint */}
                  {generatedCodeHint && (
                    <View style={styles.otpHintBox}>
                      <Text style={styles.otpHintLabel}>Your 6-Digit Verification Code:</Text>
                      <Text style={styles.otpHintCode}>{generatedCodeHint}</Text>
                    </View>
                  )}

                  {/* 6-Digit Code Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>6-Digit Verification Code</Text>
                    <View style={styles.inputBox}>
                      <Ionicons name="shield-checkmark-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                      <TextInput
                        style={[styles.textInput, { letterSpacing: 4, fontWeight: '700', fontSize: 16 }]}
                        placeholder="123456"
                        placeholderTextColor="#94A3B8"
                        value={forgotCode}
                        onChangeText={setForgotCode}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                    </View>
                  </View>

                  {/* New Password */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>New Password (min 8 characters)</Text>
                    <View style={styles.inputBox}>
                      <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Enter new password (min 8 chars)"
                        placeholderTextColor="#94A3B8"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showNewPassword}
                      />
                      <TouchableOpacity
                        onPress={() => setShowNewPassword(!showNewPassword)}
                        style={styles.eyeBtn}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={19}
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
                    <View style={styles.passwordLabelRow}>
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
                      <Ionicons name="shield-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
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
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={19}
                          color="#64748B"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Submit Reset Button */}
                  <TouchableOpacity
                    style={[styles.submitBtn, { marginTop: 10 }]}
                    onPress={handleResetPassword}
                    disabled={forgotLoading}
                    activeOpacity={0.85}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <View style={styles.submitBtnContent}>
                        <Text style={styles.submitBtnText}>Reset Password & Save</Text>
                        <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Resend / Change Email Link with Cooldown */}
                  <TouchableOpacity
                    style={styles.backToStep1Btn}
                    onPress={() => {
                      if (resendCooldown > 0) {
                        Alert.alert('Please Wait', `You can request another verification code in ${resendCooldown} seconds.`);
                      } else {
                        handleRequestResetCode();
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={resendCooldown > 0 ? 'time-outline' : 'refresh-outline'}
                      size={14}
                      color={resendCooldown > 0 ? '#94A3B8' : '#2563EB'}
                    />
                    <Text
                      style={[
                        styles.backToStep1Text,
                        resendCooldown > 0 && { color: '#94A3B8' },
                      ]}
                    >
                      {resendCooldown > 0
                        ? `Resend code in ${resendCooldown}s`
                        : 'Resend Verification Code'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.backToStep1Btn, { paddingTop: 0 }]}
                    onPress={() => setForgotStep(1)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="arrow-back" size={14} color="#64748B" />
                    <Text style={[styles.backToStep1Text, { color: '#64748B' }]}>
                      Change Email Address
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ==================================================== */}
      {/* BACKEND SERVER CONFIGURATION MODAL                   */}
      {/* ==================================================== */}
      <Modal visible={serverModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.serverModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Backend Connection</Text>
              <TouchableOpacity onPress={() => setServerModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Physical Android phones connect via your laptop's Wi-Fi IP address:
            </Text>

            <TextInput
              style={styles.serverInput}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://192.168.1.7:8000"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={styles.autoSetBtn}
              onPress={() => {
                setServerUrl('http://192.168.1.7:8000');
              }}
            >
              <Ionicons name="laptop-outline" size={16} color="#1D4ED8" />
              <Text style={styles.autoSetText}>Use Laptop Wi-Fi: http://192.168.1.7:8000</Text>
            </TouchableOpacity>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => pingServer(serverUrl)}
              >
                <Text style={styles.modalBtnTextSecondary}>Ping Test</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={handleSaveServerUrl}
              >
                <Text style={styles.modalBtnTextPrimary}>Save & Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  roleSection: {
    marginBottom: 18,
  },
  roleGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  roleCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#F8FAFC',
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
    marginTop: 6,
  },
  roleTitleActive: {
    color: '#2563EB',
  },
  roleDesc: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
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
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  forgotPasswordLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
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
  inputIcon: {
    marginRight: 8,
  },
  eyeBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  strengthContainer: {
    marginTop: 6,
    paddingHorizontal: 2,
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
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  connectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 18,
    gap: 6,
    alignSelf: 'center',
    maxWidth: '95%',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotGreen: {
    backgroundColor: '#16A34A',
  },
  statusDotRed: {
    backgroundColor: '#DC2626',
  },
  statusDotYellow: {
    backgroundColor: '#EAB308',
  },
  connectionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    flexShrink: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 18,
  },
  serverModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  serverInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
  },
  autoSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  autoSetText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnPrimary: {
    backgroundColor: '#2563EB',
  },
  modalBtnSecondary: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalBtnTextPrimary: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  modalBtnTextSecondary: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 14,
  },

  /* Forgot Password Modal Styles */
  forgotModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  forgotHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  keyIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  forgotStepIndicator: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  closeIconBtn: {
    padding: 6,
  },
  forgotStepContent: {
    marginTop: 6,
  },
  forgotInstruction: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 16,
  },
  emailBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 14,
  },
  emailBannerText: {
    fontSize: 12,
    color: '#166534',
    flexShrink: 1,
  },
  otpHintBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  otpHintLabel: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
  otpHintCode: {
    fontSize: 24,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 6,
    marginTop: 4,
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
  backToStep1Btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
  },
  backToStep1Text: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
});
