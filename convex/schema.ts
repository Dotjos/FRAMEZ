import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  posts: defineTable({
    authorId: v.id("users"),
    authorName: v.string(),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_author", ["authorId"])
    .index("by_created_at", ["createdAt"]),
});
