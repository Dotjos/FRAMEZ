import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) Alert.alert("Signup failed", error.message);
    else {
      Alert.alert("Success", "Account created! You can now log in.");
      router.replace("/login");
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Framez</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        secureTextEntry
        onChangeText={setPassword}
      />
      <TouchableOpacity
        style={styles.button}
        onPress={handleSignup}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Creating..." : "Sign Up"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/login")}>
        <Text style={styles.link}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  logo: {
    fontSize: 40,
    fontWeight: "bold",
    textAlign: "center",
    color: "#E1306C",
    marginBottom: 30,
  },
  input: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#E1306C",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { textAlign: "center", marginTop: 20, color: "#E1306C" },
});
