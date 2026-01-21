
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useRouter, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { authenticatedGet, BACKEND_URL } from '@/utils/api';
import { Fixture, Team, Club } from '@/types';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { updateTheme } = useThemeColors();
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's teams and fixtures
  const fetchData = React.useCallback(async () => {
    if (!user) {
      console.log('[Home] No user found, skipping data fetch');
      return;
    }
    
    try {
      setLoadingData(true);
      setError(null);
      console.log('[Home] Fetching teams and fixtures for user:', user.id);
      console.log('[Home] Backend URL:', BACKEND_URL);
      
      // Fetch user's clubs (returns clubs where user has membership)
      console.log('[Home] Fetching clubs...');
      const clubsResponse = await authenticatedGet<Club[]>('/api/clubs');
      console.log('[Home] Fetched clubs:', clubsResponse);
      
      if (!clubsResponse || clubsResponse.length === 0) {
        console.warn('[Home] No clubs found for user, redirecting to get-started');
        router.replace('/get-started');
        return;
      }
      
      const firstClub = clubsResponse[0];
      console.log('[Home] Using club:', firstClub.id, firstClub.name);
      
      // Note: Club colors are ignored - monochrome theme is enforced
      
      // Fetch teams for the first club
      console.log('[Home] Fetching teams for club:', firstClub.id);
      const teamsUrl = `/api/teams?clubId=${firstClub.id}`;
      console.log('[Home] Request URL:', BACKEND_URL + teamsUrl);
      
      let fetchedTeams: Team[] = [];
      try {
        const teamsResponse = await authenticatedGet<Team[]>(teamsUrl);
        console.log('[Home] Teams API response status: 200');
        console.log('[Home] Fetched teams:', teamsResponse);
        console.log('[Home] Number of teams:', teamsResponse?.length || 0);
        fetchedTeams = teamsResponse || [];
        setTeams(fetchedTeams);
      } catch (teamsError: any) {
        console.error('[Home] Failed to fetch teams:', teamsError);
        console.error('[Home] Teams error message:', teamsError?.message);
        
        // Check if it's a 404 route not found error
        if (teamsError?.message?.includes('404') || teamsError?.message?.includes('not found')) {
          console.error('[Home] 404 ERROR: GET /api/teams endpoint not found on backend');
          setError('App configuration error. The teams endpoint is not available. Please contact support.');
          return;
        }
        
        // For other errors, continue but show empty teams
        console.warn('[Home] Continuing with empty teams list due to error');
        setTeams([]);
      }
      
      // Check if we have teams after the try-catch
      if (!fetchedTeams || fetchedTeams.length === 0) {
        console.warn('[Home] No teams found for club');
        // Don't set error for empty teams - show empty state instead
        setFixtures([]);
        return;
      }
      
      // Fetch fixtures for the first team
      const firstTeam = fetchedTeams[0];
      console.log('[Home] Fetching fixtures for team:', firstTeam.id, firstTeam.name);
      const fixturesResponse = await authenticatedGet<Fixture[]>(`/api/fixtures?teamId=${firstTeam.id}`);
      console.log('[Home] Fetched fixtures:', fixturesResponse);
      setFixtures(fixturesResponse || []);
      
      console.log('[Home] Data fetch completed successfully');
    } catch (error: any) {
      console.error('[Home] Error fetching data:', error);
      console.error('[Home] Error type:', typeof error);
      console.error('[Home] Error message:', error?.message);
      console.error('[Home] Error name:', error?.name);
      console.error('[Home] Error stack:', error?.stack);
      
      let errorMessage = 'Failed to load data. Please try again.';
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      setError(errorMessage);
    } finally {
      setLoadingData(false);
    }
  }, [user, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Redirect to auth if not logged in
  if (!loading && !user) {
    return <Redirect href="/auth" />;
  }

  if (loading || loadingData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
      </View>
    );
  }

  // Get next fixture (first scheduled or in_progress fixture)
  const nextFixture = fixtures.find(f => f.status === 'scheduled' || f.status === 'in_progress');
  
  // Get most recent completed fixture
  const recentCompletedFixture = fixtures
    .filter(f => f.status === 'completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  
  // Calculate stats
  const totalMatches = fixtures.filter(f => f.status === 'completed').length;
  const totalPlayers = teams.reduce((sum, team) => sum + (team as any).playerCount || 0, 0);

  // Handler for Build Team button
  const handleBuildTeamPress = () => {
    console.log('[Home] User tapped Build Team button');
    
    if (!nextFixture) {
      console.warn('[Home] No fixture selected for Build Team');
      
      // Show alert with options
      Alert.alert(
        'No Fixture Selected',
        'You need to create or select a fixture before building a team lineup.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => console.log('[Home] User cancelled fixture creation'),
          },
          {
            text: 'Create Fixture',
            onPress: () => {
              console.log('[Home] User chose to create fixture');
              // TODO: Navigate to fixture creation screen when available
              Alert.alert('Coming Soon', 'Fixture creation screen will be available soon.');
            },
          },
        ]
      );
      return;
    }

    try {
      console.log(`[Home] Navigating to Lineups screen for fixture ${nextFixture.id}`);
      router.push(`/lineups/${nextFixture.id}` as any);
    } catch (error) {
      console.error('[Home] Error navigating to Lineups screen:', error);
      Alert.alert(
        'Navigation Error',
        'Failed to open the Team Builder. Please try again.',
        [
          {
            text: 'Retry',
            onPress: handleBuildTeamPress,
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    }
  };

  // Error state with retry
  if (error) {
    const isConfigError = error.includes('configuration error') || error.includes('not available');
    const errorIcon = isConfigError ? 'error' : 'error';
    const errorTitle = isConfigError ? 'Configuration Error' : 'Failed to Load Data';
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name={errorIcon}
            size={64}
            color={colors.danger}
          />
          <Text style={styles.errorTitle}>{errorTitle}</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          {!isConfigError && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                console.log('[Home] User tapped Retry button');
                fetchData();
              }}
            >
              <IconSymbol
                ios_icon_name="arrow.clockwise"
                android_material_icon_name="refresh"
                size={20}
                color="#fff"
              />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          )}
          {isConfigError && (
            <Text style={styles.supportText}>
              Please contact support or try again later.
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || 'Coach'}</Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role?.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity
            style={[styles.actionCard, styles.primaryAction]}
            onPress={() => {
              console.log('[Home] User tapped Start Match button');
              // If there's a next fixture, pass its ID
              if (nextFixture) {
                router.push(`/match-tracker?fixtureId=${nextFixture.id}`);
              } else {
                router.push('/match-tracker');
              }
            }}
          >
            <View style={styles.actionIcon}>
              <IconSymbol
                ios_icon_name="play.circle.fill"
                android_material_icon_name="play-circle-filled"
                size={40}
                color="#fff"
              />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Start Match Tracker</Text>
              <Text style={styles.actionSubtitle}>Record match events in real-time</Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={24}
              color="#fff"
            />
          </TouchableOpacity>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionCard, styles.secondaryAction]}
              onPress={handleBuildTeamPress}
            >
              <IconSymbol
                ios_icon_name="person.3.fill"
                android_material_icon_name="group"
                size={32}
                color={colors.primary}
              />
              <Text style={styles.secondaryActionText}>Build Team</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, styles.secondaryAction]}
              onPress={() => {
                console.log('[Home] User tapped View Reports button');
                if (recentCompletedFixture) {
                  router.push(`/match-report/${recentCompletedFixture.id}` as any);
                } else if (teams.length > 0) {
                  router.push(`/season-dashboard/${teams[0].id}` as any);
                }
              }}
            >
              <IconSymbol
                ios_icon_name="chart.bar.fill"
                android_material_icon_name="bar-chart"
                size={32}
                color={colors.primary}
              />
              <Text style={styles.secondaryActionText}>View Reports</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionCard, styles.secondaryAction]}
              onPress={() => {
                console.log('[Home] User tapped Season Dashboard button');
                if (teams.length > 0) {
                  router.push(`/season-dashboard/${teams[0].id}` as any);
                }
              }}
            >
              <IconSymbol
                ios_icon_name="chart.line.uptrend.xyaxis"
                android_material_icon_name="trending-up"
                size={32}
                color={colors.primary}
              />
              <Text style={styles.secondaryActionText}>Season Stats</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Empty state if no teams */}
        {teams.length === 0 && (
          <View style={styles.section}>
            <View style={styles.emptyCard}>
              <IconSymbol
                ios_icon_name="sportscourt"
                android_material_icon_name="sports"
                size={64}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyText}>No teams yet</Text>
              <Text style={styles.emptySubtext}>Create a team to get started with fixtures and match tracking</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  console.log('[Home] User tapped Create Team from empty state');
                  // Navigate to club dashboard or create team
                  router.push('/get-started');
                }}
              >
                <Text style={styles.retryButtonText}>Create Team</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Next Fixture */}
        {teams.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Next Fixture</Text>
            {nextFixture ? (
            <View style={styles.fixtureCard}>
              <View style={styles.fixtureHeader}>
                <Text style={styles.fixtureCompetition}>
                  {(nextFixture as any).competition?.name || 'Match'}
                </Text>
                <Text style={styles.fixtureDate}>
                  {new Date(nextFixture.date).toLocaleDateString('en-IE', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <View style={styles.fixtureMatch}>
                <Text style={styles.fixtureTeam}>
                  {teams.find(t => t.id === nextFixture.teamId)?.name || 'Your Team'}
                </Text>
                <Text style={styles.fixtureVs}>vs</Text>
                <Text style={styles.fixtureTeam}>{nextFixture.opponent}</Text>
              </View>
              {nextFixture.venue && (
                <View style={styles.fixtureFooter}>
                  <IconSymbol
                    ios_icon_name="location.fill"
                    android_material_icon_name="location-on"
                    size={16}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.fixtureVenue}>{nextFixture.venue}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="event"
                size={32}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyText}>No upcoming fixtures</Text>
              <Text style={styles.emptySubtext}>Create a team and add fixtures to get started</Text>
            </View>
          )}
          </View>
        )}

        {/* Recent Match Report */}
        {teams.length > 0 && recentCompletedFixture && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Latest Match Report</Text>
              <TouchableOpacity
                onPress={() => {
                  console.log('[Home] User tapped View Full Report');
                  router.push(`/match-report/${recentCompletedFixture.id}` as any);
                }}
              >
                <Text style={styles.viewAllText}>View Full Report</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.reportCard}
              onPress={() => {
                console.log('[Home] User tapped recent match report');
                router.push(`/match-report/${recentCompletedFixture.id}` as any);
              }}
            >
              <View style={styles.reportHeader}>
                <Text style={styles.reportOpponent}>{recentCompletedFixture.opponent}</Text>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={24}
                  color={colors.textSecondary}
                />
              </View>
              <Text style={styles.reportDate}>
                {new Date(recentCompletedFixture.date).toLocaleDateString('en-IE', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
              <View style={styles.reportActions}>
                <View style={styles.reportAction}>
                  <IconSymbol
                    ios_icon_name="chart.bar.fill"
                    android_material_icon_name="bar-chart"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.reportActionText}>View Stats</Text>
                </View>
                <View style={styles.reportAction}>
                  <IconSymbol
                    ios_icon_name="square.and.arrow.up"
                    android_material_icon_name="share"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.reportActionText}>Export</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats Overview */}
        {teams.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Season Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{totalMatches}</Text>
                <Text style={styles.statLabel}>Matches</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{fixtures.length}</Text>
                <Text style={styles.statLabel}>Fixtures</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{totalPlayers || teams.length}</Text>
                <Text style={styles.statLabel}>{totalPlayers ? 'Players' : 'Teams'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <IconSymbol
            ios_icon_name="info.circle.fill"
            android_material_icon_name="info"
            size={24}
            color={colors.primary}
          />
          <Text style={styles.infoBannerText}>
            Match tracker works offline. Your events will sync automatically when you&apos;re back online.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  actionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 3,
  },
  primaryAction: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryAction: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
  },
  secondaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  fixtureCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 3,
  },
  fixtureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  fixtureCompetition: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  fixtureDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  fixtureMatch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 12,
  },
  fixtureTeam: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  fixtureVs: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  fixtureFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  fixtureVenue: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 3,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoBanner: {
    backgroundColor: colors.highlight,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 3,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  reportCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportOpponent: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  reportDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 24,
  },
  reportAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  supportText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
});
