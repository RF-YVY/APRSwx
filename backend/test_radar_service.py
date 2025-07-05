"""
Simple Radar Service Test

Test the radar service to see if it's working correctly.
"""

import os
import sys
import django

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'aprs_server.settings')
django.setup()

from weather.radar_service import radar_service


def test_radar_service():
    """Test the radar service"""
    print("🌧️ Testing Radar Service")
    print("=" * 30)
    
    # Test get_available_radars
    print("1. Testing get_available_radars...")
    try:
        sites = radar_service.get_available_radars(39.7392, -104.9847, 300)
        print(f"✅ Found {len(sites)} radar sites")
        for site in sites:
            print(f"   - {site.get('site_id', 'Unknown')}: {site.get('site_name', 'Unknown')} ({site.get('distance_km', 0):.1f} km)")
    except Exception as e:
        print(f"❌ Error testing get_available_radars: {e}")
    
    # Test get_latest_radar_data
    print("\n2. Testing get_latest_radar_data...")
    try:
        radar_data = radar_service.get_latest_radar_data('KFTG')
        if radar_data:
            print(f"✅ Retrieved radar data for KFTG")
            print(f"   - Timestamp: {radar_data.get('timestamp', 'Unknown')}")
            print(f"   - Product: {radar_data.get('product', 'Unknown')}")
        else:
            print("⚠️ No radar data available for KFTG")
    except Exception as e:
        print(f"❌ Error testing get_latest_radar_data: {e}")
    
    # Test generate_radar_overlay
    print("\n3. Testing generate_radar_overlay...")
    try:
        if radar_data:
            bounds = [38.5, -106.0, 41.0, -103.0]
            size = (256, 256)
            overlay = radar_service.generate_radar_overlay(radar_data, bounds, size)
            if overlay:
                print(f"✅ Generated radar overlay ({len(overlay)} characters)")
            else:
                print("⚠️ No radar overlay generated")
        else:
            print("⚠️ No radar data available for overlay generation")
    except Exception as e:
        print(f"❌ Error testing generate_radar_overlay: {e}")
    
    print("\n🎯 Radar Service Test Complete")


if __name__ == "__main__":
    test_radar_service()
