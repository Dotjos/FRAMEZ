import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

interface Profile {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
}

interface Post {
  id: string;
  image_url: string | null;
  content: string;
  created_at: string;
  user_id: string;
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Edit form states
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const fetchProfile = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!error && data) {
      setProfile(data);
      setUsername(data.username || "");
      setBio(data.bio || "");
    }
  };

  const fetchUserPosts = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error) setPosts(data || []);
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchProfile(), fetchUserPosts()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleUpdateProfile = async () => {
    if (!username.trim()) {
      Alert.alert("Error", "Username cannot be empty");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        username: username.trim(),
        bio: bio.trim() || null,
      })
      .eq("id", user?.id);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", "Profile updated successfully!");
      setEditing(false);
      await fetchProfile();
    }

    setLoading(false);
  };

  // const handleUploadAvatar = async () => {
  //   const result = await ImagePicker.launchImageLibraryAsync({
  //     mediaTypes: ["images"],
  //     allowsEditing: true,
  //     aspect: [1, 1],
  //     quality: 0.8,
  //   });

  //   if (result.canceled) return;

  //   setUploadingAvatar(true);

  //   try {
  //     const uri = result.assets[0].uri;

  //     // Read image as base64
  //     const base64 = await FileSystem.readAsStringAsync(uri, {
  //       encoding: FileSystem.EncodingType.Base64,
  //     });

  //     const fileName = `${user?.id}-${Date.now()}.jpg`;

  //     const { data: profile, error } = await supabase
  //       .from("profiles")
  //       .select("avatar_url")
  //       .eq("user_id", user?.id)
  //       .single();

  //     if (error) throw error;

  //     // Get the public URL of the uploaded image
  //     const { data: publicUrlData } = supabase.storage
  //       .from("profile")
  //       .getPublicUrl(fileName);

  //     const avatarUrl = publicUrlData.publicUrl;

  //     // Update the user's profile table
  //     const { error: updateError } = await supabase
  //       .from("profiles")
  //       .update({ avatar_url: avatarUrl })
  //       .eq("user_id", user?.id);

  //     if (updateError) throw updateError;

  //     Toast.show({
  //       type: "success",
  //       text2: "Profile picture updated successfully!",
  //     });
  //     await fetchProfile();
  //   } catch (err: any) {
  //     console.error("Avatar upload error:", err);
  //     Toast.show({
  //       type: "error",
  //       text2: "Failed to upload profile picture, kindly try again",
  //     });
  //   } finally {
  //     setUploadingAvatar(false);
  //   }
  // };

  const handleUploadAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    setUploadingAvatar(true);

    try {
      const uri = result.assets[0].uri;
      const fileName = `${user?.id}/avatar-${Date.now()}.jpg`;

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("profile") //
        .upload(fileName, decode(base64), {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("profile")
        .getPublicUrl(fileName);

      const avatarUrl = publicUrlData.publicUrl;

      // Update user's profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("user_id", user?.id);

      if (updateError) throw updateError;

      Toast.show({
        type: "success",
        text2: "Profile picture updated successfully!",
      });

      await fetchProfile();
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      Toast.show({
        type: "error",
        text2: "Failed to upload profile picture, kindly try again",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const handleDeletePost = async (postId: string) => {
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("posts")
            .delete()
            .eq("id", postId);

          if (error) {
            Alert.alert("Error", "Failed to delete post");
          } else {
            Alert.alert("Success", "Post deleted");
            await fetchUserPosts();
          }
        },
      },
    ]);
  };

  if (loading && !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E1306C" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Info */}
      <View style={styles.profileSection}>
        <TouchableOpacity
          onPress={handleUploadAvatar}
          disabled={uploadingAvatar}
          style={styles.avatarContainer}
        >
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {profile?.username?.[0]?.toUpperCase() || "?"}
              </Text>
            </View>
          )}
          {uploadingAvatar && (
            <View style={styles.avatarLoading}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
          <View style={styles.editAvatarBadge}>
            <Text style={styles.editAvatarText}>✏️</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{posts.length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>
      </View>

      {/* Edit Mode */}
      {editing ? (
        <View style={styles.editSection}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="Write a bio..."
            multiline
            numberOfLines={4}
          />

          <View style={styles.editButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setEditing(false);
                setUsername(profile?.username || "");
                setBio(profile?.bio || "");
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleUpdateProfile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.profileDetails}>
          <Text style={styles.username}>
            {profile?.username || "No username"}
          </Text>
          {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => setEditing(true)}
          >
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Posts Section */}
      <View style={styles.postsSection}>
        <Text style={styles.postsHeader}>My Posts</Text>
        {posts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No posts yet</Text>
            <TouchableOpacity
              style={styles.createPostButton}
              onPress={() => router.push("/create")}
            >
              <Text style={styles.createPostText}>Create Your First Post</Text>
            </TouchableOpacity>
          </View>
        ) : (
          posts.map((post) => (
            <View key={post.id} style={styles.postCard}>
              {/* User Info */}
              <View style={styles.postUserInfo}>
                <View style={styles.postAvatar}>
                  {profile?.avatar_url ? (
                    <Image
                      source={{ uri: profile.avatar_url }}
                      style={styles.postAvatarImage}
                    />
                  ) : (
                    <View style={styles.postAvatarPlaceholder}>
                      <Text style={styles.postAvatarText}>
                        {profile?.username?.[0]?.toUpperCase() || "?"}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.postUserDetails}>
                  <Text style={styles.postUsername}>
                    {profile?.username || "Anonymous"}
                  </Text>
                  <Text style={styles.postTimestamp}>
                    {formatDate(post.created_at)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeletePost(post.id)}
                  style={styles.deleteButton}
                >
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>

              {/* Post Image */}
              {post.image_url && (
                <Image
                  source={{ uri: post.image_url }}
                  style={styles.postImage}
                  resizeMode="cover"
                />
              )}

              {/* Post Caption */}
              {post.content && (
                <Text style={styles.postCaption}>{post.content}</Text>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ebebeb",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },
  signOutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  signOutText: {
    color: "#E1306C",
    fontWeight: "600",
  },
  profileSection: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 30,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#E1306C",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholderText: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "bold",
  },
  avatarLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
  },
  editAvatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#fff",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E1306C",
  },
  editAvatarText: {
    fontSize: 12,
  },
  statsContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  profileDetails: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: "#262626",
    marginBottom: 12,
    lineHeight: 18,
  },
  editProfileButton: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dbdbdb",
  },
  editProfileText: {
    fontWeight: "600",
    fontSize: 14,
  },
  editSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#262626",
  },
  input: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#dbdbdb",
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  editButtons: {
    flexDirection: "row",
    gap: 10,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#dbdbdb",
  },
  cancelButtonText: {
    fontWeight: "600",
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: "#E1306C",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  postsSection: {
    paddingTop: 10,
    // borderTopWidth: 1,
    borderTopColor: "#ebebeb",
  },
  postsHeader: {
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginBottom: 15,
  },
  createPostButton: {
    backgroundColor: "#E1306C",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createPostText: {
    color: "#fff",
    fontWeight: "600",
  },
  postCard: {
    backgroundColor: "#fff",
    marginBottom: 5,
    borderBottomWidth: 1,
    borderColor: "#ebebeb",
  },
  postUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  postAvatar: {
    marginRight: 10,
  },
  postAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  postAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E1306C",
    justifyContent: "center",
    alignItems: "center",
  },
  postAvatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  postUserDetails: {
    flex: 1,
  },
  postUsername: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },
  postTimestamp: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 20,
  },
  postImage: {
    width: "100%",
    height: 400,
    backgroundColor: "#f0f0f0",
  },
  postCaption: {
    padding: 12,
    fontSize: 14,
    color: "#262626",
    lineHeight: 18,
  },
});
