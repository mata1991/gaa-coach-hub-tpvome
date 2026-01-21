
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedPost } from '@/utils/api';
import { parseClubColors } from '@/utils/colorParser';
import { useThemeColors } from '@/contexts/ThemeContext';
import * as ImagePicker from 'expo-image-picker';

export default function CreateClubScreen() {
  const router = useRouter();
  const { updateTheme } = useThemeColors();
  
  const [name, setName] = useState('');
  const [county, setCounty] = useState('');
  const [colours, setColours] = useState('');
  const [crestUri, setCrestUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [nameError, setNameError] = useState('');

  console.log('CreateClubScreen: Rendering create club form');

  const handlePickCrest = async () => {
    console.log('User tapped Pick Crest button');
    
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      setErrorMessage('Please allow access to your photo library to upload a crest.');
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

  const validateForm = (): boolean => {
    console.log('[CreateClub] Validating form');
    let isValid = true;
    
    if (!name.trim()) {
      const errorMsg = 'Club name is required';
      setNameError(errorMsg);
      console.log('[CreateClub] Validation failed:', errorMsg);
      isValid = false;
    } else {
      setNameError('');
    }
    
    return isValid;
  };

  const handleCreateClub = async () => {
    console.log('[CreateClub] User tapped Create Club button', { name, county, colours });
    
    setErrorMessage('');
    
    const isValid = validateForm();
    console.log('[CreateClub] Validation result:', isValid);
    
    if (!isValid) {
      return;
    }

    setLoading(true);
    console.log('[CreateClub] Starting club creation...');

    try {
      let crestUrl = undefined;

      if (crestUri) {
        console.log('[CreateClub] Crest upload skipped - will be implemented later');
      }

      const parsedColors = parseClubColors(colours);
      console.log('[CreateClub] Parsed colors:', parsedColors);

      const requestPayload = {
        name: name.trim(),
        county: county.trim() || undefined,
        colours: colours.trim() || undefined,
        primaryColor: parsedColors.primaryColor,
        secondaryColor: parsedColors.secondaryColor,
        crestUrl,
      };
      
      console.log('[CreateClub] Request payload:', requestPayload);
      console.log('[CreateClub] Calling POST /api/clubs');

      const club = await authenticatedPost('/api/clubs', requestPayload);

      console.log('[CreateClub] Club created successfully:', club);

      await updateTheme(parsedColors.primaryColor, parsedColors.secondaryColor);
      console.log('[CreateClub] Theme updated successfully');

      console.log('[CreateClub] Navigating to Create Team with clubId:', club.id);
      
      router.replace({
        pathname: '/create-team',
        params: { clubId: club.id },
      });
    } catch (error: any) {
      console.error('[CreateClub] Failed to create club:', error);
      console.error('[CreateClub] Error message:', error?.message);
      console.error('[CreateClub] Error details:', error);
      
      const errorMsg = error?.message || 'Failed to create club. Please try again.';
      setErrorMessage(errorMsg);
    } finally {
      setLoading(false);
      console.log('[CreateClub] Loading state set to false');
    }
  };

  const isFormValid = name.trim().length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Create Club',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.description}>
            Set up your club profile. You can update these details later.
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
                Club Name <Text style={styles.required}>*</Text>
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
                placeholder="e.g., St. Patrick's GAA Club"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                editable={!loading}
              />
              {nameError ? (
                <Text style={styles.fieldError}>{nameError}</Text>
              ) : null}
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
                editable={!loading}
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
                editable={!loading}
              />
              <Text style={styles.hint}>
                Examples: &quot;Green and Gold&quot;, &quot;Blue/White&quot;, &quot;#0F8A3B,#F4C542&quot;
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Club Crest (Optional)</Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handlePickCrest}
                disabled={loading}
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
            style={[
              styles.createButton,
              (!isFormValid || loading) && styles.createButtonDisabled
            ]}
            onPress={handleCreateClub}
            disabled={!isFormValid || loading}
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
                <Text style={styles.createButtonText}>Create Club</Text>
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
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
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
