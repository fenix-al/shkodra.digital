export const REPORT_REVIEW_STATUS = 'në_shqyrtim'
export const REPORT_FOLLOW_UP_COOLDOWN_HOURS = 5

export const REPORT_PRIORITY_META = {
  overdue: {
    level: 'overdue',
    label: 'Prapambetur',
    score: 999,
    mapColor: '#f97316',
    badgeClass: 'border-orange-500/30 bg-orange-500/15 text-orange-200',
    pulseClass: 'leaflet-report-overdue',
  },
  urgent: {
    level: 'urgent',
    label: 'Urgjent',
    score: 5,
    mapColor: '#fb7185',
    badgeClass: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
    pulseClass: '',
  },
  medium: {
    level: 'medium',
    label: 'Mesatar',
    score: 3,
    mapColor: '#f59e0b',
    badgeClass: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    pulseClass: '',
  },
  normal: {
    level: 'normal',
    label: 'Normal',
    score: 1,
    mapColor: '#38bdf8',
    badgeClass: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
    pulseClass: '',
  },
  closed: {
    level: 'closed',
    label: 'Mbyllur',
    score: 0,
    mapColor: '#94a3b8',
    badgeClass: 'border-slate-500/20 bg-slate-500/10 text-slate-300',
    pulseClass: '',
  },
}

function toTimestamp(value) {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

export function isClosedReport(report) {
  return report.status === 'zgjidhur' || report.status === 'refuzuar'
}

export function isOverdueReport(report) {
  return !isClosedReport(report) && Number(report.follow_up_count ?? 0) > 0
}

export function getReportFollowUpState(report, now = Date.now()) {
  const baseTimestamp = Math.max(
    toTimestamp(report.last_follow_up_at) ?? 0,
    toTimestamp(report.created_at) ?? 0,
  )

  if (!baseTimestamp || isClosedReport(report)) {
    return {
      canFollowUp: false,
      cooldownHours: REPORT_FOLLOW_UP_COOLDOWN_HOURS,
      nextEligibleAt: null,
      remainingMs: 0,
    }
  }

  const cooldownMs = REPORT_FOLLOW_UP_COOLDOWN_HOURS * 60 * 60 * 1000
  const nextEligibleAt = baseTimestamp + cooldownMs
  const remainingMs = Math.max(0, nextEligibleAt - now)

  return {
    canFollowUp: remainingMs === 0,
    cooldownHours: REPORT_FOLLOW_UP_COOLDOWN_HOURS,
    nextEligibleAt,
    remainingMs,
  }
}

export function getReportPriority(report, now = Date.now()) {
  if (isClosedReport(report)) return REPORT_PRIORITY_META.closed
  if (isOverdueReport(report)) return REPORT_PRIORITY_META.overdue

  const createdAt = toTimestamp(report.created_at)
  const ageHours = createdAt ? Math.max(0, (now - createdAt) / (1000 * 60 * 60)) : 0

  let score = 1
  if (report.category === 'akses') score += 2
  if (report.category === 'ndricim') score += 1
  if (report.photo_url) score += 1
  if (report.latitude !== null && report.longitude !== null) score += 1
  if (ageHours >= 72) score += 2
  else if (ageHours >= 24) score += 1
  if (report.status === REPORT_REVIEW_STATUS) score += 1

  if (score >= 5) return REPORT_PRIORITY_META.urgent
  if (score >= 3) return REPORT_PRIORITY_META.medium
  return REPORT_PRIORITY_META.normal
}
