
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet } from '@/utils/api';
import { Club, Team, Season, Membership } from '@/types';
import { getSportDisplayName } from '@/constants/EventPresets';

interface ClubDashboardData {
  club: Club;
  teams: Team[];
  seasons: Season[];
  members: Membership[];
  userRole: 'CLUB_ADMIN' | 'COACH' | 'STATS_PERSON' | 'PLAYER';
}

export default function ClubDashboardScreen() {
  const router = useRouter();
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ClubDashboardData | null>(null);

  console.log('ClubDashboardScreen: Rendering club dashboard', { clubId });

  const fetchDashboard = useCallback(async () => {
    console.log('Fetching club dashboard data...');
    setLoading(true);

    try {
      // Fetch club dashboard data from API
      const dashboardData = await authenticatedGet(`/api/clubs/${clubId}/dashboard`);
      console.log('Club dashboard data fetched:', dashboardData);
      setData(dashboardData);
    } catch (error) {
      console.error('Failed to fetch club dashboard:', error);
      Alert.alert('Error', 'Failed to load club dashboard');
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleAddTeam = () => {
    console.log('User tapped Add Team button');
    router.push({
      pathname: '/create-team',
      params: { clubId },
    });
  };

  const handleTeamPress = (teamId: string) => {
    console.log('User tapped team:', teamId);
    router.push({
      pathname: '/team-dashboard/[teamId]',
      params: { teamId },
    });
  };

  const handleEditClub = () => {
    console.log('User tapped Edit Club button');
    router.push({
      pathname: '/edit-club/[clubId]',
      params: { clubId },
    });
  };

  const handleInviteMember = () => {
    console.log('User tapped Invite Member button');
    // TODO: Implement invite member flow
    Alert.alert('Coming Soon', 'Invite member feature will be available soon');
  };

  const isAdmin = data?.userRole === 'CLUB_ADMIN';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading club dashboard...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.errorContainer}>
        <IconSymbol
          ios_icon_name="exclamationmark.triangle"
          android_material_icon_name="error"
          size={48}
          color={colors.error}
        />
        <Text style={styles.errorText}>Failed to load club dashboard</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDashboard}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeTeamsCount = data.teams.filter((t) => !t.isArchived).length;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: data.club.name,
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Club Info */}
          <View style={styles.clubInfo}>
            <View style={styles.clubHeader}>
              <View>
                <Text style={styles.clubName}>{data.club.name}</Text>
                {data.club.county && (
                  <Text style={styles.clubCounty}>{data.club.county}</Text>
                )}
              </View>
              {isAdmin && (
                <TouchableOpacity onPress={handleEditClub}>
                  <IconSymbol
                    ios_icon_name="pencil.circle.fill"
                    android_material_icon_name="edit"
                    size={28}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{activeTeamsCount}</Text>
                <Text style={styles.statLabel}>Active Teams</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{data.members.length}</Text>
                <Text style={styles.statLabel}>Members</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{data.seasons.length}</Text>
                <Text style={styles.statLabel}>Seasons</Text>
              </View>
            </View>
          </View>

          {/* Teams Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Teams</Text>
              {isAdmin && (
                <TouchableOpacity style={styles.addButton} onPress={handleAddTeam}>
                  <IconSymbol
                    ios_icon_name="plus.circle.fill"
                    android_material_icon_name="add-circle"
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={styles.addButtonText}>Add Team</Text>
                </TouchableOpacity>
              )}
            </View>

            {data.teams.length === 0 ? (
              <View style={styles.emptyState}>
                <IconSymbol
                  ios_icon_name="sportscourt"
                  android_material_icon_name="sports"
                  size={48}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyText}>No teams yet</Text>
                {isAdmin && (
                  <TouchableOpacity style={styles.emptyButton} onPress={handleAddTeam}>
                    <Text style={styles.emptyButtonText}>Create your first team</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.teamsList}>
                {data.teams.filter((t) => !t.isArchived).map((team) => (
                  <TouchableOpacity
                    key={team.id}
                    style={styles.teamCard}
                    onPress={() => handleTeamPress(team.id)}
                  >
                    <View style={styles.teamInfo}>
                      <Text style={styles.teamName}>{team.name}</Text>
                      <View style={styles.teamMeta}>
                        {team.sport && (
                          <Text style={styles.teamMetaText}>{getSportDisplayName(team.sport)}</Text>
                        )}
                        {team.grade && (
                          <Text style={styles.teamMetaText}>{team.grade}</Text>
                        )}
                        {team.ageGroup && (
                          <Text style={styles.teamMetaText}>{team.ageGroup}</Text>
                        )}
                      </View>
                    </View>
                    <IconSymbol
                      ios_icon_name="chevron.right"
                      android_material_icon_name="arrow-forward"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Members Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Members</Text>
              {isAdmin && (
                <TouchableOpacity style={styles.addButton} onPress={handleInviteMember}>
                  <IconSymbol
                    ios_icon_name="person.badge.plus"
                    android_material_icon_name="person-add"
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={styles.addButtonText}>Invite</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.membersList}>
              {data.members.map((member) => (
                <View key={member.id} style={styles.memberCard}>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.userName || member.userEmail}</Text>
                    <Text style={styles.memberRole}>{member.role.replace('_', ' ')}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
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
    padding: 16,
    gap: 20,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  clubInfo: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 12,
    gap: 16,
  },
  clubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  clubName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  clubCounty: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyState: {
    backgroundColor: colors.card,
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  teamsList: {
    gap: 12,
  },
  teamCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamInfo: {
    flex: 1,
    gap: 6,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  teamMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  teamMetaText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  membersList: {
    gap: 8,
  },
  memberCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
  },
  memberInfo: {
    gap: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  memberRole: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
