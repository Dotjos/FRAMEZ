// import { supabase } from "@/lib/supabase";
// import { router } from "expo-router";
// import React, { useState } from "react";

// import {
//   ActivityIndicator,
//   KeyboardAvoidingView,
//   Platform,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import Toast from "react-native-toast-message";

// export default function SignUpScreen() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [confirm, setConfirm] = useState("");
//   const [errors, setErrors] = useState<{
//     email?: string;
//     password?: string;
//     confirm?: string;
//   }>({});
//   const [loading, setLoading] = useState(false);

//   const validate = () => {
//     const newErrors: typeof errors = {};
//     if (!email) newErrors.email = "Please enter your email address.";
//     else if (!/\S+@\S+\.\S+/.test(email))
//       newErrors.email = "That doesn't look like a valid email.";

//     if (!password) newErrors.password = "Please create a password.";
//     else if (password.length < 6)
//       newErrors.password = "Password must be at least 6 characters.";

//     if (password !== confirm) newErrors.confirm = "Passwords don't match.";

//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleSignup = async () => {
//     if (!validate()) return;

//     try {
//       const { data, error } = await supabase.auth.signUp({
//         email,
//         password,
//         options: {
//           emailRedirectTo: "https://your-app-domain.com/auth/callback", // Or deep link for mobile
//         },
//       });

//       if (error) {
//         // 🟡 CASE 1: Email already registered
//         if (error.message.includes("User already registered")) {
//           // Check if the user has already verified before
//           const { data: existingUser } = await supabase
//             .from("profiles")
//             .select("email_verified")
//             .eq("email", email)
//             .single();

//           if (existingUser?.email_verified) {
//             // ✅ CASE 1A: Verified user trying to re-signup
//             Toast.show({
//               type: "info",
//               text1: "Account already exists",
//               text2: "You already have an account. Please log in instead.",
//             });

//             setTimeout(() => {
//               router.replace("/login");
//             }, 2000);
//             return;
//           } else {
//             // 🟠 CASE 1B: Unverified user — resend confirmation email
//             Toast.show({
//               type: "info",
//               text1: "Email already registered",
//               text2: "We’ve resent a verification link to your inbox.",
//             });

//             await supabase.auth.resend({
//               type: "signup",
//               email,
//               options: {
//                 emailRedirectTo: "https://your-app-domain.com/auth/callback",
//               },
//             });
//             return;
//           }
//         }

//         // Any other signup error
//         throw error;
//       }

//       // 🟢 CASE 2: New user created (not verified yet)
//       if (data?.user && !data.user?.confirmed_at) {
//         Toast.show({
//           type: "info",
//           text1: "Verify your email",
//           text2: "We’ve sent a confirmation link to your inbox.",
//         });

//         setTimeout(() => {
//           router.replace("/login");
//         }, 2000);
//         return;
//       }
//     } catch (err: any) {
//       Toast.show({
//         type: "error",
//         text1: "Signup Failed",
//         text2:
//           err.message || "Something went wrong while creating your account.",
//       });
//     }
//   };

//   return (
//     <KeyboardAvoidingView
//       behavior={Platform.OS === "ios" ? "padding" : "height"}
//       style={styles.container}
//     >
//       <View style={styles.inner}>
//         <Text style={styles.logo}>Framez</Text>
//         <Text style={styles.subtitle}>Create your account</Text>

//         {/* Email */}
//         <TextInput
//           style={[styles.input, errors.email && styles.errorInput]}
//           placeholder="Email"
//           autoCapitalize="none"
//           keyboardType="email-address"
//           value={email}
//           onChangeText={(t) => {
//             setEmail(t);
//             if (errors.email)
//               setErrors((prev) => ({ ...prev, email: undefined }));
//           }}
//         />
//         {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

//         {/* Password */}
//         <TextInput
//           style={[styles.input, errors.password && styles.errorInput]}
//           placeholder="Password"
//           secureTextEntry
//           value={password}
//           onChangeText={(t) => {
//             setPassword(t);
//             if (errors.password)
//               setErrors((prev) => ({ ...prev, password: undefined }));
//           }}
//         />
//         {errors.password && (
//           <Text style={styles.errorText}>{errors.password}</Text>
//         )}

//         {/* Confirm Password */}
//         <TextInput
//           style={[styles.input, errors.confirm && styles.errorInput]}
//           placeholder="Confirm Password"
//           secureTextEntry
//           value={confirm}
//           onChangeText={(t) => {
//             setConfirm(t);
//             if (errors.confirm)
//               setErrors((prev) => ({ ...prev, confirm: undefined }));
//           }}
//         />
//         {errors.confirm && (
//           <Text style={styles.errorText}>{errors.confirm}</Text>
//         )}

