import { supabase } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";
import { create } from "zustand";

interface Post {
  id: string;
  image_url: string | null;
  content: string;
  created_at: string;
  user_id: string;
  likes_count?: number;
  reposts_count?: number;
  comments_count?: number;
  profiles?: Profile;
}

interface Profile {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
}

interface PostStore {
  // State
  posts: Post[];
  likedPosts: string[];
  repostedPosts: string[];
  profiles: Record<string, Profile>;
  loading: boolean;
  realtimeChannels: RealtimeChannel[];

  // Actions
  setPosts: (posts: Post[]) => void;
  setLikedPosts: (postIds: string[]) => void;
  setRepostedPosts: (postIds: string[]) => void;
  addPost: (post: Post) => void;
  removePost: (postId: string) => void;
  updatePost: (postId: string, updates: Partial<Post>) => void;

  // Fetch actions
  fetchPosts: (userId?: string) => Promise<void>;
  fetchUserInteractions: (userId: string) => Promise<void>;
  fetchProfile: (userId: string) => Promise<Profile | null>;
  refreshPostCounts: (postId: string) => Promise<void>;

  // Interaction actions
  toggleLike: (postId: string, userId: string) => Promise<void>;
  toggleRepost: (postId: string, userId: string) => Promise<void>;
  deletePost: (postId: string) => Promise<boolean>;

  // Utility
  isLiked: (postId: string) => boolean;
  isReposted: (postId: string) => boolean;
  getPostById: (postId: string) => Post | undefined;
  getProfile: (userId: string) => Profile | undefined;

  // Real-time
  setupRealtime: (currentUserId?: string) => void;
  cleanupRealtime: () => void;

  // Reset
  reset: () => void;
}

