import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ConvexProviderWithAuth client={convex}>
        <Stack />
      </ConvexProviderWithAuth>
    </SafeAreaProvider>
  );
}
