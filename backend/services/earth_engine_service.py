import ee
import pandas as pd
import numpy as np
from datetime import datetime

class EarthEngineService:
    def __init__(self):
        self.initialize_ee()
    
    def initialize_ee(self):
        """Initialize Earth Engine with authentication."""
        try:
            ee.Initialize(project='ndvi-field-segmentation')
        except Exception:
            ee.Authenticate()
            ee.Initialize(project='ndvi-field-segmentation')
    
    def get_sentinel2_collection(self, start_date, end_date, geometry):
        """Fetch Sentinel-2 imagery for the given time period and location."""
        start = ee.Date(start_date.strftime('%Y-%m-%d'))
        end = ee.Date(end_date.strftime('%Y-%m-%d'))
        
        s2 = ee.ImageCollection('COPERNICUS/S2_HARMONIZED') \
            .filterDate(start, end) \
            .filterBounds(geometry) \
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
        
        return s2
    
    def calculate_ndvi(self, image_collection):
        """Calculate NDVI for each image in the collection."""
        def add_ndvi(image):
            ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
            return image.addBands(ndvi).set('date', image.date().format('YYYY-MM-dd'))
        
        return image_collection.map(add_ndvi)
    
    def extract_ndvi_time_series(self, ndvi_collection, geometry):
        """Extract NDVI time series data for plotting."""
        image_list = ndvi_collection.toList(ndvi_collection.size())
        size = image_list.size().getInfo()
        
        dates = []
        mean_ndvi_values = []
        
        for i in range(size):
            image = ee.Image(image_list.get(i))
            date_str = image.get('date').getInfo()
            
            mean_ndvi = image.select('NDVI').reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=geometry,
                scale=10,
                maxPixels=1e9
            ).get('NDVI').getInfo()
            
            if mean_ndvi is not None:
                dates.append(date_str)
                mean_ndvi_values.append(mean_ndvi)
        
        return pd.DataFrame({'date': dates, 'ndvi': mean_ndvi_values})
    
    def get_rainfall_data(self, start_date, end_date, geometry):
        """Fetch precipitation data from CHIRPS dataset."""
        start = ee.Date(start_date.strftime('%Y-%m-%d'))
        end = ee.Date(end_date.strftime('%Y-%m-%d'))
        
        rainfall = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY') \
            .filterDate(start, end) \
            .filterBounds(geometry)
        
        # Extract time series
        rainfall_series = self.extract_rainfall_time_series(rainfall, geometry)
        
        # Calculate statistics
        total_rainfall = rainfall_series['rainfall'].sum() if not rainfall_series.empty else 0
        avg_rainfall = rainfall_series['rainfall'].mean() if not rainfall_series.empty else 0
        max_rainfall = rainfall_series['rainfall'].max() if not rainfall_series.empty else 0
        
        return {
            'time_series': rainfall_series.to_dict('records') if not rainfall_series.empty else [],
            'statistics': {
                'total': total_rainfall,
                'average': avg_rainfall,
                'maximum': max_rainfall
            }
        }
    
    def extract_rainfall_time_series(self, rainfall_collection, geometry):
        """Extract rainfall time series data."""
        image_list = rainfall_collection.toList(rainfall_collection.size())
        size = image_list.size().getInfo()
        
        dates = []
        rainfall_values = []
        
        for i in range(size):
            image = ee.Image(image_list.get(i))
            date = image.date()
            date_str = date.format('YYYY-MM-dd').getInfo()
            
            mean_rainfall = image.select('precipitation').reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=geometry,
                scale=5000,
                maxPixels=1e9
            ).get('precipitation').getInfo()
            
            if mean_rainfall is not None:
                dates.append(date_str)
                rainfall_values.append(mean_rainfall)
        
        return pd.DataFrame({'date': dates, 'rainfall': rainfall_values})
