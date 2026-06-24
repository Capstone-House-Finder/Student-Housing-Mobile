import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'offline_mutation_queue';

export type QueuedMutation =
  | { type: 'review'; listingId: number; rating: number; comment?: string }
  | { type: 'contact'; listingId: number }
  | { type: 'report'; targetId: number; targetType: string; reason: string }
  | { type: 'listing_create'; payload: Record<string, unknown> };

async function readQueue(): Promise<QueuedMutation[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueuedMutation[];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedMutation[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueueMutation(mutation: QueuedMutation) {
  const queue = await readQueue();
  queue.push(mutation);
  await writeQueue(queue);
}

export async function processMutationQueue(
  accessToken: string,
  handlers: {
    review: (listingId: number, data: { rating: number; comment?: string }) => Promise<boolean>;
    contact: (listingId: number) => Promise<boolean>;
    report: (data: { target_id: number; target_type: string; reason: string }) => Promise<boolean>;
    listingCreate: (payload: Record<string, unknown>) => Promise<boolean>;
  }
): Promise<number> {
  const queue = await readQueue();
  if (!queue.length) return 0;

  const remaining: QueuedMutation[] = [];
  let processed = 0;

  for (const item of queue) {
    let ok = false;
    if (item.type === 'review') {
      ok = await handlers.review(item.listingId, { rating: item.rating, comment: item.comment });
    } else if (item.type === 'contact') {
      ok = await handlers.contact(item.listingId);
    } else if (item.type === 'report') {
      ok = await handlers.report({ target_id: item.targetId, target_type: item.targetType, reason: item.reason });
    } else if (item.type === 'listing_create') {
      ok = await handlers.listingCreate(item.payload);
    }
    if (ok) processed += 1;
    else remaining.push(item);
  }

  await writeQueue(remaining);
  return processed;
}
