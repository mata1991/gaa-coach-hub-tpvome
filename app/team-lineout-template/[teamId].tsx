
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { authenticatedGet } from '@/utils/api';
import { Player, LineupSlot } from '@/types';
import { ScreenState } from '@/components/ScreenState';
import { useSafeParams, isValidParam } from '@/hooks/useSafeParams';
import { GAA_POSITIONS } from '@/constants/EventPresets';

type Position = 'GOALKEEPER' | 'BACK' | 'MIDFIELDER' | 'FORWARD';

const POS_ORDER: Record<string, number> = {
  'GOALKEEPER': 0,
  'GK': 0,
  'BACK': 1,
  'MIDFIELDER': 2,
  'MID': 2,
  'FORWARD': 3,
  'FWD': 3,
};

const POS_LABEL: Record<string, string> = {
  'GOALKEEPER': 'Goalkeepers',
  'GK': 'Goalkeepers',
  'BACK': 'Backs',
  'MIDFIELDER': 'Midfielders',
  'MID': 'Midfielders',
  'FORWARD': 'Forwards',
  'FWD': 'Forwards',
};

export default function TeamLineoutTemplateScreen() {
  const router = useRouter();
  const params = useSafeParams<{ teamId?: string }>();
  const teamId = params.teamId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [startingSlots, setStartingSlots] = useState<LineupSlot[]>([]);
  const [benchSlots, setBenchSlots] = useState<LineupSlot[]>([]);
  
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

  console.log('[TeamLineoutTemplate] Rendering team lineout template screen', { teamId });

  useEffect(() => {
    if (!isValidParam(teamId, 'teamId')) {
      setError('Invalid team ID');
      setLoading(false);
      return;
    }
    
    fetchData();
  }, [teamId]);

  const showAlert = (title: string, message: string) => {
    setAlertModalConfig({ title, message });
    setShowAlertModal(true);
  };

  const fetchData = async () => {
    if (!teamId) return;
    
    console.log('[TeamLineoutTemplate] Fetching players for teamId:', teamId);
    setLoading(true);
    setError(null);

    try {
      // Fetch players using the correct endpoint
      const playersResponse = await authenticatedGet<Player[]>(`/api/teams/${teamId}/players`);
      console.log('[TeamLineoutTemplate] Players fetched:', playersResponse.length);
      console.log('[TeamLineoutTemplate] Sample player:', playersResponse[0]);
      setPlayers(playersResponse);

      // Initialize empty slots
      const emptyStarting: LineupSlot[] = GAA_POSITIONS.map(pos => ({
        positionNo: pos.positionNo,
        positionName: pos.positionName,
        playerId: null,
        playerName: null,
        jerseyNo: null,
      }));

      const emptyBench: LineupSlot[] = Array.from({ length: 15 }, (_, i) => ({
        positionNo: i + 16,
        positionName: `Bench ${i + 1}`,
        playerId: null,
        playerName: null,
        jerseyNo: null,
      }));

      setStartingSlots(emptyStarting);
      setBenchSlots(emptyBench);
    } catch (err: any) {
      console.error('[TeamLineoutTemplate] Error fetching data:', err);
      console.error('[TeamLineoutTemplate] Error status:', err?.status);
      console.error('[TeamLineoutTemplate] Error message:', err?.message);
      
      let errorMessage = 'Failed to load players';
      
      if (err?.status === 401 || err?.status === 403) {
        errorMessage = 'Session expired. Please log in again.';
      } else if (err?.status === 404) {
        errorMessage = 'Team not found';
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSlotPress = (index: number, type: 'starting' | 'bench') => {
    console.log('[TeamLineoutTemplate] Slot pressed:', type, index);
    
    // Check if there are players available
    if (players.length === 0) {
      console.log('[TeamLineoutTemplate] No players available');
      showAlert(
        'No Players Available',
        'You need to add players to your team before creating a lineup. Go to the Players screen to add players.'
      );
      return;
    }
    
    setSelectedSlotIndex(index);
    setSelectedSlotType(type);
    setSearchQuery('');
    setShowPlayerPicker(true);
  };

  const handlePlayerSelect = (player: Player) => {
    console.log('[TeamLineoutTemplate] Player selected:', player.name);
    if (selectedSlotIndex === null) return;

    const slots = selectedSlotType === 'starting' ? startingSlots : benchSlots;
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

    if (selectedSlotType === 'starting') {
      setStartingSlots(updatedSlots);
    } else {
      setBenchSlots(updatedSlots);
    }

    setShowPlayerPicker(false);
    setSelectedSlotIndex(null);
  };

  const handleRemovePlayer = (index: number, type: 'starting' | 'bench') => {
    const slots = type === 'starting' ? startingSlots : benchSlots;
    const updatedSlots = [...slots];
    
    updatedSlots[index] = {
      ...updatedSlots[index],
      playerId: null,
      playerName: null,
      jerseyNo: null,
    };

    if (type === 'starting') {
      setStartingSlots(updatedSlots);
    } else {
      setBenchSlots(updatedSlots);
    }
  };

  const handleViewPitch = () => {
    console.log('[TeamLineoutTemplate] User tapped View Pitch button');
    showAlert('Coming Soon', 'Pitch view will be available in the next update.');
  };

  const getStarting15Count = () => {
    return startingSlots.filter(slot => slot.playerId || slot.playerName).length;
  };

  const isStarting15Complete = getStarting15Count() === 15;

  // Get all selected player IDs across starting and bench
  const selectedPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    startingSlots.forEach(slot => {
      if (slot.playerId) ids.add(slot.playerId);
    });
    benchSlots.forEach(slot => {
      if (slot.playerId) ids.add(slot.playerId);
    });
    console.log('[TeamLineoutTemplate] Selected player IDs:', Array.from(ids));
    return ids;
  }, [startingSlots, benchSlots]);

  // Build sections for SectionList - grouped by position, sorted by depthOrder
  const playerSections = useMemo(() => {
    console.log('[TeamLineoutTemplate] Building player sections');
    console.log('[TeamLineoutTemplate] Total players:', players.length);
    console.log('[TeamLineoutTemplate] Selected IDs count:', selectedPlayerIds.size);
    console.log('[TeamLineoutTemplate] Search query:', searchQuery);
    
    // Filter out selected players and apply search
    const availablePlayers = players
      .filter(p => {
        const isSelected = selectedPlayerIds.has(p.id);
        console.log(`[TeamLineoutTemplate] Player ${p.name}: selected=${isSelected}`);
        return !isSelected;
      })
      .filter(p => {
        if (!searchQuery) return true;
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        console.log(`[TeamLineoutTemplate] Player ${p.name}: matchesSearch=${matchesSearch}`);
        return matchesSearch;
      });
    
    console.log('[TeamLineoutTemplate] Available players after filtering:', availablePlayers.length);
    
    // Sort by position group, then depthOrder, then name
    const sortedPlayers = availablePlayers.sort((a, b) => {
      // Get position group (handle both formats: GOALKEEPER, GK, etc.)
      const posA = a.primaryPositionGroup || 'ZZZ';
      const posB = b.primaryPositionGroup || 'ZZZ';
      const posOrderA = POS_ORDER[posA] ?? 999;
      const posOrderB = POS_ORDER[posB] ?? 999;
      
      if (posOrderA !== posOrderB) {
        return posOrderA - posOrderB;
      }
      
      // Then by depthOrder (null last)
      const depthA = a.depthOrder ?? 9999;
      const depthB = b.depthOrder ?? 9999;
      
      if (depthA !== depthB) {
        return depthA - depthB;
      }
      
      // Finally by name
      return a.name.localeCompare(b.name);
    });
    
    // Group by position
    const grouped: { [key: string]: Player[] } = {
      'GOALKEEPER': [],
      'BACK': [],
      'MIDFIELDER': [],
      'FORWARD': [],
    };
    
    sortedPlayers.forEach(player => {
      const pos = player.primaryPositionGroup || 'OTHER';
      // Normalize position names
      if (pos === 'GK') {
        grouped['GOALKEEPER'].push(player);
      } else if (pos === 'MID') {
        grouped['MIDFIELDER'].push(player);
      } else if (pos === 'FWD') {
        grouped['FORWARD'].push(player);
      } else if (grouped[pos]) {
        grouped[pos].push(player);
      }
    });
    
    // Build sections array
    const sections = Object.keys(grouped)
      .filter(key => grouped[key].length > 0)
      .map(key => ({
        title: POS_LABEL[key] || key,
        data: grouped[key],
      }));
    
    console.log('[TeamLineoutTemplate] Sections built:', sections.map(s => `${s.title}: ${s.data.length}`));
    
    return sections;
  }, [players, selectedPlayerIds, searchQuery]);

  if (!isValidParam(teamId, 'teamId')) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Team Line Out', headerShown: true }} />
        <ScreenState
          error="Invalid team ID. Please select a valid team."
          onRetry={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  const starting15Count = getStarting15Count();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Team Line Out',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScreenState
          loading={loading}
          error={error}
          onRetry={fetchData}
        >
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
              {startingSlots.map((slot, index) => {
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
              {benchSlots.map((slot, index) => {
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
              disabled={!isStarting15Complete}
            >
              <IconSymbol
                ios_icon_name="doc.text"
                android_material_icon_name="description"
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.primaryButtonText}>Preview Pitch</Text>
            </TouchableOpacity>
            {!isStarting15Complete && (
              <Text style={styles.helperText}>
                Complete the starting 15 to preview pitch layout
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

                {/* Player List - Grouped by Position using SectionList */}
                {playerSections.length > 0 ? (
                  <SectionList
                    sections={playerSections}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => {
                      const playerName = item.name;
                      const depthText = item.depthOrder ? `#${item.depthOrder}` : '';

                      return (
                        <TouchableOpacity
                          style={styles.playerItem}
                          onPress={() => handlePlayerSelect(item)}
                        >
                          <View style={styles.playerInfo}>
                            <Text style={styles.playerItemName}>{playerName}</Text>
                            {depthText && (
                              <Text style={styles.playerItemPosition}>{depthText}</Text>
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
                    renderSectionHeader={({ section: { title } }) => (
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionHeaderText}>{title}</Text>
                      </View>
                    )}
                    style={{ flex: 1 }}
                    stickySectionHeadersEnabled={true}
                  />
                ) : (
                  <View style={styles.emptyList}>
                    <IconSymbol
                      ios_icon_name="person.3"
                      android_material_icon_name="group"
                      size={48}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.emptyListText}>
                      {searchQuery 
                        ? 'No players found matching your search' 
                        : players.length === 0
                        ? 'No players in your team yet'
                        : 'All players have been assigned'}
                    </Text>
                    {players.length === 0 && (
                      <TouchableOpacity
                        style={styles.emptyListButton}
                        onPress={() => {
                          setShowPlayerPicker(false);
                          router.push({
                            pathname: '/players/[teamId]',
                            params: { teamId },
                          });
                        }}
                      >
                        <Text style={styles.emptyListButtonText}>Add Players</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Cancel Button */}
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
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    gap: 16,
  },
  emptyListText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyListButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyListButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
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
