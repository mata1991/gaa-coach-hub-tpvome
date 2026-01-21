
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
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedPost } from '@/utils/api';
import { parseClubColors } from '@/utils/colorParser';
import { useThemeColors } from '@/contexts/ThemeContext';

export default function CreateClubScreen() {
  const router = useRouter();
  const { updateTheme } = useThemeColors();
  
  const [clubName, setClubName] = useState('');
  const [county, setCounty] = useState('');
  const [colours, setColours] = useState('');
  const [crestUri, setCrestUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  console.log('CreateClubScreen: Rendering create club screen');

  const handlePickCrest = async () => {
    console.log('User tapped Pick Crest button');
    
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      console.log('Media library permission denied');
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

  const validateForm = () => {
    if (!clubName.trim()) {
      return 'Club name is required';
    }
    return null;
  };

  const handleCreateClub = async () => {
    console.log('User tapped Create Club button');

    const validationError = validateForm();
    if (validationError) {
      console.log('Validation failed:', validationError);
      alert(validationError);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: clubName.trim(),
        county: county.trim() || undefined,
        colours: colours.trim() || undefined,
      };

      console.log('Creating club with payload:', payload);
      const club = await authenticatedPost('/api/clubs', payload);
      console.log('Club created successfully:', club);

      // Note: Club colors are stored but not applied to theme (monochrome theme is enforced)
      console.log('Navigating to create team screen');
      router.replace({
        pathname: '/create-team',
        params: { clubId: club.id },
      });
    } catch (error) {
      console.error('Failed to create club:', error);
      alert('Failed to create club. Please try again.');
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
          <Text style={styles.title}>Create Your Club</Text>
          <Text style={styles.description}>
            Set up your club profile to get started
          </Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>
                Club Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={clubName}
                onChangeText={setClubName}
                placeholder="Enter club name"
                placeholderTextColor="#999"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>County (Optional)</Text>
              <TextInput
                style={styles.input}
                value={county}
                onChangeText={setCounty}
                placeholder="e.g., Cork, Dublin"
                placeholderTextColor="#999"
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
                placeholderTextColor="#999"
                autoCapitalize="words"
              />
              <Text style={styles.hint}>
                Note: Monochrome theme is enforced throughout the app
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Club Crest (Optional)</Text>
              <TouchableOpacity style={styles.crestButton} onPress={handlePickCrest}>
                {crestUri ? (
                  <Image source={{ uri: crestUri }} style={styles.crestImage} />
                ) : (
                  <View style={styles.crestPlaceholder}>
                    <IconSymbol
                      ios_icon_name="photo"
                      android_material_icon_name="image"
                      size={32}
                      color="#666"
                    />
                    <Text style={styles.crestPlaceholderText}>Tap to select crest</Text>
                  </View>
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
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  form: {
    gap: 24,
    marginBottom: 32,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
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
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  crestButton: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  crestImage: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
  },
  crestPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  crestPlaceholderText: {
    fontSize: 14,
    color: '#666',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
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