//         {/* Button */}
//         <TouchableOpacity
//           style={[styles.button, loading && styles.buttonDisabled]}
//           onPress={handleSignup}
//           disabled={loading}
//         >
//           {loading ? (
//             <ActivityIndicator color="#fff" />
//           ) : (
//             <Text style={styles.buttonText}>Sign Up</Text>
//           )}
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => router.push("/login")}>
//           <Text style={styles.link}>Already have an account? Log in</Text>
//         </TouchableOpacity>
//       </View>

//       <Toast />
//     </KeyboardAvoidingView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#fff" },
//   inner: { flex: 1, justifyContent: "center", padding: 20 },
//   logo: {
//     fontSize: 48,
//     fontWeight: "bold",
//     textAlign: "center",
//     color: "#E1306C",
//     marginBottom: 8,
//   },
//   subtitle: {
//     fontSize: 16,
//     textAlign: "center",
//     color: "#666",
//     marginBottom: 30,
//   },
//   input: {
//     backgroundColor: "#f5f5f5",
//     padding: 15,
//     borderRadius: 8,
//     marginBottom: 10,
//     fontSize: 16,
//     borderWidth: 1,
//     borderColor: "#ddd",
//   },
//   link: {
//     textAlign: "center",
//     color: "#E1306C",
//     marginTop: 20,
//     fontWeight: "600",
//   },

//   errorInput: {
//     borderColor: "#E1306C",
//     backgroundColor: "#fff0f3",
//   },
//   errorText: {
//     color: "#E1306C",
//     fontSize: 13,
//     marginBottom: 8,
//     marginLeft: 5,
//   },
//   button: {
//     backgroundColor: "#E1306C",
//     padding: 15,
//     borderRadius: 8,
//     alignItems: "center",
//     marginTop: 15,
//   },
//   buttonDisabled: {
//     opacity: 0.6,
//   },
//   buttonText: {
//     color: "#fff",
//     fontSize: 16,
//     fontWeight: "600",
//   },
// });

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

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirm?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  // ✅ Validate before submission
  const validate = () => {
    const newErrors: typeof errors = {};
    if (!email) newErrors.email = "Please enter your email address.";
    else if (!/\S+@\S+\.\S+/.test(email))
      newErrors.email = "That doesn't look like a valid email.";

    if (!password) newErrors.password = "Please create a password.";
    else if (password.length < 6)
      newErrors.password = "Password must be at least 6 characters.";

    if (password !== confirm) newErrors.confirm = "Passwords don't match.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return; // ✅ fix: you forgot to invoke validate()

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: "https://your-app-domain.com/auth/callback",
        },
      });

      if (error) {
        // 🟡 CASE 1: Email already registered
        if (error.message.includes("User already registered")) {
          const { data: existingUser } = await supabase
            .from("profiles")
            .select("email_verified")
            .eq("email", email)
            .single();

          if (existingUser?.email_verified) {
            // ✅ Already verified user
            Toast.show({
              type: "info",
              text1: "Account already exists",
              text2: "You already have an account. Please log in instead.",
            });

            setTimeout(() => {
              router.replace("/login");
            }, 2000);
            return;
          } else {
            // 🟠 Unverified user
            Toast.show({
              type: "info",
              text1: "Email already registered",
              text2: "We’ve resent a verification link to your inbox.",
            });

            await supabase.auth.resend({
              type: "signup",
              email,
              options: {
                emailRedirectTo: "https://your-app-domain.com/auth/callback",
              },
            });
            return;
          }
        }

        throw error;
      }

      // 🟢 CASE 2: New signup (needs verification)
      if (data?.user && !data.user?.confirmed_at) {
        Toast.show({
          type: "info",
          text1: "Verify your email",
          text2:
            "We’ve sent a confirmation link to your inbox. Please verify before logging in.",
        });

        setTimeout(() => {
          router.replace("/login");
        }, 2000);
      }
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Signup Failed",
        text2:
          err.message || "Something went wrong while creating your account.",
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
        <Text style={styles.subtitle}>Create your account</Text>

        {/* Email */}
        <TextInput
          style={[styles.input, errors.email && styles.errorInput]}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            if (errors.email)
              setErrors((prev) => ({ ...prev, email: undefined }));
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
            if (errors.password)
              setErrors((prev) => ({ ...prev, password: undefined }));
          }}
        />
        {errors.password && (
          <Text style={styles.errorText}>{errors.password}</Text>
        )}

        {/* Confirm Password */}
        <TextInput
          style={[styles.input, errors.confirm && styles.errorInput]}
          placeholder="Confirm Password"
          secureTextEntry
          value={confirm}
          onChangeText={(t) => {
            setConfirm(t);
            if (errors.confirm)
              setErrors((prev) => ({ ...prev, confirm: undefined }));
          }}
        />
        {errors.confirm && (
          <Text style={styles.errorText}>{errors.confirm}</Text>
        )}

        {/* Button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/login")}>
          <Text style={styles.link}>Already have an account? Log in</Text>
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
  button: {
    backgroundColor: "#E1306C",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
