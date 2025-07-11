# Generated by Django 5.2.4 on 2025-07-04 12:23

import django.core.validators
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Station",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "callsign",
                    models.CharField(
                        max_length=10,
                        unique=True,
                        validators=[
                            django.core.validators.RegexValidator(
                                message="Invalid callsign format",
                                regex="^[A-Z0-9]{1,6}(-[0-9]{1,2})?$",
                            )
                        ],
                    ),
                ),
                (
                    "ssid",
                    models.CharField(
                        blank=True,
                        help_text="SSID (Secondary Station ID)",
                        max_length=2,
                    ),
                ),
                (
                    "station_type",
                    models.CharField(
                        choices=[
                            ("fixed", "Fixed Station"),
                            ("mobile", "Mobile Station"),
                            ("portable", "Portable Station"),
                            ("maritime", "Maritime Mobile"),
                            ("aeronautical", "Aeronautical Mobile"),
                            ("weather", "Weather Station"),
                            ("digipeater", "Digipeater"),
                            ("igate", "Internet Gateway"),
                            ("object", "Object"),
                            ("item", "Item"),
                            ("unknown", "Unknown"),
                        ],
                        default="unknown",
                        max_length=20,
                    ),
                ),
                ("symbol_table", models.CharField(default="/", max_length=1)),
                ("symbol_code", models.CharField(default="&", max_length=1)),
                ("latitude", models.FloatField(blank=True, null=True)),
                ("longitude", models.FloatField(blank=True, null=True)),
                (
                    "last_altitude",
                    models.FloatField(
                        blank=True, help_text="Last known altitude in meters", null=True
                    ),
                ),
                ("last_heard", models.DateTimeField(blank=True, null=True)),
                ("last_comment", models.TextField(blank=True)),
                ("first_heard", models.DateTimeField(auto_now_add=True)),
                ("is_active", models.BooleanField(default=True)),
                ("packet_count", models.IntegerField(default=0)),
                (
                    "track_history",
                    models.BooleanField(
                        default=True, help_text="Keep position history for this station"
                    ),
                ),
                (
                    "max_history_age",
                    models.IntegerField(
                        default=24, help_text="Maximum age of position history in hours"
                    ),
                ),
                (
                    "capabilities",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        help_text="Station capabilities and features",
                    ),
                ),
                ("operator_name", models.CharField(blank=True, max_length=100)),
                ("operator_email", models.EmailField(blank=True, max_length=254)),
                (
                    "qth",
                    models.CharField(
                        blank=True,
                        help_text="Station location description",
                        max_length=200,
                    ),
                ),
                (
                    "equipment_info",
                    models.TextField(
                        blank=True, help_text="Radio and equipment information"
                    ),
                ),
            ],
            options={
                "ordering": ["-last_heard"],
                "indexes": [
                    models.Index(
                        fields=["callsign"], name="stations_st_callsig_6e7b55_idx"
                    ),
                    models.Index(
                        fields=["last_heard"], name="stations_st_last_he_05f102_idx"
                    ),
                    models.Index(
                        fields=["station_type"], name="stations_st_station_51014c_idx"
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="StationGroup",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=100, unique=True)),
                ("description", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                (
                    "color",
                    models.CharField(
                        default="#FF0000",
                        help_text="Hex color code for map display",
                        max_length=7,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "stations",
                    models.ManyToManyField(
                        blank=True, related_name="groups", to="stations.station"
                    ),
                ),
            ],
            options={
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="StationNote",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("note", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("created_by", models.CharField(blank=True, max_length=50)),
                (
                    "station",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notes",
                        to="stations.station",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="StationStats",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("total_packets", models.IntegerField(default=0)),
                ("position_packets", models.IntegerField(default=0)),
                ("weather_packets", models.IntegerField(default=0)),
                ("message_packets", models.IntegerField(default=0)),
                ("telemetry_packets", models.IntegerField(default=0)),
                ("first_packet", models.DateTimeField(blank=True, null=True)),
                ("last_packet", models.DateTimeField(blank=True, null=True)),
                ("active_days", models.IntegerField(default=0)),
                (
                    "max_distance_km",
                    models.FloatField(
                        default=0.0, help_text="Maximum distance traveled in km"
                    ),
                ),
                (
                    "total_distance_km",
                    models.FloatField(
                        default=0.0, help_text="Total distance traveled in km"
                    ),
                ),
                (
                    "avg_beacon_interval",
                    models.IntegerField(
                        default=0, help_text="Average beacon interval in seconds"
                    ),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "station",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="stats",
                        to="stations.station",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="StationAlias",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("alias", models.CharField(max_length=20, unique=True)),
                (
                    "alias_type",
                    models.CharField(
                        choices=[
                            ("tactical", "Tactical Call"),
                            ("object", "Object Name"),
                            ("item", "Item Name"),
                            ("alternate", "Alternate Call"),
                        ],
                        default="tactical",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "station",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="aliases",
                        to="stations.station",
                    ),
                ),
            ],
            options={
                "unique_together": {("station", "alias")},
            },
        ),
    ]
