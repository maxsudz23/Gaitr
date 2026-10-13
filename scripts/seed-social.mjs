#!/usr/bin/env node

/**
 * Seeds LOCAL Supabase with fake reviewers, reviews, likes, comments, and
 * follows so the Feed, profiles, likes, and comments have something to show.
 *
 *   pnpm seed:social           # create (or re-create) the test data
 *   pnpm seed:social --clean   # remove it again
 *
 * Every real (non-seed) account follows three of the four fake reviewers. The
 * fourth (`casual_carla`) is deliberately not followed, so her reviews should
 * appear on shoe pages but never in your Feed.
 *
 * Fake accounts use `@seed.gaitr.local` emails and are deleted on --clean;
 * deleting them cascades to their reviews, likes, comments, and follows.
 * Uses the local service-role key from `supabase status`, so it only ever
 * touches the local stack.
 */
import { execSync } from 'node:child_process';

import { createClient } from '@supabase/supabase-js';

const SEED_DOMAIN = 'seed.gaitr.local';

const REVIEWERS = [
  {
    username: 'trail_tess',
    displayName: 'Tess Romero',
    bio: 'Ultra runner. Mountains > roads.',
    followed: true,
  },
  {
    username: 'tempo_tom',
    displayName: 'Tom Okafor',
    bio: 'Marathoner chasing a sub-3.',
    followed: true,
  },
  {
    username: 'daily_miles',
    displayName: 'Priya Shah',
    bio: '40 easy miles a week, every week.',
    followed: true,
  },
  {
    username: 'casual_carla',
    displayName: 'Carla Nguyen',
    bio: 'Weekend jogger. Not followed by default.',
    followed: false,
  },
];

// [reviewer, shoe slug, overall, title, body, aspects, hours ago]
const REVIEWS = [
  ['trail_tess', 'speedgoat-5', 5, 'Grip for days', 'Took these up muddy switchbacks and never slipped once. Toe box has room for swelling on long days.', { traction: 5, comfort: 4, durability: 4 }, 2],
  ['tempo_tom', 'vaporfly-3', 4.5, 'Race day only', 'Ran a 2-minute PR in these. Wildly bouncy, but the outsole is already wearing after 60 miles.', { cushioning: 5, durability: 2, value: 3 }, 5],
  ['daily_miles', 'fresh-foam-1080-v13', 4, 'Comfy easy-day shoe', 'Soft without feeling mushy. Runs a touch warm in summer.', { comfort: 5, breathability: 3, fit: 4 }, 9],
  ['tempo_tom', 'endorphin-speed-4', 4, 'Great tempo shoe', 'The plate gives a nice snap at threshold pace. A bit narrow through the midfoot.', { fit: 3, cushioning: 4 }, 26],
  ['trail_tess', 'pegasus-41', 3, 'Fine on roads, meh off them', 'Reliable for road miles, but the outsole has no business on gravel.', { traction: 2, durability: 4, value: 4 }, 30],
  ['daily_miles', 'clifton-9', 3.5, 'Good, not magic', 'Cushy and light, though the heel counter rubbed for the first week.', { comfort: 3, cushioning: 4 }, 50],
  ['casual_carla', 'pegasus-41', 4, 'My go-to jogger', 'Comfortable out of the box and looks good enough to wear to brunch.', { style: 5, comfort: 4 }, 3],
];

// [liker, review author, shoe slug]
const LIKES = [
  ['tempo_tom', 'trail_tess', 'speedgoat-5'],
  ['daily_miles', 'trail_tess', 'speedgoat-5'],
  ['trail_tess', 'tempo_tom', 'vaporfly-3'],
  ['casual_carla', 'daily_miles', 'fresh-foam-1080-v13'],
];

// [commenter, review author, shoe slug, body, index of the comment it replies to]
const COMMENTS = [
  ['tempo_tom', 'trail_tess', 'speedgoat-5', 'How are they on wet rock?'],
  ['trail_tess', 'trail_tess', 'speedgoat-5', '@tempo_tom Surprisingly solid! Better than my old Peregrines.', 0],
  ['daily_miles', 'trail_tess', 'speedgoat-5', '@trail_tess Good to know, I slide everywhere in mine.', 0],
  ['daily_miles', 'tempo_tom', 'vaporfly-3', 'Congrats on the PR! What distance?'],
  ['tempo_tom', 'tempo_tom', 'vaporfly-3', '@daily_miles Thanks! Full marathon, 3:04.', 3],
  ['casual_carla', 'trail_tess', 'speedgoat-5', 'Do they run true to size?'],
];

