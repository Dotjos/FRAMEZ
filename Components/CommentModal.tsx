// CommentModal.jsx
import { supabase } from "@/lib/supabase"; // Assuming you have your Supabase client imported here
import { useAuthStore } from "@/store/authStore";
import { usePostStore } from "@/store/postStore";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Define the shape of a Comment (adjust this based on your Supabase schema)
interface Comment {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface CommentModalProps {
  isVisible: boolean;
  post: any; // The post object passed from PostCard
  onClose: () => void;
  onCommentSuccess: (postId: string, currentCount: number) => void;
}

const CommentModal: React.FC<CommentModalProps> = ({
  isVisible,
  post,
  onClose,
  onCommentSuccess,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore();
  const { refreshPostCounts } = usePostStore();
  // Replace this with actual user data from your auth store
  const currentUserId = user?.id;
  // --- Supabase Fetch and Realtime Listener ---
  const fetchComments = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("comments")
      .select("*, profiles(username, avatar_url)") // Fetch comment and related user profile
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error);
    } else {
      setComments(data || []);
    }
    setIsLoading(false);
  }, [post.id]);

  useEffect(() => {
    if (!isVisible) return; // Only run when the modal is visible

    fetchComments();

    // Setup Realtime Listener
    const subscription = supabase
      .channel(`post_comments_${post.id}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen for INSERT, UPDATE, DELETE
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${post.id}`,
        },
        (payload) => {
          // Re-fetch comments or manually update state
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      // Cleanup subscription when component unmounts or post.id changes
      supabase.removeChannel(subscription);
    };
  }, [isVisible, post.id, fetchComments]);

  // --- Supabase Submit Comment ---
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !currentUserId) return;

    const { error } = await supabase.from("comments").insert({
      post_id: post.id,
      user_id: currentUserId,
      content: newComment.trim(),
    });

    if (error) {
      console.error("Error submitting comment:", error);
    } else {
      setNewComment("");
      onCommentSuccess(post.id, post.comments_count || 0);
      await refreshPostCounts(post.id);
    }
  };

  const renderCommentItem = ({ item }: { item: Comment }) => (
    <View style={styles.commentItem}>
      {/* Avatar Section */}
      <View style={styles.avatarContainer}>
        {item.profiles?.avatar_url ? (
          <Image
            source={{ uri: item.profiles.avatar_url }}
            style={styles.commentAvatar}
          />
        ) : (
          // Placeholder if no avatar_url or profile
          <View style={styles.commentAvatarPlaceholder}>
            <Text style={styles.commentAvatarPlaceholderText}>
              {item.profiles?.username?.[0]?.toUpperCase() || "?"}
            </Text>
          </View>
        )}
      </View>

      {/* Comment Content Section */}
      <View style={styles.commentContentWrapper}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUsername}>
            {item.profiles?.username || "Anonymous"}
          </Text>
          <Text style={styles.commentTimestamp}>
            {new Date(item.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
        <Text style={styles.commentContent}>{item.content}</Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet" // Good for iOS
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
            <Text style={styles.title}>Comments</Text>
          </View>

          {/* Comment List */}
          {isLoading ? (
            <Text style={styles.loadingText}>Loading comments...</Text>
          ) : (
            <FlatList
              data={comments}
              renderItem={renderCommentItem}
              keyExtractor={(item) => item.id}
              style={styles.flatList} // ADDED: Give FlatList flex: 1
              contentContainerStyle={styles.flatListContent}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Be the first to comment!</Text>
              }
            />
          )}

          {/* Comment Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Add a comment..."
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />
            <TouchableOpacity
              onPress={handleSubmitComment}
              disabled={!newComment.trim()}
              style={[
                styles.sendButton,
                { opacity: newComment.trim() ? 1 : 0.5 },
              ]}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  closeButton: {
    marginRight: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },

  commentItem: {
    flexDirection: "row", // Align avatar and content horizontally
    alignItems: "flex-start", // Align items to the top
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff", // Added background for distinct rows
  },
  avatarContainer: {
    marginRight: 10,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18, // Makes it a perfect circle
    backgroundColor: "#f0f0f0", // Fallback background
  },
  commentAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E1306C", // A vibrant color for placeholder
    justifyContent: "center",
    alignItems: "center",
  },
  commentAvatarPlaceholderText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  commentContentWrapper: {
    flex: 1, // Take up remaining space
  },
  flatList: {
    flex: 1,
  },
  flatListContent: {
    paddingTop: 10, // Added a little top padding
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  commentUsername: {
    fontWeight: "600", // Slightly bolder
    fontSize: 15,
    color: "#222",
    marginRight: 8, // Space between username and timestamp
  },

  commentContent: {
    fontSize: 15,
    color: "#444",
    lineHeight: 20, // Improved readability
  },
  commentTimestamp: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end", // Align input to the top of the container
    padding: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  textInput: {
    flex: 1,
    maxHeight: 100, // Prevent it from getting too tall
    minHeight: 40,
    borderRadius: 20,
    color: "#555",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    marginRight: 10,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: "#E1306C", // Standard iOS/App color
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    textAlign: "center",
    marginTop: 20,
    color: "#777",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    color: "#999",
    fontSize: 16,
  },
});

export default CommentModal;
