
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPost, authenticatedPut } from '@/utils/api';
import { MatchState, MatchEvent, TeamSide } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetworkState } from 'expo-network';
import { IconSymbol } from '@/components/IconSymbol';

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
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 32,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#FF0000',
    borderRadius: 12,
    padding: 24,
    marginBottom: 32,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    width: 100,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  confirmButton: {
    minHeight: 60,
    backgroundColor: '#FF0000',
    borderWidth: 2,
    borderColor: '#FF0000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorIcon: {
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorButton: {
    backgroundColor: '#FF0000',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default function EventConfirmScreen() {
  const params = useLocalSearchParams<{
    fixtureId?: string;
    eventType?: string;
    eventCategory?: string;
    side?: string;
    playerId?: string;
    playerName?: string;
  }>();
  const router = useRouter();
  
  const fixtureId = params.fixtureId;
  const eventType = params.eventType;
  const eventCategory = params.eventCategory;
  const side = params.side as TeamSide;
  const playerId = params.playerId;
  const playerName = params.playerName;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [matchState, setMatchState] = useState<MatchState | null>(null);

  const networkState = useNetworkState();

  useEffect(() => {
    console.log('[EventConfirm] Component mounted, fixtureId:', fixtureId);
    
    // Validate fixtureId exists
    if (!fixtureId) {
      console.error('[EventConfirm] ERROR: fixtureId is missing from route params!');
      setError('No fixture selected');
      setLoading(false);
      return;
    }

    fetchData();
  }, [fixtureId]);

  const fetchData = async () => {
    console.log('[EventConfirm] Fetching match state for fixtureId:', fixtureId);
    
    // Double-check fixtureId before making API calls
    if (!fixtureId) {
      console.error('[EventConfirm] Cannot fetch data: fixtureId is undefined');
      setError('No fixture selected');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const stateResponse = await authenticatedGet(`/api/fixtures/${fixtureId}/match-state`);
      console.log('[EventConfirm] Match state fetched:', stateResponse);
      setMatchState(stateResponse);
    } catch (error: any) {
      console.error('[EventConfirm] Error fetching match state:', error);
      console.error('[EventConfirm] Error message:', error?.message);
      console.error('[EventConfirm] Error status:', error?.status);
      
      const errorMessage = error?.message || 'Failed to load match state';
      setError(errorMessage);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!matchState) {
      console.error('[EventConfirm] Cannot confirm: matchState is null');
      return;
    }

    if (!fixtureId) {
      console.error('[EventConfirm] Cannot confirm: fixtureId is undefined');
      setError('No fixture selected');
      setShowErrorModal(true);
      return;
    }

    console.log('[EventConfirm] User confirmed event:', eventType);
    setSaving(true);

    try {
      const currentHalf = (matchState as any).half || 'H1';

      const event: MatchEvent = {
        fixtureId,
        playerId: playerId || undefined as any,
        side,
        timestamp: matchState.matchClock,
        eventType: eventType || '',
        eventCategory: eventCategory as any,
        half: currentHalf,
        clientId: `${Date.now()}_${Math.random()}`,
        synced: false,
      };

      const stored = await AsyncStorage.getItem(`pending_events_${fixtureId}`);
      const pendingEvents = stored ? JSON.parse(stored) : [];
      pendingEvents.push(event);
      await AsyncStorage.setItem(`pending_events_${fixtureId}`, JSON.stringify(pendingEvents));

      if (eventType === 'Goal') {
        const goalsKey = side === 'HOME' ? 'homeGoals' : 'awayGoals';
        const newGoals = matchState[goalsKey] + 1;
        await authenticatedPut(`/api/fixtures/${fixtureId}/match-state`, { [goalsKey]: newGoals });
      } else if (eventType === 'Point') {
        const pointsKey = side === 'HOME' ? 'homePoints' : 'awayPoints';
        const newPoints = matchState[pointsKey] + 1;
        await authenticatedPut(`/api/fixtures/${fixtureId}/match-state`, { [pointsKey]: newPoints });
      }

      if (networkState.isConnected) {
        try {
          await authenticatedPost('/api/match-events/batch', { events: [event] });
          await AsyncStorage.removeItem(`pending_events_${fixtureId}`);
        } catch (error) {
          console.error('[EventConfirm] Error syncing event:', error);
        }
      }

      const displayPlayer = playerName === 'Skipped' ? 'Skipped' : playerName;
      const toastMessage = `Recorded: ${side} ${eventType} (${displayPlayer})`;
      
      console.log('[EventConfirm] Event saved successfully, navigating back');
      router.back();
      router.back();
    } catch (error: any) {
      console.error('[EventConfirm] Error saving event:', error);
      console.error('[EventConfirm] Error message:', error?.message);
      
      const errorMessage = error?.message || 'Failed to save event';
      setError(errorMessage);
      setShowErrorModal(true);
      setSaving(false);
    }
  };

  const handleBackToFixtures = () => {
    console.log('[EventConfirm] User tapped Back to Fixtures');
    router.back();
    router.back();
  };

  const handleRetry = () => {
    console.log('[EventConfirm] User tapped Retry');
    setShowErrorModal(false);
    fetchData();
  };

  // Show error screen if fixtureId is missing
  if (!fixtureId) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Confirm Event', headerShown: true }} />
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="error"
            size={48}
            color="#FF0000"
            style={styles.errorIcon}
          />
          <Text style={styles.errorTitle}>No Fixture Selected</Text>
          <Text style={styles.errorMessage}>
            Please select a fixture before confirming events.
          </Text>
          <TouchableOpacity style={styles.errorButton} onPress={handleBackToFixtures}>
            <Text style={styles.errorButtonText}>Back to Fixtures</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Confirm Event', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 12, color: colors.textSecondary }}>Loading match state...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayPlayer = playerName === 'Skipped' ? 'Skipped' : playerName || 'Unknown';

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Confirm Event', headerShown: true }} />

      <View style={styles.content}>
        <Text style={styles.title}>Confirm Event</Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Event:</Text>
            <Text style={styles.summaryValue}>{eventType || 'Unknown'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Team:</Text>
            <Text style={styles.summaryValue}>{side || 'Unknown'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Player:</Text>
            <Text style={styles.summaryValue}>{displayPlayer}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirm}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm & Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Error</Text>
            <Text style={styles.modalMessage}>
              {error || 'An error occurred. Please try again.'}
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={handleRetry}>
              <Text style={styles.modalButtonText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#666' }]}
              onPress={() => {
                setShowErrorModal(false);
                router.back();
              }}
            >
              <Text style={styles.modalButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
