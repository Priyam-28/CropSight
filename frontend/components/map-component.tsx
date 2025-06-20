"use client"

import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix for default markers in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
})

interface MapComponentProps {
  latitude: number
  longitude: number
  bufferSize: number
  zones: number
}

export default function MapComponent({ latitude, longitude, bufferSize, zones }: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current) return

    // Initialize map
    const map = L.map(mapRef.current).setView([latitude, longitude], 16)

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    // Add satellite imagery layer
    const satelliteLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
      },
    )

    // Layer control
    const baseMaps = {
      OpenStreetMap: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"),
      Satellite: satelliteLayer,
    }

    L.control.layers(baseMaps).addTo(map)

    // Add field center marker
    const centerMarker = L.marker([latitude, longitude])
      .addTo(map)
      .bindPopup(`<b>Field Center</b><br>Lat: ${latitude.toFixed(6)}<br>Lng: ${longitude.toFixed(6)}`)

    // Add field boundary circle
    const fieldBoundary = L.circle([latitude, longitude], {
      color: "#22c55e",
      fillColor: "#22c55e",
      fillOpacity: 0.1,
      radius: bufferSize,
      weight: 2,
    }).addTo(map)

    // Add zone visualization (mock zones for demonstration)
    const zoneColors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"]

    for (let i = 0; i < zones; i++) {
      const angle = (i * 360) / zones
      const zoneRadius = bufferSize / zones
      const zoneCenter = [
        latitude + (Math.cos((angle * Math.PI) / 180) * zoneRadius) / 111320,
        longitude + (Math.sin((angle * Math.PI) / 180) * zoneRadius) / (111320 * Math.cos((latitude * Math.PI) / 180)),
      ] as [number, number]

      L.circle(zoneCenter, {
        color: zoneColors[i % zoneColors.length],
        fillColor: zoneColors[i % zoneColors.length],
        fillOpacity: 0.3,
        radius: zoneRadius * 0.8,
        weight: 2,
      })
        .addTo(map)
        .bindPopup(`<b>Zone ${i + 1}</b><br>Management Zone`)
    }

    // Add NDVI legend
    const legend = new L.Control({ position: "bottomright" })
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "info legend")
      div.style.backgroundColor = "white"
      div.style.padding = "10px"
      div.style.borderRadius = "5px"
      div.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)"

      const grades = [0, 0.2, 0.4, 0.6, 0.8]
      const colors = ["#d73027", "#f46d43", "#fee08b", "#a6d96a", "#1a9850"]

      div.innerHTML = "<h4>NDVI Values</h4>"

      for (let i = 0; i < grades.length; i++) {
        div.innerHTML +=
          '<i style="background:' +
          colors[i] +
          '; width: 18px; height: 18px; display: inline-block; margin-right: 8px;"></i> ' +
          grades[i] +
          (grades[i + 1] ? "&ndash;" + grades[i + 1] + "<br>" : "+")
      }

      return div
    }
    legend.addTo(map)

    mapInstanceRef.current = map

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [latitude, longitude, bufferSize, zones])

  return <div ref={mapRef} className="h-96 w-full rounded-lg shadow-md" />
}
