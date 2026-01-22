
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPost, authenticatedPut } from '@/utils/api';
import { LineupSlot, MatchSquad, Player, TeamSide, Fixture } from '@/types';
import { GAA_POSITIONS } from '@/constants/EventPresets';

// Helper to resolve image sources (handles both local require() and remote URLs)
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: 4,
    margin: 16,
    borderRadius: 12,
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
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  pitchContainer: {
    backgroundColor: '#2D5016',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    minHeight: 400,
  },
  pitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 8,
  },
  positionSlot: {
    width: 70,
    height: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  filledSlot: {
    backgroundColor: colors.primary,
  },
  positionNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  playerName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 2,
  },
  jerseyNumber: {
    fontSize: 8,
    color: '#FFFFFF',
  },
  listContainer: {
    marginHorizontal: 16,
  },
  playerSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  slotNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  slotNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  slotInfo: {
    flex: 1,
  },
  slotPosition: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  slotPlayer: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptySlot: {
    fontStyle: 'italic',
  },
  addButton: {
    padding: 8,
  },
  benchSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  benchNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: 12,
    width: 32,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.card,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: colors.text,
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
    maxHeight: '80%',
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
  modalScroll: {
    maxHeight: 400,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  playerInfo: {
    flex: 1,
  },
  playerItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  playerItemJersey: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  quickAddContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  quickAddTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
  },
  quickAddButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  lockedBanner: {
    backgroundColor: '#FF9500',
    padding: 12,
    alignItems: 'center',
  },
  lockedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  teamInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  teamCrest: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
  },
  teamCrestPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  teamDetails: {
    flex: 1,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  teamColours: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  jerseyPreview: {
    width: 40,
    height: 40,
    marginTop: 4,
    borderRadius: 4,
    backgroundColor: colors.background,
  },
  vsText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
    marginHorizontal: 8,
  },
});