function localKeys() {
  const env = Object.fromEntries(
    execSync('supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\n')
      .map((line) => line.match(/^(\w+)="?([^"]*)"?$/))
      .filter(Boolean)
      .map(([, key, value]) => [key, value]),
  );
  if (!env.API_URL || !env.SECRET_KEY) {
    throw new Error('Could not read local Supabase keys. Is `supabase start` running?');
  }
  if (!/127\.0\.0\.1|localhost/.test(env.API_URL)) {
    throw new Error(`Refusing to seed a non-local Supabase (${env.API_URL}).`);
  }
  return env;
}

const { API_URL, SECRET_KEY } = localKeys();
const admin = createClient(API_URL, SECRET_KEY, { auth: { persistSession: false } });

async function listAllUsers() {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users;
}

async function clean() {
  const seedUsers = (await listAllUsers()).filter((u) => u.email?.endsWith(`@${SEED_DOMAIN}`));
  for (const user of seedUsers) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
  }
  console.log(`Removed ${seedUsers.length} seed reviewers and all their data.`);
}

async function seed() {
  await clean();

  const { data: shoes, error: shoesError } = await admin.from('shoes').select('id, slug');
  if (shoesError) throw shoesError;
  const shoeId = Object.fromEntries(shoes.map((s) => [s.slug, s.id]));

  const userId = {};
  for (const reviewer of REVIEWERS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: `${reviewer.username}@${SEED_DOMAIN}`,
      password: 'seed-password-123',
      email_confirm: true,
    });
    if (error) throw error;
    userId[reviewer.username] = data.user.id;
    const { error: profileError } = await admin
      .from('profiles')
      .update({ username: reviewer.username, display_name: reviewer.displayName, bio: reviewer.bio })
      .eq('id', data.user.id);
    if (profileError) throw profileError;
  }

  const reviewId = {};
  for (const [author, slug, overall, title, body, aspects, hoursAgo] of REVIEWS) {
    if (!shoeId[slug]) throw new Error(`Unknown shoe slug: ${slug}`);
    const createdAt = new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString();
    const { data, error } = await admin
      .from('reviews')
      .insert({
        user_id: userId[author],
        shoe_id: shoeId[slug],
        overall_rating: overall,
        title,
        body,
        created_at: createdAt,
      })
      .select('id')
      .single();
    if (error) throw error;
    reviewId[`${author}/${slug}`] = data.id;
    const ratings = Object.entries(aspects).map(([aspect, score]) => ({
      review_id: data.id,
      aspect,
      score,
    }));
    const { error: ratingsError } = await admin.from('ratings').insert(ratings);
    if (ratingsError) throw ratingsError;
  }

  const { error: likesError } = await admin.from('review_likes').insert(
    LIKES.map(([liker, author, slug]) => ({
      user_id: userId[liker],
      review_id: reviewId[`${author}/${slug}`],
    })),
  );
  if (likesError) throw likesError;

  const commentId = [];
  for (const [index, [commenter, author, slug, body, replyTo]] of COMMENTS.entries()) {
    const { data, error } = await admin
      .from('review_comments')
      .insert({
        user_id: userId[commenter],
        review_id: reviewId[`${author}/${slug}`],
        parent_id: replyTo == null ? null : commentId[replyTo],
        body,
        // Keep the thread in order: one minute apart.
        created_at: new Date(Date.now() - (COMMENTS.length - index) * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();
    if (error) throw error;
    commentId.push(data.id);
  }

  // Seed reviewers follow each other a little, so their profiles show counts.
  const { error: seedFollowsError } = await admin.from('follows').insert([
    { follower_id: userId.tempo_tom, following_id: userId.trail_tess },
    { follower_id: userId.daily_miles, following_id: userId.trail_tess },
  ]);
  if (seedFollowsError) throw seedFollowsError;

  // Every real account follows the reviewers marked `followed`.
  const realUsers = (await listAllUsers()).filter((u) => !u.email?.endsWith(`@${SEED_DOMAIN}`));
  const follows = realUsers.flatMap((user) =>
    REVIEWERS.filter((r) => r.followed).map((r) => ({
      follower_id: user.id,
      following_id: userId[r.username],
    })),
  );
  if (follows.length > 0) {
    const { error } = await admin.from('follows').insert(follows);
    if (error) throw error;
  }

  console.log(
    `Seeded ${REVIEWERS.length} reviewers, ${REVIEWS.length} reviews, ${LIKES.length} likes, ` +
      `${COMMENTS.length} comments (incl. replies). ${realUsers.length} real account(s) now follow ` +
      `${REVIEWERS.filter((r) => r.followed).length} of them.`,
  );
}

const run = process.argv.includes('--clean') ? clean : seed;
run().catch((error) => {
  console.error(error);
  process.exit(1);
});
