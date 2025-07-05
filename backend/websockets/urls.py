from django.urls import path
from . import views
from . import settings_api

urlpatterns = [
    path('status/', views.websocket_status, name='websocket-status'),
    path('settings/', settings_api.user_settings, name='user-settings'),
]
