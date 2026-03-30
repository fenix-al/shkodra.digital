// ─── Plate / Authorization ────────────────────────────────────────────────────

export type PlateStatus = 'approved' | 'pending' | 'rejected' | 'suspended'
export type VehicleType = 'car' | 'motorcycle' | 'delivery' | 'business' | null

export interface AuthorizedPlate {
  id: string
  plate_number: string
  owner_name: string
  vehicle_type: VehicleType
  status: PlateStatus
  created_at: string
  /** Injected server-side from scan_logs — latest ENTRY timestamp for this plate */
  last_entry_at: string | null
}

// ─── Zone Stats ───────────────────────────────────────────────────────────────

export interface ZoneStats {
  activeCount: number
  pendingCount: number
  occupancy: number
  capacity: number
  scansToday: number
  zoneName: string
}

// ─── Scan Log ─────────────────────────────────────────────────────────────────

export type ScanAction = 'ENTRY' | 'EXIT'
export type ScanMethod = 'QR' | 'MANUAL'

export interface ScanLog {
  plate_number: string
  action: ScanAction
  scanned_at: string
  scan_method: ScanMethod
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'manager' | 'police' | 'citizen'

export interface UserProfile {
  full_name: string | null
  role: UserRole
}