export const usePostStore = create<PostStore>((set, get) => ({
  // Initial state
  posts: [],
  likedPosts: [],
  repostedPosts: [],
  profiles: {},
  loading: false,
  realtimeChannels: [],

  // Basic setters
  setPosts: (posts) => set({ posts }),

  setLikedPosts: (postIds) => set({ likedPosts: postIds }),

  setRepostedPosts: (postIds) => set({ repostedPosts: postIds }),

  addPost: (post) =>
    set((state) => {
      // Don't add duplicates
      if (state.posts.some((p) => p.id === post.id)) return state;
      return { posts: [post, ...state.posts] };
    }),

  removePost: (postId) =>
    set((state) => ({
      posts: state.posts.filter((p) => p.id !== postId),
    })),

  updatePost: (postId, updates) =>
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId ? { ...p, ...updates } : p
      ),
    })),

  // Fetch all posts or user-specific posts with counts
  fetchPosts: async (userId) => {
    set({ loading: true });

    try {
      let query = supabase
        .from("posts")
        .select(
          `
          *,
          profiles:user_id (
            id,
            username,
            avatar_url,
            bio
          )
        `
        )
        .order("created_at", { ascending: false });

      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data: posts, error } = await query;

      if (error) throw error;

      if (posts) {
        // Fetch counts for all posts in parallel and cache profiles
        const postsWithCounts = await Promise.all(
          posts.map(async (post) => {
            const [likesResult, repostsResult, commentsResult] =
              await Promise.all([
                supabase
                  .from("likes")
                  .select("*", { count: "exact", head: true })
                  .eq("post_id", post.id),
                supabase
                  .from("reposts")
                  .select("*", { count: "exact", head: true })
                  .eq("post_id", post.id),
                supabase
                  .from("comments")
                  .select("*", { count: "exact", head: true })
                  .eq("post_id", post.id),
              ]);

            // Cache the profile data
            if (post.profiles) {
              set((state) => ({
                profiles: {
                  ...state.profiles,
                  [post.user_id]: post.profiles,
                },
              }));
            }

            return {
              ...post,
              likes_count: likesResult.count || 0,
              reposts_count: repostsResult.count || 0,
              comments_count: commentsResult.count || 0,
            };
          })
        );

        set({ posts: postsWithCounts });

        // Fetch any missing profiles
        const userIds = [...new Set(posts.map((post) => post.user_id))];
        userIds.forEach((uid) => {
          if (!get().profiles[uid]) {
            get().fetchProfile(uid);
          }
        });
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      set({ loading: false });
    }
  },

  // Refresh counts for a specific post
  refreshPostCounts: async (postId) => {
    try {
      const [likesResult, repostsResult, commentsResult] = await Promise.all([
        supabase
          .from("likes")
          .select("*", { count: "exact", head: true })
          .eq("post_id", postId),
        supabase
          .from("reposts")
          .select("*", { count: "exact", head: true })
          .eq("post_id", postId),
        supabase
          .from("comments")
          .select("*", { count: "exact", head: true })
          .eq("post_id", postId),
      ]);

      get().updatePost(postId, {
        likes_count: likesResult.count || 0,
        reposts_count: repostsResult.count || 0,
        comments_count: commentsResult.count || 0,
      });
    } catch (error) {
      console.error("Error refreshing post counts:", error);
    }
  },

  // Fetch user's likes and reposts
  fetchUserInteractions: async (userId) => {
    try {
      const [likesResult, repostsResult] = await Promise.all([
        supabase.from("likes").select("post_id").eq("user_id", userId),
        supabase.from("reposts").select("post_id").eq("user_id", userId),
      ]);

      if (likesResult.data) {
        set({ likedPosts: likesResult.data.map((like) => like.post_id) });
      }

      if (repostsResult.data) {
        set({
          repostedPosts: repostsResult.data.map((repost) => repost.post_id),
        });
      }
    } catch (error) {
      console.error("Error fetching user interactions:", error);
    }
  },

  // Fetch and cache a user profile
  fetchProfile: async (userId) => {
    const state = get();

    if (state.profiles[userId]) {
      return state.profiles[userId];
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (!error && data) {
        set((state) => ({
          profiles: { ...state.profiles, [userId]: data },
        }));
        return data;
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }

    return null;
  },

  // Toggle like with optimistic update
  toggleLike: async (postId, userId) => {
    const state = get();
    const isCurrentlyLiked = state.likedPosts.includes(postId);
    const post = state.posts.find((p) => p.id === postId);
    const originalLikesCount = post?.likes_count || 0;

    // Optimistic update
    set((state) => ({
      likedPosts: isCurrentlyLiked
        ? state.likedPosts.filter((id) => id !== postId)
        : [...state.likedPosts, postId],
      posts: state.posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              likes_count: originalLikesCount + (isCurrentlyLiked ? -1 : 1),
            }
          : p
      ),
    }));

    try {
      if (isCurrentlyLiked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("likes")
          .insert({ post_id: postId, user_id: userId });

        if (error) throw error;
      }
    } catch (error) {
      console.error("Error toggling like:", error);

      // Revert on error
      set((state) => ({
        likedPosts: isCurrentlyLiked
          ? [...state.likedPosts, postId]
          : state.likedPosts.filter((id) => id !== postId),
        posts: state.posts.map((p) =>
          p.id === postId ? { ...p, likes_count: originalLikesCount } : p
        ),
      }));
    }
  },

  // Toggle repost with optimistic update
  toggleRepost: async (postId, userId) => {
    const state = get();
    const isCurrentlyReposted = state.repostedPosts.includes(postId);
    const post = state.posts.find((p) => p.id === postId);
    const originalRepostsCount = post?.reposts_count || 0;

    // Optimistic update
    set((state) => ({
      repostedPosts: isCurrentlyReposted
        ? state.repostedPosts.filter((id) => id !== postId)
        : [...state.repostedPosts, postId],
      posts: state.posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              reposts_count:
                originalRepostsCount + (isCurrentlyReposted ? -1 : 1),
            }
          : p
      ),
    }));

    try {
      if (isCurrentlyReposted) {
        const { error } = await supabase
          .from("reposts")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("reposts")
          .insert({ post_id: postId, user_id: userId });

        if (error) throw error;
      }
    } catch (error) {
      console.error("Error toggling repost:", error);

      // Revert on error
      set((state) => ({
        repostedPosts: isCurrentlyReposted
          ? [...state.repostedPosts, postId]
          : state.repostedPosts.filter((id) => id !== postId),
        posts: state.posts.map((p) =>
          p.id === postId ? { ...p, reposts_count: originalRepostsCount } : p
        ),
      }));
    }
  },

  // Delete post
  deletePost: async (postId) => {
    try {
      const { error } = await supabase.from("posts").delete().eq("id", postId);

      if (error) throw error;

      get().removePost(postId);
      return true;
    } catch (error) {
      console.error("Error deleting post:", error);
      return false;
    }
  },

  // Utility functions
  isLiked: (postId) => get().likedPosts.includes(postId),

  isReposted: (postId) => get().repostedPosts.includes(postId),

  getPostById: (postId) => get().posts.find((p) => p.id === postId),

  getProfile: (userId) => {
    // First check if we have it cached in the store
    const cachedProfile = get().profiles[userId];
    if (cachedProfile) return cachedProfile;

    // Then check if any post has this profile embedded
    const postWithProfile = get().posts.find(
      (p) => p.user_id === userId && p.profiles
    );

    if (postWithProfile?.profiles) {
      // Cache it for future use
      set((state) => ({
        profiles: {
          ...state.profiles,
          [userId]: postWithProfile.profiles!,
        },
      }));
      return postWithProfile.profiles;
    }

    return undefined;
  },

  // Setup real-time subscriptions
  setupRealtime: (currentUserId) => {
    // Clean up existing channels first
    get().cleanupRealtime();

    const channels: RealtimeChannel[] = [];

    // Posts channel
    const postsChannel = supabase
      .channel("posts-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        async (payload) => {
          const newPost = payload.new as Post;

          // Fetch the full post with profile data
          const { data: fullPost } = await supabase
            .from("posts")
            .select(
              `
              *,
              profiles:user_id (
                id,
                username,
                avatar_url,
                bio
              )
            `
            )
            .eq("id", newPost.id)
            .single();

          if (fullPost) {
            // Cache profile
            if (fullPost.profiles) {
              set((state) => ({
                profiles: {
                  ...state.profiles,
                  [fullPost.user_id]: fullPost.profiles,
                },
              }));
            }

            get().addPost(fullPost);
            // Fetch initial counts for new post
            setTimeout(() => get().refreshPostCounts(fullPost.id), 500);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "posts" },
        (payload) => {
          const updatedPost = payload.new as Post;
          get().updatePost(updatedPost.id, updatedPost);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "posts" },
        (payload) => {
          get().removePost(payload.old.id);
        }
      )
      .subscribe();

    channels.push(postsChannel);

    // Likes channel
    const likesChannel = supabase
      .channel("likes-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "likes" },
        (payload) => {
          const { post_id, user_id } = payload.new;

          // Refresh count for everyone
          get().refreshPostCounts(post_id);

          // Update current user's liked state
          if (currentUserId && user_id === currentUserId) {
            set((state) => ({
              likedPosts: [...new Set([...state.likedPosts, post_id])],
            }));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "likes" },
        (payload) => {
          const { post_id, user_id } = payload.old;

          // Refresh count for everyone
          get().refreshPostCounts(post_id);

          // Update current user's liked state
          if (currentUserId && user_id === currentUserId) {
            set((state) => ({
              likedPosts: state.likedPosts.filter((id) => id !== post_id),
            }));
          }
        }
      )
      .subscribe();

    channels.push(likesChannel);

    // Reposts channel
    const repostsChannel = supabase
      .channel("reposts-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reposts" },
        (payload) => {
          const { post_id, user_id } = payload.new;

          // Refresh count for everyone
          get().refreshPostCounts(post_id);

          // Update current user's reposted state
          if (currentUserId && user_id === currentUserId) {
            set((state) => ({
              repostedPosts: [...new Set([...state.repostedPosts, post_id])],
            }));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "reposts" },
        (payload) => {
          const { post_id, user_id } = payload.old;

          // Refresh count for everyone
          get().refreshPostCounts(post_id);

          // Update current user's reposted state
          if (currentUserId && user_id === currentUserId) {
            set((state) => ({
              repostedPosts: state.repostedPosts.filter((id) => id !== post_id),
            }));
          }
        }
      )
      .subscribe();

    channels.push(repostsChannel);

    set({ realtimeChannels: channels });
  },

  // Cleanup real-time subscriptions
  cleanupRealtime: () => {
    const channels = get().realtimeChannels;
    channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    set({ realtimeChannels: [] });
  },

  // Reset store
  reset: () => {
    get().cleanupRealtime();
    set({
      posts: [],
      likedPosts: [],
      repostedPosts: [],
      profiles: {},
      loading: false,
      realtimeChannels: [],
    });
  },
}));
