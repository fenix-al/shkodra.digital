'use client'

import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet.heat'
import {
  CircleMarker,
  MapContainer,
  Popup,
  ScaleControl,
  TileLayer,
  useMap,
  ZoomControl,
} from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { cx } from '@/lib/cx'

type ReportStatus = 'hapur' | 'në_shqyrtim' | 'zgjidhur' | 'refuzuar'
type MapMode = 'cluster' | 'hybrid' | 'heatmap'

export interface GeoReport {
  id: string
  category: string
  description: string
  status: ReportStatus
  photo_url: string | null
  latitude: number
  longitude: number
  created_at: string
  reporter_name: string | null
}

interface Props {
  reports: GeoReport[]
  selectedId: string | null
  focusNonce: number | string
  mapMode: MapMode
  className?: string
  onSelect: (id: string) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  ndricim: 'Ndricim',
  kanalizim: 'Kanalizim',
  rruge: 'Rruge',
  mbeturina: 'Mbeturina',
  akses: 'Akses',
  tjeter: 'Tjeter',
}

const STATUS_LABELS: Record<ReportStatus, string> = {
  hapur: 'Hapur',
  në_shqyrtim: 'Ne shqyrtim',
  zgjidhur: 'Zgjidhur',
  refuzuar: 'Refuzuar',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const min = String(d.getUTCMinutes()).padStart(2, '0')
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`
}

function getPriority(report: GeoReport) {
  if (report.status === 'zgjidhur' || report.status === 'refuzuar') {
    return { label: 'Mbyllur', color: '#94a3b8' }
  }

  const ageHours = Math.max(0, (Date.now() - new Date(report.created_at).getTime()) / (1000 * 60 * 60))
  let score = 1
  if (report.category === 'akses') score += 2
  if (report.category === 'ndricim') score += 1
  if (report.photo_url) score += 1
  if (ageHours >= 72) score += 2
  else if (ageHours >= 24) score += 1
  if (report.status === 'në_shqyrtim') score += 1

  if (score >= 5) return { label: 'Urgjent', color: '#fb7185' }
  if (score >= 3) return { label: 'Mesatar', color: '#f59e0b' }
  return { label: 'Normal', color: '#38bdf8' }
}

interface ClusterLike {
  getChildCount: () => number
}

function createClusterCustomIcon(cluster: ClusterLike) {
  const count = cluster.getChildCount()
  let tone = '#38bdf8'
  if (count >= 10) tone = '#fb7185'
  else if (count >= 4) tone = '#f59e0b'

  return L.divIcon({
    html: `<div style="
      width: 42px;
      height: 42px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${tone};
      color: #04111f;
      font-weight: 800;
      border: 3px solid rgba(255,255,255,0.92);
      box-shadow: 0 10px 24px rgba(15,23,42,0.35);
    ">${count}</div>`,
    className: 'reports-cluster-icon',
    iconSize: L.point(42, 42, true),
  })
}

function MapViewport({ reports, selectedId, focusNonce }: { reports: GeoReport[]; selectedId: string | null; focusNonce: number | string }) {
  const map = useMap()

  useEffect(() => {
    if (reports.length === 0) return
    const selected = reports.find((report) => report.id === selectedId)
    if (selected) {
      map.flyTo([selected.latitude, selected.longitude], Math.max(map.getZoom(), 17), { duration: 0.75 })
      return
    }

    const bounds = L.latLngBounds(reports.map((report) => [report.latitude, report.longitude]))
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 16 })
  }, [focusNonce, map, reports, selectedId])

  return null
}

function getHeatIntensity(report: GeoReport) {
  if (report.status === 'zgjidhur' || report.status === 'refuzuar') return 0.2

  let intensity = 0.35
  if (report.category === 'akses') intensity += 0.25
  if (report.category === 'ndricim') intensity += 0.15
  if (report.photo_url) intensity += 0.1
  if (report.status === 'në_shqyrtim') intensity += 0.1
  return Math.min(intensity, 1)
}

