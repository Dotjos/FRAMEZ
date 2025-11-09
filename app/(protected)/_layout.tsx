import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuthStore } from "../../store/authStore";

export default function ProtectedLayout() {
  const router = useRouter();
  const { user, fetchUser, initialized, loading } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      await fetchUser();
    };
    init();
  }, []);

  useEffect(() => {
    if (initialized && !user) {
      // user not logged in → redirect to login
      router.replace("/login");
    }
  }, [user, initialized]);

  if (loading && !initialized) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#E1306C" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
