
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function GetStartedScreen() {
  const router = useRouter();

  console.log('GetStartedScreen: Rendering onboarding screen');

  const handleCreateClub = () => {
    console.log('User tapped Create a Club button');
    router.push('/create-club');
  };

  const handleJoinClub = () => {
    console.log('User tapped Join a Club button');
    // Note: Join club flow via invite link/email not yet implemented
    alert('Join club feature coming soon. Ask your club admin for an invite link.');
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Welcome to GAA Coach Hub',
          headerBackVisible: false,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <IconSymbol
              ios_icon_name="sportscourt.fill"
              android_material_icon_name="sports"
              size={80}
              color={colors.primary}
            />
            <Text style={styles.title}>Get Started</Text>
            <Text style={styles.subtitle}>
              Create or join a club to start managing your teams
            </Text>
          </View>

          <View style={styles.options}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleCreateClub}
            >
              <IconSymbol
                ios_icon_name="plus.circle.fill"
                android_material_icon_name="add-circle"
                size={24}
                color="#fff"
              />
              <Text style={styles.primaryButtonText}>Create a Club</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleJoinClub}
            >
              <IconSymbol
                ios_icon_name="person.2.fill"
                android_material_icon_name="group"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.secondaryButtonText}>Join a Club</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.features}>
            <Text style={styles.featuresTitle}>What you can do:</Text>
            
            <View style={styles.feature}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.featureText}>Manage teams and players</Text>
            </View>

            <View style={styles.feature}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.featureText}>Track match statistics</Text>
            </View>

            <View style={styles.feature}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.featureText}>Build team lineups</Text>
            </View>

            <View style={styles.feature}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.featureText}>Generate reports</Text>
            </View>
          </View>
        </ScrollView>
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
    padding: 24,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  options: {
    width: '100%',
    gap: 16,
    marginBottom: 40,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    gap: 12,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
  features: {
    width: '100%',
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 12,
    gap: 12,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: colors.text,
  },
});
