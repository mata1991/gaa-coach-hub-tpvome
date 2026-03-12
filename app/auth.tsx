
<<<<<<< HEAD
import React, { useState } from "react";
=======
import React, { useState } from 'react';
>>>>>>> origin/main
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
<<<<<<< HEAD
  KeyboardAvoidingView,
  ScrollView,
  Modal,
  Image,
  ImageSourcePropType,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/IconSymbol";
=======
  Image,
  ImageSourcePropType,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/IconSymbol';
>>>>>>> origin/main

// Helper to resolve image sources (handles both local require() and remote URLs)
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

// Helper to resolve image sources (handles both local require() and remote URLs)
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
<<<<<<< HEAD
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);

  const showAlert = (title: string, message: string) => {
    setAlertModalConfig({ title, message });
    setShowAlertModal(true);
  };

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#169B62" />
      </View>
    );
  }

  const handleEmailAuth = async () => {
=======
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const { signIn, signUp, signInWithGoogle, signInWithApple } = useAuth();
  const router = useRouter();

  const handleSubmit = async () => {
    console.log('User tapped Sign In / Sign Up button', { isSignUp, email });
>>>>>>> origin/main
    if (!email || !password) {
      alert('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        console.log('Attempting sign up');
        await signUp(email, password);
      } else {
        console.log('Attempting sign in');
        await signIn(email, password);
      }
      console.log('Auth successful, navigating to home');
      router.replace('/');
    } catch (error: any) {
      console.error('Auth error:', error);
      const errorMessage = error?.message || 'Authentication failed';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    console.log('User tapped Google sign in button');
    setLoading(true);
    try {
      await signInWithGoogle();
      console.log('Google auth successful');
      router.replace('/');
    } catch (error: any) {
      console.error('Google auth error:', error);
      const errorMessage = error?.message || 'Google sign in failed';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

<<<<<<< HEAD
  const buttonText = mode === "signin" ? "Sign In" : "Sign Up";
  const switchModeText = mode === "signin"
    ? "Don't have an account? Sign Up"
    : "Already have an account? Sign In";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Hero Area */}
          <View style={styles.heroArea}>
            <Image
              source={resolveImageSource(require("@/assets/images/final_quest_240x240.png"))}
              style={styles.logo}
            />
            <Text style={styles.appTitle}>GAA Coach Hub</Text>
            <Text style={styles.appSubtitle}>Your team. Your data.</Text>
          </View>

          {/* White Card Container */}
          <View style={styles.card}>
            {mode === "signup" && (
              <View style={styles.inputContainer}>
                <IconSymbol
                  ios_icon_name="person.fill"
                  android_material_icon_name="person"
                  size={20}
                  color="#666"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    nameFocused && styles.inputFocused,
                  ]}
                  placeholder="Name (optional)"
                  placeholderTextColor="#999"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <IconSymbol
                ios_icon_name="envelope.fill"
                android_material_icon_name="email"
                size={20}
                color="#666"
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.input,
                  emailFocused && styles.inputFocused,
                ]}
                placeholder="Email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            <View style={styles.inputContainer}>
              <IconSymbol
                ios_icon_name="lock.fill"
                android_material_icon_name="lock"
                size={20}
                color="#666"
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.input,
                  passwordFocused && styles.inputFocused,
                ]}
                placeholder="Password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleEmailAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>{buttonText}</Text>
              )}
