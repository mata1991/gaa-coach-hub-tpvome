
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPost, authenticatedPut } from '@/utils/api';
import { Fixture, Player, LineupSlot, MatchSquad, TeamSide } from '@/types';
import { GAA_POSITIONS } from '@/constants/EventPresets';

// Helper to resolve image sources (handles both local require() and remote URLs)
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function TeamLineoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ fixtureId?: string; side?: string; mode?: string }>();
  const fixtureId = params.fixtureId;
  const initialSide = (params.side || 'home') as 'home' | 'away';
  const mode = params.mode || 'view';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedSide, setSelectedSide] = useState<TeamSide>(initialSide.toUpperCase() as TeamSide);
  const [homeSquad, setHomeSquad] = useState<MatchSquad | null>(null);
  const [awaySquad, setAwaySquad] = useState<MatchSquad | null>(null);
  
  // Player picker state
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [selectedSlotType, setSelectedSlotType] = useState<'starting' | 'bench'>('starting');
  const [filterPosition, setFilterPosition] = useState<string | null>(null);
  
  // Quick add state
  const [quickAddName, setQuickAddName] = useState('');

  console.log('[TeamLineout] Rendering team lineout screen', { fixtureId, side: initialSide });

  useEffect(() => {
    if (!fixtureId) {
      console.error('[TeamLineout] ERROR: fixtureId is missing!');
      setLoading(false);
      return;
    }
    
    fetchData();
  }, [fixtureId]);

  const fetchData = async () => {
    console.log('[TeamLineout] Fetching lineup data');
    setLoading(true);

    try {
      const fixtureData = await authenticatedGet<Fixture>(`/api/fixtures/${fixtureId}`);
      console.log('[TeamLineout] Fixture data fetched:', fixtureData);
      setFixture(fixtureData);

      const squadsResponse = await authenticatedGet(`/api/fixtures/${fixtureId}/squads`);
      console.log('[TeamLineout] Squads response:', squadsResponse);
      
      const squadsArray = Array.isArray(squadsResponse) ? squadsResponse : [];
      const homeSquadData = squadsArray.find((s: any) => s.side === 'HOME');
      const awaySquadData = squadsArray.find((s: any) => s.side === 'AWAY');
      
      setHomeSquad(homeSquadData || createEmptySquad('HOME'));
      setAwaySquad(awaySquadData || createEmptySquad('AWAY'));

      const playersResponse = await authenticatedGet<Player[]>(`/api/players?teamId=${fixtureData.teamId}`);
      console.log('[TeamLineout] Players fetched:', playersResponse.length);
      setPlayers(playersResponse);
    } catch (error) {
      console.error('[TeamLineout] Error fetching lineup data:', error);
      Alert.alert('Error', 'Failed to load lineup data. Please try again.');
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
      fixtureId: fixtureId || '',
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
    console.log('[TeamLineout] Slot pressed:', type, index);
    setSelectedSlotIndex(index);
    setSelectedSlotType(type);
    setFilterPosition(null);
    setShowPlayerPicker(true);
  };

  const handlePlayerSelect = async (player: Player) => {
    console.log('[TeamLineout] Player selected:', player.name);
    if (!currentSquad || selectedSlotIndex === null) return;

    const slots = selectedSlotType === 'starting' ? currentSquad.startingSlots : currentSquad.bench;
    const updatedSlots = [...slots];
    
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

  const handleSkip = () => {
    console.log('[TeamLineout] User skipped player selection');
    setShowPlayerPicker(false);
    setSelectedSlotIndex(null);
  };

  const handleQuickAdd = async () => {
    if (!quickAddName.trim() || !fixture) {
      Alert.alert('Error', 'Please enter a player name');
      return;
    }

    console.log('[TeamLineout] Quick adding player:', quickAddName);
    try {
      const newPlayer = await authenticatedPost<Player>(`/api/players`, {
        teamId: fixture.teamId,
        name: quickAddName.trim(),
      });

      setPlayers([...players, newPlayer]);
      setQuickAddName('');
      
      await handlePlayerSelect(newPlayer);
    } catch (error) {
      console.error('[TeamLineout] Error quick adding player:', error);
      Alert.alert('Error', 'Failed to add player');
    }
  };

  const saveSquad = async (startingSlots: LineupSlot[], bench: LineupSlot[]) => {
    console.log('[TeamLineout] Saving squad for side:', selectedSide);
    try {
      setSaving(true);
      
      const response = await authenticatedPost(`/api/fixtures/${fixtureId}/squads`, {
        side: selectedSide,
        startingSlots,
        bench,
      });

      console.log('[TeamLineout] Squad saved successfully');

      if (selectedSide === 'HOME') {
        setHomeSquad(response);
      } else {
        setAwaySquad(response);
      }
    } catch (error) {
      console.error('[TeamLineout] Error saving squad:', error);
      Alert.alert('Error', 'Failed to save lineup. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleViewSheet = () => {
    console.log('[TeamLineout] User tapped View Sheet button');
    const side = selectedSide.toLowerCase();
    router.push({
      pathname: '/team-lineout-sheet/[fixtureId]',
      params: { fixtureId, side },
    });
  };

  if (!fixtureId) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Team Line Out', headerShown: true }} />
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="error"
            size={48}
            color="#FF0000"
          />
          <Text style={styles.errorTitle}>No Fixture Selected</Text>
          <Text style={styles.errorText}>Please select a fixture to create a lineup.</Text>
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
        <Stack.Screen options={{ title: 'Team Line Out', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading lineup...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const opponentName = fixture?.opponent || 'Opponent';
  const jerseyImageUrl = selectedSide === 'HOME' 
    ? fixture?.homeJerseyImageUrl 
    : fixture?.awayJerseyImageUrl;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `Team Line Out vs ${opponentName}`,
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Home/Away Tabs */}
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
          {/* Pitch View */}
          <View style={styles.pitchContainer}>
            {GAA_POSITIONS.map((pos, index) => {
              const slot = currentSquad?.startingSlots[index];
              if (!slot) return null;
              
              const hasPlayer = !!slot.playerId;
              const displayName = slot.playerName || 'Tap to add';
              const displayNumber = slot.jerseyNo || pos.positionNo.toString();

              return (
                <TouchableOpacity
                  key={pos.positionNo}
                  style={[styles.positionSlot, hasPlayer && styles.filledSlot]}
                  onPress={() => handleSlotPress(index, 'starting')}
                >
                  {hasPlayer && jerseyImageUrl && (
                    <Image
                      source={resolveImageSource(jerseyImageUrl)}
                      style={styles.jerseyImage}
                      resizeMode="contain"
                    />
                  )}
                  <Text style={styles.positionNumber}>{displayNumber}</Text>
                  <Text style={styles.playerName} numberOfLines={1}>
                    {displayName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Bench */}
          <Text style={styles.sectionTitle}>Bench</Text>
          <View style={styles.benchContainer}>
            {currentSquad?.bench.map((slot, index) => {
              const hasPlayer = !!slot.playerId;
              const displayName = slot.playerName || 'Tap to add';
              const benchNumber = (index + 16).toString();

              return (
                <TouchableOpacity
                  key={index}
                  style={styles.benchSlot}
                  onPress={() => handleSlotPress(index, 'bench')}
                >
                  <Text style={styles.benchNumber}>{benchNumber}</Text>
                  <Text style={[styles.benchName, !hasPlayer && styles.emptySlot]}>
                    {displayName}
                  </Text>
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

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleViewSheet}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="doc.text"
                  android_material_icon_name="description"
                  size={24}
                  color="#FFFFFF"
                />
                <Text style={styles.primaryButtonText}>View Lineout Sheet</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Player Picker Modal */}
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

              {/* Quick Add */}
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

              {/* Player List */}
              <ScrollView style={styles.modalScroll}>
                {players.map(player => {
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
                          <Text style={styles.playerItemPosition}>{positionsText}</Text>
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

              {/* Skip Button */}
              <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
    flex: 1,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: 4,
    margin: 16,
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
  pitchContainer: {
    backgroundColor: '#2D5016',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 12,
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
    overflow: 'hidden',
  },
  filledSlot: {
    backgroundColor: colors.primary,
  },
  jerseyImage: {
    width: 50,
    height: 50,
    position: 'absolute',
    top: 10,
  },
  positionNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  playerName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  benchContainer: {
    marginHorizontal: 16,
    gap: 8,
  },
  benchSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  benchNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: 12,
    width: 32,
  },
  benchName: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  emptySlot: {
    fontStyle: 'italic',
    color: colors.textSecondary,
  },
  actionButtons: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
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
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickAddButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalScroll: {
    maxHeight: 300,
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
  playerItemPosition: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  skipButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
