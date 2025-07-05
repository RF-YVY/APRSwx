from django.urls import path
from . import views

urlpatterns = [
    path('packets/', views.PacketListView.as_view(), name='packet-list'),
    path('packets/<int:pk>/', views.PacketDetailView.as_view(), name='packet-detail'),
    path('packets/recent/', views.RecentPacketsView.as_view(), name='recent-packets'),
    path('packets/by-callsign/<str:callsign>/', views.PacketsByCallsignView.as_view(), name='packets-by-callsign'),
]