=======
  const handleAppleSignIn = async () => {
    console.log('User tapped Apple sign in button');
    setLoading(true);
    try {
      await signInWithApple();
      console.log('Apple auth successful');
      router.replace('/');
    } catch (error: any) {
      console.error('Apple auth error:', error);
      const errorMessage = error?.message || 'Apple sign in failed';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    console.log('User toggled auth mode', { from: isSignUp ? 'signup' : 'signin', to: isSignUp ? 'signin' : 'signup' });
    setIsSignUp(!isSignUp);
  };

  const buttonText = isSignUp ? 'Sign Up' : 'Sign In';
  const toggleText = isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up";

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.content}>
        {/* Hero Area */}
        <View style={styles.heroArea}>
          <Image
            source={resolveImageSource(require('@/assets/images/final_quest_240x240.png'))}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appTitle}>GAA Coach Hub</Text>
          <Text style={styles.appSubtitle}>Your team. Your data.</Text>
        </View>

        {/* Auth Card */}
        <View style={styles.card}>
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <IconSymbol
                ios_icon_name="envelope"
                android_material_icon_name="email"
                size={20}
                color="#6B7280"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>
            {emailFocused && <View style={styles.focusBorder} />}
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <IconSymbol
                ios_icon_name="lock"
                android_material_icon_name="lock"
                size={20}
                color="#6B7280"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
            </View>
            {passwordFocused && <View style={styles.focusBorder} />}
          </View>

          {/* Primary Button */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>{buttonText}</Text>
            )}
          </TouchableOpacity>

          {/* Toggle Mode */}
          <TouchableOpacity onPress={toggleMode} disabled={loading}>
            <Text style={styles.toggleText}>{toggleText}</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Login Buttons */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <View style={styles.googleIconContainer}>
              <Text style={styles.googleIcon}>G</Text>
            </View>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.appleButton}
              onPress={handleAppleSignIn}
              disabled={loading}
            >
              <IconSymbol
                ios_icon_name="apple.logo"
                android_material_icon_name="apple"
                size={20}
                color="#FFFFFF"
                style={styles.appleIcon}
              />
              <Text style={styles.appleButtonText}>Continue with Apple</Text>
>>>>>>> origin/main
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchModeButton}
              onPress={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              <Text style={styles.switchModeText}>{switchModeText}</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={() => handleSocialAuth("google")}
              disabled={loading}
            >
              <View style={styles.googleIconContainer}>
                <Text style={styles.googleIcon}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            {Platform.OS === "ios" && (
              <TouchableOpacity
                style={styles.appleButton}
                onPress={() => handleSocialAuth("apple")}
                disabled={loading}
              >
                <IconSymbol
                  ios_icon_name="apple.logo"
                  android_material_icon_name="apple"
                  size={20}
                  color="#fff"
                  style={styles.appleIcon}
                />
                <Text style={styles.appleButtonText}>Continue with Apple</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
<<<<<<< HEAD
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  scrollContent: {
    flexGrow: 1,
=======
    backgroundColor: '#F8F9FA',
>>>>>>> origin/main
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  heroArea: {
<<<<<<< HEAD
    alignItems: "center",
    marginBottom: 32,
=======
    alignItems: 'center',
    marginBottom: 40,
>>>>>>> origin/main
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 28,
<<<<<<< HEAD
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 16,
    color: "#666",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: "#000",
    backgroundColor: "transparent",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  inputFocused: {
    borderBottomColor: "#169B62",
  },
  primaryButton: {
    height: 50,
    backgroundColor: "#169B62",
=======
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  focusBorder: {
    height: 2,
    backgroundColor: '#169B62',
    marginTop: 2,
    borderRadius: 1,
  },
  primaryButton: {
    backgroundColor: '#169B62',
>>>>>>> origin/main
    borderRadius: 8,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
<<<<<<< HEAD
  buttonDisabled: {
    opacity: 0.6,
  },
  switchModeButton: {
    marginTop: 16,
    alignItems: "center",
  },
  switchModeText: {
    color: "#169B62",
=======
  toggleText: {
    textAlign: 'center',
    color: '#169B62',
>>>>>>> origin/main
    fontSize: 14,
    marginTop: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#9CA3AF',
    fontSize: 14,
  },
  googleButton: {
<<<<<<< HEAD
    height: 50,
=======
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
>>>>>>> origin/main
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
<<<<<<< HEAD
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
=======
    height: 50,
>>>>>>> origin/main
    marginBottom: 12,
  },
  googleIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
<<<<<<< HEAD
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  googleIcon: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4285F4",
  },
  googleButtonText: {
=======
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  googleIcon: {
>>>>>>> origin/main
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  googleButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '500',
  },
  appleButton: {
<<<<<<< HEAD
    height: 50,
    backgroundColor: "#000",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  appleIcon: {
    marginRight: 8,
  },
  appleButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  alertModal: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    gap: 16,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
  },
  alertMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  alertButton: {
    backgroundColor: "#169B62",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  alertButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
=======
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 8,
    height: 50,
  },
  appleIcon: {
    marginRight: 12,
  },
  appleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
>>>>>>> origin/main
  },
});
