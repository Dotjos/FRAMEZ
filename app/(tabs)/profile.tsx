import CommentModal from "@/Components/CommentModal";
import PostCard from "@/Components/PostCard";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { usePostStore } from "@/store/postStore";
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

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  // Get everything from the global store
  const {
    posts,
    fetchPosts,
    fetchUserInteractions,
    toggleLike,
    toggleRepost,
    deletePost: deletePostFromStore,
    isLiked,
    isReposted,
    updatePost,
    refreshPostCounts,
  } = usePostStore();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Comment Modal States <--- ADD THESE
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null); // Use 'any' or Post interface

  // Edit form states
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  // Filter posts for current user
  const userPosts = posts.filter((post) => post.user_id === user?.id);

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

  const loadData = async () => {
    if (!user?.id) return;

    setLoading(true);
    await Promise.all([
      fetchProfile(),
      fetchPosts(user.id), // Fetch only user's posts
      fetchUserInteractions(user.id),
    ]);
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
      Toast.show({
        type: "success",
        text2: "Profile updated successfully!",
      });
      setEditing(false);
      await fetchProfile();
    }

    setLoading(false);
  };

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

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { error: uploadError } = await supabase.storage
        .from("profile")
        .upload(fileName, decode(base64), {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("profile")
        .getPublicUrl(fileName);

      const avatarUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", user?.id);

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
          const success = await deletePostFromStore(postId);
          if (success) {
            Toast.show({
              type: "success",
              text2: "Post deleted successfully",
            });
          } else {
            Alert.alert("Error", "Failed to delete post");
          }
        },
      },
    ]);
  };

  const handleLike = async (postId: string) => {
    if (!user?.id) return;
    await toggleLike(postId, user.id);
  };

  const handleRepost = async (postId: string) => {
    if (!user?.id) return;
    await toggleRepost(postId, user.id);
  };

  const handleCommentPress = (post: any) => {
    setSelectedPost(post);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedPost(null);
  };

  // 3. Update the post count after a successful comment submission
  const handleCommentSuccess = async (postId: string) => {
    // This function is passed to the CommentModal and runs after a successful insert.
    // We force a refresh of the counts for this single post.
    await refreshPostCounts(postId);
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
            <Text style={styles.statNumber}>{userPosts.length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
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
        {userPosts.length === 0 ? (
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
          userPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isLiked={isLiked(post.id)}
              isReposted={isReposted(post.id)}
              onLike={handleLike}
              onRepost={handleRepost}
              onDelete={handleDeletePost}
              onComment={handleCommentPress}
            />
          ))
        )}
      </View>

      {selectedPost && (
        <CommentModal
          isVisible={isModalVisible}
          post={selectedPost}
          onClose={closeModal}
          onCommentSuccess={handleCommentSuccess} // <--- PASS THE NEW SUCCESS HANDLER
        />
      )}
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
    fontSize: 20,
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
});
