from rest_framework import serializers
from .models import Station


class StationSerializer(serializers.ModelSerializer):
    distance = serializers.SerializerMethodField()
    
    class Meta:
        model = Station
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def get_distance(self, obj):
        """Calculate distance from user location if provided in context"""
        user_lat = self.context.get('user_lat')
        user_lon = self.context.get('user_lon')
        
        if user_lat and user_lon and obj.latitude and obj.longitude:
            # Simple distance calculation (not accurate for long distances)
            import math
            
            lat1, lon1 = float(user_lat), float(user_lon)
            lat2, lon2 = float(obj.latitude), float(obj.longitude)
            
            # Convert to radians
            lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
            
            # Haversine formula
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
            c = 2 * math.asin(math.sqrt(a))
            r = 6371  # Earth's radius in kilometers
            
            return c * r
        
        return None


class StationListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views"""
    class Meta:
        model = Station
        fields = (
            'id', 'callsign', 'station_type', 'symbol_table', 'symbol_code',
            'latitude', 'longitude', 'last_heard', 'last_comment'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
