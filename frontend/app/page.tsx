"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"



import {
  Loader2,
  MapPin,
  Calendar,
  Settings,
  BarChart3,
  CloudRain,
  TrendingUp,
  Download,
  Sparkles,
  Brain,
  FileText,
  Satellite,
  Zap,
} from "lucide-react"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Area, AreaChart } from "recharts"
import { motion, AnimatePresence } from "framer-motion"
import { Switch } from "../components/ui/switch"
import { Progress } from "../components/ui/progress"
import { Badge } from "../components/ui/badge"

// Replace the dynamic import with a simple conditional render
const MapComponent = dynamic(() => import("../components/map-component"), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
        <p className="text-sm text-gray-500">Loading map...</p>
      </div>
    </div>
  ),
})

interface AnalysisRequest {
  latitude: number
  longitude: number
  buffer_size: number
  start_date: string
  end_date: string
  clustering_method: string
  num_zones: number
  crop_type: string
  crop_growth_stage: string
  eps_value: number
  min_samples: number
  bandwidth: number
  groq_api_key?: string
  use_ai_insights: boolean
}

interface NDVITimeSeriesResponse {
  dates: string[]
  ndvi_values: number[]
  mean_ndvi: number
  trend: string
}

interface RainfallResponse {
  dates: string[]
  rainfall_values: number[]
  total_rainfall: number
  avg_daily_rainfall: number
  max_daily_rainfall: number
}

interface AIInsights {
  report: string
  suggestions: string[]
  risk_assessment: string
  management_plan: string
}

interface AnalysisResponse {
  ndvi_stats: {
    mean: number
    stddev: number
    min: number
    max: number
  }
  zones_identified: number
  processing_time: number
  recommendations: string[]
  ndvi_time_series: NDVITimeSeriesResponse
  rainfall_data?: RainfallResponse
  ai_insights?: AIInsights
}

