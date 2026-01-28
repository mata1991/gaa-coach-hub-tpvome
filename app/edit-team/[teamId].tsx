
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
  Image,
  ImageSourcePropType,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedPut, authenticatedUpload, authenticatedDelete } from '@/utils/api';
import { Team } from '@/types';
import { validateHexColor } from '@/utils/colorParser';

// Helper to resolve image sources (handles both local and remote)
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

const SPORTS = ['Hurling', 'Camogie', 'Gaelic Football', 'Ladies Gaelic Football'];
const GRADES = ['Senior', 'Intermediate', 'Junior', 'Youth'];

// Common GAA club color presets
const COLOR_PRESETS = [
  { name: 'Green & Gold', primary: '#0F8A3B', secondary: '#F4C542' },
  { name: 'Blue & Gold', primary: '#0047AB', secondary: '#FFD700' },
  { name: 'Red & White', primary: '#DC143C', secondary: '#FFFFFF' },
  { name: 'Black & Amber', primary: '#000000', secondary: '#FFBF00' },
  { name: 'Maroon & White', primary: '#800000', secondary: '#FFFFFF' },
  { name: 'Navy & Sky', primary: '#000080', secondary: '#87CEEB' },
];

export default function EditTeamScreen() {
  const router = useRouter();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [sport, setSport] = useState('');
  const [grade, setGrade] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [homeVenue, setHomeVenue] = useState('');
  
  // Image uploads
  const [crestImageUrl, setCrestImageUrl] = useState('');
  const [jerseyImageUrl, setJerseyImageUrl] = useState('');
  const [uploadingCrest, setUploadingCrest] = useState(false);
  const [uploadingJersey, setUploadingJersey] = useState(false);
  
  // Color inputs
  const [primaryColor, setPrimaryColor] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('');
  const [accentColor, setAccentColor] = useState('');
  
  // Confirmation modals
  const [showRemoveCrestModal, setShowRemoveCrestModal] = useState(false);
  const [showRemoveJerseyModal, setShowRemoveJerseyModal] = useState(false);
  
  const [errorMessage, setErrorMessage] = useState('');
  const [nameError, setNameError] = useState('');

  console.log('[EditTeam] Rendering edit team form', { teamId });

  useEffect(() => {
    fetchTeam();
  }, [teamId]);

  const fetchTeam = async () => {
    console.log('[EditTeam] Fetching team data for teamId:', teamId);
    try {
      setLoading(true);
      const teamData = await authenticatedGet<Team>(`/api/teams/${teamId}`);
      console.log('[EditTeam] Team data fetched:', teamData);
      
      setTeam(teamData);
      setName(teamData.name || '');
      setShortName(teamData.shortName || '');
      setSport(teamData.sport || '');
      setGrade(teamData.grade || '');
      setAgeGroup(teamData.ageGroup || '');
      setHomeVenue(teamData.homeVenue || '');
      setCrestImageUrl(teamData.crestImageUrl || '');
      setJerseyImageUrl(teamData.jerseyImageUrl || '');
      setPrimaryColor(teamData.primaryColor || '');
      setSecondaryColor(teamData.secondaryColor || '');
      setAccentColor(teamData.accentColor || '');
    } catch (error: any) {
      console.error('[EditTeam] Failed to fetch team:', error);
      console.error('[EditTeam] Error message:', error?.message);
      console.error('[EditTeam] Error status:', error?.status);
      
      // Show specific error message based on error type
      let errorMessage = 'Failed to load team data. Please try again.';
      
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        errorMessage = 'Session expired. Please log in again.';
      } else if (error?.message?.includes('404')) {
        errorMessage = 'Team not found. It may have been deleted.';
      } else if (error?.message?.includes('Network') || error?.message?.includes('fetch')) {
        errorMessage = 'Could not reach server. Please check your connection.';
      }
      
      Alert.alert('Error', errorMessage, [
        {
          text: 'Retry',
          onPress: () => fetchTeam(),
        },
        {
          text: 'Go Back',
          style: 'cancel',
          onPress: () => router.back(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    console.log('[EditTeam] Validating form');
    let isValid = true;
    
    if (!name.trim()) {
      const errorMsg = 'Team name is required';
      setNameError(errorMsg);
      console.log('[EditTeam] Validation failed:', errorMsg);
      isValid = false;
    } else {
      setNameError('');
    }
    
    // Validate color formats if provided
    if (primaryColor && !validateHexColor(primaryColor)) {
      setErrorMessage('Primary color must be a valid hex color (e.g., #FF0000)');
      isValid = false;
    }
    if (secondaryColor && !validateHexColor(secondaryColor)) {
      setErrorMessage('Secondary color must be a valid hex color (e.g., #0000FF)');
      isValid = false;
    }
    if (accentColor && !validateHexColor(accentColor)) {
      setErrorMessage('Accent color must be a valid hex color (e.g., #00FF00)');
      isValid = false;
    }
    
    return isValid;
  };

  const handlePickCrestImage = async () => {
    console.log('[EditTeam] User tapped Pick Crest Photo');
    
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload a crest image.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1], // Square crop for crest
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('[EditTeam] Image selected:', asset.uri);
        
        // Upload image
        setUploadingCrest(true);
        setErrorMessage('');
        
        try {
          const fileName = `crest_${Date.now()}.jpg`;
          const fileType = asset.mimeType || 'image/jpeg';
          
          const uploadResult = await authenticatedUpload(
            `/api/teams/${teamId}/crest`,
            {
              uri: asset.uri,
              name: fileName,
              type: fileType,
            },
            'file'
          );
          
          console.log('[EditTeam] Crest uploaded successfully:', uploadResult);
          setCrestImageUrl(uploadResult.crestImageUrl);
          Alert.alert('Success', 'Crest image uploaded successfully');
        } catch (error: any) {
          console.error('[EditTeam] Failed to upload crest:', error);
          
          if (error?.code === 'AUTH_EXPIRED') {
            Alert.alert('Session Expired', 'Please log in again to upload images.');
          } else {
            const errorMsg = error?.message || 'Failed to upload crest image';
            setErrorMessage(errorMsg);
            Alert.alert('Upload Failed', errorMsg);
          }
        } finally {
          setUploadingCrest(false);
        }
      }
    } catch (error) {
      console.error('[EditTeam] Image picker error:', error);
      Alert.alert('Error', 'Failed to open image picker');
    }
  };

  const handlePickJerseyImage = async () => {
    console.log('[EditTeam] User tapped Pick Jersey Photo');
    
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload a jersey image.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4], // Portrait aspect for jersey
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('[EditTeam] Image selected:', asset.uri);
        
        // Upload image
        setUploadingJersey(true);
        setErrorMessage('');
        
        try {
          const fileName = `jersey_${Date.now()}.jpg`;
          const fileType = asset.mimeType || 'image/jpeg';
          
          const uploadResult = await authenticatedUpload(
            `/api/teams/${teamId}/jersey`,
            {
              uri: asset.uri,
              name: fileName,
              type: fileType,
            },
            'file'
          );
          
          console.log('[EditTeam] Jersey uploaded successfully:', uploadResult);
          setJerseyImageUrl(uploadResult.jerseyImageUrl);
          Alert.alert('Success', 'Jersey image uploaded successfully');
        } catch (error: any) {
          console.error('[EditTeam] Failed to upload jersey:', error);
          
          if (error?.code === 'AUTH_EXPIRED') {
            Alert.alert('Session Expired', 'Please log in again to upload images.');
          } else {
            const errorMsg = error?.message || 'Failed to upload jersey image';
            setErrorMessage(errorMsg);
            Alert.alert('Upload Failed', errorMsg);
          }
        } finally {
          setUploadingJersey(false);
        }
      }
    } catch (error) {
      console.error('[EditTeam] Image picker error:', error);
      Alert.alert('Error', 'Failed to open image picker');
    }
  };

  const handleRemoveCrest = async () => {
    console.log('[EditTeam] User confirmed remove crest');
    setShowRemoveCrestModal(false);
    
    try {
      await authenticatedDelete(`/api/teams/${teamId}/crest`);
      setCrestImageUrl('');
      console.log('[EditTeam] Crest removed successfully');
    } catch (error) {
      console.error('[EditTeam] Failed to remove crest:', error);
      Alert.alert('Error', 'Failed to remove crest image');
    }
  };

  const handleRemoveJersey = async () => {
    console.log('[EditTeam] User confirmed remove jersey');
    setShowRemoveJerseyModal(false);
    
    try {
      await authenticatedDelete(`/api/teams/${teamId}/jersey`);
      setJerseyImageUrl('');
      console.log('[EditTeam] Jersey removed successfully');
    } catch (error) {
      console.error('[EditTeam] Failed to remove jersey:', error);
      Alert.alert('Error', 'Failed to remove jersey image');
    }
  };

  const handleSaveTeam = async () => {
    console.log('[EditTeam] User tapped Save button', {
      name,
      shortName,
      sport,
      grade,
      ageGroup,
      homeVenue,
      crestUrl,
      colours,
    });

    setErrorMessage('');
    
    const isValid = validateForm();
    console.log('[EditTeam] Validation result:', isValid);
    
    if (!isValid) {
      return;
    }

    setSaving(true);
    console.log('[EditTeam] Starting team update...');

    try {
      const requestPayload = {
        name: name.trim(),
        shortName: shortName.trim() || undefined,
        sport: sport || undefined,
        grade: grade || undefined,
        ageGroup: ageGroup.trim() || undefined,
        homeVenue: homeVenue.trim() || undefined,
        primaryColor: primaryColor.trim() || undefined,
        secondaryColor: secondaryColor.trim() || undefined,
        accentColor: accentColor.trim() || undefined,
      };
      
      console.log('[EditTeam] Request payload:', requestPayload);
      console.log('[EditTeam] Calling PUT /api/teams/:id');

      const updatedTeam = await authenticatedPut(`/api/teams/${teamId}`, requestPayload);

      console.log('[EditTeam] Team updated successfully:', updatedTeam);
      
      Alert.alert('Success', 'Team updated successfully', [
        {
          text: 'OK',
          onPress: () => {
            console.log('[EditTeam] Navigating back to team dashboard');
            // Navigate back - the dashboard will refetch data when it comes into focus
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
    } catch (error: any) {
      console.error('[EditTeam] Failed to update team:', error);
      console.error('[EditTeam] Error message:', error?.message);
      
      const errorMsg = error?.message || 'Failed to update team. Please try again.';
      setErrorMessage(errorMsg);
    } finally {
      setSaving(false);
      console.log('[EditTeam] Saving state set to false');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Edit Team', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading team...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isFormValid = name.trim().length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Edit Team',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.description}>
            Update your team details.
          </Text>

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <IconSymbol
                ios_icon_name="exclamationmark.triangle.fill"
                android_material_icon_name="warning"
                size={20}
                color={colors.error}
              />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>
                Team Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, nameError ? styles.inputError : null]}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (nameError && text.trim()) {
                    setNameError('');
                  }
                }}
                placeholder="e.g., Senior Hurling Team"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                editable={!saving}
              />
              {nameError ? (
                <Text style={styles.fieldError}>{nameError}</Text>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Code / Short Name (Optional)</Text>
              <TextInput
                style={styles.input}
                value={shortName}
                onChangeText={setShortName}
                placeholder="e.g., SH"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="characters"
                editable={!saving}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Sport (Optional)</Text>
              <View style={styles.optionsRow}>
                {SPORTS.map((s) => {
                  const isSelected = sport === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.option, isSelected && styles.optionSelected]}
                      onPress={() => setSport(s)}
                      disabled={saving}
                    >
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Grade (Optional)</Text>
              <View style={styles.optionsRow}>
                {GRADES.map((g) => {
                  const isSelected = grade === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[styles.option, isSelected && styles.optionSelected]}
                      onPress={() => setGrade(g)}
                      disabled={saving}
                    >
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Age Group (Optional)</Text>
              <TextInput
                style={styles.input}
                value={ageGroup}
                onChangeText={setAgeGroup}
                placeholder="e.g., U16, U18, Adult"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                editable={!saving}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Default Home Venue (Optional)</Text>
              <TextInput
                style={styles.input}
                value={homeVenue}
                onChangeText={setHomeVenue}
                placeholder="e.g., St. Patrick's Park"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                editable={!saving}
              />
            </View>

            {/* Crest Image Upload */}
            <View style={styles.field}>
              <Text style={styles.label}>Crest Image (Optional)</Text>
              {crestImageUrl ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={resolveImageSource(crestImageUrl)}
                    style={styles.crestPreview}
                    resizeMode="contain"
                  />
                  <View style={styles.imageActions}>
                    <TouchableOpacity
                      style={styles.imageActionButton}
                      onPress={handlePickCrestImage}
                      disabled={uploadingCrest || saving}
                    >
                      <IconSymbol
                        ios_icon_name="arrow.triangle.2.circlepath"
                        android_material_icon_name="refresh"
                        size={20}
                        color={colors.primary}
                      />
                      <Text style={styles.imageActionText}>Replace</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.imageActionButton, styles.imageActionButtonDanger]}
                      onPress={() => setShowRemoveCrestModal(true)}
                      disabled={uploadingCrest || saving}
                    >
                      <IconSymbol
                        ios_icon_name="trash"
                        android_material_icon_name="delete"
                        size={20}
                        color={colors.error}
                      />
                      <Text style={[styles.imageActionText, styles.imageActionTextDanger]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handlePickCrestImage}
                  disabled={uploadingCrest || saving}
                >
                  {uploadingCrest ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <>
                      <IconSymbol
                        ios_icon_name="photo"
                        android_material_icon_name="photo"
                        size={24}
                        color={colors.primary}
                      />
                      <Text style={styles.uploadButtonText}>Pick Crest Photo</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Jersey Image Upload */}
            <View style={styles.field}>
              <Text style={styles.label}>Jersey Image (Optional)</Text>
              {jerseyImageUrl ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={resolveImageSource(jerseyImageUrl)}
                    style={styles.jerseyPreview}
                    resizeMode="contain"
                  />
                  <View style={styles.imageActions}>
                    <TouchableOpacity
                      style={styles.imageActionButton}
                      onPress={handlePickJerseyImage}
                      disabled={uploadingJersey || saving}
                    >
                      <IconSymbol
                        ios_icon_name="arrow.triangle.2.circlepath"
                        android_material_icon_name="refresh"
                        size={20}
                        color={colors.primary}
                      />
                      <Text style={styles.imageActionText}>Replace</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.imageActionButton, styles.imageActionButtonDanger]}
                      onPress={() => setShowRemoveJerseyModal(true)}
                      disabled={uploadingJersey || saving}
                    >
                      <IconSymbol
                        ios_icon_name="trash"
                        android_material_icon_name="delete"
                        size={20}
                        color={colors.error}
                      />
                      <Text style={[styles.imageActionText, styles.imageActionTextDanger]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handlePickJerseyImage}
                  disabled={uploadingJersey || saving}
                >
                  {uploadingJersey ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <>
                      <IconSymbol
                        ios_icon_name="photo"
                        android_material_icon_name="photo"
                        size={24}
                        color={colors.primary}
                      />
                      <Text style={styles.uploadButtonText}>Pick Jersey Photo</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Team Colors */}
            <View style={styles.field}>
              <Text style={styles.label}>Team Colors (Optional)</Text>
              <Text style={styles.fieldHint}>Choose a preset or enter custom hex colors</Text>
              
              {/* Color Presets */}
              <View style={styles.colorPresetsContainer}>
                {COLOR_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset.name}
                    style={styles.colorPreset}
                    onPress={() => {
                      setPrimaryColor(preset.primary);
                      setSecondaryColor(preset.secondary);
                    }}
                    disabled={saving}
                  >
                    <View style={styles.colorPresetColors}>
                      <View style={[styles.colorPresetSwatch, { backgroundColor: preset.primary }]} />
                      <View style={[styles.colorPresetSwatch, { backgroundColor: preset.secondary }]} />
                    </View>
                    <Text style={styles.colorPresetName}>{preset.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Primary Color</Text>
              <View style={styles.colorInputContainer}>
                <TextInput
                  style={[styles.input, styles.colorInput]}
                  value={primaryColor}
                  onChangeText={setPrimaryColor}
                  placeholder="#FF0000"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                  editable={!saving}
                />
                {primaryColor && validateHexColor(primaryColor) && (
                  <View style={[styles.colorPreview, { backgroundColor: primaryColor }]} />
                )}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Secondary Color</Text>
              <View style={styles.colorInputContainer}>
                <TextInput
                  style={[styles.input, styles.colorInput]}
                  value={secondaryColor}
                  onChangeText={setSecondaryColor}
                  placeholder="#0000FF"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                  editable={!saving}
                />
                {secondaryColor && validateHexColor(secondaryColor) && (
                  <View style={[styles.colorPreview, { backgroundColor: secondaryColor }]} />
                )}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Accent Color (Optional)</Text>
              <View style={styles.colorInputContainer}>
                <TextInput
                  style={[styles.input, styles.colorInput]}
                  value={accentColor}
                  onChangeText={setAccentColor}
                  placeholder="#00FF00"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                  editable={!saving}
                />
                {accentColor && validateHexColor(accentColor) && (
                  <View style={[styles.colorPreview, { backgroundColor: accentColor }]} />
                )}
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.saveButton,
              (!isFormValid || saving) && styles.saveButtonDisabled
            ]}
            onPress={handleSaveTeam}
            disabled={!isFormValid || saving}
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

        {/* Remove Crest Confirmation Modal */}
        <Modal
          visible={showRemoveCrestModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowRemoveCrestModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Remove Crest Image?</Text>
              <Text style={styles.modalMessage}>
                Are you sure you want to remove the crest image? This action cannot be undone.
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setShowRemoveCrestModal(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                  onPress={handleRemoveCrest}
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Remove Jersey Confirmation Modal */}
        <Modal
          visible={showRemoveJerseyModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowRemoveJerseyModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Remove Jersey Image?</Text>
              <Text style={styles.modalMessage}>
                Are you sure you want to remove the jersey image? This action cannot be undone.
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setShowRemoveJerseyModal(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                  onPress={handleRemoveJersey}
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>Remove</Text>
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBackground,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: colors.error,
    fontWeight: '600',
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
  inputError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  fieldError: {
    fontSize: 14,
    color: colors.error,
    marginTop: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: 14,
    color: colors.text,
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '600',
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
  imagePreviewContainer: {
    gap: 12,
  },
  crestPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.backgroundAlt,
    alignSelf: 'center',
  },
  jerseyPreview: {
    width: 120,
    height: 160,
    borderRadius: 8,
    backgroundColor: colors.backgroundAlt,
    alignSelf: 'center',
  },
  imageActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  imageActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageActionButtonDanger: {
    borderColor: colors.error,
  },
  imageActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  imageActionTextDanger: {
    color: colors.error,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  colorInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorInput: {
    flex: 1,
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  colorPresetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  colorPreset: {
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 100,
  },
  colorPresetColors: {
    flexDirection: 'row',
    gap: 4,
  },
  colorPresetSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorPresetName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.backgroundAlt,
  },
  modalButtonConfirm: {
    backgroundColor: colors.error,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalButtonTextConfirm: {
    color: '#fff',
  },
});
