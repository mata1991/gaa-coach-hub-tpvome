
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPut, authenticatedPost } from '@/utils/api';
import { MatchState, MatchSquad, Fixture } from '@/types';
import { IconSymbol } from '@/components/IconSymbol';
import AsyncStorage from '@react-native-async-storage/async-storage';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#FF0000',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  teamScore: {
    alignItems: 'center',
  },
  teamLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  score: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  timer: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF0000',
  },
  halfLabel: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  scoringPanel: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  columnContainer: {
    flex: 1,
    gap: 12,
  },
  columnHeader: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  columnHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  buttonStack: {
    flex: 1,
    gap: 12,
  },
  goalButton: {
    flex: 1,
    backgroundColor: '#28a745',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 80,
  },
  pointButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#333333',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 80,
  },
  wideButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 80,
  },
  buttonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  buttonTextDark: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 2,
    borderTopColor: '#FF0000',
  },
  bottomButton: {
    flex: 1,
    minHeight: 60,
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#FF0000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  startGateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  startGateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
  },
  checklistCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checklistIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checklistText: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  checklistLink: {
    fontSize: 14,
    color: '#FF0000',
    textDecorationLine: 'underline',
  },
  startButton: {
    backgroundColor: '#28a745',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 24,
  },
  startButtonDisabled: {
    backgroundColor: '#666',
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  controlButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  controlButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
    color: '#000',
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
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
});

