import CommentModal from "@/Components/CommentModal";
import PostCard from "@/Components/PostCard";
import { useAuthStore } from "@/store/authStore";
import { usePostStore } from "@/store/postStore";
import { useEffect, useState } from "react";

import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function FeedScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const { user } = useAuthStore();
  const {
    fetchPosts,
    posts,
    fetchUserInteractions,
    toggleLike,
    toggleRepost,
    isLiked,
    isReposted,
    setupRealtime,
    cleanupRealtime,
    updatePost,
  } = usePostStore();

  useEffect(() => {
    const initializeFeed = async () => {
      if (user?.id) {
        await Promise.all([
          fetchPosts(), // Fetch all posts for feed
          fetchUserInteractions(user.id),
        ]);

        // Setup real-time subscriptions
        setupRealtime(user.id);
      }
    };

    initializeFeed();

    // Cleanup on unmount
    return () => {
      cleanupRealtime();
    };
  }, [user?.id]);

  const handleCommentPress = (post: any) => {
    console.log(post);
    setSelectedPost(post);
    setIsModalVisible(true);
  };

  const handleCommentSuccess = (postId: string, currentCount: number) => {
    updatePost(postId, {
      comments_count: currentCount + 1,
    });
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedPost(null);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (user?.id) {
      await Promise.all([fetchPosts(), fetchUserInteractions(user.id)]);
    }
    setRefreshing(false);
  };

  const handleLike = async (postId: string) => {
    // Optimistic UI update
    if (!user?.id) return;
    await toggleLike(postId, user.id);
  };

  // Handle Repost
  const handleRepost = async (postId: string) => {
    if (!user?.id) return;
    await toggleRepost(postId, user.id);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.header}> Framez Feed</Text>
      {posts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No posts yet.</Text>
          <Text style={styles.emptySubtext}>Be the first to create one!</Text>
        </View>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            isLiked={isLiked(post.id)}
            post={post}
            isReposted={isReposted(post.id)}
            onLike={handleLike}
            onRepost={handleRepost}
            onComment={handleCommentPress}
          />
        ))
      )}

      {selectedPost && (
        <CommentModal
          isVisible={isModalVisible}
          post={selectedPost}
          onClose={closeModal}
          onCommentSuccess={handleCommentSuccess}
        />
      )}
    </ScrollView>
  );
}

// ... (rest of the component and styles)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 20,
    fontWeight: "400",
    marginBottom: 20,
    marginTop: 10,
    paddingHorizontal: 15,
    color: "#E1306C",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginTop: 6,
    paddingVertical: 8,
  },

  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
  },
  postCard: {
    backgroundColor: "#fff",
    marginBottom: 5,
    borderColor: "#ebebeb",
    padding: 15,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
  },
  avatar: {
    marginRight: 13,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E1306C",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  postImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#f0f0f0",
    marginBottom: 13,
  },

  caption: {
    fontSize: 20,
    color: "#262626",
    lineHeight: 18,
  },

  actionBtn: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  actionText: {
    fontSize: 2,
    fontWeight: "500",
  },
  followBtn: {
    marginLeft: "auto",
    backgroundColor: "#eee",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  followBtnText: {
    fontSize: 8,
    color: "#333",
  },
});