export default function NDVIAnalysis() {
  const [formData, setFormData] = useState<AnalysisRequest>({
    latitude: 30.9,
    longitude: 75.8,
    buffer_size: 250,
    start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    clustering_method: "K-Means",
    num_zones: 3,
    crop_type: "Wheat",
    crop_growth_stage: "Vegetative",
    eps_value: 0.05,
    min_samples: 10,
    bandwidth: 0.1,
    groq_api_key: "",
    use_ai_insights: false,
  })

  const [results, setResults] = useState<AnalysisResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState("")

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    setProgress(0)
    setCurrentStep("Initializing analysis...")

    try {
      // Simulate progress updates
      const steps = [
        "Fetching satellite imagery...",
        "Processing NDVI data...",
        "Performing clustering analysis...",
        "Analyzing rainfall patterns...",
        "Generating insights...",
      ]

      if (formData.use_ai_insights) {
        steps.push("Generating AI-powered report...")
      }

      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(steps[i])
        setProgress((i + 1) * (100 / steps.length))
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      const response = await fetch("/api/analyze-field", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Analysis failed")
      }

      const data = await response.json()
      setResults(data)
      setCurrentStep("Analysis complete!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
      setProgress(100)
    }
  }

  const formatNDVIData = (dates: string[], values: number[]) => {
    return dates.map((date, index) => ({
      date: new Date(date).toLocaleDateString(),
      ndvi: values[index],
    }))
  }

  const formatRainfallData = (dates: string[], values: number[]) => {
    return dates.map((date, index) => ({
      date: new Date(date).toLocaleDateString(),
      rainfall: values[index],
    }))
  }

  const downloadReport = () => {
    if (!results) return

    const reportContent = `
NDVI Field Analysis Report
=========================
Generated: ${new Date().toLocaleString()}

Field Location: ${formData.latitude}, ${formData.longitude}
Analysis Period: ${formData.start_date} to ${formData.end_date}
Crop Type: ${formData.crop_type}

NDVI Statistics:
- Mean: ${results.ndvi_stats.mean.toFixed(3)}
- Standard Deviation: ${results.ndvi_stats.stddev.toFixed(3)}
- Minimum: ${results.ndvi_stats.min.toFixed(3)}
- Maximum: ${results.ndvi_stats.max.toFixed(3)}

Management Zones: ${results.zones_identified}
Processing Time: ${results.processing_time.toFixed(1)}s

Recommendations:
${results.recommendations.map((rec) => `- ${rec}`).join("\n")}

${
  results.ai_insights
    ? `
AI-Generated Report:
${results.ai_insights.report}

Risk Assessment:
${results.ai_insights.risk_assessment}

Management Plan:
${results.ai_insights.management_plan}
`
    : ""
}
    `

    const blob = new Blob([reportContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ndvi-analysis-${new Date().toISOString().split("T")[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-green-600 to-blue-600 text-white">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Satellite className="w-12 h-12" />
              <h1 className="text-5xl font-bold">NDVI Field Segmentation</h1>
            </div>
            <p className="text-xl opacity-90 max-w-3xl mx-auto">
              Advanced agricultural field analysis using satellite imagery, machine learning, and AI-powered insights
            </p>
            <div className="flex items-center justify-center gap-6 mt-8">
              <Badge variant="secondary" className="px-4 py-2">
                <Zap className="w-4 h-4 mr-2" />
                Real-time Analysis
              </Badge>
              <Badge variant="secondary" className="px-4 py-2">
                <Brain className="w-4 h-4 mr-2" />
                AI-Powered Insights
              </Badge>
              <Badge variant="secondary" className="px-4 py-2">
                <BarChart3 className="w-4 h-4 mr-2" />
                Multi-Algorithm Clustering
              </Badge>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Analysis Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8"
        >
          {/* Location Input */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-green-700">
                <MapPin className="w-5 h-5" />
                Field Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="latitude" className="text-sm font-medium">
                  Latitude
                </Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: Number.parseFloat(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="longitude" className="text-sm font-medium">
                  Longitude
                </Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: Number.parseFloat(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Field Radius: {formData.buffer_size}m</Label>
                <Slider
                  value={[formData.buffer_size]}
                  onValueChange={(value) => setFormData({ ...formData, buffer_size: value[0] })}
                  max={1000}
                  min={100}
                  step={50}
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Analysis Parameters */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Settings className="w-5 h-5" />
                Analysis Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="start_date" className="text-sm font-medium">
                  Start Date
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="end_date" className="text-sm font-medium">
                  End Date
                </Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Clustering Method</Label>
                <Select
                  value={formData.clustering_method}
                  onValueChange={(value) => setFormData({ ...formData, clustering_method: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="K-Means">K-Means</SelectItem>
                    <SelectItem value="DBSCAN">DBSCAN</SelectItem>
                    <SelectItem value="Mean Shift">Mean Shift</SelectItem>
                    <SelectItem value="GMM">GMM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(formData.clustering_method === "K-Means" || formData.clustering_method === "GMM") && (
                <div>
                  <Label className="text-sm font-medium">Number of Zones: {formData.num_zones}</Label>
                  <Slider
                    value={[formData.num_zones]}
                    onValueChange={(value) => setFormData({ ...formData, num_zones: value[0] })}
                    max={7}
                    min={2}
                    step={1}
                    className="mt-2"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Crop Information */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-purple-700">
                <Calendar className="w-5 h-5" />
                Crop Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Crop Type</Label>
                <Select
                  value={formData.crop_type}
                  onValueChange={(value) => setFormData({ ...formData, crop_type: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Wheat">Wheat</SelectItem>
                    <SelectItem value="Corn/Maize">Corn/Maize</SelectItem>
                    <SelectItem value="Rice">Rice</SelectItem>
                    <SelectItem value="Soybeans">Soybeans</SelectItem>
                    <SelectItem value="Cotton">Cotton</SelectItem>
                    <SelectItem value="Sugarcane">Sugarcane</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Growth Stage</Label>
                <Select
                  value={formData.crop_growth_stage}
                  onValueChange={(value) => setFormData({ ...formData, crop_growth_stage: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Early/Emergence">Early/Emergence</SelectItem>
                    <SelectItem value="Vegetative">Vegetative</SelectItem>
                    <SelectItem value="Reproductive/Flowering">Reproductive/Flowering</SelectItem>
                    <SelectItem value="Maturity">Maturity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* AI Configuration */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <Sparkles className="w-5 h-5" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="ai-insights"
                  checked={formData.use_ai_insights}
                  onCheckedChange={(checked) => setFormData({ ...formData, use_ai_insights: checked })}
                />
                <Label htmlFor="ai-insights" className="text-sm font-medium">
                  Enable AI Insights
                </Label>
              </div>
              {formData.use_ai_insights && (
                <div>
                  <Label htmlFor="groq_api_key" className="text-sm font-medium">
                    Groq API Key
                  </Label>
                  <Input
                    id="groq_api_key"
                    type="password"
                    placeholder="Enter your Groq API key"
                    value={formData.groq_api_key}
                    onChange={(e) => setFormData({ ...formData, groq_api_key: e.target.value })}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Get your API key from{" "}
                    <a
                      href="https://console.groq.com"
                      target="_blank"
                      className="text-blue-600 hover:underline"
                      rel="noreferrer"
                    >
                      Groq Console
                    </a>
                  </p>
                </div>
              )}
              <Button
                onClick={handleAnalyze}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                disabled={loading}
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Satellite className="w-4 h-4 mr-2" />
                    Analyze Field
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Loading Progress */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8"
            >
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{currentStep}</span>
                      <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Display */}
        {error && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-6">
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Results */}
        <AnimatePresence>
          {results && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                <CardHeader className="border-b bg-gradient-to-r from-green-50 to-blue-50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl">Analysis Results</CardTitle>
                    <Button onClick={downloadReport} variant="outline" className="gap-2">
                      <Download className="w-4 h-4" />
                      Download Report
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-6 mb-6">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="map">Field Map</TabsTrigger>
                      <TabsTrigger value="ndvi">NDVI Analysis</TabsTrigger>
                      <TabsTrigger value="rainfall">Rainfall</TabsTrigger>
                      <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                      {results.ai_insights && <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>}
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                          <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-green-700 font-medium">Mean NDVI</p>
                                  <p className="text-2xl font-bold text-green-800">
                                    {results.ndvi_stats.mean.toFixed(3)}
                                  </p>
                                </div>
                                <TrendingUp className="w-8 h-8 text-green-600" />
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>

                        <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                          <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-blue-700 font-medium">Zones Identified</p>
                                  <p className="text-2xl font-bold text-blue-800">{results.zones_identified}</p>
                                </div>
                                <BarChart3 className="w-8 h-8 text-blue-600" />
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>

                        <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                          <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-purple-700 font-medium">Processing Time</p>
                                  <p className="text-2xl font-bold text-purple-800">
                                    {results.processing_time.toFixed(1)}s
                                  </p>
                                </div>
                                <Settings className="w-8 h-8 text-purple-600" />
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>

                        {results.rainfall_data && (
                          <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                            <Card className="border-0 shadow-md bg-gradient-to-br from-cyan-50 to-cyan-100">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm text-cyan-700 font-medium">Total Rainfall</p>
                                    <p className="text-2xl font-bold text-cyan-800">
                                      {results.rainfall_data.total_rainfall.toFixed(1)}mm
                                    </p>
                                  </div>
                                  <CloudRain className="w-8 h-8 text-cyan-600" />
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-0 shadow-md">
                          <CardHeader>
                            <CardTitle>NDVI Statistics</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {[
                                { label: "Mean", value: results.ndvi_stats.mean, color: "text-green-600" },
                                { label: "Std Dev", value: results.ndvi_stats.stddev, color: "text-blue-600" },
                                { label: "Minimum", value: results.ndvi_stats.min, color: "text-red-600" },
                                { label: "Maximum", value: results.ndvi_stats.max, color: "text-purple-600" },
                              ].map((stat, index) => (
                                <motion.div
                                  key={stat.label}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                  className="flex justify-between items-center p-2 rounded-lg bg-gray-50"
                                >
                                  <span className="font-medium">{stat.label}:</span>
                                  <span className={`font-mono font-bold ${stat.color}`}>{stat.value.toFixed(3)}</span>
                                </motion.div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-0 shadow-md">
                          <CardHeader>
                            <CardTitle>Field Zones</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {Array.from({ length: results.zones_identified }, (_, i) => (
                                <motion.div
                                  key={i}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: i * 0.1 }}
                                  className="flex items-center gap-3 p-2 rounded-lg bg-gray-50"
                                >
                                  <div
                                    className="w-4 h-4 rounded-full shadow-sm"
                                    style={{
                                      backgroundColor: `hsl(${(i * 360) / results.zones_identified}, 70%, 50%)`,
                                    }}
                                  />
                                  <span className="font-medium">
                                    Zone {i + 1}:{" "}
                                    {i === 0
                                      ? "Low vigor"
                                      : i === results.zones_identified - 1
                                        ? "High vigor"
                                        : "Moderate vigor"}
                                  </span>
                                </motion.div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="map" className="space-y-6">
                      <Card className="border-0 shadow-md">
                        <CardHeader>
                          <CardTitle>Interactive Field Map</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <MapComponent
                            latitude={formData.latitude}
                            longitude={formData.longitude}
                            bufferSize={formData.buffer_size}
                            zones={results.zones_identified}
                          />
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="ndvi" className="space-y-6">
                      <Card className="border-0 shadow-md">
                        <CardHeader>
                          <CardTitle>NDVI Time Series Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-80 mb-4">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart
                                data={formatNDVIData(
                                  results.ndvi_time_series.dates,
                                  results.ndvi_time_series.ndvi_values,
                                )}
                              >
                                <defs>
                                  <linearGradient id="ndviGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="date" stroke="#6b7280" />
                                <YAxis domain={[0, 1]} stroke="#6b7280" />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: "white",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "8px",
                                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                  }}
                                />
                                <Area
                                  type="monotone"
                                  dataKey="ndvi"
                                  stroke="#22c55e"
                                  strokeWidth={3}
                                  fill="url(#ndviGradient)"
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                            <p className="text-sm font-medium">
                              <strong>Trend Analysis:</strong> The NDVI trend is{" "}
                              <span className="text-green-600 font-bold">{results.ndvi_time_series.trend}</span> over
                              the analysis period.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="rainfall" className="space-y-6">
                      {results.rainfall_data ? (
                        <Card className="border-0 shadow-md">
                          <CardHeader>
                            <CardTitle>Rainfall Analysis</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="h-80 mb-6">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={formatRainfallData(
                                    results.rainfall_data.dates,
                                    results.rainfall_data.rainfall_values,
                                  )}
                                >
                                  <defs>
                                    <linearGradient id="rainfallGradient" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                  <XAxis dataKey="date" stroke="#6b7280" />
                                  <YAxis stroke="#6b7280" />
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: "white",
                                      border: "1px solid #e5e7eb",
                                      borderRadius: "8px",
                                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                    }}
                                  />
                                  <Bar dataKey="rainfall" fill="url(#rainfallGradient)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              {[
                                {
                                  label: "Total Rainfall",
                                  value: `${results.rainfall_data.total_rainfall.toFixed(1)} mm`,
                                  color: "from-blue-500 to-blue-600",
                                },
                                {
                                  label: "Average Daily",
                                  value: `${results.rainfall_data.avg_daily_rainfall.toFixed(2)} mm`,
                                  color: "from-cyan-500 to-cyan-600",
                                },
                                {
                                  label: "Maximum Daily",
                                  value: `${results.rainfall_data.max_daily_rainfall.toFixed(1)} mm`,
                                  color: "from-indigo-500 to-indigo-600",
                                },
                              ].map((stat, index) => (
                                <motion.div
                                  key={stat.label}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                  className={`text-center p-4 rounded-lg bg-gradient-to-r ${stat.color} text-white shadow-md`}
                                >
                                  <p className="text-sm opacity-90">{stat.label}</p>
                                  <p className="text-xl font-bold">{stat.value}</p>
                                </motion.div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <Card className="border-0 shadow-md">
                          <CardContent className="p-8 text-center">
                            <CloudRain className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-500">No rainfall data available for the selected period.</p>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    <TabsContent value="recommendations" className="space-y-6">
                      <Card className="border-0 shadow-md">
                        <CardHeader>
                          <CardTitle>Management Recommendations</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {results.recommendations.map((recommendation, index) => (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100"
                              >
                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                                  {index + 1}
                                </div>
                                <p className="text-sm leading-relaxed">{recommendation}</p>
                              </motion.div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {results.ai_insights && (
                      <TabsContent value="ai-insights" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <Card className="border-0 shadow-md">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                AI-Generated Report
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="prose prose-sm max-w-none">
                                <div className="whitespace-pre-wrap text-sm leading-relaxed bg-gray-50 p-4 rounded-lg">
                                  {results.ai_insights.report}
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card className="border-0 shadow-md">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <Brain className="w-5 h-5" />
                                AI Suggestions
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {results.ai_insights.suggestions.map((suggestion, index) => (
                                  <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-100"
                                  >
                                    <p className="text-sm">{suggestion}</p>
                                  </motion.div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>

                          <Card className="border-0 shadow-md lg:col-span-2">
                            <CardHeader>
                              <CardTitle>Risk Assessment & Management Plan</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <h4 className="font-semibold text-red-700 mb-2">Risk Assessment</h4>
                                  <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                                    <p className="text-sm whitespace-pre-wrap">{results.ai_insights.risk_assessment}</p>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-green-700 mb-2">Management Plan</h4>
                                  <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                    <p className="text-sm whitespace-pre-wrap">{results.ai_insights.management_plan}</p>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>
                    )}
                  </Tabs>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
