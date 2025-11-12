import { Feather, Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface PostCardProps {
  post: any;
  isLiked: boolean;
  isReposted: boolean;
  onLike: (id: string) => void;
  onRepost: (id: string) => void;
  onDelete?: (id: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  onLike,
  isReposted,
  isLiked,
  onDelete,
  onRepost,
}) => {
  // const { user } = useAuthStore();
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
  return (
    <View style={styles.postCard}>
      {/* User Info */}
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          {post.profiles.avatar_url ? (
            <Image
              source={{ uri: post.profiles.avatar_url }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {post.profiles.username?.[0]?.toUpperCase() || "?"}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.username}>{post.profiles.username}</Text>
          <Text style={styles.timestamp}>{formatDate(post.created_at)}</Text>
        </View>
        {onDelete && (
          <View>
            <TouchableOpacity onPress={() => onDelete(post.id)}>
              <Ionicons name="trash" size={18} color="#555" />
            </TouchableOpacity>
          </View>
        )}
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
      {post.content && <Text style={styles.caption}>{post.content}</Text>}

      {/* Post Actions */}
      <View style={styles.actions}>
        <View style={styles.actionEach}>
          {post.likes_count > 0 && (
            <Text style={styles.actionCount}>{post.likes_count}</Text>
          )}
          <TouchableOpacity onPress={() => onLike(post.id)}>
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={18}
              color={isLiked ? "#e63946" : "#555"}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.actionEach}>
          <TouchableOpacity onPress={() => onRepost(post.id)}>
            <Feather
              name="repeat"
              size={15}
              color={isReposted ? "#e63946" : "#555"}
            />
          </TouchableOpacity>
          {post.reposts_count > 0 && (
            <Text style={styles.actionCount}>{post.reposts_count}</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: "#fff",
    marginBottom: 5,
    borderColor: "#ebebeb",
    padding: 15,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginTop: 6,
    paddingVertical: 8,
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
    fontSize: 20,
    fontWeight: "500",
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
  actionCount: {
    fontSize: 17,
    color: "#555",
    fontWeight: "500",
    marginLeft: 4,
  },
  caption: {
    fontSize: 15,
    color: "#262626",
    lineHeight: 18,
  },
  actionEach: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
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

export default PostCard;
