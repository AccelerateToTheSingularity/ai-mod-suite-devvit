import { redis } from '@devvit/web/server';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  eventType: 'post-submit' | 'comment-submit' | 'ai-moderation';
  targetId: string;
  author: string;
  textSnippet: string;
  actionTaken: string;
  safeMode: boolean;
  success: boolean;
  message?: string;
}

export async function logAuditEvent(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
  try {
    const fullEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };
    const key = `audit_logs`;
    const score = Date.now();
    const value = JSON.stringify(fullEntry);
    
    await redis.zAdd(key, { member: value, score });
    
    const card = await redis.zCard(key);
    if (card > 100) {
      await redis.zRemRangeByRank(key, 0, card - 101);
    }
    
    console.log(`[ai-mod-suite] Audit log stored: ${value}`);
  } catch (err) {
    console.error('[ai-mod-suite] Failed to store audit log:', err);
  }
}
