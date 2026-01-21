
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
import { authenticatedGet, authenticatedPut, authenticatedDelete } from '@/utils/api';
import { Fixture } from '@/types';

export default function EditFixtureScreen() {
  const router = useRouter();
  const { fixtureId, teamId } = useLocalSearchParams<{ fixtureId: string; teamId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fixture, setFixture] = useState<Fixture | null>(null);
  
  const [opponent, setOpponent] = useState('');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<string>('');

  console.log('[EditFixture] Rendering edit fixture screen', { fixtureId, teamId });

  const fetchData = useCallback(async () => {
    console.log('[EditFixture] Fetching fixture data');
    setLoading(true);

    try {
      // Fetch fixture details
      const fixtureData = await authenticatedGet<Fixture>(`/api/fixtures/${fixtureId}`);
      console.log('[EditFixture] Fixture data fetched:', fixtureData);
      
      setFixture(fixtureData);
      setOpponent(fixtureData.opponent || '');
      setVenue(fixtureData.venue || '');
      setDate(new Date(fixtureData.date));
      setSelectedCompetition(fixtureData.competitionId || '');

      // Fetch competitions
      try {
        const competitionsData = await authenticatedGet(`/api/competitions?teamId=${teamId}`);
        console.log('[EditFixture] Competitions fetched:', competitionsData.length);
        setCompetitions(competitionsData);
      } catch (error) {
        console.error('[EditFixture] Failed to fetch competitions:', error);
        // Continue without competitions
      }
    } catch (error) {
      console.error('[EditFixture] Failed to fetch fixture:', error);
      Alert.alert('Error', 'Failed to load fixture data');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [fixtureId, teamId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(date);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setDate(newDate);
      console.log('[EditFixture] Date changed:', newDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(date);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setDate(newDate);
      console.log('[EditFixture] Time changed:', newDate);
    }
  };

  const validateForm = () => {
    if (!opponent.trim()) {
      Alert.alert('Validation Error', 'Opponent name is required');
      return false;
    }

    return true;
  };

  const handleSaveFixture = async () => {
    console.log('[EditFixture] User tapped Save button');

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const payload = {
        opponent: opponent.trim(),
        venue: venue.trim() || undefined,
        date: date.toISOString(),
        competitionId: selectedCompetition || undefined,
      };

      console.log('[EditFixture] Updating fixture:', payload);
      const updatedFixture = await authenticatedPut(`/api/fixtures/${fixtureId}`, payload);
      console.log('[EditFixture] Fixture updated:', updatedFixture);

      Alert.alert('Success', 'Fixture updated successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('[EditFixture] Failed to update fixture:', error);
      Alert.alert('Error', 'Failed to update fixture. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFixture = () => {
    console.log('[EditFixture] User tapped Delete Fixture button');
    Alert.alert(
      'Delete Fixture',
      `Are you sure you want to delete the fixture against ${opponent}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('[EditFixture] Deleting fixture:', fixtureId);
            setSaving(true);
            
            try {
              await authenticatedDelete(`/api/fixtures/${fixtureId}`);
              console.log('[EditFixture] Fixture deleted successfully');
              
              // Navigate back to team dashboard with success message
              Alert.alert('Success', 'Fixture deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => {
                    // Navigate back to team dashboard
                    if (router.canGoBack()) {
                      router.back();
                    } else {
                      router.replace({
                        pathname: '/team-dashboard/[teamId]',
                        params: { teamId },
                      });
                    }
                  },
                },
              ]);
            } catch (error) {
              console.error('[EditFixture] Failed to delete fixture:', error);
              Alert.alert('Error', 'Failed to delete fixture. Please try again.');
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Edit Fixture', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading fixture...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dateStr = date.toLocaleDateString();
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Edit Fixture',
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
              editable={!saving}
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
              editable={!saving}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Date <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
              disabled={saving}
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
              disabled={saving}
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
                      console.log('[EditFixture] Selected competition:', comp.name);
                      setSelectedCompetition(comp.id);
                    }}
                    disabled={saving}
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
              onPress={handleSaveFixture}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteFixture}
              disabled={saving}
            >
              <IconSymbol
                ios_icon_name="trash"
                android_material_icon_name="delete"
                size={20}
                color="#dc3545"
              />
              <Text style={styles.deleteButtonText}>Delete Fixture</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    padding: 16,
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dc3545',
    paddingVertical: 16,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#dc3545',
    fontSize: 16,
    fontWeight: '600',
  },
});
