
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { MatchEvent, Player } from '@/types';
import { EVENT_PRESETS, PITCH_ZONES } from '@/constants/EventPresets';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useNetworkState } from 'expo-network';

// Helper function to get icons for events
const getIconForEvent = (eventName: string): { ios: string; android: string } => {
  const iconMap: Record<string, { ios: string; android: string }> = {
    'Saved': { ios: 'shield.fill', android: 'shield' },
    'Dropped Short': { ios: 'arrow.down', android: 'arrow-downward' },
    'Blocked': { ios: 'xmark', android: 'close' },
    '45 Won': { ios: 'flag.fill', android: 'flag' },
    '65 Won': { ios: 'flag', android: 'outlined-flag' },
    'Possession Lost': { ios: 'arrow.counterclockwise', android: 'refresh' },
  };
  
  return iconMap[eventName] || { ios: 'circle', android: 'circle' };
};

export default function MatchTrackerScreen() {
  const params = useLocalSearchParams<{ fixtureId?: string }>();
  const router = useRouter();
  const fixtureId = params.fixtureId;
  const networkState = useNetworkState();
  const { addToQueue, hasQueuedEvents, queuedEvents, syncQueue, isSyncing } = useOfflineSync();

  const [matchClock, setMatchClock] = useState(0); // seconds
  const [isRunning, setIsRunning] = useState(false);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Scoring');
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [showZonePicker, setShowZonePicker] = useState(false);
  const [pendingEvent, setPendingEvent] = useState<Partial<MatchEvent> | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fixture, setFixture] = useState<any>(null);

  // Fetch fixture and players
  useEffect(() => {
    console.log('[MatchTracker] Component mounted, fixtureId:', fixtureId);
    
    // Validate fixtureId exists
    if (!fixtureId) {
      console.error('[MatchTracker] ERROR: fixtureId is missing from route params!');
      setError('No fixture selected');
      setLoadingPlayers(false);
      return;
    }
    
    const fetchData = async () => {
      try {
        setLoadingPlayers(true);
        setError(null);
        
        if (!fixtureId) {
          console.warn('[MatchTracker] No fixtureId provided, using mock data');
          // Use mock players if no fixture ID
          setPlayers([
            { id: '1', teamId: '1', name: 'John Murphy', jerseyNo: 1, positions: 'Goalkeeper', createdAt: '' },
            { id: '2', teamId: '1', name: 'Sean O\'Brien', jerseyNo: 2, positions: 'Full Back', createdAt: '' },
            { id: '3', teamId: '1', name: 'Michael Walsh', jerseyNo: 3, positions: 'Corner Back', createdAt: '' },
            { id: '4', teamId: '1', name: 'Patrick Ryan', jerseyNo: 4, positions: 'Wing Back', createdAt: '' },
            { id: '5', teamId: '1', name: 'David Kelly', jerseyNo: 5, positions: 'Centre Back', createdAt: '' },
            { id: '6', teamId: '1', name: 'James McCarthy', jerseyNo: 6, positions: 'Midfield', createdAt: '' },
            { id: '7', teamId: '1', name: 'Thomas Brennan', jerseyNo: 7, positions: 'Wing Forward', createdAt: '' },
            { id: '8', teamId: '1', name: 'Kevin Doyle', jerseyNo: 8, positions: 'Centre Forward', createdAt: '' },
            { id: '9', teamId: '1', name: 'Brian Connor', jerseyNo: 9, positions: 'Full Forward', createdAt: '' },
            { id: '10', teamId: '1', name: 'Liam Fitzgerald', jerseyNo: 10, positions: 'Corner Forward', createdAt: '' },
          ]);
          setLoadingPlayers(false);
          return;
        }

        console.log('[MatchTracker] Fetching fixture:', fixtureId);
        const { authenticatedGet } = await import('@/utils/api');
        
        // Fetch fixture details
        const fixtureData = await authenticatedGet(`/api/fixtures/${fixtureId}`);
        console.log('[MatchTracker] Fetched fixture:', fixtureData);
        setFixture(fixtureData);
        
        // Fetch players for the team
        if (fixtureData?.teamId) {
          const playersData = await authenticatedGet<Player[]>(`/api/players?teamId=${fixtureData.teamId}`);
          console.log('[MatchTracker] Fetched players:', playersData);
          setPlayers(playersData || []);
        }
      } catch (error) {
        console.error('[MatchTracker] Error fetching data:', error);
        // Use mock players on error
        setPlayers([
          { id: '1', teamId: '1', name: 'John Murphy', jerseyNo: 1, positions: 'Goalkeeper', createdAt: '' },
          { id: '2', teamId: '1', name: 'Sean O\'Brien', jerseyNo: 2, positions: 'Full Back', createdAt: '' },
          { id: '3', teamId: '1', name: 'Michael Walsh', jerseyNo: 3, positions: 'Corner Back', createdAt: '' },
        ]);
      } finally {
        setLoadingPlayers(false);
      }
    };
    
    fetchData();
  }, [fixtureId]);

  // Match clock timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setMatchClock(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEventPress = (eventType: string, category: string) => {
    console.log('User tapped event button:', eventType, 'in category:', category);
    
    if (!selectedPlayer) {
      Alert.alert('Select Player', 'Please select a player first');
      return;
    }

    const preset = EVENT_PRESETS.find(p => p.category === category);
    const typeConfig = preset?.types.find(t => t.name === eventType);

    const event: Partial<MatchEvent> = {
      fixtureId: params.fixtureId as string || 'mock-fixture-1',
      playerId: selectedPlayer.id,
      timestamp: matchClock,
      eventType,
      eventCategory: category as any,
      clientId: `${Date.now()}-${Math.random()}`,
    };

    // If event requires outcome or zone, show picker
    if (typeConfig?.requiresOutcome) {
      setPendingEvent(event);
      // For now, just add without outcome
      addEvent(event as MatchEvent);
    } else {
      // Show zone picker for most events
      setPendingEvent(event);
      setShowZonePicker(true);
    }
  };

  const addEvent = async (event: MatchEvent) => {
    console.log('Adding match event:', event);
    const newEvent = { ...event, createdAt: new Date().toISOString() };
    setEvents(prev => [...prev, newEvent]);
    
    // Add to offline queue
    await addToQueue(newEvent);
    
    setPendingEvent(null);
    setShowZonePicker(false);
  };

  const handleZoneSelect = (zone: string) => {
    if (pendingEvent) {
      addEvent({ ...pendingEvent, zone } as MatchEvent);
    }
  };

  const undoLastEvent = () => {
    if (events.length === 0) return;
    
    Alert.alert(
      'Undo Last Event',
      `Remove ${events[events.length - 1].eventType}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Undo',
          style: 'destructive',
          onPress: () => {
            console.log('User undid last event');
            setEvents(prev => prev.slice(0, -1));
          },
        },
      ]
    );
  };

  const currentPreset = EVENT_PRESETS.find(p => p.category === selectedCategory);

  // Show error screen if fixtureId is missing
  if (!fixtureId) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Match Tracker',
            headerBackTitle: 'Back',
          }}
        />
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 }]}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="error"
            size={48}
            color="#FF0000"
          />
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, textAlign: 'center' }}>
            No Fixture Selected
          </Text>
          <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center' }}>
            Please select a fixture before accessing the match tracker.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#FF0000', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 8 }}
            onPress={() => router.back()}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loadingPlayers) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Match Tracker',
            headerBackTitle: 'Back',
          }}
        />
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: colors.text, fontSize: 16 }}>Loading players...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: fixture ? `${fixture.opponent} Match` : 'Match Tracker',
          headerBackTitle: 'Back',
          headerRight: () => (
            <TouchableOpacity onPress={() => syncQueue()} disabled={!hasQueuedEvents || isSyncing}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
                <IconSymbol
                  ios_icon_name="arrow.clockwise"
                  android_material_icon_name="sync"
                  size={24}
                  color={hasQueuedEvents ? colors.warning : colors.textSecondary}
                />
                {hasQueuedEvents && (
                  <Text style={[styles.queueBadge, { color: colors.warning }]}>
                    {queuedEvents.length}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ),
        }}
      />

      {/* Network status banner */}
      {!networkState.isConnected && (
        <View style={styles.offlineBanner}>
          <IconSymbol
            ios_icon_name="wifi.slash"
            android_material_icon_name="signal-wifi-off"
            size={16}
            color="#fff"
          />
          <Text style={styles.offlineText}>Offline - Events will sync when connected</Text>
        </View>
      )}

      {/* Match clock */}
      <View style={styles.clockContainer}>
        <Text style={styles.clockTime}>{formatTime(matchClock)}</Text>
        <View style={styles.clockButtons}>
          <TouchableOpacity
            style={[styles.clockButton, isRunning && styles.clockButtonActive]}
            onPress={() => {
              console.log('User toggled match clock:', !isRunning ? 'started' : 'paused');
              setIsRunning(!isRunning);
            }}
          >
            <IconSymbol
              ios_icon_name={isRunning ? 'pause.fill' : 'play.fill'}
              android_material_icon_name={isRunning ? 'pause' : 'play-arrow'}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.clockButton}
            onPress={() => {
              console.log('User reset match clock');
              setMatchClock(0);
              setIsRunning(false);
            }}
          >
            <IconSymbol
              ios_icon_name="arrow.counterclockwise"
              android_material_icon_name="refresh"
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Selected player */}
      <TouchableOpacity
        style={styles.playerSelector}
        onPress={() => {
          console.log('User opened player picker');
          setShowPlayerPicker(true);
        }}
      >
        <IconSymbol
          ios_icon_name="person.fill"
          android_material_icon_name="person"
          size={24}
          color={colors.primary}
        />
        <Text style={styles.playerSelectorText}>
          {selectedPlayer ? `#${selectedPlayer.jerseyNo} ${selectedPlayer.name}` : 'Select Player'}
        </Text>
        <IconSymbol
          ios_icon_name="chevron.down"
          android_material_icon_name="arrow-drop-down"
          size={24}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {/* Category tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryTabs}>
        {EVENT_PRESETS.map((preset) => (
          <TouchableOpacity
            key={preset.category}
            style={[
              styles.categoryTab,
              selectedCategory === preset.category && styles.categoryTabActive,
            ]}
            onPress={() => {
              console.log('User selected category:', preset.category);
              setSelectedCategory(preset.category);
            }}
          >
            <Text
              style={[
                styles.categoryTabText,
                selectedCategory === preset.category && styles.categoryTabTextActive,
              ]}
            >
              {preset.category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Event buttons */}
      <ScrollView style={styles.eventsContainer} contentContainerStyle={styles.eventsContent}>
        {selectedCategory === 'Shot Attempts' && (
          <Text style={styles.sectionHeader}>Shot Attempts</Text>
        )}
        <View style={selectedCategory === 'Shot Attempts' ? styles.grid : styles.eventGrid}>
          {currentPreset?.types.map((type) => {
            const iconName = getIconForEvent(type.name);
            const isCompactLayout = selectedCategory === 'Shot Attempts';
            
            return (
              <TouchableOpacity
                key={type.name}
                style={isCompactLayout ? styles.compactEventButton : styles.eventButton}
                onPress={() => handleEventPress(type.name, selectedCategory)}
                disabled={!selectedPlayer}
              >
                {isCompactLayout && (
                  <IconSymbol
                    ios_icon_name={iconName.ios}
                    android_material_icon_name={iconName.android}
                    size={18}
                    color="#fff"
                  />
                )}
                <Text style={isCompactLayout ? styles.compactEventText : styles.eventButtonText}>
                  {type.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Recent events */}
        <View style={styles.recentEvents}>
          <View style={styles.recentEventsHeader}>
            <Text style={styles.recentEventsTitle}>Recent Events ({events.length})</Text>
            {events.length > 0 && (
              <TouchableOpacity onPress={undoLastEvent}>
                <Text style={styles.undoButton}>Undo Last</Text>
              </TouchableOpacity>
            )}
          </View>
          {events.slice(-10).reverse().map((event, index) => (
            <View key={index} style={styles.eventItem}>
              <Text style={styles.eventTime}>{formatTime(event.timestamp)}</Text>
              <Text style={styles.eventText}>
                {players.find(p => p.id === event.playerId)?.name} - {event.eventType}
                {event.zone && ` (${event.zone})`}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Player picker modal */}
      <Modal visible={showPlayerPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Player</Text>
              <TouchableOpacity onPress={() => setShowPlayerPicker(false)}>
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {players.map((player) => (
                <TouchableOpacity
                  key={player.id}
                  style={styles.playerItem}
                  onPress={() => {
                    console.log('User selected player:', player.name);
                    setSelectedPlayer(player);
                    setShowPlayerPicker(false);
                  }}
                >
                  <Text style={styles.playerNumber}>#{player.jerseyNo}</Text>
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{player.name}</Text>
                    <Text style={styles.playerPosition}>{player.positions}</Text>
                  </View>
                  {selectedPlayer?.id === player.id && (
                    <IconSymbol
                      ios_icon_name="checkmark"
                      android_material_icon_name="check"
                      size={24}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Zone picker modal */}
      <Modal visible={showZonePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Zone</Text>
              <TouchableOpacity onPress={() => setShowZonePicker(false)}>
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.zoneGrid}>
              {PITCH_ZONES.map((zone) => (
                <TouchableOpacity
                  key={zone}
                  style={styles.zoneButton}
                  onPress={() => {
                    console.log('User selected zone:', zone);
                    handleZoneSelect(zone);
                  }}
                >
                  <Text style={styles.zoneButtonText}>{zone}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.zoneButton, styles.zoneButtonSkip]}
                onPress={() => {
                  console.log('User skipped zone selection');
                  if (pendingEvent) {
                    addEvent(pendingEvent as MatchEvent);
                  }
                }}
              >
                <Text style={styles.zoneButtonText}>Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  offlineBanner: {
    backgroundColor: colors.warning,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  offlineText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  clockContainer: {
    backgroundColor: colors.primary,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clockTime: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  clockButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  clockButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  playerSelector: {
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  playerSelectorText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  categoryTabs: {
    marginTop: 16,
    paddingHorizontal: 16,
    maxHeight: 50,
  },
  categoryTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryTabText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  categoryTabTextActive: {
    color: '#fff',
  },
  eventsContainer: {
    flex: 1,
    marginTop: 16,
  },
  eventsContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 8,
    color: colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  eventGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  eventButton: {
    backgroundColor: colors.primary,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: '47%',
    alignItems: 'center',
    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
    elevation: 2,
  },
  eventButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  compactEventButton: {
    width: '48%',
    height: 48,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'red',
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  compactEventText: {
    fontSize: 13,
    color: '#fff',
  },
  recentEvents: {
    marginTop: 24,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  recentEventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentEventsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  undoButton: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '600',
  },
  eventItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  eventTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    minWidth: 50,
  },
  eventText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'android' ? 20 : 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  playerNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    minWidth: 40,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  playerPosition: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  zoneGrid: {
    padding: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  zoneButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: '30%',
    alignItems: 'center',
  },
  zoneButtonSkip: {
    backgroundColor: colors.textSecondary,
  },
  zoneButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  queueBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});
