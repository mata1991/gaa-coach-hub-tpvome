
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedPut } from '@/utils/api';
import { Team } from '@/types';

const SPORTS = ['Hurling', 'Camogie', 'Gaelic Football', 'Ladies Gaelic Football'];
const GRADES = ['Senior', 'Intermediate', 'Junior', 'Youth'];

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
  const [crestUrl, setCrestUrl] = useState('');
  const [colours, setColours] = useState('');
  
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
      setCrestUrl(teamData.crestUrl || '');
      setColours(teamData.colours || '');
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
    
    return isValid;
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
        crestUrl: crestUrl.trim() || undefined,
        colours: colours.trim() || undefined,
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

            <View style={styles.field}>
              <Text style={styles.label}>Crest URL (Optional)</Text>
              <TextInput
                style={styles.input}
                value={crestUrl}
                onChangeText={setCrestUrl}
                placeholder="https://example.com/crest.png"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                keyboardType="url"
                editable={!saving}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Team Colours (Optional)</Text>
              <TextInput
                style={styles.input}
                value={colours}
                onChangeText={setColours}
                placeholder="e.g., Blue and Gold"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                editable={!saving}
              />
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
});
