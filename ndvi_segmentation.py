import streamlit as st
import ee
import geemap.foliumap as geemap
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import folium
from sklearn.cluster import KMeans
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from matplotlib.colors import LinearSegmentedColormap

# Set page configuration
st.set_page_config(layout="wide", page_title="Field Segmentation Tool")

# Initialize Earth Engine
@st.cache_resource
def initialize_ee():
    try:
        ee.Initialize()
    except Exception:
        ee.Authenticate()
        ee.Initialize()

# Call the initialization function
initialize_ee()

def app():
    st.title("Field Segmentation using NDVI Analysis")
    st.write("Analyze agricultural fields using satellite imagery and NDVI values")

    # Create two columns for input parameters
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Location Parameters")
        latitude = st.number_input("Latitude", value=30.9, format="%.6f")
        longitude = st.number_input("Longitude", value=75.8, format="%.6f")
        buffer_size = st.slider("Field Radius (meters)", 
                               min_value=100, max_value=1000, value=250, step=50)
    
    with col2:
        st.subheader("Analysis Parameters")
        start_date = st.date_input("Start Date", datetime.now() - timedelta(days=90))
        end_date = st.date_input("End Date", datetime.now())
        num_zones = st.slider("Number of Zones", min_value=2, max_value=7, value=3)
        
    # Create a point and buffer to represent the field
    point = ee.Geometry.Point([longitude, latitude])
    field = point.buffer(buffer_size)
    
    # Analysis button
    if st.button("Analyze Field"):
        with st.spinner("Processing satellite imagery..."):
            # Get Sentinel-2 imagery
            s2_collection = get_sentinel2_collection(start_date, end_date, field)
            
            # Calculate NDVI
            ndvi_collection = calculate_ndvi(s2_collection)
            
            # Get median NDVI for the time period
            median_ndvi = ndvi_collection.median()
            
            # Perform zoning using K-means clustering
            zoned_image = perform_zoning(median_ndvi, field, num_zones)
            
            # Display results
            display_results(median_ndvi, zoned_image, field, latitude, longitude, num_zones)
            
            # Export option
            st.download_button(
                label="Download Analysis Report",
                data=generate_report(latitude, longitude, buffer_size, start_date, end_date, num_zones),
                file_name="field_analysis_report.txt",
                mime="text/plain"
            )

def get_sentinel2_collection(start_date, end_date, geometry):
    """Fetch Sentinel-2 imagery for the given time period and location."""
    # Format dates for Earth Engine
    start = ee.Date(start_date.strftime('%Y-%m-%d'))
    end = ee.Date(end_date.strftime('%Y-%m-%d'))
    
    # Get Sentinel-2 surface reflectance data
    s2 = ee.ImageCollection('COPERNICUS/S2_HARMONIZED') \
        .filterDate(start, end) \
        .filterBounds(geometry) \
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    
    return s2

def calculate_ndvi(image_collection):
    """Calculate NDVI for each image in the collection."""
    def add_ndvi(image):
        ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
        return image.addBands(ndvi)
    
    return image_collection.map(add_ndvi)

def perform_zoning(ndvi_image, geometry, num_zones):
    """Segment the field into zones based on NDVI values using K-means clustering."""
    # Sample NDVI values within the field boundary
    ndvi_sample = ndvi_image.select('NDVI').sampleRegions(
        collection=geometry,
        scale=10,
        geometries=True
    )
    
    # Use K-means clustering to segment the field
    clusterer = ee.Clusterer.wekaKMeans(num_zones).train(ndvi_sample)
    result = ndvi_image.select('NDVI').cluster(clusterer)
    
    return result

