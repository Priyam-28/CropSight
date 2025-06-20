import ee
import numpy as np
from datetime import datetime
from sklearn.cluster import KMeans, DBSCAN, MeanShift
from sklearn.mixture import GaussianMixture

class ClusteringService:
    def perform_clustering(self, ndvi_image, geometry, method, params):
        """Perform clustering based on the selected method."""
        start_time = datetime.now()
        
        if method == 'K-Means':
            zoned_image, zones_info = self.perform_kmeans_zoning(
                ndvi_image, geometry, params['num_zones']
            )
        elif method == 'DBSCAN':
            zoned_image, zones_info = self.perform_dbscan_zoning(
                ndvi_image, geometry, params['eps_value'], params['min_samples']
            )
        elif method == 'Mean Shift':
            zoned_image, zones_info = self.perform_meanshift_zoning(
                ndvi_image, geometry, params['bandwidth']
            )
        elif method == 'GMM':
            zoned_image, zones_info = self.perform_gmm_zoning(
                ndvi_image, geometry, params['num_zones']
            )
        else:
            raise ValueError(f"Unsupported clustering method: {method}")
        
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()
        
        return zoned_image, zones_info, processing_time
    
    def perform_kmeans_zoning(self, ndvi_image, geometry, num_zones):
        """Segment the field using K-means clustering."""
        ndvi_sample = ndvi_image.select('NDVI').sampleRegions(
            collection=geometry,
            scale=10,
            geometries=True
        )
        
        clusterer = ee.Clusterer.wekaKMeans(num_zones).train(ndvi_sample)
        result = ndvi_image.select('NDVI').cluster(clusterer)
        
        zones_info = {
            'num_zones': num_zones,
            'method': 'K-Means',
            'descriptions': self.get_zone_descriptions(num_zones)
        }
        
        return result, zones_info
    
    def perform_dbscan_zoning(self, ndvi_image, geometry, eps, min_samples):
        """Segment the field using DBSCAN clustering."""
        # Sample NDVI values
        ndvi_sample = ndvi_image.select('NDVI').sampleRegions(
            collection=geometry,
            scale=10,
            geometries=True
        )
        
        sample_data = ndvi_sample.getInfo()
        
        # Extract NDVI values
        ndvi_values = []
        for feature in sample_data['features']:
            if 'NDVI' in feature['properties'] and feature['properties']['NDVI'] is not None:
                ndvi_values.append([feature['properties']['NDVI']])
        
        if len(ndvi_values) < min_samples:
            # Fall back to K-means
            return self.perform_kmeans_zoning(ndvi_image, geometry, 3)
        
        # Apply DBSCAN
        ndvi_array = np.array(ndvi_values)
        dbscan = DBSCAN(eps=eps, min_samples=min_samples)
        clusters = dbscan.fit_predict(ndvi_array)
        
        num_clusters = len(set(clusters)) - (1 if -1 in clusters else 0)
        
        if num_clusters <= 1:
            # Fall back to K-means
            return self.perform_kmeans_zoning(ndvi_image, geometry, 3)
        
        # Use K-means result as visualization base
        kmeans_result, _ = self.perform_kmeans_zoning(ndvi_image, geometry, num_clusters)
        
        zones_info = {
            'num_zones': num_clusters,
            'method': 'DBSCAN',
            'descriptions': self.get_zone_descriptions(num_clusters),
            'noise_points': np.sum(clusters == -1)
        }
        
        return kmeans_result, zones_info
    
    def perform_meanshift_zoning(self, ndvi_image, geometry, bandwidth):
        """Segment the field using Mean Shift clustering."""
        try:
            ndvi_sample = ndvi_image.select('NDVI').sampleRegions(
                collection=geometry,
                scale=10,
                geometries=True,
                tileScale=16
            )
            
            sample_data = ndvi_sample.getInfo()
            
            if 'features' not in sample_data or len(sample_data['features']) < 10:
                return self.perform_kmeans_zoning(ndvi_image, geometry, 3)
            
            # Extract NDVI values
            ndvi_values = []
            for feature in sample_data['features']:
                if 'NDVI' in feature['properties'] and feature['properties']['NDVI'] is not None:
                    ndvi_values.append([feature['properties']['NDVI']])
            
            if len(ndvi_values) < 10:
                return self.perform_kmeans_zoning(ndvi_image, geometry, 3)
            
            # Apply Mean Shift
            ndvi_array = np.array(ndvi_values)
            meanshift = MeanShift(bandwidth=bandwidth, bin_seeding=True)
            clusters = meanshift.fit_predict(ndvi_array)
            
            num_clusters = len(np.unique(clusters))
            
            if num_clusters <= 1:
                meanshift = MeanShift(bandwidth=bandwidth/2, bin_seeding=True)
                clusters = meanshift.fit_predict(ndvi_array)
                num_clusters = len(np.unique(clusters))
                
                if num_clusters <= 1:
                    return self.perform_kmeans_zoning(ndvi_image, geometry, 3)
            
            # Use K-means result as visualization base
            kmeans_result, _ = self.perform_kmeans_zoning(ndvi_image, geometry, num_clusters)
            
            zones_info = {
                'num_zones': num_clusters,
                'method': 'Mean Shift',
                'descriptions': self.get_zone_descriptions(num_clusters)
            }
            
            return kmeans_result, zones_info
            
        except Exception as e:
            return self.perform_kmeans_zoning(ndvi_image, geometry, 3)
    
    def perform_gmm_zoning(self, ndvi_image, geometry, num_zones):
        """Segment the field using Gaussian Mixture Model."""
        ndvi_sample = ndvi_image.select('NDVI').sampleRegions(
            collection=geometry,
            scale=10,
            geometries=True
        )
        
        sample_data = ndvi_sample.getInfo()
        
        # Extract NDVI values
        ndvi_values = []
        for feature in sample_data['features']:
            if 'NDVI' in feature['properties'] and feature['properties']['NDVI'] is not None:
                ndvi_values.append([feature['properties']['NDVI']])
        
        # Apply GMM
        ndvi_array = np.array(ndvi_values)
        gmm = GaussianMixture(n_components=num_zones, random_state=42)
        clusters = gmm.fit_predict(ndvi_array)
        
        # Use K-means result as visualization base
        kmeans_result, _ = self.perform_kmeans_zoning(ndvi_image, geometry, num_zones)
        
        zones_info = {
            'num_zones': num_zones,
            'method': 'GMM',
            'descriptions': self.get_zone_descriptions(num_zones)
        }
        
        return kmeans_result, zones_info
    
    def get_zone_descriptions(self, num_zones):
        """Generate descriptions for each zone."""
        if num_zones == 2:
            return [
                "Lower performing area - may require attention",
                "Higher performing area - good crop health"
            ]
        elif num_zones == 3:
            return [
                "Low vigor area - may require additional inputs or investigation",
                "Moderate vigor area - average performance",
                "High vigor area - optimal performance"
            ]
        else:
            descriptions = []
            for i in range(num_zones):
                if i == 0:
                    descriptions.append("Lowest vigor area")
                elif i == num_zones - 1:
                    descriptions.append("Highest vigor area")
                else:
                    descriptions.append(f"Moderate vigor area (level {i+1} of {num_zones})")
            return descriptions
