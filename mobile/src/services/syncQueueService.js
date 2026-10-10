import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiRequest } from './apiClient';

const QUEUE_STORAGE_KEY = '@redapple_offline_mutation_queue';

class SyncQueueService {
  constructor() {
    this.isSyncing = false;
    this.unsubscribeNetInfo = null;
    this.listeners = new Set();
  }

  /**
   * Initializes network listener to trigger automatic flush when internet reconnects.
   */
  init() {
    if (this.unsubscribeNetInfo) return;

    this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        this.processQueue().catch((err) =>
          console.warn('[SyncQueue] Background auto-sync error:', err)
        );
      }
    });

    // Also run initial attempt on app launch
    this.processQueue().catch(() => {});
  }

  destroy() {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners(event) {
    this.listeners.forEach((fn) => {
      try {
        fn(event);
      } catch (e) {}
    });
  }

  /**
   * Enqueues an offline mutation to be replayed when online.
   * @param {'CYCLE_LOG' | 'PREGNANCY_KICK' | 'CONTRACTION_LOG' | 'PROFILE_UPDATE'} type
   * @param {object} payload
   */
  async enqueue(type, payload) {
    try {
      const queue = await this.getQueue();
      const item = {
        id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type,
        payload,
        createdAt: new Date().toISOString(),
        attempts: 0,
      };

      queue.push(item);
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
      this.notifyListeners({ action: 'enqueued', item, count: queue.length });

      // If online right now, immediately attempt to process
      const net = await NetInfo.fetch();
      if (net.isConnected) {
        this.processQueue().catch(() => {});
      }

      return item;
    } catch (err) {
      console.warn('[SyncQueue] Enqueue failed:', err);
    }
  }

  /**
   * Retrieves all items currently in the queue.
   */
  async getQueue() {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Processes all queued mutations sequentially.
   */
  async processQueue() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        this.isSyncing = false;
        return;
      }

      const queue = await this.getQueue();
      if (queue.length === 0) {
        this.isSyncing = false;
        return;
      }

      console.log(`[SyncQueue] Processing ${queue.length} pending mutations...`);
      const remaining = [];

      for (const item of queue) {
        try {
          await this.dispatchMutation(item);
          console.log(`[SyncQueue] Replayed mutation ${item.id} (${item.type})`);
        } catch (err) {
          console.warn(`[SyncQueue] Failed to sync ${item.id}:`, err);
          item.attempts = (item.attempts || 0) + 1;
          if (item.attempts < 5) {
            remaining.push(item);
          } else {
            console.error(`[SyncQueue] Dropping mutation ${item.id} after 5 failed attempts.`);
          }
        }
      }

      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remaining));
      this.notifyListeners({ action: 'synced', remainingCount: remaining.length });
    } catch (err) {
      console.warn('[SyncQueue] Process queue error:', err);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Dispatches a single mutation to the backend endpoint.
   */
  async dispatchMutation(item) {
    switch (item.type) {
      case 'CYCLE_LOG':
        return await apiRequest('/cycles/log', {
          method: 'POST',
          body: JSON.stringify(item.payload),
        });

      case 'PREGNANCY_KICK':
        return await apiRequest('/pregnancy/kicks', {
          method: 'POST',
          body: JSON.stringify(item.payload),
        });

      case 'CONTRACTION_LOG':
        return await apiRequest('/pregnancy/contractions', {
          method: 'POST',
          body: JSON.stringify(item.payload),
        });

      case 'PROFILE_UPDATE':
        return await apiRequest('/auth/profile', {
          method: 'PUT',
          body: JSON.stringify(item.payload),
        });

      default:
        console.warn(`[SyncQueue] Unknown mutation type: ${item.type}`);
    }
  }

  /**
   * Returns current count of pending offline changes.
   */
  async getPendingCount() {
    const q = await this.getQueue();
    return q.length;
  }
}

export const syncQueueService = new SyncQueueService();
export default syncQueueService;
