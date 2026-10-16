import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Local Supabase test environment is not configured.");
}

const bucket = "comparison-images";
const password = "VisualTrace-local-test-73!";
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function createTestUser(label) {
  const email = `storage-${label}-${runId}@visualtrace.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("Test user was not created.");

  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;

  return { client, user: data.user };
}

const users = [];
let comparisonId;
let imagePath;

try {
  const owner = await createTestUser("owner");
  const other = await createTestUser("other");
  users.push(owner.user.id, other.user.id);

  const comparison = await admin
    .from("comparisons")
    .insert({ user_id: owner.user.id, name: "Storage API integration" })
    .select("id")
    .single();
  if (comparison.error || !comparison.data) {
    throw comparison.error ?? new Error("Test comparison was not created.");
  }
  comparisonId = comparison.data.id;

  imagePath = `${owner.user.id}/${comparisonId}/initial.jpg`;
  const image = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0x00])], {
    type: "image/jpeg",
  });

  const upload = await owner.client.storage.from(bucket).upload(imagePath, image, {
    contentType: "image/jpeg",
    upsert: false,
  });
  assert(!upload.error, `Owner upload failed: ${upload.error?.message}`);

  const download = await owner.client.storage.from(bucket).download(imagePath);
  assert(!download.error && download.data, "Owner download failed.");

  const signed = await owner.client.storage.from(bucket).createSignedUrl(imagePath, 60);
  assert(!signed.error && signed.data?.signedUrl, "Owner signed URL failed.");

  const otherDownload = await other.client.storage.from(bucket).download(imagePath);
  assert(otherDownload.error, "Another user downloaded the owner image.");

  const otherSigned = await other.client.storage.from(bucket).createSignedUrl(imagePath, 60);
  assert(otherSigned.error, "Another user generated a signed URL.");

  const otherUpdate = await other.client.storage.from(bucket).update(imagePath, image, {
    contentType: "image/jpeg",
  });
  assert(otherUpdate.error, "Another user updated the owner image.");

  const otherDelete = await other.client.storage.from(bucket).remove([imagePath]);
  const ownerAfterOtherDelete = await owner.client.storage.from(bucket).download(imagePath);
  assert(
    !ownerAfterOtherDelete.error && ownerAfterOtherDelete.data,
    `Another user deleted the owner image: ${otherDelete.error?.message ?? "unexpected success"}`,
  );

  const invalidUpload = await owner.client.storage
    .from(bucket)
    .upload(`${owner.user.id}/${comparisonId}/archive/final.jpg`, image, {
      contentType: "image/jpeg",
      upsert: false,
    });
  assert(invalidUpload.error, "An invalid nested path was uploaded.");

  const oversized = new Blob([new Uint8Array(6 * 1024 * 1024 + 1)], {
    type: "image/jpeg",
  });
  const oversizedUpload = await owner.client.storage
    .from(bucket)
    .upload(`${owner.user.id}/${comparisonId}/final.jpg`, oversized, {
      contentType: "image/jpeg",
      upsert: false,
    });
  assert(oversizedUpload.error, "An oversized image was uploaded.");

  const ownerUpdate = await owner.client.storage.from(bucket).update(imagePath, image, {
    contentType: "image/jpeg",
  });
  assert(!ownerUpdate.error, `Owner update failed: ${ownerUpdate.error?.message}`);

  const ownerDelete = await owner.client.storage.from(bucket).remove([imagePath]);
  assert(!ownerDelete.error, `Owner delete failed: ${ownerDelete.error?.message}`);

  console.log("Private Storage API integration passed.");
} finally {
  if (imagePath) {
    await admin.storage.from(bucket).remove([imagePath]);
  }
  if (comparisonId) {
    await admin.from("comparisons").delete().eq("id", comparisonId);
  }
  for (const userId of users) {
    await admin.auth.admin.deleteUser(userId);
  }
}