function HeatmapLayer({ reports, enabled }: { reports: GeoReport[]; enabled: boolean }) {
  const map = useMap()

  useEffect(() => {
    if (!enabled || reports.length === 0) return
    const layer = L.heatLayer(
      reports.map((report) => [report.latitude, report.longitude, getHeatIntensity(report)] as L.HeatLatLngTuple),
      {
        radius: 28,
        blur: 22,
        minOpacity: 0.28,
        maxZoom: 17,
        gradient: {
          0.2: '#38bdf8',
          0.45: '#22c55e',
          0.7: '#f59e0b',
          1: '#fb7185',
        },
      },
    )

    layer.addTo(map)
    return () => {
      map.removeLayer(layer)
    }
  }, [enabled, map, reports])

  return null
}

export default function ReportsGeoMapCanvas({ reports, selectedId, focusNonce, mapMode, className, onSelect }: Props) {
  const fallbackCenter: [number, number] = reports[0] ? [reports[0].latitude, reports[0].longitude] : [42.0683, 19.5126]
  const selectedReport = useMemo(() => reports.find((report) => report.id === selectedId) ?? null, [reports, selectedId])

  return (
    <MapContainer center={fallbackCenter} zoom={14} zoomControl={false} className={cx('w-full rounded-[28px]', className)} scrollWheelZoom>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ZoomControl position="topright" />
      <ScaleControl position="bottomleft" />
      <MapViewport reports={reports} selectedId={selectedId} focusNonce={focusNonce} />
      <HeatmapLayer reports={reports} enabled={mapMode === 'heatmap' || mapMode === 'hybrid'} />

      {mapMode !== 'heatmap' && (
        <MarkerClusterGroup chunkedLoading maxClusterRadius={42} spiderfyOnMaxZoom showCoverageOnHover={false} iconCreateFunction={createClusterCustomIcon}>
          {reports.map((report) => {
            const selected = report.id === selectedId
            const priority = getPriority(report)
            return (
              <CircleMarker
                key={report.id}
                center={[report.latitude, report.longitude]}
                radius={selected ? 10 : 7}
                pathOptions={{ color: '#ffffff', weight: selected ? 3 : 2, fillColor: priority.color, fillOpacity: 0.95 }}
                eventHandlers={{ click: () => onSelect(report.id) }}
              >
                <Popup>
                  <div className="min-w-[220px] space-y-2">
                    {report.photo_url && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={report.photo_url} alt="Foto e raportit" className="h-28 w-full rounded-xl object-cover" />
                      </>
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <strong>{CATEGORY_LABELS[report.category] ?? report.category}</strong>
                      <span>{priority.label}</span>
                    </div>
                    <p>{report.description}</p>
                    <div>{STATUS_LABELS[report.status]} • {formatDate(report.created_at)}</div>
                    <div>{report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}</div>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MarkerClusterGroup>
      )}

      {mapMode === 'heatmap' && selectedReport && (
        <CircleMarker
          center={[selectedReport.latitude, selectedReport.longitude]}
          radius={11}
          pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#22c55e', fillOpacity: 0.95 }}
          eventHandlers={{ click: () => onSelect(selectedReport.id) }}
        >
          <Popup>
            <div className="min-w-[220px] space-y-2">
              {selectedReport.photo_url && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedReport.photo_url} alt="Foto e raportit" className="h-28 w-full rounded-xl object-cover" />
                </>
              )}
              <div className="flex items-center justify-between gap-3">
                <strong>{CATEGORY_LABELS[selectedReport.category] ?? selectedReport.category}</strong>
                <span>{getPriority(selectedReport).label}</span>
              </div>
              <p>{selectedReport.description}</p>
              <div>{STATUS_LABELS[selectedReport.status]} • {formatDate(selectedReport.created_at)}</div>
              <div>{selectedReport.latitude.toFixed(5)}, {selectedReport.longitude.toFixed(5)}</div>
            </div>
          </Popup>
        </CircleMarker>
      )}
    </MapContainer>
  )
}
