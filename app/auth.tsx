
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
  Image,
  ImageSourcePropType,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/IconSymbol";

type Mode = "signin" | "signup";

// Helper to resolve image sources (handles both local require() and remote URLs)
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function AuthScreen() {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple, signInWithGitHub, loading: authLoading } =
    useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
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
    if (!email || !password) {
      showAlert("Error", "Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        await signInWithEmail(email, password);
        router.replace("/");
      } else {
        await signUpWithEmail(email, password, name);
        showAlert(
          "Success",
          "Account created! Please check your email to verify your account."
        );
        router.replace("/");
      }
    } catch (error: any) {
      showAlert("Error", error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: "google" | "apple" | "github") => {
    setLoading(true);
    try {
      if (provider === "google") {
        await signInWithGoogle();
      } else if (provider === "apple") {
        await signInWithApple();
      } else if (provider === "github") {
        await signInWithGitHub();
      }
      router.replace("/");
    } catch (error: any) {
      showAlert("Error", error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

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
      </ScrollView>

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  heroArea: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 28,
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
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  switchModeButton: {
    marginTop: 16,
    alignItems: "center",
  },
  switchModeText: {
    color: "#169B62",
    fontSize: 14,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#666",
    fontSize: 14,
  },
  googleButton: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  googleIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
    fontSize: 16,
    color: "#000",
    fontWeight: "500",
  },
  appleButton: {
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
  },
});
