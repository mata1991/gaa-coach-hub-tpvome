
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { authenticatedGet } from '@/utils/api';
import { Fixture, MatchState } from '@/types';

// Helper to resolve image sources (handles both local require() and remote URLs)
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function FixtureDetailScreen() {
  const router = useRouter();
  const { fixtureId } = useLocalSearchParams<{ fixtureId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [selectedTab, setSelectedTab] = useState<'home' | 'away'>('home');

  console.log('[FixtureDetail] Rendering fixture detail screen', { fixtureId });

  const fetchData = useCallback(async () => {
    console.log('[FixtureDetail] Fetching fixture data');
    setLoading(true);

    try {
      const fixtureData = await authenticatedGet<Fixture>(`/api/fixtures/${fixtureId}`);
      console.log('[FixtureDetail] Fixture data fetched:', fixtureData);
      setFixture(fixtureData);

      // Try to fetch match state if match has started
      try {
        const stateData = await authenticatedGet<MatchState>(`/api/fixtures/${fixtureId}/match-state`);
        console.log('[FixtureDetail] Match state fetched:', stateData);
        setMatchState(stateData);
      } catch (error) {
        console.log('[FixtureDetail] No match state yet (match not started)');
        setMatchState(null);
      }
    } catch (error) {
      console.error('[FixtureDetail] Failed to fetch fixture:', error);
    } finally {
      setLoading(false);
    }
  }, [fixtureId]);

  useEffect(() => {
    if (!fixtureId) {
      console.error('[FixtureDetail] ERROR: fixtureId is missing!');
      setLoading(false);
      return;
    }
    
    fetchData();
  }, [fixtureId, fetchData]);

  const handleTeamLineOut = () => {
    console.log('[FixtureDetail] User tapped Team Line Out button');
    const side = selectedTab === 'home' ? 'home' : 'away';
    router.push({
      pathname: '/team-lineout/[fixtureId]',
      params: { fixtureId, side },
    });
  };

  const handleEditNumbers = () => {
    console.log('[FixtureDetail] User tapped Edit Numbers button');
    // Navigate to lineup editor with edit mode
    const side = selectedTab === 'home' ? 'home' : 'away';
    router.push({
      pathname: '/team-lineout/[fixtureId]',
      params: { fixtureId, side, mode: 'edit' },
    });
  };

  const handleExport = () => {
    console.log('[FixtureDetail] User tapped Export button');
    const side = selectedTab === 'home' ? 'home' : 'away';
    router.push({
      pathname: '/team-lineout-sheet/[fixtureId]',
      params: { fixtureId, side },
    });
  };

  if (!fixtureId) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Fixture', headerShown: true }} />
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="error"
            size={48}
            color="#FF0000"
          />
          <Text style={styles.errorTitle}>No Fixture Selected</Text>
          <Text style={styles.errorText}>Please select a fixture to view details.</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => router.back()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Fixture', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading fixture...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!fixture) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Fixture', headerShown: true }} />
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="error"
            size={48}
            color="#FF0000"
          />
          <Text style={styles.errorTitle}>Fixture Not Found</Text>
          <Text style={styles.errorText}>Could not load fixture details.</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => router.back()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Format score in GAA format (goals-points)
  const homeGoals = matchState?.homeGoals || 0;
  const homePoints = matchState?.homePoints || 0;
  const awayGoals = matchState?.awayGoals || 0;
  const awayPoints = matchState?.awayPoints || 0;
  
  const homeScore = `${homeGoals}-${homePoints.toString().padStart(2, '0')}`;
  const awayScore = `${awayGoals}-${awayPoints.toString().padStart(2, '0')}`;
  
  const homeTotal = homeGoals * 3 + homePoints;
  const awayTotal = awayGoals * 3 + awayPoints;
  
  const homeTotalText = `(${homeTotal})`;
  const awayTotalText = `(${awayTotal})`;

  // Get team names
  const homeTeamName = fixture.homeTeamName || 'Home Team';
  const awayTeamName = fixture.awayTeamName || fixture.opponent || 'Away Team';
  
  // Get crests and jerseys
  const homeCrestUrl = fixture.homeCrestImageUrl || fixture.homeCrestUrl;
  const awayCrestUrl = fixture.awayCrestImageUrl || fixture.awayCrestUrl;
  const homeJerseyUrl = fixture.homeJerseyImageUrl;
  const awayJerseyUrl = fixture.awayJerseyImageUrl;
  
  // Format date and time
  const fixtureDate = new Date(fixture.date);
  const dateStr = fixtureDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = fixtureDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Fixture Details',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Score Header */}
          <View style={styles.scoreHeader}>
            <View style={styles.teamScore}>
              {homeCrestUrl && (
                <Image
                  source={resolveImageSource(homeCrestUrl)}
                  style={styles.teamCrest}
                  resizeMode="contain"
                />
              )}
              <Text style={styles.teamName}>{homeTeamName}</Text>
              <Text style={styles.score}>{homeScore}</Text>
              <Text style={styles.total}>{homeTotalText}</Text>
            </View>

            <Text style={styles.vs}>vs</Text>

            <View style={styles.teamScore}>
              {awayCrestUrl && (
                <Image
                  source={resolveImageSource(awayCrestUrl)}
                  style={styles.teamCrest}
                  resizeMode="contain"
                />
              )}
              <Text style={styles.teamName}>{awayTeamName}</Text>
              <Text style={styles.score}>{awayScore}</Text>
              <Text style={styles.total}>{awayTotalText}</Text>
            </View>
          </View>

          {/* Fixture Meta */}
          <View style={styles.metaCard}>
            <View style={styles.metaRow}>
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="event"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={styles.metaText}>{dateStr}</Text>
            </View>
            <View style={styles.metaRow}>
              <IconSymbol
                ios_icon_name="clock"
                android_material_icon_name="access-time"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={styles.metaText}>Throw-in: {timeStr}</Text>
            </View>
            {fixture.venue && (
              <View style={styles.metaRow}>
                <IconSymbol
                  ios_icon_name="location"
                  android_material_icon_name="place"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text style={styles.metaText}>{fixture.venue}</Text>
              </View>
            )}
          </View>

          {/* Home/Away Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'home' && styles.activeTab]}
              onPress={() => setSelectedTab('home')}
            >
              <Text style={[styles.tabText, selectedTab === 'home' && styles.activeTabText]}>
                Home
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'away' && styles.activeTab]}
              onPress={() => setSelectedTab('away')}
            >
              <Text style={[styles.tabText, selectedTab === 'away' && styles.activeTabText]}>
                Away
              </Text>
            </TouchableOpacity>
          </View>

          {/* Team Details */}
          <View style={styles.teamDetails}>
            {selectedTab === 'home' ? (
              <>
                <View style={styles.teamHeader}>
                  {homeCrestUrl && (
                    <Image
                      source={resolveImageSource(homeCrestUrl)}
                      style={styles.largeCrest}
                      resizeMode="contain"
                    />
                  )}
                  <Text style={styles.largeTeamName}>{homeTeamName}</Text>
                  {fixture.homeColours && (
                    <Text style={styles.colours}>{fixture.homeColours}</Text>
                  )}
                </View>
                {homeJerseyUrl && (
                  <View style={styles.jerseyPreview}>
                    <Text style={styles.jerseyLabel}>Jersey</Text>
                    <Image
                      source={resolveImageSource(homeJerseyUrl)}
                      style={styles.jerseyImage}
                      resizeMode="contain"
                    />
                  </View>
                )}
              </>
            ) : (
              <>
                <View style={styles.teamHeader}>
                  {awayCrestUrl && (
                    <Image
                      source={resolveImageSource(awayCrestUrl)}
                      style={styles.largeCrest}
                      resizeMode="contain"
                    />
                  )}
                  <Text style={styles.largeTeamName}>{awayTeamName}</Text>
                  {fixture.awayColours && (
                    <Text style={styles.colours}>{fixture.awayColours}</Text>
                  )}
                </View>
                {awayJerseyUrl && (
                  <View style={styles.jerseyPreview}>
                    <Text style={styles.jerseyLabel}>Jersey</Text>
                    <Image
                      source={resolveImageSource(awayJerseyUrl)}
                      style={styles.jerseyImage}
                      resizeMode="contain"
                    />
                  </View>
                )}
              </>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleTeamLineOut}
            >
              <IconSymbol
                ios_icon_name="person.3.fill"
                android_material_icon_name="group"
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.primaryButtonText}>Team Line Out</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleEditNumbers}
            >
              <IconSymbol
                ios_icon_name="number"
                android_material_icon_name="edit"
                size={24}
                color={colors.text}
              />
              <Text style={styles.secondaryButtonText}>Edit Numbers</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleExport}
            >
              <IconSymbol
                ios_icon_name="square.and.arrow.up"
                android_material_icon_name="share"
                size={24}
                color={colors.text}
              />
              <Text style={styles.secondaryButtonText}>Export</Text>
            </TouchableOpacity>
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
    padding: 24,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  teamScore: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  teamCrest: {
    width: 48,
    height: 48,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  score: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  },
  total: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  vs: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textSecondary,
    marginHorizontal: 16,
  },
  metaCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  teamDetails: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  teamHeader: {
    alignItems: 'center',
    gap: 12,
  },
  largeCrest: {
    width: 80,
    height: 80,
  },
  largeTeamName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  colours: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  jerseyPreview: {
    alignItems: 'center',
    gap: 8,
  },
  jerseyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  jerseyImage: {
    width: 100,
    height: 100,
  },
  actionButtons: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.card,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
