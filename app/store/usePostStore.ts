import { create } from "zustand";

interface PostState {
  posts: any[];
  setPosts: (posts: any[]) => void;
  addPost: (post: any) => void;
}

export const usePostStore = create<PostState>((set) => ({
  posts: [],
  setPosts: (posts) => set({ posts }),
  addPost: (post) => set((state) => ({ posts: [post, ...state.posts] })),
}));
