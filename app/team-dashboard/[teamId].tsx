
import React, { useState, useEffect } from 'react';
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
import { Team, Fixture } from '@/types';

interface TeamDashboardData {
  team: Team;
  playerCount: number;
  upcomingFixtures: Fixture[];
  recentFixtures: Fixture[];
  userRole: 'CLUB_ADMIN' | 'COACH' | 'STATS_PERSON' | 'PLAYER';
}

export default function TeamDashboardScreen() {
  const router = useRouter();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TeamDashboardData | null>(null);

  console.log('TeamDashboardScreen: Rendering team dashboard', { teamId });

  useEffect(() => {
    fetchDashboard();
  }, [teamId]);

  const fetchDashboard = async () => {
    console.log('Fetching team dashboard data...');
    setLoading(true);

    try {
      // Fetch team dashboard data from API
      const dashboardData = await authenticatedGet(`/api/teams/${teamId}/dashboard`);
      console.log('Team dashboard data fetched:', dashboardData);
      setData(dashboardData);
    } catch (error) {
      console.error('Failed to fetch team dashboard:', error);
      Alert.alert('Error', 'Failed to load team dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayers = () => {
    console.log('User tapped Add Players button');
    // TODO: Navigate to add players screen
    Alert.alert('Coming Soon', 'Add players feature will be available soon');
  };

  const handleCreateFixture = () => {
    console.log('User tapped Create Fixture button');
    // TODO: Navigate to create fixture screen
    Alert.alert('Coming Soon', 'Create fixture feature will be available soon');
  };

  const handleBuildTeam = () => {
    console.log('User tapped Build Team button');
    
    if (!data?.upcomingFixtures || data.upcomingFixtures.length === 0) {
      Alert.alert('No Fixtures', 'Please create a fixture first before building a team');
      return;
    }

    const nextFixture = data.upcomingFixtures[0];
    router.push({
      pathname: '/lineups/[fixtureId]',
      params: { fixtureId: nextFixture.id },
    });
  };

  const handleStartMatch = () => {
    console.log('User tapped Start Match button');
    
    if (!data?.upcomingFixtures || data.upcomingFixtures.length === 0) {
      Alert.alert('No Fixtures', 'Please create a fixture first');
      return;
    }

    const nextFixture = data.upcomingFixtures[0];
    router.push({
      pathname: '/match-tracker-live/[fixtureId]',
      params: { fixtureId: nextFixture.id },
    });
  };

  const handleReports = () => {
    console.log('User tapped Reports button');
    router.push({
      pathname: '/season-dashboard/[teamId]',
      params: { teamId },
    });
  };

  const canEdit = data?.userRole === 'CLUB_ADMIN' || data?.userRole === 'COACH';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading team dashboard...</Text>
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
        <Text style={styles.errorText}>Failed to load team dashboard</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDashboard}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: data.team.name,
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Team Info */}
          <View style={styles.teamInfo}>
            <Text style={styles.teamName}>{data.team.name}</Text>
            <View style={styles.teamMeta}>
              {data.team.sport && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{data.team.sport}</Text>
                </View>
              )}
              {data.team.grade && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{data.team.grade}</Text>
                </View>
              )}
              {data.team.ageGroup && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{data.team.ageGroup}</Text>
                </View>
              )}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{data.playerCount}</Text>
                <Text style={styles.statLabel}>Players</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{data.upcomingFixtures.length}</Text>
                <Text style={styles.statLabel}>Upcoming</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{data.recentFixtures.length}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              {canEdit && (
                <TouchableOpacity style={styles.actionCard} onPress={handleAddPlayers}>
                  <IconSymbol
                    ios_icon_name="person.badge.plus"
                    android_material_icon_name="person-add"
                    size={32}
                    color={colors.primary}
                  />
                  <Text style={styles.actionText}>Add Players</Text>
                </TouchableOpacity>
              )}

              {canEdit && (
                <TouchableOpacity style={styles.actionCard} onPress={handleCreateFixture}>
                  <IconSymbol
                    ios_icon_name="calendar.badge.plus"
                    android_material_icon_name="event"
                    size={32}
                    color={colors.primary}
                  />
                  <Text style={styles.actionText}>Create Fixture</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.actionCard} onPress={handleBuildTeam}>
                <IconSymbol
                  ios_icon_name="person.3.fill"
                  android_material_icon_name="group"
                  size={32}
                  color={colors.primary}
                />
                <Text style={styles.actionText}>Build Team</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard} onPress={handleStartMatch}>
                <IconSymbol
                  ios_icon_name="play.circle.fill"
                  android_material_icon_name="play-arrow"
                  size={32}
                  color={colors.primary}
                />
                <Text style={styles.actionText}>Start Match</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard} onPress={handleReports}>
                <IconSymbol
                  ios_icon_name="chart.bar.fill"
                  android_material_icon_name="assessment"
                  size={32}
                  color={colors.primary}
                />
                <Text style={styles.actionText}>Reports</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Upcoming Fixtures */}
          {data.upcomingFixtures.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Upcoming Fixtures</Text>
              <View style={styles.fixturesList}>
                {data.upcomingFixtures.map((fixture) => {
                  const fixtureDate = new Date(fixture.date);
                  const dateStr = fixtureDate.toLocaleDateString();
                  const timeStr = fixtureDate.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <View key={fixture.id} style={styles.fixtureCard}>
                      <View style={styles.fixtureInfo}>
                        <Text style={styles.fixtureOpponent}>{fixture.opponent}</Text>
                        <Text style={styles.fixtureDate}>{dateStr}</Text>
                        <Text style={styles.fixtureDate}>{timeStr}</Text>
                        {fixture.venue && (
                          <Text style={styles.fixtureVenue}>{fixture.venue}</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Empty State */}
          {data.upcomingFixtures.length === 0 && (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="event"
                size={48}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyText}>No upcoming fixtures</Text>
              {canEdit && (
                <TouchableOpacity style={styles.emptyButton} onPress={handleCreateFixture}>
                  <Text style={styles.emptyButtonText}>Create your first fixture</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
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
  teamInfo: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 12,
    gap: 16,
  },
  teamName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  teamMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '47%',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  fixturesList: {
    gap: 12,
  },
  fixtureCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
  },
  fixtureInfo: {
    gap: 4,
  },
  fixtureOpponent: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  fixtureDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  fixtureVenue: {
    fontSize: 14,
    color: colors.textSecondary,
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
});
