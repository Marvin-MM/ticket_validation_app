export interface Manager {
  id: string;
  name: string;
  role: string;
  permissions: string[];
  sellerId: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    manager: Manager;
  };
}

export interface ScanRequest {
  qrData: string;
  location?: string;
}

export interface ScanResponse {
  success: boolean;
  valid: boolean;
  message: string;
  ticket: {
    ticketNumber: string;
    scanCount: number;
    maxScans: number;
    remainingScans: number;
  };
  customer: {
    firstName: string;
    lastName: string;
  };
}

export interface OfflineTicket {
  ticketId: string;
  qrData: string;
  maxScans: number;
  scanCount: number;
  status: string;
}

export interface OfflineCampaign {
  id: string;
  name: string;
}

export interface OfflineDownloadResponse {
  success: boolean;
  data: {
    campaigns: OfflineCampaign[];
    tickets: OfflineTicket[];
  };
}

export interface OfflineValidationLog {
  ticketId: string;
  campaignId: string;
  timestamp: string;
  synced: boolean;
}

export interface OfflineSyncRequest {
  offlineValidations: {
    ticketId: string;
    campaignId: string;
    timestamp: string;
  }[];
}

export interface OfflineSyncResponse {
  success: boolean;
  synced: number;
  conflicts: number;
}

export interface StatsResponse {
  success: boolean;
  data: {
    today: number;
    total: number;
  };
}
