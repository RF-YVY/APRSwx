from django.urls import path
from . import views

urlpatterns = [
    path('status/', views.websocket_status, name='websocket-status'),
]
