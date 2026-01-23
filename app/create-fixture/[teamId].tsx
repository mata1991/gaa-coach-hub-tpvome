
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
  Image,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedPost, authenticatedGet } from '@/utils/api';

// Helper to resolve image sources (handles both local require() and remote URLs)
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

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

  const handleImageUpload = async (type: 'homeCrest' | 'awayCrest' | 'homeJersey' | 'awayJersey') => {
    console.log(`[CreateFixture] User tapped upload ${type}`);
    
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
        console.log('[CreateFixture] Image picker canceled');
        return;
      }

      const imageUri = result.assets[0].uri;
      console.log('[CreateFixture] Image selected:', imageUri);

      // Set uploading state
      if (type === 'homeCrest') setUploadingHomeCrest(true);
      else if (type === 'awayCrest') setUploadingAwayCrest(true);
      else if (type === 'homeJersey') setUploadingHomeJersey(true);
      else if (type === 'awayJersey') setUploadingAwayJersey(true);

      // Prepare file object
      const filename = imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const fileType = match ? `image/${match[1]}` : 'image/jpeg';

      const file = {
        uri: imageUri,
        name: filename,
        type: fileType,
      };

      // Use centralized authenticated upload
      const { authenticatedUpload } = await import('@/utils/api');
      const uploadResult = await authenticatedUpload<{ url: string }>('/api/upload/image', file);
      
      console.log('[CreateFixture] Upload successful:', uploadResult);

      // Update state with uploaded URL
      if (type === 'homeCrest') setHomeCrestImageUrl(uploadResult.url);
      else if (type === 'awayCrest') setAwayCrestImageUrl(uploadResult.url);
      else if (type === 'homeJersey') setHomeJerseyImageUrl(uploadResult.url);
      else if (type === 'awayJersey') setAwayJerseyImageUrl(uploadResult.url);

      Alert.alert('Success', 'Image uploaded successfully');
    } catch (error: any) {
      console.error('[CreateFixture] Image upload failed:', error);
      console.error('[CreateFixture] Error code:', error?.code);
      console.error('[CreateFixture] Error status:', error?.status);
      
      // Handle specific error cases
      if (error?.code === 'AUTH_TOKEN_MISSING' || error?.code === 'AUTH_EXPIRED') {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [
            {
              text: 'OK',
              onPress: () => {
                router.replace('/auth');
              },
            },
          ]
        );
      } else {
        Alert.alert('Upload Failed', 'Failed to upload image. Please check your connection and try again.');
      }
    } finally {
      // Clear uploading state
      if (type === 'homeCrest') setUploadingHomeCrest(false);
      else if (type === 'awayCrest') setUploadingAwayCrest(false);
      else if (type === 'homeJersey') setUploadingHomeJersey(false);
      else if (type === 'awayJersey') setUploadingAwayJersey(false);
    }
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
        homeTeamName: homeTeamName.trim() || undefined,
        homeCrestImageUrl: homeCrestImageUrl || undefined,
        homeColours: homeColours.trim() || undefined,
        homeJerseyImageUrl: homeJerseyImageUrl || undefined,
        awayTeamName: awayTeamName.trim() || undefined,
        awayCrestImageUrl: awayCrestImageUrl || undefined,
        awayColours: awayColours.trim() || undefined,
        awayJerseyImageUrl: awayJerseyImageUrl || undefined,
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
            />
          </View>

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
