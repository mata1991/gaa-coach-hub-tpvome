
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
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { FixturePicker } from '@/components/FixturePicker';
import { authenticatedGet } from '@/utils/api';
import { Team, Fixture, Club } from '@/types';
import { getSportDisplayName } from '@/constants/EventPresets';

// Helper to resolve image sources (handles both local and remote)
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

interface TeamDashboardData {
  team: Team;
  club?: Club;
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
  const [showFixturePicker, setShowFixturePicker] = useState(false);
  const [fixturePickerMode, setFixturePickerMode] = useState<'build' | 'start'>('build');

  console.log('TeamDashboardScreen: Rendering team dashboard', { teamId });

  const fetchDashboard = React.useCallback(async () => {
    console.log('Fetching team dashboard data...');
    setLoading(true);

    try {
      const dashboardData = await authenticatedGet(`/api/teams/${teamId}/dashboard`);
      console.log('Team dashboard data fetched:', dashboardData);
      setData(dashboardData);
    } catch (error) {
      console.error('Failed to fetch team dashboard:', error);
      Alert.alert('Error', 'Failed to load team dashboard');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleSwitchTeam = () => {
    console.log('User tapped Switch Team button');
    router.push('/select-team');
  };

  const handleAddPlayers = () => {
    console.log('User tapped Add Players button');
    router.push({
      pathname: '/players/[teamId]',
      params: { teamId },
    });
  };

  const handleCreateFixture = () => {
    console.log('User tapped Create Fixture button');
    router.push({
      pathname: '/create-fixture/[teamId]',
      params: { teamId },
    });
  };

  const handleTeamLineOut = () => {
    console.log('User tapped Team Line Out button');
    
    // Include both upcoming and draft fixtures for team line out
    const availableFixtures = data?.upcomingFixtures || [];
    
    if (availableFixtures.length === 0) {
      console.log('[TeamDashboard] No fixtures available, showing alert');
      Alert.alert(
        'No Fixtures',
        'You need to create a fixture before setting up your team line out.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Create Fixture',
            onPress: handleCreateFixture,
          },
        ]
      );
      return;
    }

    if (availableFixtures.length === 1) {
      const fixture = availableFixtures[0];
      console.log('[TeamDashboard] Navigating to lineups for fixture:', fixture.id);
      router.push({
        pathname: '/lineups/[fixtureId]',
        params: { fixtureId: fixture.id, teamId },
      });
    } else {
      console.log('[TeamDashboard] Multiple fixtures found, showing picker');
      setFixturePickerMode('build');
      setShowFixturePicker(true);
    }
  };

  const handleTrainingSessions = () => {
    console.log('User tapped Training Sessions button');
    router.push({
      pathname: '/training-sessions/[teamId]',
      params: { teamId },
    });
  };

  const handleStartMatch = async () => {
    console.log('User tapped Start Match button');
    
    if (!data?.upcomingFixtures || data.upcomingFixtures.length === 0) {
      Alert.alert(
        'No Fixtures',
        'You need to create a fixture before starting a match.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Create Fixture',
            onPress: handleCreateFixture,
          },
        ]
      );
      return;
    }