export default function LineupsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const fixtureId = params.fixtureId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSide, setSelectedSide] = useState<TeamSide>('HOME');
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [homeSquad, setHomeSquad] = useState<MatchSquad | null>(null);
  const [awaySquad, setAwaySquad] = useState<MatchSquad | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [selectedSlotType, setSelectedSlotType] = useState<'starting' | 'bench'>('starting');
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddJersey, setQuickAddJersey] = useState('');
  const [showJerseyEditor, setShowJerseyEditor] = useState(false);
  const [editingJerseySlot, setEditingJerseySlot] = useState<{ index: number; type: 'starting' | 'bench' } | null>(null);
  const [editJerseyNumber, setEditJerseyNumber] = useState('');

  useEffect(() => {
    fetchData();
  }, [fixtureId]);

  const fetchData = async () => {
    console.log('Fetching lineups data for fixture:', fixtureId);
    try {
      setLoading(true);

      const fixtureResponse = await authenticatedGet(`/api/fixtures/${fixtureId}`);
      setFixture(fixtureResponse);

      const squadsResponse = await authenticatedGet(`/api/fixtures/${fixtureId}/squads`);
      setHomeSquad(squadsResponse.home || createEmptySquad('HOME'));
      setAwaySquad(squadsResponse.away || createEmptySquad('AWAY'));

      const playersResponse = await authenticatedGet(`/api/players?teamId=${fixtureResponse.teamId}`);
      setPlayers(playersResponse);
    } catch (error) {
      console.error('Error fetching lineups data:', error);
      Alert.alert('Error', 'Failed to load lineups data');
    } finally {
      setLoading(false);
    }
  };

  const createEmptySquad = (side: TeamSide): MatchSquad => {
    const startingSlots: LineupSlot[] = GAA_POSITIONS.map(pos => ({
      positionNo: pos.positionNo,
      positionName: pos.positionName,
      playerId: null,
      playerName: null,
      jerseyNo: null,
    }));

    const bench: LineupSlot[] = Array.from({ length: 15 }, (_, i) => ({
      positionNo: i + 16,
      positionName: `Bench ${i + 1}`,
      playerId: null,
      playerName: null,
      jerseyNo: null,
    }));

    return {
      id: '',
      fixtureId,
      side,
      startingSlots,
      bench,
      subsLog: [],
      locked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const currentSquad = selectedSide === 'HOME' ? homeSquad : awaySquad;

  const handleSlotPress = (index: number, type: 'starting' | 'bench') => {
    if (currentSquad?.locked) {
      Alert.alert('Lineup Locked', 'This lineup is locked because the match has started.');
      return;
    }
    console.log('Slot pressed:', type, index);
    
    const slots = type === 'starting' ? currentSquad?.startingSlots : currentSquad?.bench;
    const slot = slots?.[index];
    
    // If slot has a player, show options to change player or edit jersey number
    if (slot?.playerId) {
      Alert.alert(
        'Edit Slot',
        `${slot.playerName} - Jersey #${slot.jerseyNo || 'None'}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Change Player',
            onPress: () => {
              setSelectedSlotIndex(index);
              setSelectedSlotType(type);
              setShowPlayerPicker(true);
            },
          },
          {
            text: 'Edit Jersey Number',
            onPress: () => {
              setEditingJerseySlot({ index, type });
              setEditJerseyNumber(slot.jerseyNo || '');
              setShowJerseyEditor(true);
            },
          },
          {
            text: 'Remove Player',
            style: 'destructive',
            onPress: () => handleRemovePlayer(index, type),
          },
        ]
      );
    } else {
      // Empty slot, just show player picker
      setSelectedSlotIndex(index);
      setSelectedSlotType(type);
      setShowPlayerPicker(true);
    }
  };

  const handleRemovePlayer = async (index: number, type: 'starting' | 'bench') => {
    if (!currentSquad) return;
    
    const slots = type === 'starting' ? currentSquad.startingSlots : currentSquad.bench;
    const updatedSlots = [...slots];
    
    updatedSlots[index] = {
      ...updatedSlots[index],
      playerId: null,
      playerName: null,
      jerseyNo: null,
    };

    await saveSquad(
      type === 'starting' ? updatedSlots : currentSquad.startingSlots,
      type === 'bench' ? updatedSlots : currentSquad.bench
    );
  };

  const handleSaveJerseyNumber = async () => {
    if (!currentSquad || !editingJerseySlot) return;
    
    const { index, type } = editingJerseySlot;
    const slots = type === 'starting' ? currentSquad.startingSlots : currentSquad.bench;
    const updatedSlots = [...slots];
    
    updatedSlots[index] = {
      ...updatedSlots[index],
      jerseyNo: editJerseyNumber.trim() || null,
    };

    await saveSquad(
      type === 'starting' ? updatedSlots : currentSquad.startingSlots,
      type === 'bench' ? updatedSlots : currentSquad.bench
    );

    setShowJerseyEditor(false);
    setEditingJerseySlot(null);
    setEditJerseyNumber('');
  };

  const handlePlayerSelect = async (player: Player) => {
    console.log('Player selected:', player.name);
    if (!currentSquad || selectedSlotIndex === null) return;

    const slots = selectedSlotType === 'starting' ? currentSquad.startingSlots : currentSquad.bench;
    
    const isDuplicate = [...currentSquad.startingSlots, ...currentSquad.bench].some(
      (slot, idx) => {
        const isCurrentSlot = selectedSlotType === 'starting' 
          ? idx === selectedSlotIndex 
          : idx === selectedSlotIndex + 15;
        return !isCurrentSlot && slot.playerId === player.id;
      }
    );

    if (isDuplicate) {
      Alert.alert('Duplicate Player', 'This player is already in the lineup.');
      return;
    }

    const updatedSlots = [...slots];
    
    // Auto-assign jersey number for starting lineup (1-15 based on position)
    // For bench, leave jersey number null or allow manual assignment
    const autoJerseyNo = selectedSlotType === 'starting' 
      ? (selectedSlotIndex + 1).toString() 
      : null;
    
    updatedSlots[selectedSlotIndex] = {
      ...updatedSlots[selectedSlotIndex],
      playerId: player.id,
      playerName: player.name,
      jerseyNo: autoJerseyNo,
    };

    await saveSquad(
      selectedSlotType === 'starting' ? updatedSlots : currentSquad.startingSlots,
      selectedSlotType === 'bench' ? updatedSlots : currentSquad.bench
    );

    setShowPlayerPicker(false);
    setSelectedSlotIndex(null);
  };

  const handleQuickAdd = async () => {
    if (!quickAddName.trim() || !fixture) {
      Alert.alert('Error', 'Please enter a player name');
      return;
    }

    console.log('Quick adding player:', quickAddName);
    try {
      const newPlayer = await authenticatedPost(`/api/players`, {
        teamId: fixture.teamId,
        name: quickAddName.trim(),
      });

      setPlayers([...players, newPlayer]);
      setQuickAddName('');
      
      await handlePlayerSelect(newPlayer);
    } catch (error) {
      console.error('Error quick adding player:', error);
      Alert.alert('Error', 'Failed to add player');
    }
  };

  const saveSquad = async (startingSlots: LineupSlot[], bench: LineupSlot[]) => {
    console.log('Saving squad for side:', selectedSide);
    try {
      setSaving(true);
      
      const response = await authenticatedPost(`/api/fixtures/${fixtureId}/squads`, {
        side: selectedSide,
        startingSlots,
        bench,
      });

      if (selectedSide === 'HOME') {
        setHomeSquad(response);
      } else {
        setAwaySquad(response);
      }
    } catch (error) {
      console.error('Error saving squad:', error);
      Alert.alert('Error', 'Failed to save lineup');
    } finally {
      setSaving(false);
    }
  };

  const handleStartMatch = async () => {
    console.log('Starting match');
    const homeStartingCount = homeSquad?.startingSlots.filter(s => s.playerId).length || 0;
    const awayStartingCount = awaySquad?.startingSlots.filter(s => s.playerId).length || 0;

    if (homeStartingCount < 15 || awayStartingCount < 15) {
      Alert.alert(
        'Incomplete Lineups',
        `Home: ${homeStartingCount}/15, Away: ${awayStartingCount}/15. Start anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start Match', onPress: startMatch },
        ]
      );
    } else {
      startMatch();
    }
  };

  const startMatch = async () => {
    try {
      await authenticatedPost(`/api/fixtures/${fixtureId}/match-state/start`, {});
      console.log('Match started, navigating to tracker');
      router.push(`/match-tracker-live/${fixtureId}`);
    } catch (error) {
      console.error('Error starting match:', error);
      Alert.alert('Error', 'Failed to start match');
    }
  };

  const renderPitchLayout = () => {
    if (!currentSquad) return null;

    const rows = [
      [13, 14, 15],
      [10, 11, 12],
      [8, 9],
      [5, 6, 7],
      [2, 3, 4],
      [1],
    ];

    return (
      <View style={styles.pitchContainer}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.pitchRow}>
            {row.map(posNo => {
              const slot = currentSquad.startingSlots.find(s => s.positionNo === posNo);
              if (!slot) return null;
              
              const hasPlayer = !!slot.playerId;
              const displayName = slot.playerName || '';
              const displayJersey = slot.jerseyNo || '';

              return (
                <TouchableOpacity
                  key={posNo}
                  style={[styles.positionSlot, hasPlayer && styles.filledSlot]}
                  onPress={() => handleSlotPress(posNo - 1, 'starting')}
                >
                  <Text style={styles.positionNumber}>{posNo}</Text>
                  {hasPlayer && (
                    <>
                      <Text style={styles.playerName} numberOfLines={1}>
                        {displayName}
                      </Text>
                      {displayJersey && (
                        <Text style={styles.jerseyNumber}>{displayJersey}</Text>
                      )}
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const renderStartingList = () => {
    if (!currentSquad) return null;

    return (
      <View style={styles.listContainer}>
        {currentSquad.startingSlots.map((slot, index) => {
          const hasPlayer = !!slot.playerId;
          const displayPosition = slot.positionName;
          const displayPlayer = slot.playerName || 'Tap to add player';
          const displayJersey = slot.jerseyNo ? `#${slot.jerseyNo}` : '';

          return (
            <TouchableOpacity
              key={index}
              style={styles.playerSlot}
              onPress={() => handleSlotPress(index, 'starting')}
            >
              <View style={styles.slotNumber}>
                <Text style={styles.slotNumberText}>{slot.positionNo}</Text>
              </View>
              <View style={styles.slotInfo}>
                <Text style={styles.slotPosition}>{displayPosition}</Text>
                <Text style={[styles.slotPlayer, !hasPlayer && styles.emptySlot]}>
                  {displayPlayer} {displayJersey}
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderBench = () => {
    if (!currentSquad) return null;

    return (
      <View style={styles.listContainer}>
        {currentSquad.bench.map((slot, index) => {
          const hasPlayer = !!slot.playerId;
          const displayPlayer = slot.playerName || 'Tap to add player';
          const displayJersey = slot.jerseyNo ? `#${slot.jerseyNo}` : '';
          const benchNumber = index + 16;

          return (
            <TouchableOpacity
              key={index}
              style={styles.benchSlot}
              onPress={() => handleSlotPress(index, 'bench')}
            >
              <Text style={styles.benchNumber}>{benchNumber}</Text>
              <View style={styles.slotInfo}>
                <Text style={[styles.slotPlayer, !hasPlayer && styles.emptySlot]}>
                  {displayPlayer} {displayJersey}
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderPlayerPicker = () => {
    const availablePlayers = players.filter(p => {
      if (!currentSquad) return true;
      const isInLineup = [...currentSquad.startingSlots, ...currentSquad.bench].some(
        slot => slot.playerId === p.id
      );
      return !isInLineup;
    });

    return (
      <Modal
        visible={showPlayerPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPlayerPicker(false)}
      >
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

            <View style={styles.quickAddContainer}>
              <Text style={styles.quickAddTitle}>Quick Add New Player</Text>
              <TextInput
                style={styles.input}
                placeholder="Player Name"
                placeholderTextColor={colors.textSecondary}
                value={quickAddName}
                onChangeText={setQuickAddName}
              />
              <TouchableOpacity style={styles.quickAddButton} onPress={handleQuickAdd}>
                <Text style={styles.buttonText}>Add Player</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {availablePlayers.map(player => {
                const playerName = player.name;
                const positionsText = player.positions || '';

                return (
                  <TouchableOpacity
                    key={player.id}
                    style={styles.playerItem}
                    onPress={() => handlePlayerSelect(player)}
                  >
                    <View style={styles.playerInfo}>
                      <Text style={styles.playerItemName}>{playerName}</Text>
                      {positionsText && (
                        <Text style={styles.playerItemJersey}>{positionsText}</Text>
                      )}
                    </View>
                    <IconSymbol
                      ios_icon_name="chevron.right"
                      android_material_icon_name="chevron-right"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Lineups', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const isLocked = currentSquad?.locked || false;
  const opponentName = fixture?.opponent || 'Opponent';
  
  // Get team names and details
  const homeTeamName = fixture?.homeTeamName || 'Home Team';
  const awayTeamName = fixture?.awayTeamName || fixture?.opponent || 'Away Team';
  const homeCrestUrl = fixture?.homeCrestImageUrl || fixture?.homeCrestUrl;
  const awayCrestUrl = fixture?.awayCrestImageUrl || fixture?.awayCrestUrl;
  const homeColours = fixture?.homeColours;
  const awayColours = fixture?.awayColours;
  const homeJerseyUrl = fixture?.homeJerseyImageUrl;
  const awayJerseyUrl = fixture?.awayJerseyImageUrl;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: `Team Line Out vs ${opponentName}`, headerShown: true }} />
      
      {isLocked && (
        <View style={styles.lockedBanner}>
          <Text style={styles.lockedText}>Lineups Locked - Match Started</Text>
        </View>
      )}

      {/* Team Header with Crests, Jerseys, and Colors */}
      <View style={styles.teamHeader}>
        <View style={styles.teamInfo}>
          {homeCrestUrl ? (
            <Image 
              source={resolveImageSource(homeCrestUrl)} 
              style={styles.teamCrest}
              resizeMode="contain"
              onError={() => console.log('[Lineups] Failed to load home crest image')}
            />
          ) : (
            <View style={styles.teamCrestPlaceholder}>
              <IconSymbol
                ios_icon_name="shield"
                android_material_icon_name="shield"
                size={32}
                color={colors.textSecondary}
              />
            </View>
          )}
          <View style={styles.teamDetails}>
            <Text style={styles.teamName}>{homeTeamName}</Text>
            {homeColours && (
              <Text style={styles.teamColours}>{homeColours}</Text>
            )}
            {homeJerseyUrl && (
              <Image 
                source={resolveImageSource(homeJerseyUrl)} 
                style={styles.jerseyPreview}
                resizeMode="contain"
                onError={() => console.log('[Lineups] Failed to load home jersey image')}
              />
            )}
          </View>
        </View>

        <Text style={styles.vsText}>vs</Text>

        <View style={styles.teamInfo}>
          {awayCrestUrl ? (
            <Image 
              source={resolveImageSource(awayCrestUrl)} 
              style={styles.teamCrest}
              resizeMode="contain"
              onError={() => console.log('[Lineups] Failed to load away crest image')}
            />
          ) : (
            <View style={styles.teamCrestPlaceholder}>
              <IconSymbol
                ios_icon_name="shield"
                android_material_icon_name="shield"
                size={32}
                color={colors.textSecondary}
              />
            </View>
          )}
          <View style={styles.teamDetails}>
            <Text style={styles.teamName}>{awayTeamName}</Text>
            {awayColours && (
              <Text style={styles.teamColours}>{awayColours}</Text>
            )}
            {awayJerseyUrl && (
              <Image 
                source={resolveImageSource(awayJerseyUrl)} 
                style={styles.jerseyPreview}
                resizeMode="contain"
                onError={() => console.log('[Lineups] Failed to load away jersey image')}
              />
            )}
          </View>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedSide === 'HOME' && styles.activeTab]}
          onPress={() => setSelectedSide('HOME')}
        >
          <Text style={[styles.tabText, selectedSide === 'HOME' && styles.activeTabText]}>
            Home
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedSide === 'AWAY' && styles.activeTab]}
          onPress={() => setSelectedSide('AWAY')}
        >
          <Text style={[styles.tabText, selectedSide === 'AWAY' && styles.activeTabText]}>
            Away
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {renderPitchLayout()}

        <Text style={styles.sectionTitle}>Starting 15 (1-15)</Text>
        {renderStartingList()}

        <Text style={styles.sectionTitle}>Bench (16-30)</Text>
        {renderBench()}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.back()}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleStartMatch}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Start Match</Text>
          )}
        </TouchableOpacity>
      </View>

      {renderPlayerPicker()}

      {/* Jersey Number Editor Modal */}
      <Modal
        visible={showJerseyEditor}
        animationType="fade"
        transparent
        onRequestClose={() => setShowJerseyEditor(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 300 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Jersey Number</Text>
              <TouchableOpacity onPress={() => setShowJerseyEditor(false)}>
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 16 }}>
              <TextInput
                style={styles.input}
                placeholder="Jersey Number"
                placeholderTextColor={colors.textSecondary}
                value={editJerseyNumber}
                onChangeText={setEditJerseyNumber}
                keyboardType="number-pad"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.quickAddButton, { marginTop: 16 }]}
                onPress={handleSaveJerseyNumber}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
