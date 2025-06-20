class CropUtils:
    @staticmethod
    def get_crop_ndvi_range(crop_type):
        """Return typical NDVI range for different crops at peak growth."""
        crop_ranges = {
            "Wheat": "0.4-0.9",
            "Corn/Maize": "0.5-0.9",
            "Rice": "0.4-0.8",
            "Soybeans": "0.4-0.9",
            "Cotton": "0.4-0.8",
            "Sugarcane": "0.5-0.9",
            "Other": "0.3-0.8"
        }
        return crop_ranges.get(crop_type, "0.3-0.8")
    
    @staticmethod
    def get_optimal_rainfall(crop_type):
        """Return optimal monthly rainfall (mm) for different crops."""
        rainfall_requirements = {
            "Wheat": 80,
            "Corn/Maize": 120,
            "Rice": 180,
            "Soybeans": 100,
            "Cotton": 70,
            "Sugarcane": 150,
            "Other": 100,
        }
        return rainfall_requirements.get(crop_type, 100)
    
    @staticmethod
    def get_growth_stages(crop_type):
        """Return growth stages for different crops."""
        stages = {
            "Wheat": ["Germination", "Tillering", "Stem Extension", "Heading", "Grain Fill", "Maturity"],
            "Corn/Maize": ["Emergence", "Vegetative", "Tasseling", "Silking", "Grain Fill", "Maturity"],
            "Rice": ["Germination", "Seedling", "Tillering", "Stem Extension", "Panicle", "Grain Fill"],
            "Soybeans": ["Emergence", "Vegetative", "Flowering", "Pod Fill", "Maturity"],
            "Cotton": ["Emergence", "Squaring", "Flowering", "Boll Development", "Maturity"],
            "Sugarcane": ["Germination", "Tillering", "Grand Growth", "Maturation"],
            "Other": ["Early/Emergence", "Vegetative", "Reproductive/Flowering", "Maturity"]
        }
        return stages.get(crop_type, stages["Other"])
    
    @staticmethod
    def get_crop_specific_recommendations(crop_type):
        """Return crop-specific recommendations."""
        recommendations = {
            "Wheat": [
                "Monitor for nitrogen deficiency if NDVI is below 0.4",
                "Watch for disease pressure in dense canopy areas",
                "Consider fungicide application during heading stage"
            ],
            "Corn/Maize": [
                "Evaluate water stress if NDVI is below 0.5",
                "Ensure adequate nitrogen for grain fill period",
                "Monitor for pest pressure in high-vigor areas"
            ],
            "Rice": [
                "Verify water levels and nutrient availability",
                "Monitor for blast disease in dense areas",
                "Consider split nitrogen application"
            ],
            "Cotton": [
                "Consider growth regulators for high NDVI areas",
                "Monitor for bollworm pressure",
                "Adjust irrigation based on growth stage"
            ],
            "Soybeans": [
                "Monitor for sudden death syndrome in low-vigor areas",
                "Consider foliar fertilizer application",
                "Watch for aphid pressure"
            ],
            "Sugarcane": [
                "Monitor for borer damage",
                "Consider ratoon management practices",
                "Adjust fertilizer based on zone performance"
            ]
        }
        return recommendations.get(crop_type, [])
