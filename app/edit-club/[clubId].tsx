
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedPut } from '@/utils/api';
import { Club } from '@/types';
import * as ImagePicker from 'expo-image-picker';

export default function EditClubScreen() {
  const router = useRouter();
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [club, setClub] = useState<Club | null>(null);
  const [name, setName] = useState('');
  const [county, setCounty] = useState('');
  const [colours, setColours] = useState('');
  const [crestUri, setCrestUri] = useState<string | null>(null);

  console.log('EditClubScreen: Rendering edit club form', { clubId });

  const fetchClub = useCallback(async () => {
    console.log('Fetching club details...');
    setLoading(true);

    try {
      // Fetch club details from API
      const clubData = await authenticatedGet(`/api/clubs/${clubId}`);
      console.log('Club data fetched:', clubData);
      setClub(clubData);
      setName(clubData.name);
      setCounty(clubData.county || '');
      setColours(clubData.colours || '');
      setCrestUri(clubData.crestUrl || null);
    } catch (error) {
      console.error('Failed to fetch club:', error);
      Alert.alert('Error', 'Failed to load club details');
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchClub();
  }, [fetchClub]);

  const handlePickCrest = async () => {
    console.log('User tapped Pick Crest button');
    
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library to upload a crest.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      console.log('Crest image selected:', result.assets[0].uri);
      setCrestUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    console.log('User tapped Save button', { name, county, colours });

    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a club name');
      return;
    }

    setSaving(true);

    try {
      let crestUrl = club?.crestUrl;

      // Upload crest if changed
      if (crestUri && crestUri !== club?.crestUrl) {
        console.log('Uploading new crest image...');
        // Note: Crest upload to object storage not yet implemented
        // For now, we'll skip the upload
      }

      console.log('Updating club with data:', { name, county, colours, crestUrl });

      // Update club via API
      await authenticatedPut(`/api/clubs/${clubId}`, {
        name: name.trim(),
        county: county.trim() || undefined,
        colours: colours.trim() || undefined,
        crestUrl,
      });

      console.log('Club updated successfully');

      Alert.alert('Success', 'Club updated successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Failed to update club:', error);
      Alert.alert('Error', 'Failed to update club. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading club details...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Edit Club',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>
                Club Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., St. Patrick's GAA Club"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>County (Optional)</Text>
              <TextInput
                style={styles.input}
                value={county}
                onChangeText={setCounty}
                placeholder="e.g., Cork"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Club Colours (Optional)</Text>
              <TextInput
                style={styles.input}
                value={colours}
                onChangeText={setColours}
                placeholder="e.g., Green and Gold"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Club Crest (Optional)</Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handlePickCrest}
              >
                {crestUri ? (
                  <Image source={{ uri: crestUri }} style={styles.crestPreview} />
                ) : (
                  <>
                    <IconSymbol
                      ios_icon_name="photo"
                      android_material_icon_name="image"
                      size={32}
                      color={colors.primary}
                    />
                    <Text style={styles.uploadText}>Tap to upload crest</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
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
  content: {
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
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
  uploadButton: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  crestPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
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
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});
