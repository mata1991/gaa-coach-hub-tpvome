
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

interface ScreenStateProps {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: string;
  emptyIconMaterial?: string;
  onRetry?: () => void;
  onEmptyAction?: () => void;
  emptyActionText?: string;
  children?: React.ReactNode;
}

/**
 * Standardized screen state component
 * Enforces consistent Loading, Error, Empty, and Content states
 * 
 * Usage:
 * <ScreenState
 *   loading={loading}
 *   error={error}
 *   empty={data.length === 0}
 *   emptyTitle="No Players"
 *   emptyMessage="Add your first player to get started"
 *   onRetry={fetchData}
 * >
 *   {content}
 * </ScreenState>
 */
export function ScreenState({
  loading,
  error,
  empty,
  emptyTitle = 'No Data',
  emptyMessage = 'Nothing to display',
  emptyIcon = 'tray',
  emptyIconMaterial = 'inbox',
  onRetry,
  onEmptyAction,
  emptyActionText = 'Add',
  children,
}: ScreenStateProps) {
  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <IconSymbol
          ios_icon_name="exclamationmark.triangle"
          android_material_icon_name="error"
          size={64}
          color="#dc3545"
        />
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        {onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Empty state
  if (empty) {
    return (
      <View style={styles.container}>
        <IconSymbol
          ios_icon_name={emptyIcon}
          android_material_icon_name={emptyIconMaterial}
          size={64}
          color="#999"
        />
        <Text style={styles.emptyTitle}>{emptyTitle}</Text>
        <Text style={styles.emptyMessage}>{emptyMessage}</Text>
        {onEmptyAction && (
          <TouchableOpacity style={styles.actionButton} onPress={onEmptyAction}>
            <Text style={styles.actionButtonText}>{emptyActionText}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Content state
  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  errorMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  emptyMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
