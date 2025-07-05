from rest_framework import serializers
from .models import WeatherObservation, WeatherAlert, RadarSweep


class WeatherObservationSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeatherObservation
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class WeatherAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeatherAlert
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class RadarSweepSerializer(serializers.ModelSerializer):
    class Meta:
        model = RadarSweep
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class WeatherObservationListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views"""
    class Meta:
        model = WeatherObservation
        fields = (
            'id', 'station_callsign', 'observation_time', 'temperature',
            'humidity', 'pressure', 'wind_speed', 'wind_direction'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
