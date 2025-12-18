import * as SQLite from 'expo-sqlite';
import type { OfflineTicket, OfflineValidationLog, OfflineCampaign } from '@/types/api';

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async () => {
  try {
    db = await SQLite.openDatabaseAsync('validation.db');
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );
    `);
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS tickets (
        ticketId TEXT PRIMARY KEY,
        qrData TEXT NOT NULL UNIQUE,
        maxScans INTEGER NOT NULL,
        scanCount INTEGER NOT NULL,
        status TEXT NOT NULL
      );
    `);
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS validation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticketId TEXT NOT NULL,
        campaignId TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        synced INTEGER DEFAULT 0
      );
    `);
    
    console.log('[Database] Initialized successfully');
  } catch (error) {
    console.error('[Database] Initialization error:', error);
    throw error;
  }
};

export const saveOfflineData = async (
  campaigns: OfflineCampaign[],
  tickets: OfflineTicket[]
) => {
  if (!db) throw new Error('Database not initialized');
  
  await db.execAsync('DELETE FROM campaigns;');
  await db.execAsync('DELETE FROM tickets;');
  
  for (const campaign of campaigns) {
    await db.runAsync(
      'INSERT INTO campaigns (id, name) VALUES (?, ?)',
      [campaign.id, campaign.name]
    );
  }
  
  for (const ticket of tickets) {
    await db.runAsync(
      'INSERT INTO tickets (ticketId, qrData, maxScans, scanCount, status) VALUES (?, ?, ?, ?, ?)',
      [ticket.ticketId, ticket.qrData, ticket.maxScans, ticket.scanCount, ticket.status]
    );
  }
  
  console.log(`[Database] Saved ${campaigns.length} campaigns and ${tickets.length} tickets`);
};

export const findTicketByQR = async (qrData: string): Promise<OfflineTicket | null> => {
  if (!db) throw new Error('Database not initialized');
  
  const result = await db.getFirstAsync<OfflineTicket>(
    'SELECT * FROM tickets WHERE qrData = ?',
    [qrData]
  );
  
  return result || null;
};

export const updateTicketScanCount = async (ticketId: string, newCount: number) => {
  if (!db) throw new Error('Database not initialized');
  
  await db.runAsync(
    'UPDATE tickets SET scanCount = ? WHERE ticketId = ?',
    [newCount, ticketId]
  );
};

export const addValidationLog = async (log: Omit<OfflineValidationLog, 'synced'>) => {
  if (!db) throw new Error('Database not initialized');
  
  await db.runAsync(
    'INSERT INTO validation_logs (ticketId, campaignId, timestamp, synced) VALUES (?, ?, ?, 0)',
    [log.ticketId, log.campaignId, log.timestamp]
  );
  
  console.log('[Database] Added validation log for ticket:', log.ticketId);
};

export const getUnsyncedLogs = async (): Promise<OfflineValidationLog[]> => {
  if (!db) throw new Error('Database not initialized');
  
  const results = await db.getAllAsync<{ ticketId: string; campaignId: string; timestamp: string; synced: number }>(
    'SELECT * FROM validation_logs WHERE synced = 0'
  );
  
  return results.map(r => ({ ticketId: r.ticketId, campaignId: r.campaignId, timestamp: r.timestamp, synced: false }));
};

export const markLogsAsSynced = async () => {
  if (!db) throw new Error('Database not initialized');
  
  await db.runAsync('UPDATE validation_logs SET synced = 1 WHERE synced = 0');
  console.log('[Database] Marked logs as synced');
};

export const clearDatabase = async () => {
  if (!db) throw new Error('Database not initialized');
  
  await db.execAsync('DELETE FROM campaigns;');
  await db.execAsync('DELETE FROM tickets;');
  await db.execAsync('DELETE FROM validation_logs;');
  
  console.log('[Database] Cleared all data');
};

export const getOfflineStats = async () => {
  if (!db) throw new Error('Database not initialized');
  
  const ticketCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM tickets'
  );
  
  const logCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM validation_logs'
  );
  
  const unsyncedCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM validation_logs WHERE synced = 0'
  );
  
  return {
    totalTickets: ticketCount?.count || 0,
    totalScans: logCount?.count || 0,
    unsyncedScans: unsyncedCount?.count || 0,
  };
};
