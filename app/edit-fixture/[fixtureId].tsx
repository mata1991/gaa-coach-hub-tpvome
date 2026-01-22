
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
  Image,
  ImageSourcePropType,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedPut, authenticatedDelete } from '@/utils/api';
import { Fixture } from '@/types';
import Constants from 'expo-constants';

// Helper to resolve image sources (handles both local require() and remote URLs)
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

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
  const [tempDate, setTempDate] = useState(new Date());
  const [tempTime, setTempTime] = useState(new Date());
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<string>('');
  
  // Home team customization
  const [homeTeamName, setHomeTeamName] = useState('');
  const [homeCrestImageUrl, setHomeCrestImageUrl] = useState('');
  const [homeColours, setHomeColours] = useState('');
  const [homeJerseyImageUrl, setHomeJerseyImageUrl] = useState('');
  
  // Away team customization
  const [awayTeamName, setAwayTeamName] = useState('');
  const [awayCrestImageUrl, setAwayCrestImageUrl] = useState('');
  const [awayColours, setAwayColours] = useState('');
  const [awayJerseyImageUrl, setAwayJerseyImageUrl] = useState('');
  
  // Upload states
  const [uploadingHomeCrest, setUploadingHomeCrest] = useState(false);
  const [uploadingAwayCrest, setUploadingAwayCrest] = useState(false);
  const [uploadingHomeJersey, setUploadingHomeJersey] = useState(false);
  const [uploadingAwayJersey, setUploadingAwayJersey] = useState(false);

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
      
      // Set home/away team customization
      setHomeTeamName(fixtureData.homeTeamName || '');
      setHomeCrestImageUrl(fixtureData.homeCrestImageUrl || '');
      setHomeColours(fixtureData.homeColours || '');
      setHomeJerseyImageUrl(fixtureData.homeJerseyImageUrl || '');
      setAwayTeamName(fixtureData.awayTeamName || '');
      setAwayCrestImageUrl(fixtureData.awayCrestImageUrl || '');
      setAwayColours(fixtureData.awayColours || '');
      setAwayJerseyImageUrl(fixtureData.awayJerseyImageUrl || '');

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
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (selectedTime) {
      setTempTime(selectedTime);
    }
  };

  const confirmDateSelection = () => {
    const newDate = new Date(date);
    newDate.setFullYear(tempDate.getFullYear());
    newDate.setMonth(tempDate.getMonth());
    newDate.setDate(tempDate.getDate());
    setDate(newDate);
    setShowDatePicker(false);
    console.log('[EditFixture] Date confirmed:', newDate);
  };

  const confirmTimeSelection = () => {
    const newDate = new Date(date);
    newDate.setHours(tempTime.getHours());
    newDate.setMinutes(tempTime.getMinutes());
    setDate(newDate);
    setShowTimePicker(false);
    console.log('[EditFixture] Time confirmed:', newDate);
  };

  const cancelDateSelection = () => {
    setShowDatePicker(false);
    setTempDate(date);
  };

  const cancelTimeSelection = () => {
    setShowTimePicker(false);
    setTempTime(date);
  };

  const validateForm = () => {
    if (!opponent.trim()) {
      Alert.alert('Validation Error', 'Opponent name is required');
      return false;
    }

    return true;
  };

  const handleImageUpload = async (type: 'homeCrest' | 'awayCrest' | 'homeJersey' | 'awayJersey') => {
    console.log(`[EditFixture] User tapped upload ${type}`);
    
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) {
        console.log('[EditFixture] Image picker canceled');
        return;
      }

      const imageUri = result.assets[0].uri;
      console.log('[EditFixture] Image selected:', imageUri);

      // Set uploading state
      if (type === 'homeCrest') setUploadingHomeCrest(true);
      else if (type === 'awayCrest') setUploadingAwayCrest(true);
      else if (type === 'homeJersey') setUploadingHomeJersey(true);
      else if (type === 'awayJersey') setUploadingAwayJersey(true);

      // Upload to backend with authentication
      const backendUrl = Constants.expoConfig?.extra?.backendUrl;
      if (!backendUrl) {
        throw new Error('Backend URL not configured');
      }

      // Get auth token
      const { authClient } = await import('@/lib/auth');
      const session = await authClient.getSession();
      const token = session?.data?.session?.token;

      if (!token) {
        console.error('[EditFixture] No auth token found');
        Alert.alert('Session Expired', 'Your session has expired. Please log in again.');
        return;
      }

      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const fileType = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('image', {
        uri: imageUri,
        name: filename,
        type: fileType,
      } as any);

      console.log('[EditFixture] Uploading to:', `${backendUrl}/api/upload/image`);
      const response = await fetch(`${backendUrl}/api/upload/image`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('[EditFixture] Upload response status:', response.status);

      if (response.status === 401 || response.status === 403) {
        console.error('[EditFixture] Authentication failed during upload');
        Alert.alert('Session Expired', 'Your session has expired. Please log in again.');
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[EditFixture] Upload failed:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status}`);
      }

      const uploadResult = await response.json();
      console.log('[EditFixture] Upload successful:', uploadResult);

      // Update state with uploaded URL
      if (type === 'homeCrest') setHomeCrestImageUrl(uploadResult.url);
      else if (type === 'awayCrest') setAwayCrestImageUrl(uploadResult.url);
      else if (type === 'homeJersey') setHomeJerseyImageUrl(uploadResult.url);
      else if (type === 'awayJersey') setAwayJerseyImageUrl(uploadResult.url);

      Alert.alert('Success', 'Image uploaded successfully');
    } catch (error) {
      console.error('[EditFixture] Image upload failed:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      // Clear uploading state
      if (type === 'homeCrest') setUploadingHomeCrest(false);
      else if (type === 'awayCrest') setUploadingAwayCrest(false);
      else if (type === 'homeJersey') setUploadingHomeJersey(false);
      else if (type === 'awayJersey') setUploadingAwayJersey(false);
    }
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
        homeTeamName: homeTeamName.trim() || undefined,
        homeCrestImageUrl: homeCrestImageUrl || undefined,
        homeColours: homeColours.trim() || undefined,
        homeJerseyImageUrl: homeJerseyImageUrl || undefined,
        awayTeamName: awayTeamName.trim() || undefined,
        awayCrestImageUrl: awayCrestImageUrl || undefined,
        awayColours: awayColours.trim() || undefined,
        awayJerseyImageUrl: awayJerseyImageUrl || undefined,
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
              onPress={() => {
                setTempDate(date);
                setShowDatePicker(true);
              }}
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
              onPress={() => {
                setTempTime(date);
                setShowTimePicker(true);
              }}
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

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Home Team Customization (Optional)</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Home Team Name</Text>
            <TextInput
              style={styles.input}
              value={homeTeamName}
              onChangeText={setHomeTeamName}
              placeholder="e.g., Your Club Name"
              placeholderTextColor="#999"
              editable={!saving}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Upload Home Crest</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => handleImageUpload('homeCrest')}
              disabled={saving || uploadingHomeCrest}
            >
              {uploadingHomeCrest ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <IconSymbol
                    ios_icon_name="photo"
                    android_material_icon_name="image"
                    size={24}
                    color="#000"
                  />
                  <Text style={styles.uploadButtonText}>
                    {homeCrestImageUrl ? 'Change Crest' : 'Upload Crest'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {homeCrestImageUrl && (
              <View style={styles.imagePreview}>
                <Image
                  source={resolveImageSource(homeCrestImageUrl)}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setHomeCrestImageUrl('')}
                >
                  <IconSymbol
                    ios_icon_name="xmark.circle.fill"
                    android_material_icon_name="cancel"
                    size={24}
                    color="#dc3545"
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Upload Home Jersey</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => handleImageUpload('homeJersey')}
              disabled={saving || uploadingHomeJersey}
            >
              {uploadingHomeJersey ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <IconSymbol
                    ios_icon_name="photo"
                    android_material_icon_name="image"
                    size={24}
                    color="#000"
                  />
                  <Text style={styles.uploadButtonText}>
                    {homeJerseyImageUrl ? 'Change Jersey' : 'Upload Jersey'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {homeJerseyImageUrl && (
              <View style={styles.imagePreview}>
                <Image
                  source={resolveImageSource(homeJerseyImageUrl)}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setHomeJerseyImageUrl('')}
                >
                  <IconSymbol
                    ios_icon_name="xmark.circle.fill"
                    android_material_icon_name="cancel"
                    size={24}
                    color="#dc3545"
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Home Team Colours</Text>
            <TextInput
              style={styles.input}
              value={homeColours}
              onChangeText={setHomeColours}
              placeholder="e.g., Blue and Gold"
              placeholderTextColor="#999"
              editable={!saving}
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Away Team Customization (Optional)</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Away Team Name</Text>
            <TextInput
              style={styles.input}
              value={awayTeamName}
              onChangeText={setAwayTeamName}
              placeholder="e.g., Opponent Club Name"
              placeholderTextColor="#999"
              editable={!saving}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Upload Away Crest</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => handleImageUpload('awayCrest')}
              disabled={saving || uploadingAwayCrest}
            >
              {uploadingAwayCrest ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <IconSymbol
                    ios_icon_name="photo"
                    android_material_icon_name="image"
                    size={24}
                    color="#000"
                  />
                  <Text style={styles.uploadButtonText}>
                    {awayCrestImageUrl ? 'Change Crest' : 'Upload Crest'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {awayCrestImageUrl && (
              <View style={styles.imagePreview}>
                <Image
                  source={resolveImageSource(awayCrestImageUrl)}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setAwayCrestImageUrl('')}
                >
                  <IconSymbol
                    ios_icon_name="xmark.circle.fill"
                    android_material_icon_name="cancel"
                    size={24}
                    color="#dc3545"
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Upload Away Jersey</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => handleImageUpload('awayJersey')}
              disabled={saving || uploadingAwayJersey}
            >
              {uploadingAwayJersey ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <IconSymbol
                    ios_icon_name="photo"
                    android_material_icon_name="image"
                    size={24}
                    color="#000"
                  />
                  <Text style={styles.uploadButtonText}>
                    {awayJerseyImageUrl ? 'Change Jersey' : 'Upload Jersey'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {awayJerseyImageUrl && (
              <View style={styles.imagePreview}>
                <Image
                  source={resolveImageSource(awayJerseyImageUrl)}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setAwayJerseyImageUrl('')}
                >
                  <IconSymbol
                    ios_icon_name="xmark.circle.fill"
                    android_material_icon_name="cancel"
                    size={24}
                    color="#dc3545"
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Away Team Colours</Text>
            <TextInput
              style={styles.input}
              value={awayColours}
              onChangeText={setAwayColours}
              placeholder="e.g., Red and White"
              placeholderTextColor="#999"
              editable={!saving}
            />
          </View>

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

        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={cancelDateSelection}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date</Text>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                style={styles.picker}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={cancelDateSelection}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={confirmDateSelection}
                >
                  <Text style={styles.modalConfirmButtonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showTimePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={cancelTimeSelection}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Time</Text>
              </View>
              <DateTimePicker
                value={tempTime}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                style={styles.picker}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={cancelTimeSelection}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={confirmTimeSelection}
                >
                  <Text style={styles.modalConfirmButtonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
  sectionHeader: {
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
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
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  imagePreview: {
    marginTop: 12,
    alignItems: 'center',
    position: 'relative',
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: '35%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  picker: {
    width: '100%',
    height: 200,
  },
  modalButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalCancelButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalConfirmButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#000',
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
