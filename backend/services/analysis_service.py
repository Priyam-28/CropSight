import ee
import numpy as np
from datetime import datetime
from utils.crop_utils import CropUtils

class AnalysisService:
    def get_ndvi_statistics(self, ndvi_image, geometry):
        """Calculate NDVI statistics for the field."""
        try:
            ndvi_stats = ndvi_image.select('NDVI').reduceRegion(
                reducer=ee.Reducer.mean().combine(
                    reducer2=ee.Reducer.stdDev(),
                    sharedInputs=True
                ).combine(
                    reducer2=ee.Reducer.minMax(),
                    sharedInputs=True
                ),
                geometry=geometry,
                scale=10,
                maxPixels=1e9
            ).getInfo()
            
            return {
                'mean': round(ndvi_stats.get('NDVI_mean', 0), 3),
                'std_dev': round(ndvi_stats.get('NDVI_stdDev', 0), 3),
                'min': round(ndvi_stats.get('NDVI_min', 0), 3),
                'max': round(ndvi_stats.get('NDVI_max', 0), 3)
            }
        except Exception as e:
            return {
                'mean': 0,
                'std_dev': 0,
                'min': 0,
                'max': 0,
                'error': str(e)
            }
    
    def generate_recommendations(self, mean_ndvi, num_zones, crop_type, rainfall_data):
        """Generate recommendations based on analysis results."""
        recommendations = []
        
        # NDVI-based recommendations
        if mean_ndvi < 0.3:
            recommendations.append("The field shows signs of stress. Consider irrigation or nutrient assessment.")
            recommendations.append("Low NDVI values may indicate bare soil or early growth stage.")
        elif mean_ndvi < 0.5:
            recommendations.append("Field has moderate vegetation health. Monitor for changes in coming weeks.")
            recommendations.append("Consider targeted fertilizer application in lower-performing zones.")
        else:
            recommendations.append("Field shows good overall vegetation health.")
            recommendations.append("Focus on maintaining current management practices.")
        
        # Crop-specific recommendations
        crop_recommendations = CropUtils.get_crop_specific_recommendations(crop_type)
        if crop_recommendations:
            recommendations.extend(crop_recommendations)
        
        # Zone-based recommendations
        if num_zones >= 3:
            recommendations.append(f"Consider variable rate application based on the {num_zones} identified management zones.")
            recommendations.append("Take soil samples from each zone to determine specific nutrient requirements.")
        
        # Rainfall-based recommendations
        if rainfall_data and 'statistics' in rainfall_data:
            total_rainfall = rainfall_data['statistics']['total']
            optimal_rainfall = CropUtils.get_optimal_rainfall(crop_type)
            
            if total_rainfall < optimal_rainfall * 0.7:
                recommendations.append(f"Total rainfall ({total_rainfall:.1f} mm) is below optimal for {crop_type}. Consider irrigation.")
            elif total_rainfall > optimal_rainfall * 1.3:
                recommendations.append(f"Total rainfall ({total_rainfall:.1f} mm) is above optimal for {crop_type}. Monitor for disease pressure.")
        
        return recommendations
    
    def generate_report(self, analysis_data, metadata):
        """Generate a comprehensive analysis report."""
        report = f"""
Field Analysis Report
=====================
Date Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Location Information:
- Latitude: {metadata.get('location', {}).get('latitude', 'N/A')}
- Longitude: {metadata.get('location', {}).get('longitude', 'N/A')}
- Field Radius: {metadata.get('buffer_size', 'N/A')} meters

Analysis Parameters:
- Analysis Period: {metadata.get('date_range', {}).get('start', 'N/A')} to {metadata.get('date_range', {}).get('end', 'N/A')}
- Clustering Method: {metadata.get('clustering_method', 'N/A')}

NDVI Statistics:
- Mean NDVI: {analysis_data.get('ndvi_stats', {}).get('mean', 'N/A')}
- Standard Deviation: {analysis_data.get('ndvi_stats', {}).get('std_dev', 'N/A')}
- Minimum NDVI: {analysis_data.get('ndvi_stats', {}).get('min', 'N/A')}
- Maximum NDVI: {analysis_data.get('ndvi_stats', {}).get('max', 'N/A')}

Management Zones:
- Number of Zones: {analysis_data.get('zones_info', {}).get('num_zones', 'N/A')}
- Clustering Method: {analysis_data.get('zones_info', {}).get('method', 'N/A')}

Recommendations:
"""
        
        recommendations = analysis_data.get('recommendations', [])
        for i, rec in enumerate(recommendations, 1):
            report += f"{i}. {rec}\n"
        
        report += """
Management Guidelines:
1. Ground-truth the zones with field visits
2. Take soil samples from each management zone
3. Develop variable rate prescription maps for inputs
4. Monitor changes in NDVI over time to assess management effectiveness
5. Adjust irrigation scheduling based on rainfall patterns

Note: This analysis is based on remote sensing data and should be verified with field observations.
        """
        
        return report
