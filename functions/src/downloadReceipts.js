// Download all receipt images from Firebase Storage.
// Usage:
//   node downloadReceipts.js serviceAccount.json bucket [user1,user2]
//
// With no user IDs, it downloads every file under receipts/<uid>/.

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

async function main() {
  const [, , saPath, bucketName, userIdsArg] = process.argv;
  if (!saPath || !bucketName) {
    console.error("Usage: node downloadReceipts.js serviceAccount.json bucket [user1,user2]");
    process.exit(1);
  }
  const userIds = (userIdsArg || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  admin.initializeApp({
    credential: admin.credential.cert(require(path.resolve(saPath))),
    storageBucket: bucketName,
  });
  const bucket = admin.storage().bucket();

  const targets = [];
  if (userIds.length === 0) {
    const [files] = await bucket.getFiles({ prefix: "receipts/" });
    const byUser = new Map();
    for (const f of files) {
      const parts = f.name.split("/").filter(Boolean); // receipts/<uid>/filename
      if (parts.length < 3) continue;
      const uid = parts[1];
      if (!byUser.has(uid)) byUser.set(uid, []);
      byUser.get(uid).push(f);
    }
    byUser.forEach((list, uid) => targets.push({ uid, files: list }));
  } else {
    for (const uid of userIds) {
      const [files] = await bucket.getFiles({ prefix: `receipts/${uid}/` });
      targets.push({ uid, files });
    }
  }

  for (const { uid, files } of targets) {
    if (!files || files.length === 0) {
      console.log(`No files for ${uid}`);
      continue;
    }
    const outDir = path.join(process.cwd(), "downloads", uid);
    fs.mkdirSync(outDir, { recursive: true });
    for (const f of files) {
      const dest = path.join(outDir, path.basename(f.name));
      console.log(`Downloading ${f.name} -> ${dest}`);
      await f.download({ destination: dest });
    }
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
