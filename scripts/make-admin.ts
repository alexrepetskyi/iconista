/**
 * Grants the admin role to an existing account:
 *
 *   npx tsx scripts/make-admin.ts wife@example.com
 */
import mongoose from 'mongoose';

async function main() {
  const email = process.argv[2]?.toLowerCase();
  const uri = process.env.MONGODB_URI;
  if (!email || !uri) {
    console.error('Usage: MONGODB_URI=... npx tsx scripts/make-admin.ts <email>');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const result = await mongoose.connection
    .collection('users')
    .updateOne({ email }, { $set: { role: 'admin' } });
  if (result.matchedCount === 0) {
    console.error(`No account with email ${email} — register on the site first.`);
    process.exit(1);
  }
  console.log(`${email} is now an admin.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
