
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedPost, authenticatedPut, authenticatedDelete, authenticatedPatch } from '@/utils/api';
import { Player, PositionGroup } from '@/types';
import { ScreenState } from '@/components/ScreenState';
import { useSafeParams, isValidParam } from '@/hooks/useSafeParams';

type FilterType = 'ALL' | PositionGroup;

const POSITION_GROUPS: { value: PositionGroup; label: string }[] = [
  { value: 'GK', label: 'Goalkeeper' },
  { value: 'BACK', label: 'Backs' },
  { value: 'MID', label: 'Midfielders' },
  { value: 'FWD', label: 'Forwards' },
];

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'GK', label: 'Goalkeepers' },
  { value: 'BACK', label: 'Backs' },
  { value: 'MID', label: 'Midfielders' },
  { value: 'FWD', label: 'Forwards' },
];

export default function PlayersListScreen() {
  const router = useRouter();
  const params = useSafeParams<{ teamId?: string }>();
  const teamId = params.teamId;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [primaryPositionGroup, setPrimaryPositionGroup] = useState<PositionGroup | ''>('');
  const [dominantSide, setDominantSide] = useState<'left' | 'right' | ''>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Custom modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    confirmStyle?: 'default' | 'destructive';
  } | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState<{
    title: string;
    message: string;
  } | null>(null);

  console.log('PlayersListScreen: Rendering players list', { teamId, filter, playerCount: players.length });

  const fetchPlayers = useCallback(async () => {
    if (!isValidParam(teamId, 'teamId')) {
      console.log('PlayersListScreen: No teamId provided');
      setError('No team selected');
      setLoading(false);
      return;
    }

    console.log('PlayersListScreen: Fetching players for team:', teamId);
    setLoading(true);
    setError(null);

    try {
      const data = await authenticatedGet(`/api/players?teamId=${teamId}`);
      console.log('PlayersListScreen: Players fetched successfully:', data.length, 'players');
      setPlayers(data);
      setError(null);
    } catch (err: any) {
      console.error('PlayersListScreen: Failed to fetch players:', err);
      console.error('PlayersListScreen: Error status:', err?.status);
      console.error('PlayersListScreen: Error message:', err?.message);
      setError('Failed to load players');
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  // Auto-refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      console.log('PlayersListScreen: Screen focused, refreshing players');
      fetchPlayers();
    }, [fetchPlayers])
  );

  const handleAddPlayer = () => {
    console.log('PlayersListScreen: User tapped Add Player button');
    setEditingPlayer(null);
    setName('');
    setPrimaryPositionGroup('');
    setDominantSide('');
    setNotes('');
    setShowAddModal(true);
  };

  const handleEditPlayer = (player: Player) => {
    console.log('PlayersListScreen: User tapped Edit Player:', player.name);
    setEditingPlayer(player);
    setName(player.name);
    setPrimaryPositionGroup(player.primaryPositionGroup || '');
    setDominantSide(player.dominantSide || '');
    setNotes(player.notes || '');
    setShowAddModal(true);
  };

  const showAlert = (title: string, message: string) => {
    setAlertModalConfig({ title, message });
    setShowAlertModal(true);
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText: string = 'Confirm',
    confirmStyle: 'default' | 'destructive' = 'default'
  ) => {
    setConfirmModalConfig({ title, message, onConfirm, confirmText, confirmStyle });
    setShowConfirmModal(true);
  };

  const handleSavePlayer = async () => {
    console.log('PlayersListScreen: User tapped Save Player');

    if (!name.trim()) {
      showAlert('Validation Error', 'Player name is required');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        teamId,
        name: name.trim(),
        primaryPositionGroup: primaryPositionGroup || undefined,
        dominantSide: dominantSide || undefined,
        notes: notes.trim() || undefined,
      };

      if (editingPlayer) {
        console.log('PlayersListScreen: Updating player:', editingPlayer.id, payload);
        await authenticatedPut(`/api/players/${editingPlayer.id}`, payload);
        showAlert('Success', 'Player updated');
      } else {
        console.log('PlayersListScreen: Creating new player:', payload);
        await authenticatedPost('/api/players', payload);
        showAlert('Success', 'Player added');
      }

      setShowAddModal(false);
      fetchPlayers();
    } catch (err) {
      console.error('PlayersListScreen: Failed to save player:', err);
      showAlert('Error', 'Failed to save player');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlayer = (player: Player) => {
    console.log('PlayersListScreen: User tapped Delete Player:', player.name);
    
    showConfirm(
      'Delete Player',
      `Are you sure you want to delete ${player.name}?`,
      async () => {
        try {
          console.log('PlayersListScreen: Deleting player:', player.id);
          await authenticatedDelete(`/api/players/${player.id}`);
          showAlert('Success', 'Player deleted');
          fetchPlayers();
        } catch (err) {
          console.error('PlayersListScreen: Failed to delete player:', err);
          showAlert('Error', 'Failed to delete player');
        }
      },
      'Delete',
      'destructive'
    );
  };

  const handleMoveUp = async (player: Player, groupPlayers: Player[]) => {
    console.log('PlayersListScreen: User tapped Move Up for player:', player.name);
    
    // Filter out injured players for reordering
    const nonInjuredPlayers = groupPlayers.filter(p => !p.isInjured);
    const currentIndex = nonInjuredPlayers.findIndex((p) => p.id === player.id);
    
    if (currentIndex <= 0) {
      console.log('PlayersListScreen: Player is already at the top');
      return;
    }

    const playerAbove = nonInjuredPlayers[currentIndex - 1];
    
    // Swap depthOrder values
    const playerNewDepth = playerAbove.depthOrder ?? currentIndex - 1;
    const playerAboveNewDepth = player.depthOrder ?? currentIndex;

    try {
      console.log('PlayersListScreen: Swapping depth order:', {
        player: player.name,
        playerOldDepth: player.depthOrder,
        playerNewDepth,
        playerAbove: playerAbove.name,
        playerAboveOldDepth: playerAbove.depthOrder,
        playerAboveNewDepth,
      });
      
      // Optimistic update - swap the two players
      const updatedPlayers = players.map((p) => {
        if (p.id === player.id) {
          return { ...p, depthOrder: playerNewDepth };
        }
        if (p.id === playerAbove.id) {
          return { ...p, depthOrder: playerAboveNewDepth };
        }
        return p;
      });
      setPlayers(sortPlayers(updatedPlayers));

      // Send batch update to backend
      await authenticatedPatch(`/api/teams/${teamId}/players/batch`, {
        updates: [
          { playerId: player.id, depthOrder: playerNewDepth },
          { playerId: playerAbove.id, depthOrder: playerAboveNewDepth },
        ],
      });

      console.log('PlayersListScreen: Order updated successfully');
      // Refetch to confirm backend state
      fetchPlayers();
    } catch (err) {
      console.error('PlayersListScreen: Failed to reorder players:', err);
      showAlert('Error', 'Failed to update order');
      fetchPlayers(); // Revert on error
    }
  };

  const handleMoveDown = async (player: Player, groupPlayers: Player[]) => {
    console.log('PlayersListScreen: User tapped Move Down for player:', player.name);
    
    // Filter out injured players for reordering
    const nonInjuredPlayers = groupPlayers.filter(p => !p.isInjured);
    const currentIndex = nonInjuredPlayers.findIndex((p) => p.id === player.id);
    
    if (currentIndex >= nonInjuredPlayers.length - 1) {
      console.log('PlayersListScreen: Player is already at the bottom');
      return;
    }

    const playerBelow = nonInjuredPlayers[currentIndex + 1];
    
    // Swap depthOrder values
    const playerNewDepth = playerBelow.depthOrder ?? currentIndex + 1;
    const playerBelowNewDepth = player.depthOrder ?? currentIndex;

    try {
      console.log('PlayersListScreen: Swapping depth order:', {
        player: player.name,
        playerOldDepth: player.depthOrder,
        playerNewDepth,
        playerBelow: playerBelow.name,
        playerBelowOldDepth: playerBelow.depthOrder,
        playerBelowNewDepth,
      });
      
      // Optimistic update - swap the two players
      const updatedPlayers = players.map((p) => {
        if (p.id === player.id) {
          return { ...p, depthOrder: playerNewDepth };
        }
        if (p.id === playerBelow.id) {
          return { ...p, depthOrder: playerBelowNewDepth };
        }
        return p;
      });
      setPlayers(sortPlayers(updatedPlayers));

      // Send batch update to backend
      await authenticatedPatch(`/api/teams/${teamId}/players/batch`, {
        updates: [
          { playerId: player.id, depthOrder: playerNewDepth },
          { playerId: playerBelow.id, depthOrder: playerBelowNewDepth },
        ],
      });

      console.log('PlayersListScreen: Order updated successfully');
      // Refetch to confirm backend state
      fetchPlayers();
    } catch (err) {
      console.error('PlayersListScreen: Failed to reorder players:', err);
      showAlert('Error', 'Failed to update order');
      fetchPlayers(); // Revert on error
    }
  };

  const handleToggleInjured = async (player: Player) => {
    console.log('PlayersListScreen: User tapped Injured toggle for player:', player.name);
    
    const newInjuredStatus = !player.isInjured;
    
    try {
      // Optimistic update with immediate re-sort
      const updatedPlayers = players.map((p) =>
        p.id === player.id ? { ...p, isInjured: newInjuredStatus } : p
      );
      setPlayers(sortPlayers(updatedPlayers));

      console.log('PlayersListScreen: Updating player injured status:', { playerId: player.id, isInjured: newInjuredStatus });
      await authenticatedPatch(`/api/players/${player.id}`, {
        isInjured: newInjuredStatus,
      });

      console.log('PlayersListScreen: Player injured status updated successfully');
      // Refetch to confirm backend state
      fetchPlayers();
    } catch (err) {
      console.error('PlayersListScreen: Failed to update injured status:', err);
      showAlert('Error', 'Failed to update injured status');
      fetchPlayers(); // Revert on error
    }
  };

  const sortPlayers = (playersList: Player[]) => {
    // Sort: non-injured first, then injured, preserving depthOrder and name within each group
    return [...playersList].sort((a, b) => {
      const aInjured = a.isInjured ? 1 : 0;
      const bInjured = b.isInjured ? 1 : 0;
      
      if (aInjured !== bInjured) {
        return aInjured - bInjured; // Non-injured (0) before injured (1)
      }
      
      // Within same injury status, sort by depthOrder
      const aDepth = a.depthOrder ?? 999;
      const bDepth = b.depthOrder ?? 999;
      
      if (aDepth !== bDepth) {
        return aDepth - bDepth;
      }
      
      // Finally by name
      return a.name.localeCompare(b.name);
    });
  };

  const getFilteredPlayers = () => {
    let filtered: Player[];
    if (filter === 'ALL') {
      filtered = players;
    } else {
      // Filter by primaryPositionGroup enum value
      filtered = players.filter((p) => p.primaryPositionGroup === filter);
    }
    return sortPlayers(filtered);
  };

  const getGroupedPlayers = () => {
    const grouped: { [key in PositionGroup]?: Player[] } = {};
    
    players.forEach((player) => {
      if (player.primaryPositionGroup) {
        if (!grouped[player.primaryPositionGroup]) {
          grouped[player.primaryPositionGroup] = [];
        }
        grouped[player.primaryPositionGroup]!.push(player);
      }
    });

    // Sort each group with injury-aware sorting
    Object.keys(grouped).forEach((key) => {
      const posKey = key as PositionGroup;
      grouped[posKey] = sortPlayers(grouped[posKey]!);
    });

    return grouped;
  };

  const filteredPlayers = getFilteredPlayers();
  const groupedPlayers = getGroupedPlayers();

  const renderPlayerCard = (player: Player, groupPlayers: Player[]) => {
    // For up/down buttons, only consider non-injured players
    const nonInjuredPlayers = groupPlayers.filter(p => !p.isInjured);
    const currentIndex = nonInjuredPlayers.findIndex((p) => p.id === player.id);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === nonInjuredPlayers.length - 1;
    const isInjured = player.isInjured || false;
    
    const positionLabel = POSITION_GROUPS.find((g) => g.value === player.primaryPositionGroup)?.label || 'No position';
    const handednessText = player.dominantSide === 'left' ? 'Left-handed' : player.dominantSide === 'right' ? 'Right-handed' : '';

    return (
      <View style={styles.playerCard}>
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{player.name}</Text>
          <Text style={styles.playerPosition}>{positionLabel}</Text>
          {handednessText && (
            <Text style={styles.playerDetail}>{handednessText}</Text>
          )}
        </View>
        <View style={styles.playerActions}>
          <TouchableOpacity
            style={[styles.injuredToggle, isInjured && styles.injuredToggleActive]}
            onPress={() => handleToggleInjured(player)}
          >
            <IconSymbol
              ios_icon_name={isInjured ? 'cross.case.fill' : 'cross.case'}
              android_material_icon_name="local-hospital"
              size={20}
              color={isInjured ? '#fff' : '#dc3545'}
            />
          </TouchableOpacity>
          {player.primaryPositionGroup && !isInjured && (
            <>
              <TouchableOpacity
                style={[styles.iconButton, isFirst && styles.iconButtonDisabled]}
                onPress={() => !isFirst && handleMoveUp(player, groupPlayers)}
                disabled={isFirst}
              >
                <IconSymbol
                  ios_icon_name="chevron.up"
                  android_material_icon_name="arrow-upward"
                  size={20}
                  color={isFirst ? '#ccc' : '#000'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconButton, isLast && styles.iconButtonDisabled]}
                onPress={() => !isLast && handleMoveDown(player, groupPlayers)}
                disabled={isLast}
              >
                <IconSymbol
                  ios_icon_name="chevron.down"
                  android_material_icon_name="arrow-downward"
                  size={20}
                  color={isLast ? '#ccc' : '#000'}
                />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handleEditPlayer(player)}
          >
            <IconSymbol
              ios_icon_name="pencil"
              android_material_icon_name="edit"
              size={20}
              color="#000"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handleDeletePlayer(player)}
          >
            <IconSymbol
              ios_icon_name="trash"
              android_material_icon_name="delete"
              size={20}
              color="#000"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (!isValidParam(teamId, 'teamId')) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Players',
            headerBackTitle: 'Back',
          }}
        />
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <ScreenState
            error="No team selected. Please select a team to view players."
            onRetry={() => router.push('/select-team')}
          />
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Players',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScreenState
          loading={loading}
          error={error}
          empty={players.length === 0}
          emptyTitle="No Players Yet"
          emptyMessage="Add your first player to get started"
          emptyIcon="person.3"
          emptyIconMaterial="group"
          onRetry={fetchPlayers}
          onEmptyAction={handleAddPlayer}
          emptyActionText="Add Player"
        >
          <ScrollView contentContainerStyle={styles.content}>
            {/* Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterContainer}
            >
              {FILTER_OPTIONS.map((option) => {
                const isActive = filter === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.filterPill, isActive && styles.filterPillActive]}
                    onPress={() => {
                      console.log('PlayersListScreen: User selected filter:', option.value);
                      setFilter(option.value);
                    }}
                  >
                    <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Players List */}
            {filter === 'ALL' ? (
              <View style={styles.playersList}>
                {POSITION_GROUPS.map((group) => {
                  const groupPlayersList = groupedPlayers[group.value] || [];
                  if (groupPlayersList.length === 0) {
                    return null;
                  }

                  return (
                    <View key={group.value} style={styles.groupSection}>
                      <Text style={styles.groupHeader}>{group.label}</Text>
                      <FlatList
                        data={groupPlayersList}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => renderPlayerCard(item, groupPlayersList)}
                        scrollEnabled={false}
                      />
                    </View>
                  );
                })}
                
                {/* Show players without position group */}
                {players.filter(p => !p.primaryPositionGroup).length > 0 && (
                  <View style={styles.groupSection}>
                    <Text style={styles.groupHeader}>Unassigned Position</Text>
                    <FlatList
                      data={players.filter(p => !p.primaryPositionGroup)}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => renderPlayerCard(item, players.filter(p => !p.primaryPositionGroup))}
                      scrollEnabled={false}
                    />
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.playersList}>
                {filteredPlayers.length > 0 ? (
                  <FlatList
                    data={filteredPlayers}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => renderPlayerCard(item, filteredPlayers)}
                    scrollEnabled={false}
                  />
                ) : (
                  <View style={styles.emptyFilterState}>
                    <IconSymbol
                      ios_icon_name="person.3"
                      android_material_icon_name="group"
                      size={48}
                      color="#999"
                    />
                    <Text style={styles.emptyFilterText}>
                      No players in this position
                    </Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity style={styles.fabButton} onPress={handleAddPlayer}>
              <IconSymbol
                ios_icon_name="plus"
                android_material_icon_name="add"
                size={24}
                color="#fff"
              />
            </TouchableOpacity>
          </ScrollView>
        </ScreenState>

        {/* Add/Edit Player Modal */}
        <Modal
          visible={showAddModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowAddModal(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingPlayer ? 'Edit Player' : 'Add Player'}
              </Text>
              <TouchableOpacity onPress={handleSavePlayer} disabled={saving}>
                <Text style={[styles.modalSave, saving && styles.modalSaveDisabled]}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter player name"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Primary Position Group</Text>
                <View style={styles.positionGrid}>
                  {POSITION_GROUPS.map((group) => {
                    const isSelected = primaryPositionGroup === group.value;
                    return (
                      <TouchableOpacity
                        key={group.value}
                        style={[
                          styles.positionChip,
                          isSelected && styles.positionChipActive,
                        ]}
                        onPress={() => setPrimaryPositionGroup(group.value)}
                      >
                        <Text
                          style={[
                            styles.positionChipText,
                            isSelected && styles.positionChipTextActive,
                          ]}
                        >
                          {group.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Dominant Side</Text>
                <View style={styles.segmentedControl}>
                  <TouchableOpacity
                    style={[
                      styles.segment,
                      dominantSide === 'left' && styles.segmentActive,
                    ]}
                    onPress={() => setDominantSide('left')}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        dominantSide === 'left' && styles.segmentTextActive,
                      ]}
                    >
                      Left
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.segment,
                      dominantSide === 'right' && styles.segmentActive,
                    ]}
                    onPress={() => setDominantSide('right')}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        dominantSide === 'right' && styles.segmentTextActive,
                      ]}
                    >
                      Right
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Notes</Text>
                <Text style={styles.helpText}>
                  e.g. injury history, previous game notes, availability constraints, strengths/targets
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Hamstring strain Sept 2025, Strong free taker, Returning from ankle injury, Limited availability midweek"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                />
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* Custom Alert Modal */}
        <Modal
          visible={showAlertModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAlertModal(false)}
        >
          <View style={styles.modalOverlay}>
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

        {/* Custom Confirm Modal */}
        <Modal
          visible={showConfirmModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowConfirmModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.alertModal}>
              <Text style={styles.alertTitle}>{confirmModalConfig?.title}</Text>
              <Text style={styles.alertMessage}>{confirmModalConfig?.message}</Text>
              <View style={styles.confirmButtons}>
                <TouchableOpacity
                  style={styles.confirmCancelButton}
                  onPress={() => setShowConfirmModal(false)}
                >
                  <Text style={styles.confirmCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.confirmActionButton,
                    confirmModalConfig?.confirmStyle === 'destructive' && styles.confirmDestructiveButton,
                  ]}
                  onPress={() => {
                    setShowConfirmModal(false);
                    confirmModalConfig?.onConfirm();
                  }}
                >
                  <Text style={styles.confirmActionButtonText}>
                    {confirmModalConfig?.confirmText || 'Confirm'}
                  </Text>
                </TouchableOpacity>
              </View>
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
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  filterContainer: {
    paddingBottom: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  filterPillText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  playersList: {
    gap: 12,
  },
  groupSection: {
    marginBottom: 24,
  },
  groupHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    paddingLeft: 4,
  },
  playerCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  playerInfo: {
    flex: 1,
    gap: 4,
  },
  playerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  playerPosition: {
    fontSize: 14,
    color: '#666',
  },
  playerDetail: {
    fontSize: 12,
    color: '#999',
  },
  playerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  injuredToggle: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dc3545',
    backgroundColor: '#fff',
  },
  injuredToggleActive: {
    backgroundColor: '#dc3545',
    borderColor: '#dc3545',
  },
  iconButton: {
    padding: 8,
  },
  iconButtonDisabled: {
    opacity: 0.3,
  },
  emptyFilterState: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyFilterText: {
    fontSize: 16,
    color: '#999',
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#000',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalCancel: {
    fontSize: 16,
    color: '#000',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  modalSaveDisabled: {
    color: '#999',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  required: {
    color: '#dc3545',
  },
  helpText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  positionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  positionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    minWidth: '47%',
    alignItems: 'center',
  },
  positionChipActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  positionChipText: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  positionChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  segmentActive: {
    backgroundColor: '#000',
  },
  segmentText: {
    fontSize: 16,
    color: '#000',
  },
  segmentTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  alertButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  alertButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmCancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmCancelButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmActionButton: {
    flex: 1,
    backgroundColor: '#000',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmDestructiveButton: {
    backgroundColor: '#dc3545',
  },
  confirmActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
