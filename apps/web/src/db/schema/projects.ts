import { relations } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const projectRole = pgEnum("project_role", ["owner", "editor", "viewer"]);

export const project = pgTable("project", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  // BCP 47 tag of the source language, e.g. "en" or "en-US".
  baseLocale: text("base_locale").notNull(),
  createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
  ...timestamps,
});

// Slugs a project used before being renamed. They keep resolving to the
// project (API and UI), so renaming never breaks deployed SDK clients, and
// they stay reserved so no other project can take them over.
export const projectSlugAlias = pgTable(
  "project_slug_alias",
  {
    slug: text("slug").primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("project_slug_alias_project_id_idx").on(t.projectId)],
);

export const projectMember = pgTable(
  "project_member",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: projectRole("role").notNull().default("editor"),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.userId] }),
    index("project_member_user_id_idx").on(t.userId),
  ],
);

export const projectLocale = pgTable(
  "project_locale",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [primaryKey({ columns: [t.projectId, t.code] })],
);

// A translatable string identifier, e.g. "checkout.button.pay".
export const translationKey = pgTable(
  "translation_key",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    description: text("description"),
    ...timestamps,
  },
  (t) => [uniqueIndex("translation_key_project_key_idx").on(t.projectId, t.key)],
);

export const translation = pgTable(
  "translation",
  {
    keyId: uuid("key_id")
      .notNull()
      .references(() => translationKey.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    value: text("value").notNull(),
    updatedById: text("updated_by_id").references(() => user.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.keyId, t.locale] })],
);

// Project-scoped, read-only keys used by the SDK to fetch translations.
// Only a SHA-256 hash of the secret is stored; `prefix` is shown in the UI.
export const projectApiKey = pgTable(
  "project_api_key",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    prefix: text("prefix").notNull(),
    hash: text("hash").notNull().unique(),
    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("project_api_key_project_id_idx").on(t.projectId)],
);

export const projectRelations = relations(project, ({ many }) => ({
  members: many(projectMember),
  locales: many(projectLocale),
  keys: many(translationKey),
  apiKeys: many(projectApiKey),
}));

export const projectMemberRelations = relations(projectMember, ({ one }) => ({
  project: one(project, { fields: [projectMember.projectId], references: [project.id] }),
  user: one(user, { fields: [projectMember.userId], references: [user.id] }),
}));

export const projectLocaleRelations = relations(projectLocale, ({ one }) => ({
  project: one(project, { fields: [projectLocale.projectId], references: [project.id] }),
}));

export const translationKeyRelations = relations(translationKey, ({ one, many }) => ({
  project: one(project, { fields: [translationKey.projectId], references: [project.id] }),
  translations: many(translation),
}));

export const translationRelations = relations(translation, ({ one }) => ({
  key: one(translationKey, { fields: [translation.keyId], references: [translationKey.id] }),
}));

export const projectApiKeyRelations = relations(projectApiKey, ({ one }) => ({
  project: one(project, { fields: [projectApiKey.projectId], references: [project.id] }),
}));
