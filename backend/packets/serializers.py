from rest_framework import serializers
from .models import APRSPacket


class APRSPacketSerializer(serializers.ModelSerializer):
    class Meta:
        model = APRSPacket
        fields = '__all__'
        read_only_fields = ('id', 'received_at')


class APRSPacketListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views"""
    class Meta:
        model = APRSPacket
        fields = ('id', 'source_callsign', 'packet_type', 'timestamp', 'received_at')
        read_only_fields = ('id', 'received_at')
