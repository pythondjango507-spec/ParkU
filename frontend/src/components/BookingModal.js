import React, { useState, useEffect } from 'react';
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
import { api } from '../services/api';
import { authState } from '../services/auth';

export const BookingModal = ({ visible, spot, onClose, onBookingSuccess }) => {
  // Booking Type: 'hourly' vs 'daily' (multi-day)
  const [bookingMode, setBookingMode] = useState('hourly');

  // Driver details
  const [userName, setUserName] = useState('');
  const [plate, setPlate] = useState('');

  // Hourly options
  const [hours, setHours] = useState(1);
  const [hourlyDateMode, setHourlyDateMode] = useState('today');
  const [hourlyCustomDate, setHourlyCustomDate] = useState(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('Now');
  const [customTime, setCustomTime] = useState('');
  const [isCustomTimeOpen, setIsCustomTimeOpen] = useState(false);

  // Multi-day options (From Date to To Date)
  const now = new Date();
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date(now.getTime() + 7 * 86400000)); // Default 7 days
  const [activeCalTarget, setActiveCalTarget] = useState('from'); // 'from' or 'to'
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const [loading, setLoading] = useState(false);

  // Pre-fill user details if logged in
  useEffect(() => {
    const user = authState.getUser();
    if (user && user.name) {
      setUserName(user.name);
    }
  }, [visible]);

  if (!spot) return null;

  // Hourly Date calculations
  let hourlyDateString = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  if (hourlyDateMode === 'tomorrow') {
    hourlyDateString = new Date(now.getTime() + 86400000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } else if (hourlyDateMode === 'custom') {
    hourlyDateString = hourlyCustomDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const activeTime = isCustomTimeOpen && customTime.trim() ? customTime.trim() : selectedTimeSlot;
  const timeSlots = ['Now', '09:00 AM', '11:30 AM', '02:00 PM', '04:30 PM', '07:00 PM'];

  // Multi-day calculations
  const fromDateString = fromDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const toDateString = toDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  // Calculate day difference (inclusive)
  const timeDiff = toDate.getTime() - fromDate.getTime();
  const totalDays = Math.max(1, Math.round(timeDiff / (1000 * 60 * 60 * 24)) + 1);

  const dailyRate = spot.daily_rate || 200;
  const originalMultiDayPrice = Math.round(totalDays * dailyRate);

  // Concession / Discount if >= 7 days
  const weeklyDiscountPercent = spot.weekly_discount_percent || 15;
  const isWeeklyDiscountEligible = totalDays >= 7;
  const discountAmount = isWeeklyDiscountEligible
    ? Math.round(originalMultiDayPrice * (weeklyDiscountPercent / 100))
    : 0;
  const finalMultiDayPrice = originalMultiDayPrice - discountAmount;

  // Hourly Price
  const finalHourlyPrice = Math.round(spot.hourly_rate * hours);

  // Active Price
  const finalTotal = bookingMode === 'daily' ? finalMultiDayPrice : finalHourlyPrice;

  // Calendar calculations
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day) => {
    const picked = new Date(calendarYear, calendarMonth, day);
    if (bookingMode === 'daily') {
      if (activeCalTarget === 'from') {
        setFromDate(picked);
        if (picked > toDate) {
          setToDate(new Date(picked.getTime() + 86400000));
        }
      } else {
        if (picked < fromDate) {
          Alert.alert('Invalid Range', 'End date cannot be earlier than start date');
          return;
        }
        setToDate(picked);
      }
    } else {
      setHourlyCustomDate(picked);
    }
  };

  const handleConfirm = async () => {
    if (!userName.trim()) {
      Alert.alert('Required', 'Please enter driver name');
      return;
    }
    if (!plate.trim()) {
      Alert.alert('Required', 'Please enter vehicle license plate');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        spot_id: spot.id,
        user_name: userName.trim(),
        vehicle_plate: plate.trim().toUpperCase(),
        booking_type: bookingMode,
      };

      if (bookingMode === 'daily') {
        payload.from_date = fromDateString;
        payload.to_date = toDateString;
      } else {
        payload.booking_date = hourlyDateString;
        payload.start_time = activeTime;
        payload.duration_hours = hours;
      }

      const res = await api.createBooking(payload);
      setLoading(false);

      const successMsg =
        bookingMode === 'daily'
          ? `Spot: ${spot.name}\nFrom: ${fromDateString}\nTo: ${toDateString} (${totalDays} Days)\n${isWeeklyDiscountEligible ? `🎉 Saved ₹${discountAmount} (${weeklyDiscountPercent}% Long-Stay Discount)\n` : ''}Total Paid: ₹${finalTotal}`
          : `Spot: ${spot.name}\nDate: ${hourlyDateString}\nTime: ${activeTime} (${hours} hr${hours > 1 ? 's' : ''})\nTotal Paid: ₹${finalTotal}`;

      Alert.alert('Reservation Confirmed 🎉', successMsg);
      setPlate('');
      onBookingSuccess(res);
    } catch (err) {
      setLoading(false);
      Alert.alert('Booking Error', err.message || 'Could not complete reservation');
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
            <Text style={styles.headerTitle}>Reserve Parking</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#4B5563" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Spot Header Summary */}
            <View style={styles.spotSummary}>
              <Text style={styles.spotName}>{spot.name}</Text>
              <Text style={styles.spotLocation}>{spot.location}</Text>
              <View style={styles.ratesBanner}>
                <Text style={styles.ratesBannerText}>
                  Hourly: ₹{Math.round(spot.hourly_rate)}/hr  •  Daily: ₹{Math.round(dailyRate)}/day
                </Text>
                {spot.weekly_discount_percent > 0 && (
                  <Text style={styles.discountHighlight}>
                    🏷️ {spot.weekly_discount_percent}% Concession on ≥ 7 Days!
                  </Text>
                )}
              </View>
            </View>

            {/* Mode Switcher: Hourly vs Multi-Day */}
            <View style={styles.modeSwitcher}>
              <TouchableOpacity
                style={[styles.modeBtn, bookingMode === 'hourly' && styles.modeBtnActive]}
                onPress={() => setBookingMode('hourly')}
              >
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={bookingMode === 'hourly' ? '#2563EB' : '#64748B'}
                />
                <Text style={[styles.modeText, bookingMode === 'hourly' && styles.modeTextActive]}>
                  Hourly Booking
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeBtn, bookingMode === 'daily' && styles.modeBtnActive]}
                onPress={() => setBookingMode('daily')}
              >
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={bookingMode === 'daily' ? '#2563EB' : '#64748B'}
                />
                <Text style={[styles.modeText, bookingMode === 'daily' && styles.modeTextActive]}>
                  Multi-Day (From - To)
                </Text>
              </TouchableOpacity>
            </View>

            {/* HOURLY MODE CONTROLS */}
            {bookingMode === 'hourly' && (
              <>
                <Text style={styles.label}>Select Date</Text>
                <View style={styles.row}>
                  <TouchableOpacity
                    style={[styles.dateChip, hourlyDateMode === 'today' && styles.chipActive]}
                    onPress={() => setHourlyDateMode('today')}
                  >
                    <Text style={[styles.dateLabel, hourlyDateMode === 'today' && styles.textActive]}>Today</Text>
                    <Text style={[styles.dateSub, hourlyDateMode === 'today' && styles.subActive]}>
                      {now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.dateChip, hourlyDateMode === 'tomorrow' && styles.chipActive]}
                    onPress={() => setHourlyDateMode('tomorrow')}
                  >
                    <Text style={[styles.dateLabel, hourlyDateMode === 'tomorrow' && styles.textActive]}>Tomorrow</Text>
                    <Text style={[styles.dateSub, hourlyDateMode === 'tomorrow' && styles.subActive]}>
                      {new Date(now.getTime() + 86400000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.dateChip, hourlyDateMode === 'custom' && styles.chipActive]}
                    onPress={() => setHourlyDateMode('custom')}
                  >
                    <Text style={[styles.dateLabel, hourlyDateMode === 'custom' && styles.textActive]}>Custom Date</Text>
                    <Text style={[styles.dateSub, hourlyDateMode === 'custom' && styles.subActive]}>
                      {hourlyDateMode === 'custom' ? hourlyCustomDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Calendar'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {hourlyDateMode === 'custom' && (
                  <View style={styles.calendarCard}>
                    <View style={styles.calendarHeader}>
                      <TouchableOpacity onPress={handlePrevMonth} style={styles.calNavBtn}>
                        <Ionicons name="chevron-back" size={16} color="#1E293B" />
                      </TouchableOpacity>
                      <Text style={styles.calendarTitle}>{monthNames[calendarMonth]} {calendarYear}</Text>
                      <TouchableOpacity onPress={handleNextMonth} style={styles.calNavBtn}>
                        <Ionicons name="chevron-forward" size={16} color="#1E293B" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.calendarDaysGrid}>
                      {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                        <View key={`empty-${i}`} style={styles.calendarDayCell} />
                      ))}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const isSel = hourlyCustomDate.getDate() === day && hourlyCustomDate.getMonth() === calendarMonth;
                        return (
                          <TouchableOpacity
                            key={day}
                            style={[styles.calendarDayCell, isSel && styles.calDaySelected]}
                            onPress={() => handleSelectDay(day)}
                          >
                            <Text style={[styles.calendarDayText, isSel && styles.calDayTextSelected]}>{day}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                <View style={styles.labelRow}>
                  <Text style={styles.labelNoMargin}>Arrival Time</Text>
                  <TouchableOpacity onPress={() => setIsCustomTimeOpen(!isCustomTimeOpen)}>
                    <Text style={styles.customTimeToggle}>{isCustomTimeOpen ? 'Use presets' : 'Specific time'}</Text>
                  </TouchableOpacity>
                </View>

                {isCustomTimeOpen ? (
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 02:45 PM"
                    placeholderTextColor="#9CA3AF"
                    value={customTime}
                    onChangeText={setCustomTime}
                  />
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
                    {timeSlots.map((slot) => (
                      <TouchableOpacity
                        key={slot}
                        style={[styles.timeChip, selectedTimeSlot === slot && styles.chipActive]}
                        onPress={() => setSelectedTimeSlot(slot)}
                      >
                        <Text style={[styles.timeText, selectedTimeSlot === slot && styles.textActive]}>{slot}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                <Text style={styles.label}>Duration (Hours)</Text>
                <View style={styles.row}>
                  {[1, 2, 3, 4, 8].map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[styles.hourChip, hours === h && styles.chipActive]}
                      onPress={() => setHours(h)}
                    >
                      <Text style={[styles.hourText, hours === h && styles.textActive]}>{h} hr{h > 1 ? 's' : ''}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* MULTI-DAY (FROM - TO) CONTROLS */}
            {bookingMode === 'daily' && (
              <>
                <Text style={styles.label}>Choose Reservation Dates</Text>
                <View style={styles.row}>
                  <TouchableOpacity
                    style={[styles.rangeCard, activeCalTarget === 'from' && styles.rangeCardActive]}
                    onPress={() => setActiveCalTarget('from')}
                  >
                    <Text style={styles.rangeSub}>START DATE</Text>
                    <Text style={styles.rangeVal}>{fromDateString}</Text>
                  </TouchableOpacity>

                  <View style={{ justifyContent: 'center' }}>
                    <Ionicons name="arrow-forward" size={18} color="#94A3B8" />
                  </View>

                  <TouchableOpacity
                    style={[styles.rangeCard, activeCalTarget === 'to' && styles.rangeCardActive]}
                    onPress={() => setActiveCalTarget('to')}
                  >
                    <Text style={styles.rangeSub}>END DATE</Text>
                    <Text style={styles.rangeVal}>{toDateString}</Text>
                  </TouchableOpacity>
                </View>

                {/* Interactive Calendar for Date Range */}
                <View style={styles.calendarCard}>
                  <View style={styles.calendarHeader}>
                    <TouchableOpacity onPress={handlePrevMonth} style={styles.calNavBtn}>
                      <Ionicons name="chevron-back" size={16} color="#1E293B" />
                    </TouchableOpacity>
                    <Text style={styles.calendarTitle}>
                      Pick {activeCalTarget === 'from' ? 'Start' : 'End'} Date: {monthNames[calendarMonth]} {calendarYear}
                    </Text>
                    <TouchableOpacity onPress={handleNextMonth} style={styles.calNavBtn}>
                      <Ionicons name="chevron-forward" size={16} color="#1E293B" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.calendarDaysGrid}>
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                      <View key={`empty-${i}`} style={styles.calendarDayCell} />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const cellDate = new Date(calendarYear, calendarMonth, day);
                      const isFrom = fromDate.toDateString() === cellDate.toDateString();
                      const isTo = toDate.toDateString() === cellDate.toDateString();
                      const inRange = cellDate >= fromDate && cellDate <= toDate;

                      return (
                        <TouchableOpacity
                          key={day}
                          style={[
                            styles.calendarDayCell,
                            inRange && styles.calDayInRange,
                            (isFrom || isTo) && styles.calDaySelected,
                          ]}
                          onPress={() => handleSelectDay(day)}
                        >
                          <Text
                            style={[
                              styles.calendarDayText,
                              (isFrom || isTo) && styles.calDayTextSelected,
                            ]}
                          >
                            {day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Long-Stay Weekly Concession Highlight */}
                {isWeeklyDiscountEligible ? (
                  <View style={styles.discountCelebrationBox}>
                    <Ionicons name="gift" size={20} color="#15803D" />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.discountCelebTitle}>
                        {weeklyDiscountPercent}% Long-Stay Discount Applied!
                      </Text>
                      <Text style={styles.discountCelebSub}>
                        You booked {totalDays} days. Owner discount saves you ₹{discountAmount}!
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.discountOfferTip}>
                    <Ionicons name="sparkles" size={16} color="#B45309" />
                    <Text style={styles.discountOfferText}>
                      Tip: Book 7 days or more to unlock {weeklyDiscountPercent}% off! ({7 - totalDays} more day{7 - totalDays > 1 ? 's' : ''} needed)
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* DRIVER & VEHICLE DETAILS */}
            <Text style={styles.label}>Driver Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ramesh Kumar"
              placeholderTextColor="#9CA3AF"
              value={userName}
              onChangeText={setUserName}
            />

            <Text style={styles.label}>Vehicle License Plate</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. KA 03 AB 1234"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
              value={plate}
              onChangeText={setPlate}
            />

            {/* Price Breakdown Box */}
            <View style={styles.totalBox}>
              <View style={styles.totalRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryDate}>
                    {bookingMode === 'daily'
                      ? `${totalDays} Days (${fromDateString} - ${toDateString})`
                      : `${hourlyDateString} • ${activeTime} (${hours} hrs)`}
                  </Text>
                  <Text style={styles.calculationText}>
                    {bookingMode === 'daily'
                      ? `₹${dailyRate}/day × ${totalDays} days ${isWeeklyDiscountEligible ? `- ₹${discountAmount} discount` : ''}`
                      : `₹${Math.round(spot.hourly_rate)}/hr × ${hours} hr${hours > 1 ? 's' : ''}`}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {isWeeklyDiscountEligible && (
                    <Text style={styles.strikethroughPrice}>₹{originalMultiDayPrice}</Text>
                  )}
                  <Text style={styles.totalLabel}>Total Payable</Text>
                  <Text style={styles.totalValue}>₹{finalTotal}</Text>
                </View>
              </View>
            </View>

            {/* Confirm Button */}
            <TouchableOpacity
              style={[styles.confirmBtn, loading && styles.disabledBtn]}
              onPress={handleConfirm}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmText}>Confirm & Reserve Spot</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 26 }} />
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
    maxHeight: '94%',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
  spotSummary: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  ratesBanner: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  ratesBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  discountHighlight: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
    marginTop: 2,
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9,
    gap: 6,
  },
  modeBtnActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  modeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  modeTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  labelNoMargin: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  customTimeToggle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  dateChip: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  textActive: {
    color: '#FFFFFF',
  },
  subActive: {
    color: '#E0E7FF',
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  dateSub: {
    fontSize: 10,
    color: '#64748B',
  },
  hourChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  hourText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  timeChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  scrollRow: {
    marginBottom: 4,
  },
  rangeCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rangeCardActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  rangeSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  rangeVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  calendarCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calendarTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  calNavBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  calendarDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayCell: {
    width: '14.28%',
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    marginVertical: 1,
  },
  calendarDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  calDaySelected: {
    backgroundColor: '#2563EB',
  },
  calDayInRange: {
    backgroundColor: '#DBEAFE',
  },
  calDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  discountCelebrationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  discountCelebTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
  },
  discountCelebSub: {
    fontSize: 11,
    color: '#166534',
    marginTop: 1,
  },
  discountOfferTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 8,
    marginTop: 8,
    gap: 6,
  },
  discountOfferText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
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
  },
  totalBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
  },
  calculationText: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 2,
  },
  strikethroughPrice: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E40AF',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  confirmBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  disabledBtn: {
    backgroundColor: '#93C5FD',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
