
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPost, authenticatedPut } from '@/utils/api';
import { Fixture, Player, LineupSlot, MatchSquad, TeamSide } from '@/types';
import { GAA_POSITIONS } from '@/constants/EventPresets';
import { ScreenState } from '@/components/ScreenState';
import { useSafeParams, isValidParam } from '@/hooks/useSafeParams';

export default function TeamLineoutScreen() {
  const router = useRouter();
  const params = useSafeParams<{ fixtureId?: string; side?: string }>();
  const fixtureId = params.fixtureId;
  const initialSide = (params.side || 'home') as 'home' | 'away';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedSide, setSelectedSide] = useState<TeamSide>(initialSide.toUpperCase() as TeamSide);
  const [homeSquad, setHomeSquad] = useState<MatchSquad | null>(null);
  const [awaySquad, setAwaySquad] = useState<MatchSquad | null>(null);
  
  // Player picker state
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [selectedSlotType, setSelectedSlotType] = useState<'starting' | 'bench'>('starting');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState<{
    title: string;
    message: string;
  } | null>(null);

  console.log('[TeamLineout] Rendering team lineout screen', { fixtureId, side: initialSide });

  useEffect(() => {
    if (!isValidParam(fixtureId, 'fixtureId')) {
      setError('Invalid fixture ID');
      setLoading(false);
      return;
    }
    
    fetchData();
  }, [fixtureId]);

  const showAlert = (title: string, message: string) => {
    setAlertModalConfig({ title, message });
    setShowAlertModal(true);
  };

  const fetchData = async () => {
    if (!fixtureId) return;
    
    console.log('[TeamLineout] Fetching lineup data');
    setLoading(true);
    setError(null);

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
    } catch (err: any) {
      console.error('[TeamLineout] Error fetching lineup data:', err);
      setError(err?.message || 'Failed to load lineup data');
    } finally {
      setLoading(false);
    }
  };

  const createEmptySquad = (side: TeamSide): MatchSquad => {
    const startingSlots: LineupSlot[] = GAA_POSITIONS.map(pos => ({
      positionNo: pos.positionNo,
      positionName: pos.positionName,
      playerId: null,
      playerName: side === 'AWAY' ? `Away #${pos.positionNo}` : null,
      jerseyNo: side === 'AWAY' ? pos.positionNo.toString() : null,
    }));

    const bench: LineupSlot[] = Array.from({ length: 15 }, (_, i) => ({
      positionNo: i + 16,
      positionName: `Bench ${i + 1}`,
      playerId: null,
      playerName: side === 'AWAY' ? `Away #${i + 16}` : null,
      jerseyNo: side === 'AWAY' ? (i + 16).toString() : null,
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
    setSearchQuery('');
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

    // Optimistic update
    if (selectedSide === 'HOME') {
      setHomeSquad({
        ...currentSquad,
        [selectedSlotType === 'starting' ? 'startingSlots' : 'bench']: updatedSlots,
      });
    } else {
      setAwaySquad({
        ...currentSquad,
        [selectedSlotType === 'starting' ? 'startingSlots' : 'bench']: updatedSlots,
      });
    }

    setShowPlayerPicker(false);
    setSelectedSlotIndex(null);

    await saveSquad(
      selectedSlotType === 'starting' ? updatedSlots : currentSquad.startingSlots,
      selectedSlotType === 'bench' ? updatedSlots : currentSquad.bench
    );
  };

  const handleRemovePlayer = async (index: number, type: 'starting' | 'bench') => {
    if (!currentSquad) return;

    const slots = type === 'starting' ? currentSquad.startingSlots : currentSquad.bench;
    const updatedSlots = [...slots];
    
    updatedSlots[index] = {
      ...updatedSlots[index],
      playerId: null,
      playerName: selectedSide === 'AWAY' ? `Away #${updatedSlots[index].positionNo}` : null,
      jerseyNo: selectedSide === 'AWAY' ? updatedSlots[index].positionNo.toString() : null,
    };

    // Optimistic update
    if (selectedSide === 'HOME') {
      setHomeSquad({
        ...currentSquad,
        [type === 'starting' ? 'startingSlots' : 'bench']: updatedSlots,
      });
    } else {
      setAwaySquad({
        ...currentSquad,
        [type === 'starting' ? 'startingSlots' : 'bench']: updatedSlots,
      });
    }

    await saveSquad(
      type === 'starting' ? updatedSlots : currentSquad.startingSlots,
      type === 'bench' ? updatedSlots : currentSquad.bench
    );
  };

  const saveSquad = async (startingSlots: LineupSlot[], bench: LineupSlot[]) => {
    if (!fixtureId) return;
    
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
    } catch (err: any) {
      console.error('[TeamLineout] Error saving squad:', err);
      showAlert('Error', 'Failed to save lineup. Please try again.');
      // Rollback on error
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleViewPitch = () => {
    console.log('[TeamLineout] User tapped View Pitch button');
    const side = selectedSide.toLowerCase();
    router.push({
      pathname: '/team-lineout-sheet/[fixtureId]',
      params: { fixtureId, side },
    });
  };

  const getStarting15Count = () => {
    if (!currentSquad) return 0;
    return currentSquad.startingSlots.filter(slot => slot.playerId || slot.playerName).length;
  };

  const isStarting15Complete = getStarting15Count() === 15;

  const filteredPlayers = players.filter(player => 
    player.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isValidParam(fixtureId, 'fixtureId')) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Team Line Out', headerShown: true }} />
        <ScreenState
          error="Invalid fixture ID. Please select a valid fixture."
          onRetry={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  const opponentName = fixture?.opponent || 'Opponent';
  const starting15Count = getStarting15Count();

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
        <ScreenState
          loading={loading}
          error={error}
          onRetry={fetchData}
        >
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

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Starting 15: {starting15Count}/15
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(starting15Count / 15) * 100}%` }]} />
            </View>
          </View>

          <ScrollView style={styles.content}>
            {/* Starting 15 List */}
            <Text style={styles.sectionTitle}>Starting 15</Text>
            <View style={styles.positionsList}>
              {currentSquad?.startingSlots.map((slot, index) => {
                const hasPlayer = !!slot.playerId || !!slot.playerName;
                const displayName = slot.playerName || 'Tap to select';
                const positionText = slot.positionName;

                return (
                  <TouchableOpacity
                    key={slot.positionNo}
                    style={styles.positionRow}
                    onPress={() => handleSlotPress(index, 'starting')}
                  >
                    <View style={styles.positionInfo}>
                      <Text style={styles.positionNumber}>{slot.positionNo}</Text>
                      <View style={styles.positionDetails}>
                        <Text style={styles.positionName}>{positionText}</Text>
                        <Text style={[styles.playerName, !hasPlayer && styles.emptySlot]}>
                          {displayName}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.positionActions}>
                      {hasPlayer && (
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleRemovePlayer(index, 'starting');
                          }}
                        >
                          <IconSymbol
                            ios_icon_name="xmark.circle.fill"
                            android_material_icon_name="cancel"
                            size={20}
                            color="#dc3545"
                          />
                        </TouchableOpacity>
                      )}
                      <IconSymbol
                        ios_icon_name="chevron.right"
                        android_material_icon_name="chevron-right"
                        size={20}
                        color={colors.textSecondary}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Bench List */}
            <Text style={styles.sectionTitle}>Bench</Text>
            <View style={styles.positionsList}>
              {currentSquad?.bench.map((slot, index) => {
                const hasPlayer = !!slot.playerId || !!slot.playerName;
                const displayName = slot.playerName || 'Tap to select';
                const benchNumber = (index + 16).toString();

                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.positionRow}
                    onPress={() => handleSlotPress(index, 'bench')}
                  >
                    <View style={styles.positionInfo}>
                      <Text style={styles.positionNumber}>{benchNumber}</Text>
                      <View style={styles.positionDetails}>
                        <Text style={[styles.playerName, !hasPlayer && styles.emptySlot]}>
                          {displayName}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.positionActions}>
                      {hasPlayer && (
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleRemovePlayer(index, 'bench');
                          }}
                        >
                          <IconSymbol
                            ios_icon_name="xmark.circle.fill"
                            android_material_icon_name="cancel"
                            size={20}
                            color="#dc3545"
                          />
                        </TouchableOpacity>
                      )}
                      <IconSymbol
                        ios_icon_name="chevron.right"
                        android_material_icon_name="chevron-right"
                        size={20}
                        color={colors.textSecondary}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.primaryButton, !isStarting15Complete && styles.disabledButton]}
              onPress={handleViewPitch}
              disabled={!isStarting15Complete || saving}
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
                  <Text style={styles.primaryButtonText}>View Pitch Layout</Text>
                </>
              )}
            </TouchableOpacity>
            {!isStarting15Complete && (
              <Text style={styles.helperText}>
                Complete the starting 15 to view pitch layout
              </Text>
            )}
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

                {/* Search */}
                <View style={styles.searchContainer}>
                  <IconSymbol
                    ios_icon_name="magnifyingglass"
                    android_material_icon_name="search"
                    size={20}
                    color={colors.textSecondary}
                  />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search players..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                {/* Player List */}
                <FlatList
                  data={filteredPlayers}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => {
                    const playerName = item.name;
                    const positionText = item.primaryPositionGroup || '';

                    return (
                      <TouchableOpacity
                        style={styles.playerItem}
                        onPress={() => handlePlayerSelect(item)}
                      >
                        <View style={styles.playerInfo}>
                          <Text style={styles.playerItemName}>{playerName}</Text>
                          {positionText && (
                            <Text style={styles.playerItemPosition}>{positionText}</Text>
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
                  }}
                  ListEmptyComponent={
                    <View style={styles.emptyList}>
                      <Text style={styles.emptyListText}>No players found</Text>
                    </View>
                  }
                />

                {/* Skip Button */}
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={() => setShowPlayerPicker(false)}
                >
                  <Text style={styles.skipButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Custom Alert Modal */}
          <Modal
            visible={showAlertModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowAlertModal(false)}
          >
            <View style={styles.alertOverlay}>
              <View style={styles.alertModal}>
                <Text style={styles.alertTitle}>{alertModalConfig?.title}</Text>
                <Text style={styles.alertMessage}>{alertModalConfig?.message}</Text>
                <TouchableOpacity
                  style={styles.alertButton}
                  onPress={() => setShowAlertModal(false)}
                >
                  <Text style={styles.alertButtonText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </ScreenState>
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
  progressContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  positionsList: {
    marginHorizontal: 16,
    gap: 8,
  },
  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  positionInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  positionNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    width: 32,
  },
  positionDetails: {
    flex: 1,
  },
  positionName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  emptySlot: {
    fontStyle: 'italic',
    color: colors.textSecondary,
    fontWeight: '400',
  },
  positionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeButton: {
    padding: 4,
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
  disabledButton: {
    backgroundColor: colors.textSecondary,
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  helperText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
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
  emptyList: {
    padding: 32,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 16,
    color: colors.textSecondary,
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
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertModal: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  alertButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  alertButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
