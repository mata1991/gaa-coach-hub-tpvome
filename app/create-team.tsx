
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedPost } from '@/utils/api';

const SPORTS = ['Hurling', 'Camogie', 'Gaelic Football', 'Ladies Gaelic Football'];
const GRADES = ['Senior', 'Intermediate', 'Junior', 'Youth'];

export default function CreateTeamScreen() {
  const router = useRouter();
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [sport, setSport] = useState('');
  const [grade, setGrade] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [homeVenue, setHomeVenue] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [nameError, setNameError] = useState('');

  console.log('[CreateTeam] Rendering create team form', { clubId });

  const validateForm = (): boolean => {
    console.log('[CreateTeam] Validating form');
    let isValid = true;
    
    if (!name.trim()) {
      const errorMsg = 'Team name is required';
      setNameError(errorMsg);
      console.log('[CreateTeam] Validation failed:', errorMsg);
      isValid = false;
    } else {
      setNameError('');
    }
    
    return isValid;
  };

  const handleCreateTeam = async () => {
    console.log('[CreateTeam] User tapped Create Team button', {
      name,
      shortName,
      sport,
      grade,
      ageGroup,
      homeVenue,
      clubId,
    });

    setErrorMessage('');
    
    const isValid = validateForm();
    console.log('[CreateTeam] Validation result:', isValid);
    
    if (!isValid) {
      return;
    }

    if (!clubId) {
      console.error('[CreateTeam] No clubId provided');
      setErrorMessage('Club ID is missing. Please go back and try again.');
      return;
    }

    setLoading(true);
    console.log('[CreateTeam] Starting team creation...');

    try {
      const requestPayload = {
        clubId,
        name: name.trim(),
        shortName: shortName.trim() || undefined,
        sport: sport || undefined,
        grade: grade || undefined,
        ageGroup: ageGroup.trim() || undefined,
        homeVenue: homeVenue.trim() || undefined,
      };
      
      console.log('[CreateTeam] Request payload:', requestPayload);
      console.log('[CreateTeam] Calling POST /api/teams');

      const team = await authenticatedPost('/api/teams', requestPayload);

      console.log('[CreateTeam] Team created successfully:', team);
      console.log('[CreateTeam] Navigating to Team Dashboard with teamId:', team.id);

      router.replace({
        pathname: '/team-dashboard/[teamId]',
        params: { teamId: team.id },
      });
    } catch (error: any) {
      console.error('[CreateTeam] Failed to create team:', error);
      console.error('[CreateTeam] Error message:', error?.message);
      console.error('[CreateTeam] Error details:', error);
      
      const errorMsg = error?.message || 'Failed to create team. Please try again.';
      setErrorMessage(errorMsg);
    } finally {
      setLoading(false);
      console.log('[CreateTeam] Loading state set to false');
    }
  };

  const isFormValid = name.trim().length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Create Team',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.description}>
            Add a team to your club. You can create multiple teams.
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
                editable={!loading}
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
                editable={!loading}
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
                      disabled={loading}
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
                      disabled={loading}
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
                editable={!loading}
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
                editable={!loading}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.createButton,
              (!isFormValid || loading) && styles.createButtonDisabled
            ]}
            onPress={handleCreateTeam}
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
                <Text style={styles.createButtonText}>Create Team</Text>
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
