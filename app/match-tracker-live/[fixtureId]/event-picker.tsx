
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { authenticatedGet } from '@/utils/api';
import { MatchSquad, MatchState, TeamSide } from '@/types';
import { IconSymbol } from '@/components/IconSymbol';

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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorIcon: {
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorButton: {
    backgroundColor: '#FF0000',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  const params = useLocalSearchParams<{ fixtureId?: string }>();
  const router = useRouter();
  const fixtureId = params.fixtureId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [step, setStep] = useState<'event' | 'side' | 'player'>('event');
  const [selectedEvent, setSelectedEvent] = useState<{ name: string; category: string } | null>(null);
  const [selectedSide, setSelectedSide] = useState<TeamSide | null>(null);
  const [homeSquad, setHomeSquad] = useState<MatchSquad | null>(null);
  const [awaySquad, setAwaySquad] = useState<MatchSquad | null>(null);
  const [matchState, setMatchState] = useState<MatchState | null>(null);

  useEffect(() => {
    console.log('[EventPicker] Component mounted, fixtureId:', fixtureId);
    
    // Validate fixtureId exists
    if (!fixtureId) {
      console.error('[EventPicker] ERROR: fixtureId is missing from route params!');
      setError('No fixture selected');
      setLoading(false);
      return;
    }

    fetchData();
  }, [fixtureId]);

  const fetchData = async () => {
    console.log('[EventPicker] Fetching data for fixtureId:', fixtureId);
    
    // Double-check fixtureId before making API calls
    if (!fixtureId) {
      console.error('[EventPicker] Cannot fetch data: fixtureId is undefined');
      setError('No fixture selected');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[EventPicker] Fetching match state...');
      const stateResponse = await authenticatedGet(`/api/fixtures/${fixtureId}/match-state`);
      console.log('[EventPicker] Match state fetched:', stateResponse);
      setMatchState(stateResponse);

      console.log('[EventPicker] Fetching squads...');
      const squadsResponse = await authenticatedGet(`/api/fixtures/${fixtureId}/squads`);
      console.log('[EventPicker] Squads fetched:', squadsResponse);
      
      const squadsArray = Array.isArray(squadsResponse) ? squadsResponse : [];
      const homeSquadData = squadsArray.find((s: any) => s.side === 'HOME');
      const awaySquadData = squadsArray.find((s: any) => s.side === 'AWAY');
      
      setHomeSquad(homeSquadData || null);
      setAwaySquad(awaySquadData || null);
      
      console.log('[EventPicker] Data loaded successfully');
    } catch (error: any) {
      console.error('[EventPicker] Error fetching data:', error);
      console.error('[EventPicker] Error message:', error?.message);
      console.error('[EventPicker] Error status:', error?.status);
      
      const errorMessage = error?.message || 'Failed to load match data';
      setError(errorMessage);
      setShowErrorModal(true);
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
    
    if (!fixtureId) {
      console.error('[EventPicker] Cannot navigate: fixtureId is undefined');
      setError('No fixture selected');
      setShowErrorModal(true);
      return;
    }

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
    
    if (!fixtureId) {
      console.error('[EventPicker] Cannot navigate: fixtureId is undefined');
      setError('No fixture selected');
      setShowErrorModal(true);
      return;
    }

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

  const handleBackToFixtures = () => {
    console.log('[EventPicker] User tapped Back to Fixtures');
    router.back();
  };

  const handleRetry = () => {
    console.log('[EventPicker] User tapped Retry');
    setShowErrorModal(false);
    fetchData();
  };

  // Show error screen if fixtureId is missing
  if (!fixtureId) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Event Picker', headerShown: true }} />
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="error"
            size={48}
            color="#FF0000"
            style={styles.errorIcon}
          />
          <Text style={styles.errorTitle}>No Fixture Selected</Text>
          <Text style={styles.errorMessage}>
            Please select a fixture before accessing the event picker.
          </Text>
          <TouchableOpacity style={styles.errorButton} onPress={handleBackToFixtures}>
            <Text style={styles.errorButtonText}>Back to Fixtures</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Event Picker', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 12, color: colors.textSecondary }}>Loading match data...</Text>
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

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Failed to Load Match Data</Text>
            <Text style={styles.modalMessage}>
              {error || 'An error occurred while loading match data. Please try again.'}
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={handleRetry}>
              <Text style={styles.modalButtonText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#666' }]}
              onPress={() => {
                setShowErrorModal(false);
                router.back();
              }}
            >
              <Text style={styles.modalButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
