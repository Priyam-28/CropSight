from flask import Flask, request, jsonify
from flask_cors import CORS
import ee
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.cluster import KMeans, DBSCAN, MeanShift
from sklearn.mixture import GaussianMixture
import json
import os
from services.earth_engine_service import EarthEngineService
from services.clustering_service import ClusteringService
from services.analysis_service import AnalysisService
from utils.crop_utils import CropUtils
from utils.response_utils import ResponseUtils

app = Flask(__name__)
CORS(app)

# Initialize services
ee_service = EarthEngineService()
clustering_service = ClusteringService()
analysis_service = AnalysisService()

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "NDVI Field Segmentation API is running"})

@app.route('/api/analyze-field', methods=['POST'])
def analyze_field():
    try:
        data = request.get_json()
        
        # Extract parameters
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        buffer_size = data.get('buffer_size', 250)
        start_date = datetime.strptime(data.get('start_date'), '%Y-%m-%d')
        end_date = datetime.strptime(data.get('end_date'), '%Y-%m-%d')
        clustering_method = data.get('clustering_method', 'K-Means')
        num_zones = data.get('num_zones', 3)
        crop_type = data.get('crop_type', 'Wheat')
        crop_growth_stage = data.get('crop_growth_stage', 'Vegetative')
        
        # Additional clustering parameters
        eps_value = data.get('eps_value', 0.05)
        min_samples = data.get('min_samples', 10)
        bandwidth = data.get('bandwidth', 0.1)
        
        # Create geometry
        geometry = ee.Geometry.Point([longitude, latitude]).buffer(buffer_size)
        
        # Get satellite imagery
        s2_collection = ee_service.get_sentinel2_collection(start_date, end_date, geometry)
        ndvi_collection = ee_service.calculate_ndvi(s2_collection)
        median_ndvi = ndvi_collection.median()
        
        # Get time series data
        ndvi_time_series = ee_service.extract_ndvi_time_series(ndvi_collection, geometry)
        rainfall_data = ee_service.get_rainfall_data(start_date, end_date, geometry)
        
        # Perform clustering
        clustering_params = {
            'num_zones': num_zones,
            'eps_value': eps_value,
            'min_samples': min_samples,
            'bandwidth': bandwidth
        }
        
        zoned_image, zones_info, processing_time = clustering_service.perform_clustering(
            median_ndvi, geometry, clustering_method, clustering_params
        )
        
        # Get NDVI statistics
        ndvi_stats = analysis_service.get_ndvi_statistics(median_ndvi, geometry)
        
        # Generate recommendations
        recommendations = analysis_service.generate_recommendations(
            ndvi_stats['mean'], zones_info['num_zones'], crop_type, rainfall_data
        )
        
        # Prepare response
        response_data = {
            'ndvi_stats': ndvi_stats,
            'zones_info': zones_info,
            'processing_time': processing_time,
            'ndvi_time_series': ndvi_time_series.to_dict('records') if not ndvi_time_series.empty else [],
            'rainfall_data': rainfall_data,
            'recommendations': recommendations,
            'crop_info': {
                'type': crop_type,
                'growth_stage': crop_growth_stage,
                'typical_ndvi_range': CropUtils.get_crop_ndvi_range(crop_type),
                'optimal_rainfall': CropUtils.get_optimal_rainfall(crop_type)
            },
            'analysis_metadata': {
                'location': {'latitude': latitude, 'longitude': longitude},
                'buffer_size': buffer_size,
                'date_range': {'start': start_date.isoformat(), 'end': end_date.isoformat()},
                'clustering_method': clustering_method
            }
        }
        
        return jsonify(ResponseUtils.success_response(response_data))
        
    except Exception as e:
        return jsonify(ResponseUtils.error_response(str(e))), 500

@app.route('/api/get-map-data', methods=['POST'])
def get_map_data():
    try:
        data = request.get_json()
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        buffer_size = data.get('buffer_size', 250)
        start_date = datetime.strptime(data.get('start_date'), '%Y-%m-%d')
        end_date = datetime.strptime(data.get('end_date'), '%Y-%m-%d')
        
        geometry = ee.Geometry.Point([longitude, latitude]).buffer(buffer_size)
        
        # Get imagery and calculate NDVI
        s2_collection = ee_service.get_sentinel2_collection(start_date, end_date, geometry)
        ndvi_collection = ee_service.calculate_ndvi(s2_collection)
        median_ndvi = ndvi_collection.median()
        
        # Get map tiles URL
        ndvi_vis_params = {
            'min': 0,
            'max': 0.8,
            'palette': ['#d73027', '#f46d43', '#fdae61', '#fee08b', '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850']
        }
        
        map_id = median_ndvi.select('NDVI').clip(geometry).getMapId(ndvi_vis_params)
        
        response_data = {
            'map_id': map_id['mapid'],
            'token': map_id['token'],
            'tile_url': f"https://earthengine.googleapis.com/v1alpha/projects/earthengine-legacy/maps/{map_id['mapid']}/tiles/{{z}}/{{x}}/{{y}}?token={map_id['token']}",
            'bounds': {
                'center': [latitude, longitude],
                'zoom': 16
            }
        }
        
        return jsonify(ResponseUtils.success_response(response_data))
        
    except Exception as e:
        return jsonify(ResponseUtils.error_response(str(e))), 500

@app.route('/api/export-report', methods=['POST'])
def export_report():
    try:
        data = request.get_json()
        
        report_content = analysis_service.generate_report(
            data.get('analysis_data'),
            data.get('metadata')
        )
        
        return jsonify(ResponseUtils.success_response({
            'report': report_content,
            'filename': f"field_analysis_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        }))
        
    except Exception as e:
        return jsonify(ResponseUtils.error_response(str(e))), 500

@app.route('/api/crop-info/<crop_type>', methods=['GET'])
def get_crop_info(crop_type):
    try:
        crop_info = {
            'ndvi_range': CropUtils.get_crop_ndvi_range(crop_type),
            'optimal_rainfall': CropUtils.get_optimal_rainfall(crop_type),
            'growth_stages': CropUtils.get_growth_stages(crop_type),
            'recommendations': CropUtils.get_crop_specific_recommendations(crop_type)
        }
        
        return jsonify(ResponseUtils.success_response(crop_info))
        
    except Exception as e:
        return jsonify(ResponseUtils.error_response(str(e))), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
