// import { Stack, useRouter } from "expo-router";
// import { useEffect } from "react";
// import { ActivityIndicator, View } from "react-native";
// import { useAuthStore } from "../../store/authStore";

// export default function AuthLayout() {
//   const router = useRouter();
//   const { user, fetchUser, initialized, loading } = useAuthStore();

//   useEffect(() => {
//     const init = async () => {
//       await fetchUser();
//     };
//     init();
//   }, []);

//   useEffect(() => {
//     if (initialized && user) {
//       // already logged in → redirect to protected home
//       router.replace("/");
//     }
//   }, [user, initialized]);

//   if (loading && !initialized) {
//     return (
//       <View className="flex-1 items-center justify-center bg-white">
//         <ActivityIndicator size="large" color="#E1306C" />
//       </View>
//     );
//   }

//   return <Stack screenOptions={{ headerShown: false }} />;
// }

import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuthStore } from "../../store/authStore";

export default function AuthLayout() {
  const { user, initialized } = useAuthStore();

  // Show loading while checking auth
  if (!initialized) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#E1306C" />
      </View>
    );
  }

  // If user is already logged in, redirect to tabs
  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  // Otherwise, show auth screens (login/signup)
  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
