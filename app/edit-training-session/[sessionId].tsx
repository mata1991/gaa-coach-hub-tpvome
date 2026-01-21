
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedPut } from '@/utils/api';
import { colors } from '@/styles/commonStyles';
import { TrainingSession } from '@/types';

export default function EditTrainingSessionScreen() {
  const router = useRouter();
  const { sessionId, teamId } = useLocalSearchParams<{ sessionId: string; teamId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState<TrainingSession | null>(null);
  
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [location, setLocation] = useState('');
  const [focus, setFocus] = useState('');
  const [notes, setNotes] = useState('');

  console.log('[EditTrainingSession] Rendering edit training session screen', { sessionId, teamId });

  const fetchSession = useCallback(async () => {
    console.log('[EditTrainingSession] Fetching session data');
    setLoading(true);

    try {
      const sessionData = await authenticatedGet<TrainingSession>(`/api/training-sessions/${sessionId}`);
      console.log('[EditTrainingSession] Session data fetched:', sessionData);
      
      setSession(sessionData);
      
      const sessionDateTime = new Date(sessionData.dateTime);
      setDate(sessionDateTime);
      setTime(sessionDateTime);
      setLocation(sessionData.location || '');
      setFocus(sessionData.focus || '');
      setNotes(sessionData.notes || '');
    } catch (error) {
      console.error('[EditTrainingSession] Failed to fetch session:', error);
      Alert.alert('Error', 'Failed to load training session data');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    console.log('[EditTrainingSession] Date changed:', selectedDate);
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    console.log('[EditTrainingSession] Time changed:', selectedTime);
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  const validateForm = (): boolean => {
    console.log('[EditTrainingSession] Validating form');
    
    if (!date) {
      Alert.alert('Validation Error', 'Date is required');
      return false;
    }
    
    if (!time) {
      Alert.alert('Validation Error', 'Time is required');
      return false;
    }
    
    return true;
  };

  const handleSaveSession = async () => {
    console.log('[EditTrainingSession] User tapped Save button');
    
    if (!validateForm()) {
      return;
    }
    
    // Combine date and time
    const combinedDateTime = new Date(date);
    combinedDateTime.setHours(time.getHours());
    combinedDateTime.setMinutes(time.getMinutes());
    combinedDateTime.setSeconds(0);
    combinedDateTime.setMilliseconds(0);
    
    console.log('[EditTrainingSession] Combined date/time:', combinedDateTime.toISOString());
    
    setSaving(true);
    
    try {
      const payload = {
        dateTime: combinedDateTime.toISOString(),
        location: location.trim() || undefined,
        focus: focus.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      
      console.log('[EditTrainingSession] Updating session with payload:', payload);
      
      const updatedSession = await authenticatedPut(`/api/training-sessions/${sessionId}`, payload);
      
      console.log('[EditTrainingSession] Session updated:', updatedSession.id);
      
      Alert.alert('Success', 'Training session updated successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('[EditTrainingSession] Failed to update session:', error);
      const errorMsg = error?.message || 'Failed to update training session. Please try again.';
      Alert.alert('Error', errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Edit Training Session', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dateStr = date.toLocaleDateString();
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Edit Training Session',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.description}>
            Update training session details
          </Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>
                Date <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  console.log('[EditTrainingSession] Date button pressed');
                  setShowDatePicker(true);
                }}
                disabled={saving}
              >
                <IconSymbol
                  ios_icon_name="calendar"
                  android_material_icon_name="event"
                  size={20}
                  color={colors.text}
                />
                <Text style={styles.dateButtonText}>{dateStr}</Text>
                <IconSymbol
                  ios_icon_name="chevron.down"
                  android_material_icon_name="arrow-drop-down"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                />
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Time <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  console.log('[EditTrainingSession] Time button pressed');
                  setShowTimePicker(true);
                }}
                disabled={saving}
              >
                <IconSymbol
                  ios_icon_name="clock"
                  android_material_icon_name="access-time"
                  size={20}
                  color={colors.text}
                />
                <Text style={styles.dateButtonText}>{timeStr}</Text>
                <IconSymbol
                  ios_icon_name="chevron.down"
                  android_material_icon_name="arrow-drop-down"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={time}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                  is24Hour={false}
                />
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Location (Optional)</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g., Training Ground"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                editable={!saving}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Focus (Optional)</Text>
              <TextInput
                style={styles.input}
                value={focus}
                onChangeText={setFocus}
                placeholder="e.g., Puckout drills, Fitness"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="sentences"
                editable={!saving}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional notes about the session"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="sentences"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!saving}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSaveSession}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={24}
                  color="#fff"
                />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  content: {
    padding: 24,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  form: {
    gap: 20,
    marginBottom: 32,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  required: {
    color: colors.error,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    minHeight: 100,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});