    if (data.upcomingFixtures.length === 1) {
      const fixture = data.upcomingFixtures[0];
      await checkLineupsAndStartMatch(fixture.id);
    } else {
      console.log('Multiple fixtures found, showing picker');
      setFixturePickerMode('start');
      setShowFixturePicker(true);
    }
  };

  const checkLineupsAndStartMatch = async (fixtureId: string) => {
    console.log('Checking lineups for fixture:', fixtureId);

    try {
      const squads = await authenticatedGet(`/api/match-squads?fixtureId=${fixtureId}`);
      console.log('Squads fetched:', squads);

      if (!squads || squads.length === 0) {
        Alert.alert(
          'No Lineups',
          'You need to build your team before starting the match.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Build Team',
              onPress: () => {
                router.push({
                  pathname: '/lineups/[fixtureId]',
                  params: { fixtureId, teamId },
                });
              },
            },
          ]
        );
        return;
      }

      console.log('Lineups found, navigating to live match');
      router.push({
        pathname: '/match-tracker-live/[fixtureId]',
        params: { fixtureId },
      });
    } catch (error) {
      console.error('Failed to check lineups:', error);
      Alert.alert('Error', 'Failed to check lineups. Please try again.');
    }
  };

  const handleReports = () => {
    console.log('User tapped Reports button');
    router.push({
      pathname: '/reports/[teamId]',
      params: { teamId },
    });
  };

  const handleFixtureSelected = (fixture: Fixture) => {
    console.log('Fixture selected from picker:', fixture.opponent);
    setShowFixturePicker(false);

    if (fixturePickerMode === 'build') {
      router.push({
        pathname: '/lineups/[fixtureId]',
        params: { fixtureId: fixture.id, teamId },
      });
    } else {
      checkLineupsAndStartMatch(fixture.id);
    }
  };

  const canEdit = data?.userRole === 'CLUB_ADMIN' || data?.userRole === 'COACH';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
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
          color="#dc3545"
        />
        <Text style={styles.errorText}>Failed to load team dashboard</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDashboard}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const upcomingCount = data.upcomingFixtures.length.toString();
  const completedCount = data.recentFixtures.length.toString();
  const playerCountStr = data.playerCount.toString();
  
  // Determine crest URL (club crest has priority, then team crest)
  const crestUrl = data.club?.crestUrl || data.team.crestUrl;
  const hasCrest = !!crestUrl;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: data.team.name,
          headerBackTitle: 'Back',
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSwitchTeam}
              style={{ marginRight: 8 }}
            >
              <IconSymbol
                ios_icon_name="arrow.triangle.2.circlepath"
                android_material_icon_name="swap-horiz"
                size={24}
                color="#000"
              />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Team Info */}
          <View style={styles.teamInfo}>
            <View style={styles.teamHeader}>
              <View style={styles.teamCrestContainer}>
                {hasCrest ? (
                  <Image
                    source={resolveImageSource(crestUrl)}
                    style={styles.teamCrest}
                    resizeMode="contain"
                    onError={() => console.log('[TeamDashboard] Failed to load crest image')}
                  />
                ) : (
                  <IconSymbol
                    ios_icon_name="shield.fill"
                    android_material_icon_name="shield"
                    size={32}
                    color="#000"
                  />
                )}
              </View>
              <Text style={styles.teamName}>{data.team.name}</Text>
            </View>
            <View style={styles.teamMeta}>
              {data.team.sport && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{getSportDisplayName(data.team.sport)}</Text>
                </View>
              )}
              {data.team.grade && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{data.team.grade}</Text>
                </View>
              )}
              {data.team.ageGroup && data.team.ageGroup !== data.team.grade && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{data.team.ageGroup}</Text>
                </View>
              )}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{playerCountStr}</Text>
                <Text style={styles.statLabel}>Players</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{upcomingCount}</Text>
                <Text style={styles.statLabel}>Upcoming</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{completedCount}</Text>
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
                    color="#000"
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
                    color="#000"
                  />
                  <Text style={styles.actionText}>Create Fixture</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.actionCard} onPress={handleTeamLineOut}>
                <IconSymbol
                  ios_icon_name="person.3.fill"
                  android_material_icon_name="group"
                  size={32}
                  color="#000"
                />
                <Text style={styles.actionText}>Team Line Out</Text>
              </TouchableOpacity>

              {canEdit && (
                <TouchableOpacity style={styles.actionCard} onPress={handleTrainingSessions}>
                  <IconSymbol
                    ios_icon_name="figure.run"
                    android_material_icon_name="directions-run"
                    size={32}
                    color="#000"
                  />
                  <Text style={styles.actionText}>Training Sessions</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.actionCard} onPress={handleStartMatch}>
                <IconSymbol
                  ios_icon_name="play.circle.fill"
                  android_material_icon_name="play-arrow"
                  size={32}
                  color="#000"
                />
                <Text style={styles.actionText}>Start Match</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard} onPress={handleReports}>
                <IconSymbol
                  ios_icon_name="chart.bar.fill"
                  android_material_icon_name="assessment"
                  size={32}
                  color="#000"
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
                    <TouchableOpacity
                      key={fixture.id}
                      style={styles.fixtureCard}
                      onPress={() => {
                        console.log('[TeamDashboard] User tapped fixture:', fixture.id);
                        router.push({
                          pathname: '/edit-fixture/[fixtureId]',
                          params: { fixtureId: fixture.id, teamId },
                        });
                      }}
                    >
                      <View style={styles.fixtureInfo}>
                        <Text style={styles.fixtureOpponent}>{fixture.opponent}</Text>
                        <Text style={styles.fixtureDate}>{dateStr}</Text>
                        <Text style={styles.fixtureDate}>{timeStr}</Text>
                        {fixture.venue && (
                          <Text style={styles.fixtureVenue}>{fixture.venue}</Text>
                        )}
                      </View>
                      <IconSymbol
                        ios_icon_name="chevron.right"
                        android_material_icon_name="chevron-right"
                        size={20}
                        color="#666"
                      />
                    </TouchableOpacity>
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
                color="#666"
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

        {/* Fixture Picker Modal */}
        <FixturePicker
          visible={showFixturePicker}
          fixtures={data.upcomingFixtures}
          onSelect={handleFixtureSelected}
          onClose={() => setShowFixturePicker(false)}
          title={fixturePickerMode === 'build' ? 'Select Fixture for Team Line Out' : 'Select Fixture to Start Match'}
        />
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
    padding: 16,
    gap: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#000',
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 20,
    borderRadius: 12,
    gap: 16,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  teamCrestContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  teamCrest: {
    width: 40,
    height: 40,
  },
  teamName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  teamMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
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
    color: '#000',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
    color: '#000',
    textAlign: 'center',
  },
  fixturesList: {
    gap: 12,
  },
  fixtureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  fixtureInfo: {
    flex: 1,
    gap: 4,
  },
  fixtureOpponent: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  fixtureDate: {
    fontSize: 14,
    color: '#666',
  },
  fixtureVenue: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  emptyButton: {
    backgroundColor: '#000',
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
