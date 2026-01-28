
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  ImageSourcePropType,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { authenticatedGet } from '@/utils/api';
import { Fixture, MatchSquad, TeamSide } from '@/types';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

// Helper to resolve image sources (handles both local require() and remote URLs)
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function TeamLineoutSheetScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ fixtureId?: string; side?: string }>();
  const fixtureId = params.fixtureId;
  const side = (params.side || 'home').toUpperCase() as TeamSide;

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [squad, setSquad] = useState<MatchSquad | null>(null);

  console.log('[LineoutSheet] Rendering lineout sheet screen', { fixtureId, side });

  useEffect(() => {
    if (!fixtureId) {
      console.error('[LineoutSheet] ERROR: fixtureId is missing!');
      setLoading(false);
      return;
    }
    
    fetchData();
  }, [fixtureId, side]);

  const fetchData = async () => {
    console.log('[LineoutSheet] Fetching lineout sheet data');
    setLoading(true);

    try {
      const fixtureData = await authenticatedGet<Fixture>(`/api/fixtures/${fixtureId}`);
      console.log('[LineoutSheet] Fixture data fetched:', fixtureData);
      setFixture(fixtureData);

      const squadsResponse = await authenticatedGet(`/api/fixtures/${fixtureId}/squads`);
      console.log('[LineoutSheet] Squads response:', squadsResponse);
      
      const squadsArray = Array.isArray(squadsResponse) ? squadsResponse : [];
      const squadData = squadsArray.find((s: any) => s.side === side);
      
      if (!squadData) {
        console.warn('[LineoutSheet] No squad found for side:', side);
        Alert.alert('No Lineup', 'No lineup has been created for this team yet.');
        router.back();
        return;
      }
      
      setSquad(squadData);
    } catch (error) {
      console.error('[LineoutSheet] Error fetching lineout sheet data:', error);
      Alert.alert('Error', 'Failed to load lineout sheet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPNG = async () => {
    console.log('[LineoutSheet] User tapped Export to PNG');
    setExporting(true);

    try {
      // TODO: Implement PNG export using react-native-view-shot or similar
      Alert.alert('Export', 'PNG export will be available soon');
    } catch (error) {
      console.error('[LineoutSheet] Error exporting PNG:', error);
      Alert.alert('Error', 'Failed to export PNG');
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    console.log('[LineoutSheet] User tapped Share button');
    
    if (!fixture) return;

    const teamName = side === 'HOME' 
      ? (fixture.homeTeamName || 'Home Team')
      : (fixture.awayTeamName || fixture.opponent || 'Away Team');
    
    const opponentName = side === 'HOME'
      ? (fixture.awayTeamName || fixture.opponent || 'Away Team')
      : (fixture.homeTeamName || 'Home Team');

    const fixtureDate = new Date(fixture.date);
    const dateStr = fixtureDate.toLocaleDateString();
    const timeStr = fixtureDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const message = `${teamName} Team Lineup\nvs ${opponentName}\n${dateStr} at ${timeStr}\n${fixture.venue || ''}`;

    try {
      await Share.share({
        message,
      });
    } catch (error) {
      console.error('[LineoutSheet] Error sharing:', error);
    }
  };

  if (!fixtureId) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Lineout Sheet', headerShown: true }} />
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="error"
            size={48}
            color="#FF0000"
          />
          <Text style={styles.errorTitle}>No Fixture Selected</Text>
          <Text style={styles.errorText}>Please select a fixture to view the lineout sheet.</Text>
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
        <Stack.Screen options={{ title: 'Lineout Sheet', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading lineout sheet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!fixture || !squad) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Lineout Sheet', headerShown: true }} />
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="error"
            size={48}
            color="#FF0000"
          />
          <Text style={styles.errorTitle}>Lineup Not Found</Text>
          <Text style={styles.errorText}>Could not load lineup data.</Text>
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

  const teamName = side === 'HOME' 
    ? (fixture.homeTeamName || 'Home Team')
    : (fixture.awayTeamName || fixture.opponent || 'Away Team');
  
  const opponentName = side === 'HOME'
    ? (fixture.awayTeamName || fixture.opponent || 'Away Team')
    : (fixture.homeTeamName || 'Home Team');

  const crestUrl = side === 'HOME'
    ? (fixture.homeCrestImageUrl || fixture.homeCrestUrl)
    : (fixture.awayCrestImageUrl || fixture.awayCrestUrl);

  const jerseyUrl = side === 'HOME'
    ? fixture.homeJerseyImageUrl
    : fixture.awayJerseyImageUrl;

  const colours = side === 'HOME'
    ? fixture.homeColours
    : fixture.awayColours;

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
          title: 'Team Lineout Sheet',
          headerBackTitle: 'Back',
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 12, marginRight: 8 }}>
              <TouchableOpacity onPress={handleShare}>
                <IconSymbol
                  ios_icon_name="square.and.arrow.up"
                  android_material_icon_name="share"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Poster Header */}
          <View style={styles.posterHeader}>
            <View style={styles.headerTop}>
              {crestUrl && (
                <Image
                  source={resolveImageSource(crestUrl)}
                  style={styles.headerCrest}
                  resizeMode="contain"
                />
              )}
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>{teamName}</Text>
                <Text style={styles.headerSubtitle}>vs {opponentName}</Text>
              </View>
              {jerseyUrl && (
                <Image
                  source={resolveImageSource(jerseyUrl)}
                  style={styles.headerJersey}
                  resizeMode="contain"
                />
              )}
            </View>

            <View style={styles.headerMeta}>
              <Text style={styles.metaText}>{dateStr}</Text>
              <Text style={styles.metaText}>Throw-in: {timeStr}</Text>
              {fixture.venue && (
                <Text style={styles.metaText}>{fixture.venue}</Text>
              )}
              {colours && (
                <Text style={styles.metaText}>Colours: {colours}</Text>
              )}
            </View>
          </View>

          {/* Starting 15 Grid */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Starting 15</Text>
            <View style={styles.lineupGrid}>
              {squad.startingSlots.map((slot, index) => {
                const hasPlayer = !!slot.playerId;
                const displayNumber = slot.jerseyNo || slot.positionNo.toString();
                const displayName = slot.playerName || 'TBC';
                const positionName = slot.positionName;

                return (
                  <View key={index} style={styles.playerCard}>
                    <View style={styles.playerCardHeader}>
                      <Text style={styles.playerCardNumber}>{displayNumber}</Text>
                      <Text style={styles.playerCardPosition}>{positionName}</Text>
                    </View>
                    <Text style={[styles.playerCardName, !hasPlayer && styles.tbcText]}>
                      {displayName}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Bench */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Substitutes</Text>
            <View style={styles.benchGrid}>
              {squad.bench.map((slot, index) => {
                const hasPlayer = !!slot.playerId;
                const displayNumber = slot.jerseyNo || (index + 16).toString();
                const displayName = slot.playerName || 'TBC';

                return (
                  <View key={index} style={styles.benchCard}>
                    <Text style={styles.benchCardNumber}>{displayNumber}</Text>
                    <Text style={[styles.benchCardName, !hasPlayer && styles.tbcText]}>
                      {displayName}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Export Button */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExportPNG}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="arrow.down.doc"
                  android_material_icon_name="download"
                  size={24}
                  color="#FFFFFF"
                />
                <Text style={styles.exportButtonText}>Export to PNG</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
  posterHeader: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    gap: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  headerCrest: {
    width: 60,
    height: 60,
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  headerJersey: {
    width: 60,
    height: 60,
  },
  headerMeta: {
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  lineupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  playerCard: {
    width: '31%',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  playerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerCardNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  playerCardPosition: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'right',
    flex: 1,
  },
  playerCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  tbcText: {
    fontStyle: 'italic',
    color: colors.textSecondary,
  },
  benchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  benchCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  benchCardNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    width: 32,
  },
  benchCardName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  actionButtons: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  exportButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