export default function MatchTrackerLiveScreen() {
  const params = useLocalSearchParams<{ fixtureId?: string }>();
  const router = useRouter();
  const fixtureId = params.fixtureId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [homeSquad, setHomeSquad] = useState<MatchSquad | null>(null);
  const [awaySquad, setAwaySquad] = useState<MatchSquad | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showEndMatchModal, setShowEndMatchModal] = useState(false);

  console.log('[MatchTrackerLive] Component mounted, fixtureId:', fixtureId);

  useEffect(() => {
    if (!fixtureId) {
      console.error('[MatchTrackerLive] ERROR: fixtureId is missing!');
      setError('No fixture selected');
      setLoading(false);
      return;
    }

    fetchData();
  }, [fixtureId]);

  // Timer effect
  useEffect(() => {
    if (!isRunning || !matchState) return;

    const interval = setInterval(() => {
      setMatchState((prev) => {
        if (!prev) return prev;
        return { ...prev, matchClock: prev.matchClock + 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, matchState]);

  const fetchData = async () => {
    if (!fixtureId) {
      console.error('[MatchTrackerLive] Cannot fetch: fixtureId is undefined');
      setError('No fixture selected');
      setLoading(false);
      return;
    }

    console.log('[MatchTrackerLive] Fetching data for fixtureId:', fixtureId);
    setLoading(true);
    setError(null);

    try {
      const [fixtureData, stateData, squadsData] = await Promise.all([
        authenticatedGet<Fixture>(`/api/fixtures/${fixtureId}`),
        authenticatedGet<MatchState>(`/api/fixtures/${fixtureId}/match-state`),
        authenticatedGet<MatchSquad[]>(`/api/fixtures/${fixtureId}/squads`),
      ]);

      console.log('[MatchTrackerLive] Data fetched successfully');
      setFixture(fixtureData);
      setMatchState(stateData);

      const squadsArray = Array.isArray(squadsData) ? squadsData : [];
      const home = squadsArray.find((s) => s.side === 'HOME');
      const away = squadsArray.find((s) => s.side === 'AWAY');
      setHomeSquad(home || null);
      setAwaySquad(away || null);

      // Set running state based on match state
      if (stateData.status === 'IN_PROGRESS') {
        setIsRunning(true);
      }
    } catch (error: any) {
      console.error('[MatchTrackerLive] Error fetching data:', error);
      setError(error?.message || 'Failed to load match data');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const minsStr = mins.toString();
    const secsStr = secs.toString().padStart(2, '0');
    return `${minsStr}:${secsStr}`;
  };

  const formatScore = (goals: number, points: number): string => {
    const goalsStr = goals.toString();
    const pointsStr = points.toString().padStart(2, '0');
    return `${goalsStr}-${pointsStr}`;
  };

  const handleStart = async () => {
    if (!matchState || !fixtureId) return;

    console.log('[MatchTrackerLive] User tapped Start');

    try {
      await authenticatedPut(`/api/fixtures/${fixtureId}/match-state`, {
        status: 'IN_PROGRESS',
        startedAt: new Date().toISOString(),
      });

      setMatchState((prev) => prev ? { ...prev, status: 'IN_PROGRESS' } : prev);
      setIsRunning(true);
    } catch (error: any) {
      console.error('[MatchTrackerLive] Error starting match:', error);
      setError(error?.message || 'Failed to start match');
      setShowErrorModal(true);
    }
  };

  const handlePause = () => {
    console.log('[MatchTrackerLive] User tapped Pause');
    setIsRunning(false);
  };

  const handleResume = () => {
    console.log('[MatchTrackerLive] User tapped Resume');
    setIsRunning(true);
  };

  const handleEvent = (side: 'HOME' | 'AWAY', eventType: 'GOAL' | 'POINT' | 'WIDE') => {
    if (!fixtureId) return;
    console.log('[MatchTrackerLive] User tapped event button:', side, eventType);
    router.push({
      pathname: `/match-tracker-live/${fixtureId}/event-picker`,
      params: { side, eventType },
    });
  };

  const handleUndo = async () => {
    if (!fixtureId) return;
    console.log('[MatchTrackerLive] User tapped Undo');
    
    try {
      const stored = await AsyncStorage.getItem(`pending_events_${fixtureId}`);
      const pendingEvents = stored ? JSON.parse(stored) : [];
      
      if (pendingEvents.length === 0) {
        setError('No events to undo');
        setShowErrorModal(true);
        return;
      }

      const lastEvent = pendingEvents[pendingEvents.length - 1];
      pendingEvents.pop();
      await AsyncStorage.setItem(`pending_events_${fixtureId}`, JSON.stringify(pendingEvents));

      // Revert score if needed
      if (lastEvent.eventType === 'Goal') {
        const goalsKey = lastEvent.side === 'HOME' ? 'homeGoals' : 'awayGoals';
        const newGoals = Math.max(0, (matchState?.[goalsKey] || 0) - 1);
        await authenticatedPut(`/api/fixtures/${fixtureId}/match-state`, { [goalsKey]: newGoals });
        setMatchState((prev) => prev ? { ...prev, [goalsKey]: newGoals } : prev);
      } else if (lastEvent.eventType === 'Point') {
        const pointsKey = lastEvent.side === 'HOME' ? 'homePoints' : 'awayPoints';
        const newPoints = Math.max(0, (matchState?.[pointsKey] || 0) - 1);
        await authenticatedPut(`/api/fixtures/${fixtureId}/match-state`, { [pointsKey]: newPoints });
        setMatchState((prev) => prev ? { ...prev, [pointsKey]: newPoints } : prev);
      }

      console.log('[MatchTrackerLive] Event undone successfully');
    } catch (error: any) {
      console.error('[MatchTrackerLive] Error undoing event:', error);
      setError(error?.message || 'Failed to undo event');
      setShowErrorModal(true);
    }
  };

  const handleEndMatch = () => {
    console.log('[MatchTrackerLive] User tapped End Match');
    setShowEndMatchModal(true);
  };

  const confirmEndMatch = async () => {
    if (!matchState || !fixtureId) return;

    console.log('[MatchTrackerLive] Confirming end match');

    try {
      await authenticatedPut(`/api/fixtures/${fixtureId}/match-state`, {
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
      });

      await authenticatedPut(`/api/fixtures/${fixtureId}`, {
        status: 'completed',
      });

      setShowEndMatchModal(false);
      router.back();
    } catch (error: any) {
      console.error('[MatchTrackerLive] Error ending match:', error);
      setError(error?.message || 'Failed to end match');
      setShowErrorModal(true);
    }
  };

  const handleCreateSquad = (side: 'HOME' | 'AWAY') => {
    if (!fixtureId) return;
    console.log('[MatchTrackerLive] User tapped Create Squad for:', side);
    router.push({
      pathname: `/team-lineout/${fixtureId}`,
      params: { side },
    });
  };

  if (!fixtureId) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="error"
            size={48}
            color="#FF0000"
          />
          <Text style={styles.errorTitle}>No Fixture Selected</Text>
          <Text style={styles.errorMessage}>
            Please select a fixture before starting the match tracker.
          </Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF0000" />
          <Text style={styles.loadingText}>Loading match...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!matchState || !fixture) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.circle"
            android_material_icon_name="error"
            size={48}
            color="#FF0000"
          />
          <Text style={styles.errorTitle}>Failed to Load Match</Text>
          <Text style={styles.errorMessage}>{error || 'Unable to load match data'}</Text>
          <TouchableOpacity style={styles.errorButton} onPress={fetchData}>
            <Text style={styles.errorButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Start gating: check if both squads exist
  const hasHomeSquad = homeSquad && homeSquad.startingSlots.some((s) => s.playerId);
  const hasAwaySquad = awaySquad && awaySquad.startingSlots.some((s) => s.playerId);
  const canStart = hasHomeSquad && hasAwaySquad;
  const isNotStarted = matchState.status === 'NOT_STARTED';

  if (isNotStarted && !canStart) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.startGateContainer}>
          <Text style={styles.startGateTitle}>Match Setup Required</Text>
          <View style={styles.checklistCard}>
            <View style={styles.checklistItem}>
              <View
                style={[
                  styles.checklistIcon,
                  { backgroundColor: hasHomeSquad ? '#28a745' : '#dc3545' },
                ]}
              >
                <IconSymbol
                  ios_icon_name={hasHomeSquad ? 'checkmark' : 'xmark'}
                  android_material_icon_name={hasHomeSquad ? 'check' : 'close'}
                  size={16}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.checklistText}>Home Squad</Text>
              {!hasHomeSquad && (
                <TouchableOpacity onPress={() => handleCreateSquad('HOME')}>
                  <Text style={styles.checklistLink}>Create</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.checklistItem}>
              <View
                style={[
                  styles.checklistIcon,
                  { backgroundColor: hasAwaySquad ? '#28a745' : '#dc3545' },
                ]}
              >
                <IconSymbol
                  ios_icon_name={hasAwaySquad ? 'checkmark' : 'xmark'}
                  android_material_icon_name={hasAwaySquad ? 'check' : 'close'}
                  size={16}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.checklistText}>Away Squad</Text>
              {!hasAwaySquad && (
                <TouchableOpacity onPress={() => handleCreateSquad('AWAY')}>
                  <Text style={styles.checklistLink}>Create</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={[styles.startButton, !canStart && styles.startButtonDisabled]}
            onPress={handleStart}
            disabled={!canStart}
          >
            <Text style={styles.startButtonText}>Start Match</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const homeScore = formatScore(matchState.homeGoals, matchState.homePoints);
  const awayScore = formatScore(matchState.awayGoals, matchState.awayPoints);
  const timeDisplay = formatTime(matchState.matchClock);
  const halfDisplay = matchState.half === 'H2' ? '2nd Half' : '1st Half';
  const homeTeamName = fixture.homeTeam || 'HOME';
  const awayTeamName = fixture.opponent || 'AWAY';

  return (
    <>
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Header: Score + Timer */}
        <View style={styles.header}>
          <View style={styles.scoreRow}>
            <View style={styles.teamScore}>
              <Text style={styles.teamLabel}>HOME</Text>
              <Text style={styles.score}>{homeScore}</Text>
            </View>
            <View style={styles.teamScore}>
              <Text style={styles.teamLabel}>AWAY</Text>
              <Text style={styles.score}>{awayScore}</Text>
            </View>
          </View>
          <View style={styles.timerRow}>
            <Text style={styles.timer}>{timeDisplay}</Text>
            <Text style={styles.halfLabel}>{halfDisplay}</Text>
          </View>
          {isNotStarted && (
            <View style={styles.controlsRow}>
              <TouchableOpacity style={styles.controlButton} onPress={handleStart}>
                <Text style={styles.controlButtonText}>Start</Text>
              </TouchableOpacity>
            </View>
          )}
          {matchState.status === 'IN_PROGRESS' && (
            <View style={styles.controlsRow}>
              {isRunning ? (
                <TouchableOpacity style={styles.controlButton} onPress={handlePause}>
                  <Text style={styles.controlButtonText}>Pause</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.controlButton} onPress={handleResume}>
                  <Text style={styles.controlButtonText}>Resume</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Content: Two-Column Scoring Panel */}
        <View style={styles.content}>
          <View style={styles.scoringPanel}>
            {/* HOME Column */}
            <View style={styles.columnContainer}>
              <View style={styles.columnHeader}>
                <Text style={styles.columnHeaderText}>{homeTeamName}</Text>
              </View>
              <View style={styles.buttonStack}>
                <TouchableOpacity
                  style={styles.goalButton}
                  onPress={() => handleEvent('HOME', 'GOAL')}
                  disabled={isNotStarted}
                >
                  <Text style={styles.buttonText}>GOAL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.pointButton}
                  onPress={() => handleEvent('HOME', 'POINT')}
                  disabled={isNotStarted}
                >
                  <Text style={styles.buttonTextDark}>POINT</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.wideButton}
                  onPress={() => handleEvent('HOME', 'WIDE')}
                  disabled={isNotStarted}
                >
                  <Text style={styles.buttonText}>WIDE</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* AWAY Column */}
            <View style={styles.columnContainer}>
              <View style={styles.columnHeader}>
                <Text style={styles.columnHeaderText}>{awayTeamName}</Text>
              </View>
              <View style={styles.buttonStack}>
                <TouchableOpacity
                  style={styles.goalButton}
                  onPress={() => handleEvent('AWAY', 'GOAL')}
                  disabled={isNotStarted}
                >
                  <Text style={styles.buttonText}>GOAL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.pointButton}
                  onPress={() => handleEvent('AWAY', 'POINT')}
                  disabled={isNotStarted}
                >
                  <Text style={styles.buttonTextDark}>POINT</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.wideButton}
                  onPress={() => handleEvent('AWAY', 'WIDE')}
                  disabled={isNotStarted}
                >
                  <Text style={styles.buttonText}>WIDE</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom Bar: Undo + End Match */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.bottomButton}
            onPress={handleUndo}
            disabled={isNotStarted}
          >
            <Text style={styles.bottomButtonText}>UNDO</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomButton} onPress={handleEndMatch}>
            <Text style={styles.bottomButtonText}>END MATCH</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Error</Text>
            <Text style={styles.modalMessage}>{error || 'An error occurred'}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* End Match Confirmation Modal */}
      <Modal
        visible={showEndMatchModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEndMatchModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>End Match?</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to end this match? This will mark the match as completed.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={[styles.modalButton, { flex: 1, backgroundColor: '#666' }]}
                onPress={() => setShowEndMatchModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { flex: 1 }]}
                onPress={confirmEndMatch}
              >
                <Text style={styles.modalButtonText}>End Match</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';