def display_results(ndvi_image, zoned_image, geometry, lat, lon, num_zones):
    """Display the results on the Streamlit app."""
    # Create tabs for different visualizations
    tab1, tab2, tab3 = st.tabs(["NDVI Map", "Field Zones", "Analysis"])
    
    with tab1:
        st.subheader("NDVI Distribution")
        
        # Create a map centered at the field location
        m = geemap.Map()
        m.centerObject(ee.Geometry.Point([lon, lat]), 16)
        
        # Add the field boundary
        m.addLayer(geometry, {'color': 'white'}, 'Field Boundary')
        
        # Add NDVI layer with custom colormap
        ndvi_vis = {
            'min': 0,
            'max': 0.8,
            'palette': ['#d73027', '#f46d43', '#fdae61', '#fee08b', '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850']
        }
        m.addLayer(ndvi_image.select('NDVI').clip(geometry), ndvi_vis, 'NDVI')
        
        # Add legend
        m.add_colorbar(ndvi_vis, label="NDVI Values")
        
        # Display the map
        m.to_streamlit(height=500)
    
    with tab2:
        st.subheader(f"Field Segmentation ({num_zones} zones)")
        
        # Create a map for zoning
        m2 = geemap.Map()
        m2.centerObject(ee.Geometry.Point([lon, lat]), 16)
        
        # Add the field boundary
        m2.addLayer(geometry, {'color': 'white'}, 'Field Boundary')
        
        # Add zoned image with distinct colors
        zone_vis = {
            'min': 0,
            'max': num_zones - 1,
            'palette': get_zone_colors(num_zones)
        }
        m2.addLayer(zoned_image.clip(geometry), zone_vis, 'Field Zones')
        
        # Display the map
        m2.to_streamlit(height=500)
        
        # Zone explanation
        st.write("Zone interpretation:")
        zone_df = pd.DataFrame({
            "Zone": [f"Zone {i+1}" for i in range(num_zones)],
            "Description": [get_zone_description(i, num_zones) for i in range(num_zones)]
        })
        st.table(zone_df)
    
    with tab3:
        st.subheader("Statistical Analysis")
        
        # Get NDVI statistics for the field
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
            
            # Display statistics
            stats_df = pd.DataFrame({
                "Statistic": ["Mean NDVI", "StdDev", "Minimum", "Maximum"],
                "Value": [
                    round(ndvi_stats.get('NDVI_mean', 0), 3),
                    round(ndvi_stats.get('NDVI_stdDev', 0), 3),
                    round(ndvi_stats.get('NDVI_min', 0), 3),
                    round(ndvi_stats.get('NDVI_max', 0), 3)
                ]
            })
            st.table(stats_df)
            
            # Create recommendations based on NDVI values
            st.subheader("Recommendations")
            mean_ndvi = ndvi_stats.get('NDVI_mean', 0)
            recommendations = generate_recommendations(mean_ndvi, num_zones)
            for rec in recommendations:
                st.markdown(f"- {rec}")
                
        except Exception as e:
            st.error(f"Error computing statistics: {str(e)}")

def get_zone_colors(num_zones):
    """Generate a color palette for the zones."""
    colors = ['#d7191c', '#fdae61', '#ffffbf', '#a6d96a', '#1a9641']
    if num_zones <= 5:
        return colors[:num_zones]
    else:
        # For more than 5 zones, interpolate colors
        return list(mcolors.TABLEAU_COLORS.values())[:num_zones]

def get_zone_description(zone_index, num_zones):
    """Generate description for each zone based on its index."""
    if num_zones == 3:
        descriptions = [
            "Low vigor area - may require additional inputs or investigation",
            "Moderate vigor area - average performance",
            "High vigor area - optimal performance"
        ]
        return descriptions[zone_index]
    elif num_zones == 2:
        descriptions = [
            "Lower performing area - may require attention",
            "Higher performing area - good crop health"
        ]
        return descriptions[zone_index]
    else:
        # Generic descriptions for other numbers of zones
        if zone_index == 0:
            return "Lowest vigor area"
        elif zone_index == num_zones - 1:
            return "Highest vigor area"
        else:
            return f"Moderate vigor area (level {zone_index})"

def generate_recommendations(mean_ndvi, num_zones):
    """Generate recommendations based on NDVI values."""
    recommendations = []
    
    if mean_ndvi < 0.3:
        recommendations.append("The field shows signs of stress. Consider irrigation or nutrient assessment.")
        recommendations.append("Low NDVI values may indicate bare soil or early growth stage.")
    elif mean_ndvi < 0.5:
        recommendations.append("Field has moderate vegetation health. Monitor for changes in coming weeks.")
        recommendations.append("Consider targeted fertilizer application in lower-performing zones.")
    else:
        recommendations.append("Field shows good overall vegetation health.")
        recommendations.append("Focus on maintaining current management practices.")
    
    if num_zones >= 3:
        recommendations.append(f"Consider variable rate application based on the {num_zones} identified management zones.")
    
    return recommendations

def generate_report(lat, lon, buffer, start_date, end_date, num_zones):
    """Generate a simple text report for download."""
    report = f"""
Field Analysis Report
=====================
Date Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Location Information:
- Latitude: {lat}
- Longitude: {lon}
- Field Radius: {buffer} meters

Analysis Parameters:
- Analysis Period: {start_date} to {end_date}
- Number of Management Zones: {num_zones}

Summary of Results:
- The field was segmented into {num_zones} management zones based on NDVI values.
- Zones represent different levels of crop vigor, from lowest (Zone 1) to highest (Zone {num_zones}).
- Consider variable rate application of inputs based on these zones.

Next Steps:
1. Ground-truth the zones with field visits
2. Develop variable rate prescription maps for inputs
3. Monitor changes in NDVI over time to assess management effectiveness

For more detailed analysis, please consider soil testing in each zone.
    """
    return report

if __name__ == "__main__":
    app()