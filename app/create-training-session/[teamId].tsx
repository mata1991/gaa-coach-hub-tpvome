
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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedPost } from '@/utils/api';
import { colors } from '@/styles/commonStyles';

export default function CreateTrainingSessionScreen() {
  const router = useRouter();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [location, setLocation] = useState('');
  const [focus, setFocus] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  console.log('[CreateTrainingSession] Rendering create training session form', { teamId });

  const handleDateChange = (event: any, selectedDate?: Date) => {
    console.log('[CreateTrainingSession] Date changed:', selectedDate);
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    console.log('[CreateTrainingSession] Time changed:', selectedTime);
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  const handleCreateSession = async () => {
    console.log('[CreateTrainingSession] User tapped Create Session');
    
    // Combine date and time
    const combinedDateTime = new Date(date);
    combinedDateTime.setHours(time.getHours());
    combinedDateTime.setMinutes(time.getMinutes());
    combinedDateTime.setSeconds(0);
    combinedDateTime.setMilliseconds(0);
    
    console.log('[CreateTrainingSession] Combined date/time:', combinedDateTime.toISOString());
    
    setLoading(true);
    
    try {
      const payload = {
        teamId,
        dateTime: combinedDateTime.toISOString(),
        location: location.trim() || undefined,
        focus: focus.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      
      console.log('[CreateTrainingSession] Creating session with payload:', payload);
      
      const session = await authenticatedPost('/api/training-sessions', payload);
      
      console.log('[CreateTrainingSession] Session created:', session.id);
      
      // Navigate to attendance screen
      router.replace({
        pathname: '/training-attendance/[sessionId]',
        params: { sessionId: session.id, teamId },
      });
    } catch (error) {
      console.error('[CreateTrainingSession] Failed to create session:', error);
      Alert.alert('Error', 'Failed to create training session');
    } finally {
      setLoading(false);
    }
  };

  const dateStr = date.toLocaleDateString();
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Create Training Session',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.description}>
            Create a new training session and track attendance
          </Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Date *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <IconSymbol
                  ios_icon_name="calendar"
                  android_material_icon_name="event"
                  size={20}
                  color={colors.text}
                />
                <Text style={styles.dateButtonText}>{dateStr}</Text>
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
              <Text style={styles.label}>Time *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowTimePicker(true)}
              >
                <IconSymbol
                  ios_icon_name="clock"
                  android_material_icon_name="access-time"
                  size={20}
                  color={colors.text}
                />
                <Text style={styles.dateButtonText}>{timeStr}</Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={time}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
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
                editable={!loading}
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
                editable={!loading}
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
                editable={!loading}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            onPress={handleCreateSession}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={24}
                  color="#fff"
                />
                <Text style={styles.createButtonText}>Create & Set Attendance</Text>
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});
