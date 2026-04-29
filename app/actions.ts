'use server';

import { revalidatePath } from 'next/cache';

/**
 * handleVoteAction
 * This function processes the BORA PULSE (Upvotes/Downvotes).
 * Because it is a Server Action, it runs on the server and can
 * trigger a fresh data fetch for the entire page.
 */
export async function handleVoteAction(songId: string, type: 'up' | 'down') {
  try {
    // 1. LOG THE ACTION
    // In your terminal, you will see exactly which slot is being boosted
    console.log(`BORA PULSE INCOMING: [${type.toUpperCase()}] for Slot ${songId}`);

    // 2. FUTURE DATABASE LOGIC
    // This is where you will eventually add the Supabase call to 
    // increment the 'votes' or 'momentum_score' in your registry table.
    // Example: 
    // await supabase.from('registry').rpc('increment_vote', { slot: songId });

    // 3. REVALIDATE THE CACHE
    // This is the "magic" line. It tells Next.js to throw away the cached
    // version of the home page and fetch the fresh registry data from Supabase.
    revalidatePath('/');

    return { success: true };
  } catch (error) {
    console.error("Pulse Error:", error);
    return { success: false, error: "Failed to register pulse" };
  }
}