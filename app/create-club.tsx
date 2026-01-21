
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedPost } from '@/utils/api';
import * as ImagePicker from 'expo-image-picker';

export default function CreateClubScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [county, setCounty] = useState('');
  const [colours, setColours] = useState('');
  const [crestUri, setCrestUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  console.log('CreateClubScreen: Rendering create club form');

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

  const handleCreateClub = async () => {
    console.log('User tapped Create Club button', { name, county, colours });

    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a club name');
      return;
    }

    setLoading(true);

    try {
      let crestUrl = undefined;

      // Upload crest if selected
      if (crestUri) {
        console.log('Uploading crest image...');
        // Note: Crest upload to object storage not yet implemented
        // For now, we'll skip the upload and use the local URI
        // In production, this would upload to object storage and return a URL
      }

      console.log('Creating club with data:', { name, county, colours, crestUrl });

      // Create club via API
      const club = await authenticatedPost('/api/clubs', {
        name: name.trim(),
        county: county.trim() || undefined,
        colours: colours.trim() || undefined,
        crestUrl,
      });

      console.log('Club created successfully:', club);

      Alert.alert(
        'Success',
        'Club created successfully! Now let\'s add your first team.',
        [
          {
            text: 'Continue',
            onPress: () => {
              router.replace({
                pathname: '/create-team',
                params: { clubId: club.id },
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to create club:', error);
      Alert.alert('Error', 'Failed to create club. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            onPress={handleCreateClub}
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
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});
