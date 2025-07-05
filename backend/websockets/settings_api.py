# User Settings API Endpoints
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import logging
from .models import UserSettings

logger = logging.getLogger(__name__)

@csrf_exempt
@api_view(['GET', 'POST'])
def user_settings(request):
    """
    Get or save user settings
    """
    try:
        if request.method == 'GET':
            # Get settings for the user (using session or user ID)
            session_key = request.session.session_key or 'default'
            
            # If no session key, create one
            if not request.session.session_key:
                request.session.save()
                session_key = request.session.session_key or 'default'
            
            try:
                settings_obj = UserSettings.objects.get(session_key=session_key)
                return JsonResponse({
                    'success': True,
                    'settings': {
                        'callsign': settings_obj.callsign,
                        'ssid': settings_obj.ssid,
                        'passcode': settings_obj.passcode,
                        'location': {
                            'latitude': str(settings_obj.latitude),
                            'longitude': str(settings_obj.longitude),
                            'source': settings_obj.location_source
                        } if settings_obj.latitude and settings_obj.longitude else None,
                        'autoGeneratePasscode': settings_obj.auto_generate_passcode,
                        'distanceUnit': settings_obj.distance_unit,
                        'darkTheme': settings_obj.dark_theme,
                        'aprsIsConnected': False,  # Always start disconnected
                        'aprsIsFilters': {
                            'distanceRange': settings_obj.filter_distance_range,
                            'stationTypes': json.loads(settings_obj.filter_station_types) if settings_obj.filter_station_types else [],
                            'enableWeather': settings_obj.filter_enable_weather,
                            'enableMessages': settings_obj.filter_enable_messages
                        },
                        'tncSettings': json.loads(settings_obj.tnc_settings) if settings_obj.tnc_settings else {}
                    }
                })
            except UserSettings.DoesNotExist:
                # Return null when no settings exist for this session
                return JsonResponse({
                    'success': True,
                    'settings': None
                })
        
        elif request.method == 'POST':
            # Save settings
            data = json.loads(request.body)
            session_key = request.session.session_key or 'default'
            
            # Ensure session key exists
            if not request.session.session_key:
                request.session.save()
                session_key = request.session.session_key
            
            settings_data = data.get('settings', {})
            
            # Get or create settings object
            settings_obj, created = UserSettings.objects.get_or_create(
                session_key=session_key,
                defaults={}
            )
            
            # Update settings
            settings_obj.callsign = settings_data.get('callsign', '')
            settings_obj.ssid = settings_data.get('ssid', 0)
            settings_obj.passcode = settings_data.get('passcode', -1)
            
            location = settings_data.get('location')
            if location:
                settings_obj.latitude = location.get('latitude')
                settings_obj.longitude = location.get('longitude')
                settings_obj.location_source = location.get('source', 'manual')
            
            settings_obj.auto_generate_passcode = settings_data.get('autoGeneratePasscode', True)
            settings_obj.distance_unit = settings_data.get('distanceUnit', 'km')
            settings_obj.dark_theme = settings_data.get('darkTheme', False)
            
            # APRS-IS filters
            filters = settings_data.get('aprsIsFilters', {})
            settings_obj.filter_distance_range = filters.get('distanceRange', 100)
            settings_obj.filter_station_types = json.dumps(filters.get('stationTypes', []))
            settings_obj.filter_enable_weather = filters.get('enableWeather', True)
            settings_obj.filter_enable_messages = filters.get('enableMessages', True)
            
            # TNC settings
            tnc_settings = settings_data.get('tncSettings', {})
            settings_obj.tnc_settings = json.dumps(tnc_settings)
            
            settings_obj.save()
            
            logger.info(f"Settings saved for session {session_key}")
            
            return JsonResponse({
                'success': True,
                'message': 'Settings saved successfully'
            })
            
    except Exception as e:
        logger.error(f"Error handling settings request: {e}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
