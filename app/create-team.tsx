
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedPost } from '@/utils/api';

const SPORTS = ['Hurling', 'Camogie'];
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

  console.log('CreateTeamScreen: Rendering create team form', { clubId });

  const handleCreateTeam = async () => {
    console.log('User tapped Create Team button', {
      name,
      shortName,
      sport,
      grade,
      ageGroup,
      homeVenue,
    });

    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a team name');
      return;
    }

    setLoading(true);

    try {
      console.log('Creating team with data:', {
        clubId,
        name,
        shortName,
        sport,
        grade,
        ageGroup,
        homeVenue,
      });

      // Create team via API
      const team = await authenticatedPost('/api/teams', {
        clubId,
        name: name.trim(),
        shortName: shortName.trim() || undefined,
        sport: sport || undefined,
        grade: grade || undefined,
        ageGroup: ageGroup.trim() || undefined,
        homeVenue: homeVenue.trim() || undefined,
      });

      console.log('Team created successfully:', team);

      Alert.alert(
        'Success',
        'Team created successfully!',
        [
          {
            text: 'Add Another Team',
            onPress: () => {
              // Reset form
              setName('');
              setShortName('');
              setSport('');
              setGrade('');
              setAgeGroup('');
              setHomeVenue('');
            },
          },
          {
            text: 'Go to Team Dashboard',
            onPress: () => {
              router.replace({
                pathname: '/team-dashboard/[teamId]',
                params: { teamId: team.id },
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to create team:', error);
      Alert.alert('Error', 'Failed to create team. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>
                Team Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Senior Hurling Team"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
              />
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
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            onPress={handleCreateTeam}
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
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});
