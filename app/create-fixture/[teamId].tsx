
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedPost, authenticatedGet } from '@/utils/api';

export default function CreateFixtureScreen() {
  const router = useRouter();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  
  const [opponent, setOpponent] = useState('');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  console.log('CreateFixtureScreen: Rendering create fixture', { teamId });

  const fetchCompetitions = useCallback(async () => {
    console.log('Fetching competitions for team:', teamId);
    setLoading(true);

    try {
      const data = await authenticatedGet(`/api/competitions?teamId=${teamId}`);
      console.log('Competitions fetched:', data);
      setCompetitions(data);
      if (data.length > 0) {
        setSelectedCompetition(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch competitions:', error);
      // Continue without competitions - user can still create fixture
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchCompetitions();
  }, [fetchCompetitions]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(date);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setDate(newDate);
      console.log('Date changed:', newDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(date);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setDate(newDate);
      console.log('Time changed:', newDate);
    }
  };

  const validateForm = () => {
    if (!opponent.trim()) {
      Alert.alert('Validation Error', 'Opponent name is required');
      return false;
    }

    return true;
  };

  const handleCreateFixture = async () => {
    console.log('User tapped Create Fixture button');

    if (!validateForm()) {
      return;
    }

    // Check if date is in the past and warn user
    const now = new Date();
    if (date < now) {
      Alert.alert(
        'Date Warning',
        'The selected date is in the past. Do you want to continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => submitFixture('scheduled') },
        ]
      );
      return;
    }

    await submitFixture('scheduled');
  };

  const submitFixture = async (status: 'scheduled' | 'draft') => {

    console.log(`Submitting fixture with status: ${status}`);
    setSaving(true);

    try {
      const payload = {
        teamId,
        opponent: opponent.trim(),
        venue: venue.trim() || undefined,
        date: date.toISOString(),
        competitionId: selectedCompetition || undefined,
        status,
      };

      console.log('Creating fixture:', payload);
      const result = await authenticatedPost('/api/fixtures', payload);
      console.log('Fixture created:', result);

      const successMessage = status === 'draft' ? 'Fixture saved as draft' : 'Fixture created successfully';
      Alert.alert('Success', successMessage, [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Failed to create fixture:', error);
      Alert.alert('Error', 'Failed to create fixture. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    console.log('User tapped Save as Draft button');

    if (!validateForm()) {
      return;
    }

    await submitFixture('draft');
  };

  const dateStr = date.toLocaleDateString();
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Create Fixture',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Opponent <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={opponent}
              onChangeText={setOpponent}
              placeholder="Enter opponent name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Venue</Text>
            <TextInput
              style={styles.input}
              value={venue}
              onChangeText={setVenue}
              placeholder="Enter venue (optional)"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Date <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="event"
                size={20}
                color="#000"
              />
              <Text style={styles.dateButtonText}>{dateStr}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Time <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowTimePicker(true)}
            >
              <IconSymbol
                ios_icon_name="clock"
                android_material_icon_name="access-time"
                size={20}
                color="#000"
              />
              <Text style={styles.dateButtonText}>{timeStr}</Text>
            </TouchableOpacity>
          </View>

          {competitions.length > 0 && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Competition</Text>
              <View style={styles.competitionsList}>
                {competitions.map((comp) => (
                  <TouchableOpacity
                    key={comp.id}
                    style={[
                      styles.competitionChip,
                      selectedCompetition === comp.id && styles.competitionChipActive,
                    ]}
                    onPress={() => {
                      console.log('Selected competition:', comp.name);
                      setSelectedCompetition(comp.id);
                    }}
                  >
                    <Text
                      style={[
                        styles.competitionChipText,
                        selectedCompetition === comp.id && styles.competitionChipTextActive,
                      ]}
                    >
                      {comp.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleCreateFixture}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Fixture</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleSaveDraft}
              disabled={saving}
            >
              <Text style={styles.secondaryButtonText}>Save as Draft</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={date}
            mode="time"
            display="default"
            onChange={handleTimeChange}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  required: {
    color: '#dc3545',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#000',
  },
  competitionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  competitionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  competitionChipActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  competitionChipText: {
    fontSize: 14,
    color: '#000',
  },
  competitionChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonGroup: {
    gap: 12,
    marginTop: 24,
  },
  primaryButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
