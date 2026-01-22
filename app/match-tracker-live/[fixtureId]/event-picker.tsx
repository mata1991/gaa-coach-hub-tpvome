
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
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { authenticatedGet } from '@/utils/api';
import { MatchSquad, MatchState, TeamSide } from '@/types';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  grid: {
    gap: 12,
  },
  eventButton: {
    minHeight: 80,
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#FF0000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sideRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sideButton: {
    flex: 1,
    minHeight: 80,
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#FF0000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#FF0000',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  playerNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playerNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  playerPosition: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  skipButton: {
    minHeight: 60,
    backgroundColor: '#FF0000',
    borderWidth: 2,
    borderColor: '#FF0000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  skipButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  noPlayersText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 24,
  },
});

const EVENT_TYPES = [
  { name: 'Point', category: 'Scoring' },
  { name: 'Goal', category: 'Scoring' },
  { name: 'Wide', category: 'Scoring' },
  { name: 'Saved', category: 'Scoring' },
  { name: 'Dropped Short', category: 'Scoring' },
  { name: 'Blocked', category: 'Scoring' },
];

export default function EventPickerScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const fixtureId = params.fixtureId as string;

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'event' | 'side' | 'player'>('event');
  const [selectedEvent, setSelectedEvent] = useState<{ name: string; category: string } | null>(null);
  const [selectedSide, setSelectedSide] = useState<TeamSide | null>(null);
  const [homeSquad, setHomeSquad] = useState<MatchSquad | null>(null);
  const [awaySquad, setAwaySquad] = useState<MatchSquad | null>(null);
  const [matchState, setMatchState] = useState<MatchState | null>(null);

  useEffect(() => {
    fetchData();
  }, [fixtureId]);

  const fetchData = async () => {
    console.log('[EventPicker] Fetching data');
    try {
      setLoading(true);

      const stateResponse = await authenticatedGet(`/api/fixtures/${fixtureId}/match-state`);
      setMatchState(stateResponse);

      const squadsResponse = await authenticatedGet(`/api/fixtures/${fixtureId}/squads`);
      const squadsArray = Array.isArray(squadsResponse) ? squadsResponse : [];
      const homeSquadData = squadsArray.find((s: any) => s.side === 'HOME');
      const awaySquadData = squadsArray.find((s: any) => s.side === 'AWAY');
      
      setHomeSquad(homeSquadData || null);
      setAwaySquad(awaySquadData || null);
    } catch (error) {
      console.error('[EventPicker] Error fetching data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleEventSelect = (event: { name: string; category: string }) => {
    console.log('[EventPicker] Event selected:', event.name);
    setSelectedEvent(event);
    setStep('side');
  };

  const handleSideSelect = (side: TeamSide) => {
    console.log('[EventPicker] Side selected:', side);
    setSelectedSide(side);
    setStep('player');
  };

  const handlePlayerSelect = (playerId: string, playerName: string) => {
    console.log('[EventPicker] Player selected:', playerName);
    router.push({
      pathname: `/match-tracker-live/${fixtureId}/event-confirm`,
      params: {
        eventType: selectedEvent?.name,
        eventCategory: selectedEvent?.category,
        side: selectedSide,
        playerId,
        playerName,
      },
    });
  };

  const handleSkip = () => {
    console.log('[EventPicker] User skipped player selection');
    router.push({
      pathname: `/match-tracker-live/${fixtureId}/event-confirm`,
      params: {
        eventType: selectedEvent?.name,
        eventCategory: selectedEvent?.category,
        side: selectedSide,
        playerId: '',
        playerName: 'Skipped',
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Event Picker', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const currentSquad = selectedSide === 'HOME' ? homeSquad : awaySquad;
  const onFieldPlayers = currentSquad?.startingSlots.filter(s => s.playerId) || [];
  const hasPlayers = onFieldPlayers.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Event Picker', headerShown: true }} />

      <ScrollView style={styles.content}>
        {step === 'event' && (
          <React.Fragment>
            <Text style={styles.title}>Choose Event Type</Text>
            <View style={styles.grid}>
              {EVENT_TYPES.map((event, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.eventButton}
                  onPress={() => handleEventSelect(event)}
                >
                  <Text style={styles.eventButtonText}>{event.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </React.Fragment>
        )}

        {step === 'side' && (
          <React.Fragment>
            <Text style={styles.title}>Choose Team Side</Text>
            <View style={styles.sideRow}>
              <TouchableOpacity
                style={styles.sideButton}
                onPress={() => handleSideSelect('HOME')}
              >
                <Text style={styles.sideButtonText}>HOME</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sideButton}
                onPress={() => handleSideSelect('AWAY')}
              >
                <Text style={styles.sideButtonText}>AWAY</Text>
              </TouchableOpacity>
            </View>
          </React.Fragment>
        )}

        {step === 'player' && (
          <React.Fragment>
            <Text style={styles.title}>Choose Player (or Skip)</Text>
            {hasPlayers ? (
              <React.Fragment>
                {onFieldPlayers.map((player, index) => {
                  const playerName = player.playerName || '';
                  const positionName = player.positionName;
                  const jerseyNo = player.jerseyNo || player.positionNo.toString();

                  return (
                    <TouchableOpacity
                      key={index}
                      style={styles.playerItem}
                      onPress={() => handlePlayerSelect(player.playerId!, playerName)}
                    >
                      <View style={styles.playerNumber}>
                        <Text style={styles.playerNumberText}>{jerseyNo}</Text>
                      </View>
                      <View style={styles.playerInfo}>
                        <Text style={styles.playerName}>{playerName}</Text>
                        <Text style={styles.playerPosition}>{positionName}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                  <Text style={styles.skipButtonText}>Skip</Text>
                </TouchableOpacity>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <Text style={styles.noPlayersText}>No players added</Text>
                <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                  <Text style={styles.skipButtonText}>Skip</Text>
                </TouchableOpacity>
              </React.Fragment>
            )}
          </React.Fragment>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