import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedPost } from '@/utils/api';

// Helper to resolve image sources (handles both local and remote URLs)
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}


  const router = useRouter();
  const [showJoinPanel, setShowJoinPanel] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log('GetStartedScreen: Rendering onboarding screen');

  const handleCreateClub = () => {
    console.log('User tapped Create a Club button');
    router.push('/create-club');
  };

  const handleJoinClub = () => {
    console.log('User tapped Join a Club button');
    setShowJoinPanel(true);
  };

  const handleConfirmJoin = async () => {
    const trimmedCode = inviteCode.trim();
    
    if (!trimmedCode) {
      setError('Please enter an invite code');
      return;
    }

    console.log('User confirming join with invite code:', trimmedCode);
    setIsLoading(true);
    setError(null);

    try {
      await authenticatedPost('/api/clubs/join', { inviteCode: trimmedCode });
      console.log('Successfully joined club');
      setShowJoinPanel(false);
      router.push('/');
    } catch (err: any) {
      console.error('Error joining club:', err);
      setError(err?.message || 'Failed to join club. Please check your invite code.');
    } finally {
      setIsLoading(false);
    }
  };

  const logoSource = resolveImageSource(require('@/assets/images/final_quest_240x240.png'));

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Welcome to GAA Coach Hub',
          headerBackVisible: false,
        }}
      />
      <LinearGradient
        colors={['#FFFFFF', '#F0F7F4']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <Image
                source={logoSource}
                style={styles.logo}
              />
              <Text style={styles.title}>Get Started</Text>
              <Text style={styles.subtitle}>
                Create or join a club to start managing your teams
              </Text>
            </View>

            <View style={styles.options}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleCreateClub}
              >
                <IconSymbol
                  ios_icon_name="plus.circle.fill"
                  android_material_icon_name="add-circle"
                  size={24}
                  color="#fff"
                />
                <Text style={styles.primaryButtonText}>Create a Club</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleJoinClub}
              >
                <IconSymbol
                  ios_icon_name="person.2.fill"
                  android_material_icon_name="group"
                  size={24}
                  color="#169B62"
                />
                <Text style={styles.secondaryButtonText}>Join a Club</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.features}>
              <View style={styles.featureCard}>
                <View style={[styles.iconCircle, { backgroundColor: '#169B62' }]}>
                  <IconSymbol
                    ios_icon_name="shield.fill"
                    android_material_icon_name="shield"
                    size={28}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Manage Teams</Text>
                  <Text style={styles.featureDescription}>
                    Players, lineups, and injuries in one place
                  </Text>
                </View>
              </View>

              <View style={styles.featureCard}>
                <View style={[styles.iconCircle, { backgroundColor: '#2196F3' }]}>
                  <IconSymbol
                    ios_icon_name="chart.bar.fill"
                    android_material_icon_name="bar-chart"
                    size={28}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Track Stats</Text>
                  <Text style={styles.featureDescription}>
                    Live match events and season analytics
                  </Text>
                </View>
              </View>

              <View style={styles.featureCard}>
                <View style={[styles.iconCircle, { backgroundColor: '#FF9800' }]}>
                  <IconSymbol
                    ios_icon_name="calendar"
                    android_material_icon_name="calendar-today"
                    size={28}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Stay Organised</Text>
                  <Text style={styles.featureDescription}>
                    Fixtures, training, and attendance
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* Join Club Bottom Panel Modal */}
      <Modal
        visible={showJoinPanel}
        transparent
        animationType="slide"
        onRequestClose={() => setShowJoinPanel(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bottomPanel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Join a Club</Text>
              <TouchableOpacity
                onPress={() => setShowJoinPanel(false)}
                style={styles.closeButton}
              >
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.panelContent}>
              <Text style={styles.inputLabel}>Enter invite code</Text>
              <TextInput
                style={styles.input}
                value={inviteCode}
                onChangeText={setInviteCode}
                placeholder="e.g. ABC123XYZ"
                placeholderTextColor="#999"
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!isLoading}
              />

              {error && (
                <View style={styles.errorContainer}>
                  <IconSymbol
                    ios_icon_name="exclamationmark.circle"
                    android_material_icon_name="error"
                    size={16}
                    color="#dc3545"
                  />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.confirmButton, isLoading && styles.confirmButtonDisabled]}
                onPress={handleConfirmJoin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  options: {
    width: '100%',
    gap: 16,
    marginBottom: 40,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#169B62',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#169B62',
    gap: 12,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#169B62',
  },
  features: {
    width: '100%',
    gap: 16,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomPanel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  panelContent: {
    padding: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#dc3545',
    flex: 1,
  },
  confirmButton: {
    backgroundColor: '#169B62',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  confirmButtonDisabled: {
    backgroundColor: '#A0D4C0',
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
