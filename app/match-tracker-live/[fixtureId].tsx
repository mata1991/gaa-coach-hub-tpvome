
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPost, authenticatedPut } from '@/utils/api';
import { MatchSquad, MatchState, MatchEvent, TeamSide, LineupSlot } from '@/types';
import { EVENT_PRESETS } from '@/constants/EventPresets';
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
  scoreboard: {
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
  scoreDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
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
    gap: 8,
    marginTop: 8,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activePeriod: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  activePeriodText: {
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
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: 4,
    margin: 16,
    borderRadius: 12,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeMode: {
    backgroundColor: colors.primary,
  },
  modeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  activeModeText: {
    color: '#FFFFFF',
  },
  sideToggle: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  sideButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeSide: {
    backgroundColor: colors.primary,
  },
  sideText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  activeSideText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  playersList: {
    paddingHorizontal: 16,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedPlayer: {
    backgroundColor: colors.primary,
  },
  playerNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedPlayerNumber: {
    backgroundColor: '#FFFFFF',
  },
  playerNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  selectedPlayerNumberText: {
    color: colors.primary,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  selectedPlayerName: {
    color: '#FFFFFF',
  },
  playerPosition: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  selectedPlayerPosition: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  eventsGrid: {
    paddingHorizontal: 16,
  },
  eventCategory: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  eventRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  eventButton: {
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  eventButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.card,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryAction: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  primaryActionText: {
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  subsContainer: {
    padding: 16,
  },
  subsSection: {
    marginBottom: 16,
  },
  subsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  subsButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  subsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

type CaptureMode = 'player-first' | 'event-first';

export default function MatchTrackerLiveScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const fixtureId = params.fixtureId as string;

  const [loading, setLoading] = useState(true);
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [homeSquad, setHomeSquad] = useState<MatchSquad | null>(null);
  const [awaySquad, setAwaySquad] = useState<MatchSquad | null>(null);
  const [captureMode, setCaptureMode] = useState<CaptureMode>('player-first');
  const [selectedSide, setSelectedSide] = useState<TeamSide>('HOME');
  const [selectedPlayer, setSelectedPlayer] = useState<LineupSlot | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showSubsModal, setShowSubsModal] = useState(false);
  const [playerOff, setPlayerOff] = useState<LineupSlot | null>(null);
  const [playerOn, setPlayerOn] = useState<LineupSlot | null>(null);
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
    console.log('Fetching match tracker data');
    try {
      setLoading(true);

      const stateResponse = await authenticatedGet(`/api/fixtures/${fixtureId}/match-state`);
      setMatchState(stateResponse);
      setIsRunning(stateResponse.status === 'IN_PROGRESS');

      const squadsResponse = await authenticatedGet(`/api/fixtures/${fixtureId}/squads`);
      setHomeSquad(squadsResponse.home);
      setAwaySquad(squadsResponse.away);

      const eventsResponse = await authenticatedGet(`/api/fixtures/${fixtureId}/events`);
      setEvents(eventsResponse);
    } catch (error) {
      console.error('Error fetching match tracker data:', error);
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
      console.error('Error loading pending events:', error);
    }
  };

  const savePendingEvents = async (events: MatchEvent[]) => {
    try {
      await AsyncStorage.setItem(`pending_events_${fixtureId}`, JSON.stringify(events));
    } catch (error) {
      console.error('Error saving pending events:', error);
    }
  };

  const syncPendingEvents = async () => {
    if (pendingEvents.length === 0) return;

    console.log('Syncing pending events:', pendingEvents.length);
    try {
      await authenticatedPost('/api/match-events/batch', { events: pendingEvents });
      setPendingEvents([]);
      await AsyncStorage.removeItem(`pending_events_${fixtureId}`);
      console.log('Events synced successfully');
    } catch (error) {
      console.error('Error syncing events:', error);
    }
  };

  const handleToggleClock = () => {
    console.log('Toggling clock');
    setIsRunning(!isRunning);
    if (matchState) {
      updateMatchState({ status: isRunning ? 'PAUSED' : 'IN_PROGRESS' });
    }
  };

  const handlePeriodChange = (period: number) => {
    console.log('Changing period to:', period);
    updateMatchState({ period });
  };

  const updateMatchState = async (updates: Partial<MatchState>) => {
    if (!matchState) return;

    const newState = { ...matchState, ...updates };
    setMatchState(newState);

    try {
      await authenticatedPut(`/api/fixtures/${fixtureId}/match-state`, updates);
    } catch (error) {
      console.error('Error updating match state:', error);
    }
  };

  const handlePlayerPress = (player: LineupSlot) => {
    console.log('Player selected:', player.playerName);
    if (captureMode === 'player-first') {
      setSelectedPlayer(player);
    }
  };

  const handleEventPress = (eventType: string, category: string) => {
    console.log('Event selected:', eventType);
    if (captureMode === 'event-first') {
      setSelectedEvent(eventType);
    } else if (selectedPlayer) {
      recordEvent(selectedPlayer, eventType, category);
      setSelectedPlayer(null);
    }
  };

  const recordEvent = async (player: LineupSlot, eventType: string, category: string) => {
    if (!matchState || !player.playerId) return;

    console.log('Recording event:', eventType, 'for player:', player.playerName);

    const event: MatchEvent = {
      fixtureId,
      playerId: player.playerId,
      side: selectedSide,
      timestamp: matchState.matchClock,
      eventType,
      eventCategory: category as any,
      clientId: `${Date.now()}_${Math.random()}`,
      synced: false,
    };

    const newEvents = [...events, event];
    setEvents(newEvents);

    const newPending = [...pendingEvents, event];
    setPendingEvents(newPending);
    await savePendingEvents(newPending);

    if (eventType === 'Goal') {
      const goalsKey = selectedSide === 'HOME' ? 'homeGoals' : 'awayGoals';
      updateMatchState({ [goalsKey]: matchState[goalsKey] + 1 });
    } else if (eventType === 'Point') {
      const pointsKey = selectedSide === 'HOME' ? 'homePoints' : 'awayPoints';
      updateMatchState({ [pointsKey]: matchState[pointsKey] + 1 });
    }

    if (networkState.isConnected) {
      syncPendingEvents();
    }
  };

  const handleUndo = () => {
    if (events.length === 0) return;

    console.log('Undoing last event');
    const lastEvent = events[events.length - 1];
    const newEvents = events.slice(0, -1);
    setEvents(newEvents);

    const newPending = pendingEvents.filter(e => e.clientId !== lastEvent.clientId);
    setPendingEvents(newPending);
    savePendingEvents(newPending);

    if (lastEvent.eventType === 'Goal' && matchState) {
      const goalsKey = lastEvent.side === 'HOME' ? 'homeGoals' : 'awayGoals';
      updateMatchState({ [goalsKey]: Math.max(0, matchState[goalsKey] - 1) });
    } else if (lastEvent.eventType === 'Point' && matchState) {
      const pointsKey = lastEvent.side === 'HOME' ? 'homePoints' : 'awayPoints';
      updateMatchState({ [pointsKey]: Math.max(0, matchState[pointsKey] - 1) });
    }
  };

  const handleSubstitution = async () => {
    if (!playerOff || !playerOn || !matchState) {
      Alert.alert('Error', 'Please select both players');
      return;
    }

    console.log('Recording substitution:', playerOff.playerName, '->', playerOn.playerName);

    try {
      await authenticatedPost(`/api/fixtures/${fixtureId}/squads/${selectedSide}/substitute`, {
        playerOffId: playerOff.playerId,
        playerOnId: playerOn.playerId,
        matchTime: matchState.matchClock,
      });

      await fetchData();
      setShowSubsModal(false);
      setPlayerOff(null);
      setPlayerOn(null);
    } catch (error) {
      console.error('Error recording substitution:', error);
      Alert.alert('Error', 'Failed to record substitution');
    }
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
            console.log('Ending match');
            try {
              await authenticatedPost(`/api/fixtures/${fixtureId}/match-state/complete`, {});
              router.push(`/match-report/${fixtureId}`);
            } catch (error) {
              console.error('Error ending match:', error);
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

  const currentSquad = selectedSide === 'HOME' ? homeSquad : awaySquad;
  const onFieldPlayers = currentSquad?.startingSlots.filter(s => s.playerId) || [];

  const renderScoreboard = () => {
    if (!matchState) return null;

    const homeTotal = matchState.homeGoals * 3 + matchState.homePoints;
    const awayTotal = matchState.awayGoals * 3 + matchState.awayPoints;
    const homeGoalsText = `${matchState.homeGoals}`;
    const homePointsText = `${matchState.homePoints}`;
    const awayGoalsText = `${matchState.awayGoals}`;
    const awayPointsText = `${matchState.awayPoints}`;
    const clockText = formatTime(matchState.matchClock);
    const isOnline = networkState.isConnected;
    const syncStatusText = isOnline ? 'Online' : 'Offline';
    const pendingCount = pendingEvents.length;
    const pendingText = pendingCount > 0 ? `${pendingCount} pending` : '';

    return (
      <View style={styles.scoreboard}>
        <View style={styles.scoreRow}>
          <View style={styles.teamScore}>
            <Text style={styles.teamName}>HOME</Text>
            <Text style={styles.score}>{homeTotal}</Text>
            <Text style={styles.scoreDetail}>{homeGoalsText}G {homePointsText}P</Text>
          </View>
          <View style={styles.teamScore}>
            <Text style={styles.teamName}>AWAY</Text>
            <Text style={styles.score}>{awayTotal}</Text>
            <Text style={styles.scoreDetail}>{awayGoalsText}G {awayPointsText}P</Text>
          </View>
        </View>

        <View style={styles.clockContainer}>
          <Text style={styles.clock}>{clockText}</Text>
          <View style={styles.clockControls}>
            <TouchableOpacity style={styles.clockButton} onPress={handleToggleClock}>
              <Text style={styles.clockButtonText}>{isRunning ? 'Pause' : 'Start'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.periodSelector}>
            {[1, 2, 3, 4].map(p => {
              const isActive = matchState.period === p;
              const periodText = `Q${p}`;
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodButton, isActive && styles.activePeriod]}
                  onPress={() => handlePeriodChange(p)}
                >
                  <Text style={[styles.periodText, isActive && styles.activePeriodText]}>
                    {periodText}
                  </Text>
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
    );
  };

  const renderModeToggle = () => {
    const isPlayerFirst = captureMode === 'player-first';
    const isEventFirst = captureMode === 'event-first';

    return (
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeButton, isPlayerFirst && styles.activeMode]}
          onPress={() => setCaptureMode('player-first')}
        >
          <Text style={[styles.modeText, isPlayerFirst && styles.activeModeText]}>
            Player First
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, isEventFirst && styles.activeMode]}
          onPress={() => setCaptureMode('event-first')}
        >
          <Text style={[styles.modeText, isEventFirst && styles.activeModeText]}>
            Event First
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSideToggle = () => {
    const isHome = selectedSide === 'HOME';
    const isAway = selectedSide === 'AWAY';

    return (
      <View style={styles.sideToggle}>
        <TouchableOpacity
          style={[styles.sideButton, isHome && styles.activeSide]}
          onPress={() => {
            setSelectedSide('HOME');
            setSelectedPlayer(null);
          }}
        >
          <Text style={[styles.sideText, isHome && styles.activeSideText]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sideButton, isAway && styles.activeSide]}
          onPress={() => {
            setSelectedSide('AWAY');
            setSelectedPlayer(null);
          }}
        >
          <Text style={[styles.sideText, isAway && styles.activeSideText]}>Away</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderPlayersList = () => {
    return (
      <ScrollView style={styles.playersList}>
        {onFieldPlayers.map((player, index) => {
          const isSelected = selectedPlayer?.playerId === player.playerId;
          const playerName = player.playerName || '';
          const positionName = player.positionName;
          const jerseyNo = player.jerseyNo || player.positionNo.toString();

          return (
            <TouchableOpacity
              key={index}
              style={[styles.playerItem, isSelected && styles.selectedPlayer]}
              onPress={() => handlePlayerPress(player)}
            >
              <View style={[styles.playerNumber, isSelected && styles.selectedPlayerNumber]}>
                <Text style={[styles.playerNumberText, isSelected && styles.selectedPlayerNumberText]}>
                  {jerseyNo}
                </Text>
              </View>
              <View style={styles.playerInfo}>
                <Text style={[styles.playerName, isSelected && styles.selectedPlayerName]}>
                  {playerName}
                </Text>
                <Text style={[styles.playerPosition, isSelected && styles.selectedPlayerPosition]}>
                  {positionName}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  const renderEventsGrid = () => {
    return (
      <ScrollView style={styles.eventsGrid}>
        {EVENT_PRESETS.map((preset, index) => (
          <React.Fragment key={index}>
            <Text style={styles.eventCategory}>{preset.category}</Text>
            <View style={styles.eventRow}>
              {preset.types.map((type, typeIndex) => {
                const eventName = type.name;
                return (
                  <TouchableOpacity
                    key={typeIndex}
                    style={styles.eventButton}
                    onPress={() => handleEventPress(type.name, preset.category)}
                  >
                    <Text style={styles.eventButtonText}>{eventName}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </React.Fragment>
        ))}
      </ScrollView>
    );
  };

  const renderSubsModal = () => {
    const onField = currentSquad?.startingSlots.filter(s => s.playerId) || [];
    const bench = currentSquad?.bench.filter(s => s.playerId) || [];

    return (
      <Modal
        visible={showSubsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSubsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Substitution</Text>
              <TouchableOpacity onPress={() => setShowSubsModal(false)}>
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.subsContainer}>
              <View style={styles.subsSection}>
                <Text style={styles.subsLabel}>Player OFF (On Field)</Text>
                {onField.map((player, index) => {
                  const isSelected = playerOff?.playerId === player.playerId;
                  const playerName = player.playerName || '';
                  const jerseyNo = player.jerseyNo || player.positionNo.toString();

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.playerItem, isSelected && styles.selectedPlayer]}
                      onPress={() => setPlayerOff(player)}
                    >
                      <View style={[styles.playerNumber, isSelected && styles.selectedPlayerNumber]}>
                        <Text style={[styles.playerNumberText, isSelected && styles.selectedPlayerNumberText]}>
                          {jerseyNo}
                        </Text>
                      </View>
                      <View style={styles.playerInfo}>
                        <Text style={[styles.playerName, isSelected && styles.selectedPlayerName]}>
                          {playerName}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.subsSection}>
                <Text style={styles.subsLabel}>Player ON (Bench)</Text>
                {bench.map((player, index) => {
                  const isSelected = playerOn?.playerId === player.playerId;
                  const playerName = player.playerName || '';
                  const jerseyNo = player.jerseyNo || '';

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.playerItem, isSelected && styles.selectedPlayer]}
                      onPress={() => setPlayerOn(player)}
                    >
                      <View style={[styles.playerNumber, isSelected && styles.selectedPlayerNumber]}>
                        <Text style={[styles.playerNumberText, isSelected && styles.selectedPlayerNumberText]}>
                          {jerseyNo || index + 16}
                        </Text>
                      </View>
                      <View style={styles.playerInfo}>
                        <Text style={[styles.playerName, isSelected && styles.selectedPlayerName]}>
                          {playerName}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.subsButton}
                onPress={handleSubstitution}
                disabled={!playerOff || !playerOn}
              >
                <Text style={styles.subsButtonText}>Record Substitution</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
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

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Live Match Tracker', headerShown: true }} />

      {renderScoreboard()}
      {renderModeToggle()}
      {renderSideToggle()}

      <View style={styles.content}>
        {captureMode === 'player-first' ? renderPlayersList() : renderEventsGrid()}
      </View>

      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionButton} onPress={handleUndo}>
          <Text style={styles.actionButtonText}>Undo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => setShowSubsModal(true)}>
          <Text style={styles.actionButtonText}>Subs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.primaryAction]} onPress={handleEndMatch}>
          <Text style={[styles.actionButtonText, styles.primaryActionText]}>End Match</Text>
        </TouchableOpacity>
      </View>

      {renderSubsModal()}
    </SafeAreaView>
  );
}
