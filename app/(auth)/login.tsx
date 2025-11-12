import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!email) {
      newErrors.email = "Please enter your email address.";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "That doesn't look like a valid email.";
    }

    if (!password) {
      newErrors.password = "Please enter your password.";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);

    try {
      // 🟢 Step 1: Try to sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      console.log(data);
      if (error) {
        // Common errors: invalid credentials, etc.
        Toast.show({
          type: "error",
          text1: "Login Failed",
          text2: error.message,
        });
        setLoading(false);
        return;
      }

      const user = data?.user;

      // 🟠 Step 2: Check if the user's email is verified
      if (!user?.email_confirmed_at) {
        Toast.show({
          type: "info",
          text1: "Email Not Verified",
          text2:
            "Please verify your email before logging in. A link has been resent to your inbox.",
        });

        // Resend confirmation email
        await supabase.auth.resend({
          type: "signup",
          email,
          options: {
            emailRedirectTo: "https://your-app-domain.com/auth/callback",
          },
        });

        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // 🟢 Step 3: Check for profile existence
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("id", user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        throw profileError;
      }

      // 🧩 Step 4: Create profile if not exists
      if (!profile) {
        const defaultUsername =
          user.email?.split("@")[0] || `user_${Date.now()}`;
        const { error: insertError } = await supabase.from("profiles").insert([
          {
            user_id: user.id,
            username: defaultUsername,
            email_verified: true,
          },
        ]);

        if (insertError) throw insertError;

        Toast.show({
          type: "success",
          text1: "Welcome to Framez!",
          text2: "Your profile has been created. Set it up now.",
        });

        router.replace("/profile");
      } else {
        Toast.show({
          type: "success",
          text1: "Welcome back 👋",
          text2: "You're now signed in.",
        });

        router.replace("/");
      }
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err.message || "Something went wrong while logging in.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>Framez</Text>
        <Text style={styles.subtitle}>Welcome back</Text>

        <TextInput
          style={[styles.input, errors.email && styles.errorInput]}
          placeholder="Email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

        <TextInput
          style={[styles.input, errors.password && styles.errorInput]}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {errors.password && (
          <Text style={styles.errorText}>{errors.password}</Text>
        )}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Log In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/signup")}>
          <Text style={styles.link}>Don’t have an account? Sign up</Text>
        </TouchableOpacity>
      </View>

      <Toast />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { flex: 1, justifyContent: "center", padding: 20 },
  logo: {
    fontSize: 48,
    fontWeight: "bold",
    textAlign: "center",
    color: "#E1306C",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
    marginBottom: 30,
  },
  input: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    color: "#666",
  },
  button: {
    backgroundColor: "#E1306C",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  link: {
    textAlign: "center",
    color: "#E1306C",
    marginTop: 20,
    fontWeight: "600",
  },
  errorInput: {
    borderColor: "#E1306C",
    backgroundColor: "#fff0f3",
  },
  errorText: {
    color: "#E1306C",
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 5,
  },
});
