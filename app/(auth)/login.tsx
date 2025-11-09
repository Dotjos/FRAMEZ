// import { useRouter } from "expo-router";
// import React, { useState } from "react";
// import {
//   Alert,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { useAuthStore } from "../../store/authStore";

// export default function LoginScreen() {
//   const { signIn, loading, error, clearError } = useAuthStore();
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const router = useRouter();

//   const handleLogin = async () => {
//     if (!email || !password) return Alert.alert("Error", "All fields required");
//     try {
//       await signIn(email, password);
//       router.replace("/");
//     } catch (err: any) {
//       Alert.alert("Login failed", err.message);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.logo}>Framez</Text>
//       <TextInput
//         placeholder="Email"
//         style={styles.input}
//         value={email}
//         onChangeText={setEmail}
//       />
//       <TextInput
//         placeholder="Password"
//         style={styles.input}
//         value={password}
//         secureTextEntry
//         onChangeText={setPassword}
//       />
//       <TouchableOpacity style={styles.button} onPress={handleLogin}>
//         <Text style={styles.buttonText}>Log In</Text>
//       </TouchableOpacity>

//       <TouchableOpacity onPress={() => router.push("/signup")}>
//         <Text style={styles.link}>No account? Sign Up</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: "center",
//     padding: 20,
//     backgroundColor: "#fff",
//   },
//   logo: {
//     fontSize: 36,
//     fontWeight: "bold",
//     textAlign: "center",
//     color: "#E1306C",
//     marginBottom: 30,
//   },
//   input: {
//     borderWidth: 1,
//     borderColor: "#ddd",
//     borderRadius: 8,
//     padding: 12,
//     marginBottom: 10,
//   },
//   button: {
//     backgroundColor: "#E1306C",
//     padding: 14,
//     borderRadius: 8,
//     alignItems: "center",
//     marginTop: 10,
//   },
//   buttonText: { color: "#fff", fontWeight: "600" },
//   link: { color: "#E1306C", textAlign: "center", marginTop: 20 },
// });
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
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";

export default function LoginScreen() {
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!email) newErrors.email = "Please enter your email address.";
    else if (!/\S+@\S+\.\S+/.test(email))
      newErrors.email = "That doesn’t look like a valid email.";

    if (!password) newErrors.password = "Please enter your password.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSignIn = async () => {
    if (!validate()) return;
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      Toast.show({
        type: "error",
        text1: "Login failed",
        text2: error.message || "Please try again.",
      });
      return;
    }

    if (data?.user) {
      setUser({
        id: data.user.id,
        email: data.user.email || "",
        user_metadata: data.user.user_metadata,
      });

      Toast.show({
        type: "success",
        text1: "Welcome back 👋",
        text2: "Redirecting to your feed...",
      });

      setTimeout(() => router.replace("/"), 1500);
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

        {/* Email */}
        <TextInput
          style={[styles.input, errors.email && styles.errorInput]}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
          }}
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

        {/* Password */}
        <TextInput
          style={[styles.input, errors.password && styles.errorInput]}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
          }}
        />
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

        {/* Button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={onSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Log In</Text>
          )}
        </TouchableOpacity>

        {/* Link */}
        <TouchableOpacity onPress={() => router.push("/signup")} style={{ marginTop: 20 }}>
          <Text style={styles.link}>Don’t have an account? Sign Up</Text>
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
  },
  errorInput: { borderColor: "#E1306C", backgroundColor: "#fff0f3" },
  errorText: { color: "#E1306C", fontSize: 13, marginBottom: 8, marginLeft: 5 },
  button: {
    backgroundColor: "#E1306C",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { textAlign: "center", color: "#E1306C", fontWeight: "600" },
});
