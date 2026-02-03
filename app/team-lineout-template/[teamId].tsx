
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
  FlatList,
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
    
    console.log('[TeamLineoutTemplate] Fetching players');
    setLoading(true);
    setError(null);

    try {
      const playersResponse = await authenticatedGet<Player[]>(`/api/players?teamId=${teamId}`);
      console.log('[TeamLineoutTemplate] Players fetched:', playersResponse.length);
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
      setError(err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSlotPress = (index: number, type: 'starting' | 'bench') => {
    console.log('[TeamLineoutTemplate] Slot pressed:', type, index);
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
    // TODO: Navigate to pitch view screen with the current lineup
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
    return ids;
  }, [startingSlots, benchSlots]);

  // Position order for sorting
  const POS_ORDER: Record<string, number> = { 
    'GK': 0, 
    'BACK': 1, 
    'MID': 2, 
    'FWD': 3 
  };

  // Filter and sort players: exclude selected, group by position, sort by depthOrder
  const availablePlayers = useMemo(() => {
    return players
      .filter(p => !selectedPlayerIds.has(p.id)) // Exclude already selected
      .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        // Sort by position group first
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
  }, [players, selectedPlayerIds, searchQuery]);

  // Group players by position for section list
  const playerSections = useMemo(() => {
    const grouped: { [key: string]: Player[] } = {
      'GK': [],
      'BACK': [],
      'MID': [],
      'FWD': [],
    };
    
    availablePlayers.forEach(player => {
      const pos = player.primaryPositionGroup || 'OTHER';
      if (grouped[pos]) {
        grouped[pos].push(player);
      }
    });
    
    const POS_LABELS: Record<string, string> = {
      'GK': 'Goalkeepers',
      'BACK': 'Backs',
      'MID': 'Midfielders',
      'FWD': 'Forwards',
    };
    
    return Object.keys(grouped)
      .filter(key => grouped[key].length > 0)
      .map(key => ({
        title: POS_LABELS[key] || key,
        data: grouped[key],
      }));
  }, [availablePlayers]);

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

                {/* Player List - Grouped by Position */}
                {playerSections.length > 0 ? (
                  <ScrollView style={{ flex: 1 }}>
                    {playerSections.map((section) => (
                      <View key={section.title}>
                        <View style={styles.sectionHeader}>
                          <Text style={styles.sectionHeaderText}>{section.title}</Text>
                        </View>
                        {section.data.map((item) => {
                          const playerName = item.name;
                          const depthText = item.depthOrder ? `#${item.depthOrder}` : '';

                          return (
                            <TouchableOpacity
                              key={item.id}
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
                        })}
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.emptyList}>
                    <Text style={styles.emptyListText}>
                      {searchQuery ? 'No players found' : 'All players have been assigned'}
                    </Text>
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
  },
  emptyListText: {
    fontSize: 16,
    color: colors.textSecondary,
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
