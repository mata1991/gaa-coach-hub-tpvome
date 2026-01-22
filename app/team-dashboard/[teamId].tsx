
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
import { Stack, useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { FixturePicker } from '@/components/FixturePicker';
import { authenticatedGet, authenticatedDelete, authenticatedPost } from '@/utils/api';
import { Team, Fixture, Club } from '@/types';
import { getSportDisplayName } from '@/constants/EventPresets';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<TeamDashboardData | null>(null);
  const [showFixturePicker, setShowFixturePicker] = useState(false);
  const [fixturePickerMode, setFixturePickerMode] = useState<'build' | 'start'>('build');

  console.log('TeamDashboardScreen: Rendering team dashboard', { teamId });

  const fetchDashboard = React.useCallback(async (isRefresh = false) => {
    console.log('Fetching team dashboard data...', { isRefresh });
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const dashboardData = await authenticatedGet(`/api/teams/${teamId}/dashboard`);
      console.log('Team dashboard data fetched:', dashboardData);
      setData(dashboardData);
    } catch (error) {
      console.error('Failed to fetch team dashboard:', error);
      Alert.alert('Error', 'Failed to load team dashboard');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [teamId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Auto-refresh on screen focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('[TeamDashboard] Screen focused, refreshing data');
      fetchDashboard(true);
    }, [fetchDashboard])
  );

  const handleRefresh = () => {
    console.log('[TeamDashboard] User tapped Refresh button');
    fetchDashboard(true);
  };

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
    console.log('[TeamDashboard] User tapped Start Match button');
    
    if (!data?.upcomingFixtures || data.upcomingFixtures.length === 0) {
      console.log('[TeamDashboard] No fixtures available, showing create fixture prompt');
      Alert.alert(
        'No Fixtures',
        'You need to create a fixture before starting a match.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Create Fixture',
            onPress: () => {
              console.log('[TeamDashboard] User chose to create fixture');
              handleCreateFixture();
            },
          },
        ]
      );
      return;
    }

    console.log('[TeamDashboard] Found', data.upcomingFixtures.length, 'upcoming fixtures');

    if (data.upcomingFixtures.length === 1) {
      const fixture = data.upcomingFixtures[0];
      console.log('[TeamDashboard] Single fixture found, checking lineups for:', fixture.opponent);
      await checkLineupsAndStartMatch(fixture.id);
    } else {
      console.log('[TeamDashboard] Multiple fixtures found, showing fixture picker');
      setFixturePickerMode('start');
      setShowFixturePicker(true);
    }
  };

  const checkLineupsAndStartMatch = async (fixtureId: string) => {
    console.log('[TeamDashboard] Checking squad status for fixture:', fixtureId);
    console.log('[TeamDashboard] Request URL:', `/api/fixtures/${fixtureId}/squad-status`);

    try {
      const response = await authenticatedGet<{ homeReady: boolean; awayReady: boolean }>(`/api/fixtures/${fixtureId}/squad-status`);
      console.log('[TeamDashboard] Squad status response:', response);
      console.log('[TeamDashboard] Response status code: 200');
      console.log('[TeamDashboard] Response body:', JSON.stringify(response));

      const homeReady = response.homeReady || false;
      const awayReady = response.awayReady || false;

      if (!homeReady || !awayReady) {
        // Squads are missing, show alert and navigate to lineup screen
        const missingSquads = [];
        if (!homeReady) missingSquads.push('HOME');
        if (!awayReady) missingSquads.push('AWAY');
        
        const missingText = missingSquads.join(' and ');
        const squadWord = missingSquads.length > 1 ? 'squads' : 'squad';
        
        console.log('[TeamDashboard] Missing squads:', missingText);
        
        let message = `${missingText} ${squadWord} must be created before starting the match.\n\n`;
        if (!homeReady && !awayReady) {
          message += 'Create both HOME and AWAY squads in the Team Line Out screen.';
        } else if (!homeReady) {
          message += 'Switch to the HOME tab and add players to create the squad.';
        } else {
          message += 'Switch to the AWAY tab and add players (or use placeholders) to create the squad.';
        }
        
        Alert.alert(
          'Squads Required',
          message,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Create Squads',
              onPress: () => {
                console.log('[TeamDashboard] Navigating to Team Line Out screen to create squads');
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

      // Both squads exist, proceed to start match
      console.log('[TeamDashboard] Both squads ready, starting match');
      try {
        const startResponse = await authenticatedPost(`/api/fixtures/${fixtureId}/match-state/start`, {});
        console.log('[TeamDashboard] Match started successfully:', startResponse);
        console.log('[TeamDashboard] Navigating to live match tracker');
        
        router.push({
          pathname: '/match-tracker-live/[fixtureId]',
          params: { fixtureId },
        });
        console.log('[TeamDashboard] Navigation to match tracker initiated');
      } catch (startError: any) {
        console.error('[TeamDashboard] Failed to start match:', startError);
        console.error('[TeamDashboard] Start error message:', startError?.message);
        console.error('[TeamDashboard] Start error status:', startError?.status);
        
        // If we get a 400 error about squads, show the squad setup screen
        if (startError?.status === 400 && startError?.message?.includes('squad')) {
          console.log('[TeamDashboard] Backend returned 400 - squads issue, navigating to lineup screen');
          Alert.alert(
            'Squads Required',
            'Both HOME and AWAY squads must be created before starting the match. Please ensure both squads have been saved with at least one player each.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Create Squads',
                onPress: () => {
                  router.push({
                    pathname: '/lineups/[fixtureId]',
                    params: { fixtureId, teamId },
                  });
                },
              },
            ]
          );
        } else {
          Alert.alert(
            'Error',
            `Failed to start match: ${startError?.message || 'Unknown error'}`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error: any) {
      console.error('[TeamDashboard] Failed to check squad status:', error);
      console.error('[TeamDashboard] Error message:', error?.message);
      console.error('[TeamDashboard] Error status:', error?.status);
      console.error('[TeamDashboard] Error stack:', error?.stack);

      // Check for specific error types
      if (error?.status === 401 || error?.status === 403 || error?.message?.includes('401') || error?.message?.includes('403')) {
        console.log('[TeamDashboard] Authentication error detected (401/403)');
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [
            {
              text: 'OK',
              onPress: () => {
                router.push('/auth');
              },
            },
          ]
        );
      } else if (error?.status === 404 || error?.message?.includes('404') || error?.message?.includes('not found')) {
        console.log('[TeamDashboard] 404 error - route not found or fixture does not exist');
        Alert.alert(
          'Error',
          'Could not find fixture or squad status. Please try again or contact support.',
          [
            { text: 'OK' },
          ]
        );
      } else if (error?.message?.includes('Network') || error?.message?.includes('fetch') || error?.message?.includes('Failed to fetch')) {
        console.log('[TeamDashboard] Network error detected, checking for cached squads');
        
        // Check if there's a cached squad for offline use
        try {
          const cachedSquadsKey = `match-squads-${fixtureId}`;
          const cachedSquads = await AsyncStorage.getItem(cachedSquadsKey);
          
          if (cachedSquads) {
            const squads = JSON.parse(cachedSquads);
            const homeReady = squads && squads.home;
            const awayReady = squads && squads.away;
            
            if (homeReady && awayReady) {
              console.log('[TeamDashboard] Found cached squads, allowing offline match tracker');
              Alert.alert(
                'Offline Mode',
                'You are offline. Using cached squad data. Match events will be synced when you reconnect.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Start Match',
                    onPress: () => {
                      router.push({
                        pathname: '/match-tracker-live/[fixtureId]',
                        params: { fixtureId },
                      });
                    },
                  },
                ]
              );
              return;
            }
          }
          
          console.log('[TeamDashboard] No cached squads found or incomplete');
          Alert.alert(
            'Squads Required',
            'Squads required to start match. Please connect to the internet to create squads.',
            [
              { text: 'OK' },
            ]
          );
        } catch (cacheError) {
          console.error('[TeamDashboard] Error checking cached squads:', cacheError);
          Alert.alert(
            'Could Not Reach Server',
            'Could not reach server. Please check your connection and try again.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Retry',
                onPress: () => checkLineupsAndStartMatch(fixtureId),
              },
            ]
          );
        }
      } else {
        console.log('[TeamDashboard] Unknown error type');
        Alert.alert(
          'Error',
          'An unexpected error occurred. Please try again.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Retry',
              onPress: () => checkLineupsAndStartMatch(fixtureId),
            },
          ]
        );
      }
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

  const handleDeleteFixture = (fixture: Fixture) => {
    console.log('[TeamDashboard] User tapped Delete Fixture:', fixture.id);
    Alert.alert(
      'Delete Fixture',
      `Are you sure you want to delete the fixture against ${fixture.opponent}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('[TeamDashboard] Deleting fixture:', fixture.id);
            
            try {
              await authenticatedDelete(`/api/fixtures/${fixture.id}`);
              console.log('[TeamDashboard] Fixture deleted successfully');
              
              // Optimistically update the UI by removing the fixture from the list
              if (data) {
                setData({
                  ...data,
                  upcomingFixtures: data.upcomingFixtures.filter(f => f.id !== fixture.id),
                });
              }
              
              Alert.alert('Success', 'Fixture deleted successfully');
            } catch (error) {
              console.error('[TeamDashboard] Failed to delete fixture:', error);
              Alert.alert('Error', 'Failed to delete fixture. Please try again.');
              // Refetch to restore the correct state
              fetchDashboard();
            }
          },
        },
      ]
    );
  };

  const handleEditTeam = () => {
    console.log('[TeamDashboard] User tapped Edit Team button');
    console.log('[TeamDashboard] Navigating to edit-team with teamId:', teamId);
    
    if (!teamId) {
      console.error('[TeamDashboard] ERROR: teamId is missing!');
      Alert.alert('Error', 'Team ID is missing. Please go back and select a team.');
      return;
    }
    
    try {
      router.push({
        pathname: '/edit-team/[teamId]',
        params: { teamId },
      });
      console.log('[TeamDashboard] Navigation initiated successfully');
    } catch (error) {
      console.error('[TeamDashboard] Navigation failed:', error);
      Alert.alert('Error', 'Failed to open Edit Team screen. Please try again.');
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
            <View style={{ flexDirection: 'row', gap: 12, marginRight: 8 }}>
              <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
                {refreshing ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <IconSymbol
                    ios_icon_name="arrow.clockwise"
                    android_material_icon_name="refresh"
                    size={24}
                    color="#000"
                  />
                )}
              </TouchableOpacity>
              {canEdit && (
                <TouchableOpacity onPress={handleEditTeam}>
                  <IconSymbol
                    ios_icon_name="pencil"
                    android_material_icon_name="edit"
                    size={24}
                    color="#000"
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleSwitchTeam}>
                <IconSymbol
                  ios_icon_name="arrow.triangle.2.circlepath"
                  android_material_icon_name="swap-horiz"
                  size={24}
                  color="#000"
                />
              </TouchableOpacity>
            </View>
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
                    <View key={fixture.id} style={styles.fixtureCard}>
                      <TouchableOpacity
                        style={styles.fixtureCardContent}
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
                      {canEdit && (
                        <TouchableOpacity
                          style={styles.deleteFixtureButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDeleteFixture(fixture);
                          }}
                        >
                          <IconSymbol
                            ios_icon_name="trash"
                            android_material_icon_name="delete"
                            size={20}
                            color="#dc3545"
                          />
                        </TouchableOpacity>
                      )}
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  fixtureCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  deleteFixtureButton: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
    backgroundColor: '#fff',
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
