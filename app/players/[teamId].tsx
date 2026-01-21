
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedPost, authenticatedPut, authenticatedDelete } from '@/utils/api';
import { Player } from '@/types';

const PRIMARY_POSITIONS = ['Goalkeeper', 'Back', 'Midfielder', 'Forward'];

export default function PlayersListScreen() {
  const router = useRouter();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [primaryPosition, setPrimaryPosition] = useState('');
  const [dominantSide, setDominantSide] = useState<'left' | 'right' | ''>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  console.log('PlayersListScreen: Rendering players list', { teamId });

  const fetchPlayers = useCallback(async () => {
    console.log('Fetching players for team:', teamId);
    setLoading(true);

    try {
      const data = await authenticatedGet(`/api/players?teamId=${teamId}`);
      console.log('Players fetched:', data);
      setPlayers(data);
    } catch (error) {
      console.error('Failed to fetch players:', error);
      Alert.alert('Error', 'Failed to load players');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const handleAddPlayer = () => {
    console.log('User tapped Add Player button');
    setEditingPlayer(null);
    setName('');
    setPrimaryPosition('');
    setDominantSide('');
    setNotes('');
    setShowAddModal(true);
  };

  const handleEditPlayer = (player: Player) => {
    console.log('User tapped Edit Player:', player.name);
    setEditingPlayer(player);
    setName(player.name);
    setPrimaryPosition(player.positions || '');
    setDominantSide(player.dominantSide || '');
    setNotes(player.notes || '');
    setShowAddModal(true);
  };

  const handleSavePlayer = async () => {
    console.log('User tapped Save Player');

    if (!name.trim()) {
      Alert.alert('Validation Error', 'Player name is required');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        teamId,
        name: name.trim(),
        positions: primaryPosition || undefined,
        dominantSide: dominantSide || undefined,
        notes: notes.trim() || undefined,
      };

      if (editingPlayer) {
        console.log('Updating player:', editingPlayer.id, payload);
        await authenticatedPut(`/api/players/${editingPlayer.id}`, payload);
        Alert.alert('Success', 'Player updated successfully');
      } else {
        console.log('Creating new player:', payload);
        await authenticatedPost('/api/players', payload);
        Alert.alert('Success', 'Player added successfully');
      }

      setShowAddModal(false);
      fetchPlayers();
    } catch (error) {
      console.error('Failed to save player:', error);
      Alert.alert('Error', 'Failed to save player');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlayer = (player: Player) => {
    console.log('User tapped Delete Player:', player.name);
    
    Alert.alert(
      'Delete Player',
      `Are you sure you want to delete ${player.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Deleting player:', player.id);
              await authenticatedDelete(`/api/players/${player.id}`);
              Alert.alert('Success', 'Player deleted successfully');
              fetchPlayers();
            } catch (error) {
              console.error('Failed to delete player:', error);
              Alert.alert('Error', 'Failed to delete player');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading players...</Text>
      </View>
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
        <ScrollView contentContainerStyle={styles.content}>
          {players.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="person.3"
                android_material_icon_name="group"
                size={64}
                color="#666"
              />
              <Text style={styles.emptyTitle}>No Players Yet</Text>
              <Text style={styles.emptyText}>
                Add your first player to get started
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={handleAddPlayer}>
                <Text style={styles.primaryButtonText}>Add Player</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.playersList}>
                {players.map((player) => {
                  const positionsText = player.positions || 'No position';
                  
                  return (
                    <View key={player.id} style={styles.playerCard}>
                      <View style={styles.playerInfo}>
                        <Text style={styles.playerName}>{player.name}</Text>
                        <Text style={styles.playerPosition}>{positionsText}</Text>
                        {player.dominantSide && (
                          <Text style={styles.playerDetail}>
                            {player.dominantSide === 'left' ? 'Left-handed' : 'Right-handed'}
                          </Text>
                        )}
                      </View>
                      <View style={styles.playerActions}>
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
                })}
              </View>

              <TouchableOpacity style={styles.fabButton} onPress={handleAddPlayer}>
                <IconSymbol
                  ios_icon_name="plus"
                  android_material_icon_name="add"
                  size={24}
                  color="#fff"
                />
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

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
                <Text style={styles.label}>Primary Position</Text>
                <View style={styles.positionGrid}>
                  {PRIMARY_POSITIONS.map((position) => {
                    const isSelected = primaryPosition === position;
                    return (
                      <TouchableOpacity
                        key={position}
                        style={[
                          styles.positionChip,
                          isSelected && styles.positionChipActive,
                        ]}
                        onPress={() => setPrimaryPosition(position)}
                      >
                        <Text
                          style={[
                            styles.positionChipText,
                            isSelected && styles.positionChipTextActive,
                          ]}
                        >
                          {position}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  primaryButton: {
    backgroundColor: '#000',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  playersList: {
    gap: 12,
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
  iconButton: {
    padding: 8,
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
});
