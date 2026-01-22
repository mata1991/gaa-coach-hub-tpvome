
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPost, authenticatedPut } from '@/utils/api';
import { MatchSquad, MatchState, MatchEvent } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetworkState } from 'expo-network';

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
  header: {
    backgroundColor: colors.card,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamScore: {
    alignItems: 'center',
    flex: 1,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  score: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  },
  clockContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  clock: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  clockControls: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  clockButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clockButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
  },
  periodButton: {
    minHeight: 56,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#FF0000',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activePeriod: {
    backgroundColor: '#FF0000',
    borderColor: '#FF0000',
  },
  periodText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 4,
  },
  syncText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  eventButton: {
    width: '100%',
    minHeight: 80,
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#FF0000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  footerButton: {
    flex: 1,
    minHeight: 56,
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#FF0000',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default function MatchTrackerLiveScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const fixtureId = params.fixtureId as string;

  const [loading, setLoading] = useState(true);
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [homeSquad, setHomeSquad] = useState<MatchSquad | null>(null);
  const [awaySquad, setAwaySquad] = useState<MatchSquad | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [pendingEvents, setPendingEvents] = useState<MatchEvent[]>([]);

  const networkState = useNetworkState();
  const clockInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchData();
    loadPendingEvents();
  }, [fixtureId]);

  useEffect(() => {
    if (isRunning) {
      clockInterval.current = setInterval(() => {
        setMatchState(prev => {
          if (!prev) return prev;
          const newClock = prev.matchClock + 1;
          return { ...prev, matchClock: newClock };
        });
      }, 1000);
    } else {
      if (clockInterval.current) {
        clearInterval(clockInterval.current);
      }
    }

    return () => {
      if (clockInterval.current) {
        clearInterval(clockInterval.current);
      }
    };
  }, [isRunning]);

  useEffect(() => {
    if (networkState.isConnected && pendingEvents.length > 0) {
      syncPendingEvents();
    }
  }, [networkState.isConnected, pendingEvents.length]);

  const fetchData = async () => {
    console.log('[MatchTracker] Fetching match tracker data');
    try {
      setLoading(true);

      const stateResponse = await authenticatedGet(`/api/fixtures/${fixtureId}/match-state`);
      setMatchState(stateResponse);
      setIsRunning(false);
      setHasStarted(stateResponse.matchClock > 0);

      const squadsResponse = await authenticatedGet(`/api/fixtures/${fixtureId}/squads`);
      
      const squadsArray = Array.isArray(squadsResponse) ? squadsResponse : [];
      const homeSquadData = squadsArray.find((s: any) => s.side === 'HOME');
      const awaySquadData = squadsArray.find((s: any) => s.side === 'AWAY');
      
      setHomeSquad(homeSquadData || null);
      setAwaySquad(awaySquadData || null);

      try {
        const eventsResponse = await authenticatedGet(`/api/fixtures/${fixtureId}/events`);
        setEvents(Array.isArray(eventsResponse) ? eventsResponse : []);
      } catch (error: any) {
        if (error?.status === 404) {
          console.log('[MatchTracker] No events found (404), treating as empty');
          setEvents([]);
        } else {
          console.error('[MatchTracker] Error fetching events:', error);
          setEvents([]);
        }
      }
    } catch (error) {
      console.error('[MatchTracker] Error fetching match tracker data:', error);
      Alert.alert('Error', 'Failed to load match data');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingEvents = async () => {
    try {
      const stored = await AsyncStorage.getItem(`pending_events_${fixtureId}`);
      if (stored) {
        setPendingEvents(JSON.parse(stored));
      }
    } catch (error) {
      console.error('[MatchTracker] Error loading pending events:', error);
    }
  };

  const savePendingEvents = async (events: MatchEvent[]) => {
    try {
      await AsyncStorage.setItem(`pending_events_${fixtureId}`, JSON.stringify(events));
    } catch (error) {
      console.error('[MatchTracker] Error saving pending events:', error);
    }
  };

  const syncPendingEvents = async () => {
    if (pendingEvents.length === 0) return;

    console.log('[MatchTracker] Syncing pending events:', pendingEvents.length);
    try {
      await authenticatedPost('/api/match-events/batch', { events: pendingEvents });
      setPendingEvents([]);
      await AsyncStorage.removeItem(`pending_events_${fixtureId}`);
      console.log('[MatchTracker] Events synced successfully');
    } catch (error) {
      console.error('[MatchTracker] Error syncing events:', error);
    }
  };

  const handleToggleClock = () => {
    console.log('[MatchTracker] Toggling clock');
    if (!hasStarted) {
      setHasStarted(true);
    }
    setIsRunning(!isRunning);
    if (matchState) {
      updateMatchState({ status: isRunning ? 'PAUSED' : 'IN_PROGRESS' });
    }
  };

  const handleHalfChange = (half: 'H1' | 'H2') => {
    console.log('[MatchTracker] Changing half to:', half);
    updateMatchState({ half });
  };

  const updateMatchState = async (updates: Partial<MatchState>) => {
    if (!matchState) return;

    const newState = { ...matchState, ...updates };
    setMatchState(newState);

    try {
      await authenticatedPut(`/api/fixtures/${fixtureId}/match-state`, updates);
    } catch (error) {
      console.error('[MatchTracker] Error updating match state:', error);
    }
  };

  const handleEventPress = () => {
    console.log('[MatchTracker] User tapped EVENT button - navigating to event picker');
    router.push(`/match-tracker-live/${fixtureId}/event-picker`);
  };

  const handleUndo = async () => {
    if (events.length === 0 && pendingEvents.length === 0) {
      Alert.alert('No Events', 'There are no events to undo');
      return;
    }

    console.log('[MatchTracker] User tapped Undo button');

    const lastEvent = events.length > 0 ? events[events.length - 1] : pendingEvents[pendingEvents.length - 1];
    
    if (!lastEvent) return;

    const newEvents = events.filter(e => e.clientId !== lastEvent.clientId);
    setEvents(newEvents);

    const newPending = pendingEvents.filter(e => e.clientId !== lastEvent.clientId);
    setPendingEvents(newPending);
    await savePendingEvents(newPending);

    if (lastEvent.eventType === 'Goal' && matchState) {
      const goalsKey = lastEvent.side === 'HOME' ? 'homeGoals' : 'awayGoals';
      updateMatchState({ [goalsKey]: Math.max(0, matchState[goalsKey] - 1) });
    } else if (lastEvent.eventType === 'Point' && matchState) {
      const pointsKey = lastEvent.side === 'HOME' ? 'homePoints' : 'awayPoints';
      updateMatchState({ [pointsKey]: Math.max(0, matchState[pointsKey] - 1) });
    }

    Alert.alert('Undo', 'Last event removed');
  };

  const handleEndMatch = async () => {
    Alert.alert(
      'End Match',
      'Are you sure you want to end this match?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Match',
          style: 'destructive',
          onPress: async () => {
            console.log('[MatchTracker] User confirmed End Match');
            try {
              await authenticatedPost(`/api/fixtures/${fixtureId}/match-state/complete`, {});
              router.push(`/match-report/${fixtureId}`);
            } catch (error) {
              console.error('[MatchTracker] Error ending match:', error);
              Alert.alert('Error', 'Failed to end match');
            }
          },
        },
      ]
    );
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Match Tracker', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const homeScoreText = formatScore(matchState?.homeGoals || 0, matchState?.homePoints || 0);
  const awayScoreText = formatScore(matchState?.awayGoals || 0, matchState?.awayPoints || 0);
  const clockText = formatTime(matchState?.matchClock || 0);
  const isOnline = networkState.isConnected;
  const syncStatusText = isOnline ? 'Online' : 'Offline';
  const pendingCount = pendingEvents.length;
  const pendingText = pendingCount > 0 ? `${pendingCount} pending` : '';
  const currentHalf = (matchState as any)?.half || 'H1';
  const clockButtonText = !hasStarted ? 'Start' : isRunning ? 'Pause' : 'Resume';

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Live Match Tracker', headerShown: true }} />

      <View style={styles.header}>
        <View style={styles.scoreRow}>
          <View style={styles.teamScore}>
            <Text style={styles.teamName}>HOME</Text>
            <Text style={styles.score}>{homeScoreText}</Text>
          </View>
          <View style={styles.teamScore}>
            <Text style={styles.teamName}>AWAY</Text>
            <Text style={styles.score}>{awayScoreText}</Text>
          </View>
        </View>

        <View style={styles.clockContainer}>
          <Text style={styles.clock}>{clockText}</Text>
          <View style={styles.clockControls}>
            <TouchableOpacity style={styles.clockButton} onPress={handleToggleClock}>
              <Text style={styles.clockButtonText}>{clockButtonText}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.periodSelector}>
            {(['H1', 'H2'] as const).map(half => {
              const isActive = currentHalf === half;
              const halfText = half === 'H1' ? '1st Half' : '2nd Half';
              return (
                <TouchableOpacity
                  key={half}
                  style={[styles.periodButton, isActive && styles.activePeriod]}
                  onPress={() => handleHalfChange(half)}
                >
                  <Text style={styles.periodText}>{halfText}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.syncIndicator}>
            <IconSymbol
              ios_icon_name={isOnline ? 'wifi' : 'wifi.slash'}
              android_material_icon_name={isOnline ? 'wifi' : 'wifi-off'}
              size={16}
              color={isOnline ? '#4CAF50' : '#FF9500'}
            />
            <Text style={styles.syncText}>{syncStatusText} {pendingText}</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.eventButton} onPress={handleEventPress}>
          <Text style={styles.eventButtonText}>EVENT</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerButton} onPress={handleUndo}>
          <Text style={styles.footerButtonText}>Undo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerButton} onPress={handleEndMatch}>
          <Text style={styles.footerButtonText}>End Match</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
