import { mutation, query } from "convex/server";
import { v } from "convex/values";

export const createPost = mutation({
  args: {
    content: v.string(),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Unauthorized");

    await ctx.db.insert("posts", {
      authorId: user.subject,
      content: args.content,
      image: args.image,
      createdAt: Date.now(),
    });
  },
});

export const getPosts = query(async (ctx) => {
  return await ctx.db.query("posts").order("desc").collect();
});
