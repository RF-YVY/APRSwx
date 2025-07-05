from django.urls import path
from . import views

urlpatterns = [
    path('', views.StationListView.as_view(), name='station-list'),
    path('<int:pk>/', views.StationDetailView.as_view(), name='station-detail'),
    path('active/', views.ActiveStationsView.as_view(), name='active-stations'),
    path('by-callsign/<str:callsign>/', views.StationByCallsignView.as_view(), name='station-by-callsign'),
    path('nearby/', views.NearbyStationsView.as_view(), name='nearby-stations'),
    path('stats/', views.station_stats, name='station-stats'),
]
