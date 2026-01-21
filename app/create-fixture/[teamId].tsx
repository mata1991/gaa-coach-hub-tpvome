
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
  Modal,
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
  const [tempDate, setTempDate] = useState(new Date());
  const [tempTime, setTempTime] = useState(new Date());
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
    if (Platform.OS === 'android' && event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }
    
    if (selectedDate) {
      setTempDate(selectedDate);
      console.log('Temp date changed:', selectedDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android' && event.type === 'dismissed') {
      setShowTimePicker(false);
      return;
    }
    
    if (selectedTime) {
      setTempTime(selectedTime);
      console.log('Temp time changed:', selectedTime);
    }
  };

  const confirmDateSelection = () => {
    const newDate = new Date(date);
    newDate.setFullYear(tempDate.getFullYear());
    newDate.setMonth(tempDate.getMonth());
    newDate.setDate(tempDate.getDate());
    setDate(newDate);
    setShowDatePicker(false);
    console.log('Date confirmed:', newDate);
  };

  const confirmTimeSelection = () => {
    const newDate = new Date(date);
    newDate.setHours(tempTime.getHours());
    newDate.setMinutes(tempTime.getMinutes());
    setDate(newDate);
    setShowTimePicker(false);
    console.log('Time confirmed:', newDate);
  };

  const cancelDateSelection = () => {
    setTempDate(date);
    setShowDatePicker(false);
    console.log('Date selection cancelled');
  };

  const cancelTimeSelection = () => {
    setTempTime(date);
    setShowTimePicker(false);
    console.log('Time selection cancelled');
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
              onPress={() => {
                setTempDate(date);
                setShowDatePicker(true);
              }}
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
              onPress={() => {
                setTempTime(date);
                setShowTimePicker(true);
              }}
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

        {/* Date Picker Modal */}
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={cancelDateSelection}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1}
            onPress={cancelDateSelection}
          >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date</Text>
              </View>
              
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  style={styles.picker}
                />
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={cancelDateSelection}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                  onPress={confirmDateSelection}
                >
                  <Text style={styles.modalButtonTextConfirm}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Time Picker Modal */}
        <Modal
          visible={showTimePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={cancelTimeSelection}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1}
            onPress={cancelTimeSelection}
          >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Time</Text>
              </View>
              
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={tempTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                  style={styles.picker}
                />
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={cancelTimeSelection}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                  onPress={confirmTimeSelection}
                >
                  <Text style={styles.modalButtonTextConfirm}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    minHeight: 300,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  pickerContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  picker: {
    width: '100%',
    height: 200,
  },
  modalButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalButtonConfirm: {
    backgroundColor: '#000',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  modalButtonTextConfirm: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
