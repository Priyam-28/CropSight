import { type NextRequest, NextResponse } from "next/server"

async function generateAIInsights(analysisData: any, groqApiKey: string) {
  try {
    const prompt = `
You are an agricultural expert analyzing NDVI field data. Based on the following analysis results, provide detailed insights:

Field Analysis Data:
- Mean NDVI: ${analysisData.ndvi_stats.mean}
- NDVI Range: ${analysisData.ndvi_stats.min} to ${analysisData.ndvi_stats.max}
- Standard Deviation: ${analysisData.ndvi_stats.stddev}
- Number of Management Zones: ${analysisData.zones_identified}
- Crop Type: ${analysisData.crop_type}
- Growth Stage: ${analysisData.crop_growth_stage}
- NDVI Trend: ${analysisData.ndvi_time_series.trend}
${analysisData.rainfall_data ? `- Total Rainfall: ${analysisData.rainfall_data.total_rainfall}mm` : ""}

Please provide:
1. A comprehensive field analysis report (2-3 paragraphs)
2. Specific management suggestions (3-5 actionable items)
3. Risk assessment for potential issues
4. A detailed management plan for the next 30 days

Format your response as JSON with keys: report, suggestions (array), risk_assessment, management_plan
`

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [
          {
            role: "system",
            content:
              "You are an expert agricultural consultant specializing in precision agriculture and remote sensing analysis. Provide detailed, actionable insights based on NDVI and field data.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to generate AI insights")
    }

    const data = await response.json()
    const aiResponse = data.choices[0].message.content

    try {
      return JSON.parse(aiResponse)
    } catch {
      // If JSON parsing fails, return structured response
      return {
        report: aiResponse,
        suggestions: [
          "Monitor field conditions regularly",
          "Consider soil testing in low-performing areas",
          "Implement variable rate application based on zones",
        ],
        risk_assessment: "Based on the analysis, monitor for potential stress indicators.",
        management_plan: "Continue current management practices and monitor field development.",
      }
    }
  } catch (error) {
    console.error("AI insights generation failed:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 2000))

    type MockResponse = {
      ndvi_stats: {
        mean: number
        stddev: number
        min: number
        max: number
      }
      zones_identified: any
      processing_time: number
      recommendations: string[]
      ndvi_time_series: {
        dates: string[]
        ndvi_values: number[]
        mean_ndvi: number
        trend: string
      }
      rainfall_data: {
        dates: string[]
        rainfall_values: number[]
        total_rainfall: number
        avg_daily_rainfall: number
        max_daily_rainfall: number
      }
      crop_type: any
      crop_growth_stage: any
      ai_insights?: any
    }

    const mockResponse: MockResponse = {
      ndvi_stats: {
        mean: 0.65 + (Math.random() - 0.5) * 0.2,
        stddev: 0.12 + (Math.random() - 0.5) * 0.05,
        min: 0.25 + (Math.random() - 0.5) * 0.1,
        max: 0.85 + (Math.random() - 0.5) * 0.1,
      },
      zones_identified: body.num_zones || 3,
      processing_time: 1.5 + Math.random(),
      recommendations: [
        "Field shows good overall vegetation health based on NDVI analysis.",
        "Focus on maintaining current management practices in high-vigor zones.",
        `Consider variable rate application based on the ${body.num_zones || 3} identified management zones.`,
        "Take soil samples from each zone to determine specific nutrient requirements.",
        "Monitor low-vigor areas for potential stress factors or soil compaction.",
      ],
      ndvi_time_series: {
        dates: Array.from({ length: 7 }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - (6 - i) * 15)
          return date.toISOString().split("T")[0]
        }),
        ndvi_values: Array.from({ length: 7 }, (_, i) => 0.3 + i * 0.1 + (Math.random() - 0.5) * 0.1),
        mean_ndvi: 0.65,
        trend: Math.random() > 0.5 ? "increasing" : "decreasing",
      },
      rainfall_data: {
        dates: Array.from({ length: 10 }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - (9 - i))
          return date.toISOString().split("T")[0]
        }),
        rainfall_values: Array.from({ length: 10 }, () => Math.random() * 20),
        total_rainfall: 43.2 + Math.random() * 20,
        avg_daily_rainfall: 6.17 + Math.random() * 3,
        max_daily_rainfall: 15.3 + Math.random() * 10,
      },
      crop_type: body.crop_type,
      crop_growth_stage: body.crop_growth_stage,
    }

    // Generate AI insights if requested and API key provided
    if (body.use_ai_insights && body.groq_api_key) {
      const aiInsights = await generateAIInsights(mockResponse, body.groq_api_key)
      if (aiInsights) {
        mockResponse.ai_insights = aiInsights
      }
    }

    return NextResponse.json(mockResponse)
  } catch (error) {
    console.error("Analysis error:", error)
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 })
  }
}
