
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedDelete } from '@/utils/api';
import { Team, Club } from '@/types';
import { getSportDisplayName } from '@/constants/EventPresets';

// Helper to resolve image sources (handles both local and remote)
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

const LAST_SELECTED_TEAM_KEY = '@gaa_coach_hub:last_selected_team';

export default function SelectTeamScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);

  console.log('[SelectTeam] Rendering team selection screen');

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    console.log('[SelectTeam] Fetching teams for user');
    setLoading(true);

    try {
      // Fetch user's clubs
      const clubsData = await authenticatedGet<Club[]>('/api/clubs');
      console.log('[SelectTeam] Fetched clubs:', clubsData);
      setClubs(clubsData);

      if (!clubsData || clubsData.length === 0) {
        console.warn('[SelectTeam] No clubs found, redirecting to get-started');
        router.replace('/get-started');
        return;
      }

      // Fetch teams for all clubs
      const allTeams: Team[] = [];
      for (const club of clubsData) {
        try {
          const clubTeams = await authenticatedGet<Team[]>(`/api/teams?clubId=${club.id}`);
          console.log(`[SelectTeam] Fetched ${clubTeams.length} teams for club ${club.name}`);
          allTeams.push(...clubTeams);
        } catch (error) {
          console.error(`[SelectTeam] Failed to fetch teams for club ${club.id}:`, error);
        }
      }

      console.log('[SelectTeam] Total teams fetched:', allTeams.length);
      
      // Filter out archived teams
      const activeTeams = allTeams.filter(team => !team.isArchived);
      console.log('[SelectTeam] Active teams:', activeTeams.length);
      
      setTeams(activeTeams);

      if (allTeams.length === 0) {
        console.warn('[SelectTeam] No teams found, redirecting to create team');
        router.replace({
          pathname: '/create-team',
          params: { clubId: clubsData[0].id },
        });
      }
    } catch (error) {
      console.error('[SelectTeam] Failed to fetch teams:', error);
      Alert.alert('Error', 'Failed to load teams. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTeam = async (team: Team) => {
    console.log('[SelectTeam] User selected team:', team.name, team.id);

    try {
      // Save selected team to AsyncStorage
      await AsyncStorage.setItem(LAST_SELECTED_TEAM_KEY, team.id);
      console.log('[SelectTeam] Saved team selection to AsyncStorage');

      // Navigate to team dashboard
      router.replace({
        pathname: '/team-dashboard/[teamId]',
        params: { teamId: team.id },
      });
    } catch (error) {
      console.error('[SelectTeam] Failed to save team selection:', error);
      // Still navigate even if save fails
      router.replace({
        pathname: '/team-dashboard/[teamId]',
        params: { teamId: team.id },
      });
    }
  };

  const handleCreateTeam = () => {
    console.log('[SelectTeam] User tapped Create New Team');
    if (clubs.length > 0) {
      router.push({
        pathname: '/create-team',
        params: { clubId: clubs[0].id },
      });
    }
  };

  const handleEditTeam = (team: Team) => {
    console.log('[SelectTeam] User tapped Edit Team:', team.name);
    router.push({
      pathname: '/edit-team/[teamId]',
      params: { teamId: team.id },
    });
  };

  const handleDeleteTeam = async (team: Team) => {
    console.log('[SelectTeam] User tapped Delete Team:', team.name);
    
    const teamName = team.name;
    const confirmMessage = `Delete team '${teamName}'? This will archive the team and hide it from the list.`;
    
    Alert.alert(
      'Delete Team',
      confirmMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[SelectTeam] Deleting team:', team.id);
              await authenticatedDelete(`/api/teams/${team.id}`);
              
              // Check if deleted team was the active team
              const lastSelectedTeam = await AsyncStorage.getItem(LAST_SELECTED_TEAM_KEY);
              if (lastSelectedTeam === team.id) {
                console.log('[SelectTeam] Deleted team was active, clearing selection');
                await AsyncStorage.removeItem(LAST_SELECTED_TEAM_KEY);
              }
              
              // Refresh teams list
              await fetchTeams();
              
              Alert.alert('Success', `Team '${teamName}' has been archived.`);
            } catch (error) {
              console.error('[SelectTeam] Failed to delete team:', error);
              Alert.alert('Error', 'Failed to delete team. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading teams...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Select Team',
          headerBackVisible: false,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Select a Team</Text>
            <Text style={styles.subtitle}>
              Choose which team you want to manage
            </Text>
          </View>

          <View style={styles.teamsList}>
            {teams.map((team) => {
              const club = clubs.find((c) => c.id === team.clubId);
              const sportDisplay = getSportDisplayName(team.sport);
              const crestUrl = team.crestUrl || club?.crestUrl;
              const hasCrest = !!crestUrl;
              
              return (
                <View key={team.id} style={styles.teamCardContainer}>
                  <TouchableOpacity
                    style={styles.teamCard}
                    onPress={() => handleSelectTeam(team)}
                  >
                    <View style={styles.teamIcon}>
                      {hasCrest ? (
                        <Image
                          source={resolveImageSource(crestUrl)}
                          style={styles.crestImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <IconSymbol
                          ios_icon_name="shield.fill"
                          android_material_icon_name="shield"
                          size={32}
                          color={colors.primary}
                        />
                      )}
                    </View>
                    <View style={styles.teamInfo}>
                      <Text style={styles.teamName}>{team.name}</Text>
                      {club && (
                        <Text style={styles.clubName}>{club.name}</Text>
                      )}
                      <View style={styles.teamMeta}>
                        {sportDisplay && (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>{sportDisplay}</Text>
                          </View>
                        )}
                        {team.grade && (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>{team.grade}</Text>
                          </View>
                        )}
                        {team.ageGroup && (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>{team.ageGroup}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <IconSymbol
                      ios_icon_name="chevron.right"
                      android_material_icon_name="chevron-right"
                      size={24}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                  
                  <View style={styles.teamActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEditTeam(team)}
                    >
                      <IconSymbol
                        ios_icon_name="pencil"
                        android_material_icon_name="edit"
                        size={20}
                        color={colors.primary}
                      />
                      <Text style={styles.actionButtonText}>Edit</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteTeam(team)}
                    >
                      <IconSymbol
                        ios_icon_name="trash"
                        android_material_icon_name="delete"
                        size={20}
                        color="#dc3545"
                      />
                      <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateTeam}
          >
            <IconSymbol
              ios_icon_name="plus.circle.fill"
              android_material_icon_name="add-circle"
              size={24}
              color="#fff"
            />
            <Text style={styles.createButtonText}>Create New Team</Text>
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
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  teamsList: {
    gap: 16,
    marginBottom: 24,
  },
  teamCardContainer: {
    gap: 8,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 3,
  },
  teamIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  crestImage: {
    width: 48,
    height: 48,
  },
  teamInfo: {
    flex: 1,
    gap: 4,
  },
  teamName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  clubName: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  teamMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  badge: {
    backgroundColor: colors.highlight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
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
  createButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  teamActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.highlight,
  },
  deleteButton: {
    backgroundColor: '#fee',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  deleteButtonText: {
    color: '#dc3545',
  },
});
