from django.urls import path
from . import views

urlpatterns = [
    path('observations/', views.WeatherObservationListView.as_view(), name='weather-observations'),
    path('observations/<int:pk>/', views.WeatherObservationDetailView.as_view(), name='weather-observation-detail'),
    path('alerts/', views.WeatherAlertListView.as_view(), name='weather-alerts'),
    path('alerts/<int:pk>/', views.WeatherAlertDetailView.as_view(), name='weather-alert-detail'),
    path('radar/', views.RadarDataListView.as_view(), name='radar-data'),
    path('radar/<int:pk>/', views.RadarDataDetailView.as_view(), name='radar-data-detail'),
    path('stats/', views.weather_stats, name='weather-stats'),
    
    # MRMS radar endpoints
    path('radar-sites/', views.RadarSitesView.as_view(), name='radar-sites'),
    path('radar-data/<str:product_id>/', views.RadarDataView.as_view(), name='radar-data-product'),
    path('radar-overlay/<str:product_id>/', views.RadarOverlayView.as_view(), name='radar-overlay-product'),
]
