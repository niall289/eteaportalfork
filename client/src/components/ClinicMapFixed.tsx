import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface Clinic {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string | null;
  zipCode: string | null;
  latitude: string;
  longitude: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
}

interface ClinicWithCount extends Clinic {
  assessmentCount: number;
}

interface ClinicMapProps {
  className?: string;
}

export default function ClinicMap({ className }: ClinicMapProps) {
  const [timeRange, setTimeRange] = useState('30days');
  const [mapCenter, setMapCenter] = useState<[number, number]>([53.3498, -6.2603]); // Dublin, Ireland
  
  const { data: clinics, isLoading: isLoadingClinics } = useQuery({
    queryKey: ['/api/clinics'],
  });
  
  const { data: clinicStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/clinics/assessment-counts'],
  });

  // Debug: Log the data to see what we're getting
  useEffect(() => {
    console.log('Clinics data:', clinics);
    console.log('Clinic stats data:', clinicStats);
  }, [clinics, clinicStats]);

  // Combine clinic data with assessment counts
  const clinicsWithCounts = clinics?.map((clinic: Clinic) => {
    const stats = clinicStats?.find((stat: any) => stat.id === clinic.id);
    return {
      ...clinic,
      assessmentCount: stats?.assessmentCount || 0
    };
  }) || [];

  // Calculate max count for scaling circle sizes
  const maxCount = clinicsWithCounts.reduce((max: number, clinic: ClinicWithCount) => 
    clinic.assessmentCount > max ? clinic.assessmentCount : max, 1);

  // Scale circle radius based on assessment count
  const getCircleRadius = (count: number) => {
    const minRadius = 15;
    const maxRadius = 30;
    return count === 0 
      ? minRadius 
      : minRadius + ((count / maxCount) * (maxRadius - minRadius));
  };

  // Update map center if clinics data changes
  useEffect(() => {
    if (clinicsWithCounts && clinicsWithCounts.length > 0) {
      // Center the map on the average coordinates of all clinics
      const totalLat = clinicsWithCounts.reduce((sum: number, clinic: ClinicWithCount) => 
        sum + parseFloat(clinic.latitude), 0);
      const totalLng = clinicsWithCounts.reduce((sum: number, clinic: ClinicWithCount) => 
        sum + parseFloat(clinic.longitude), 0);
      
      setMapCenter([
        totalLat / clinicsWithCounts.length,
        totalLng / clinicsWithCounts.length
      ]);
    }
  }, [clinicsWithCounts]);

  if (isLoadingClinics || isLoadingStats) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Clinic Selection Map</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">
          Clinic Selection Map
        </CardTitle>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 days</SelectItem>
            <SelectItem value="30days">Last 30 days</SelectItem>
            <SelectItem value="90days">Last 3 months</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Geographic distribution of patient clinic selections
        </p>
        
        {/* Clinic Statistics Summary */}
        <div className="mb-4 grid grid-cols-3 gap-4">
          {clinicsWithCounts.map((clinic) => (
            <div key={clinic.id} className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <p className="text-sm font-medium">{clinic.name.replace('FootCare Clinic ', '')}</p>
              <p className="text-lg font-bold text-teal-600">{clinic.assessmentCount}</p>
              <p className="text-xs text-gray-500">patients</p>
            </div>
          ))}
        </div>

        <div className="h-96 w-full rounded-lg overflow-hidden border">
          <MapContainer 
            center={mapCenter} 
            zoom={11} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {clinicsWithCounts.map((clinic) => (
              <CircleMarker 
                key={clinic.id}
                center={[parseFloat(clinic.latitude), parseFloat(clinic.longitude)]}
                radius={getCircleRadius(clinic.assessmentCount)}
                pathOptions={{ 
                  fillColor: '#14B8A6', 
                  fillOpacity: 0.8,
                  color: '#0F766E',
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <h3 className="font-bold text-base mb-1">{clinic.name}</h3>
                    <p className="text-gray-600">{clinic.address}</p>
                    <p className="text-gray-600">{clinic.city} {clinic.zipCode}</p>
                    {clinic.phone && (
                      <p className="text-gray-600 mt-1">📞 {clinic.phone}</p>
                    )}
                    <div className="mt-2 p-2 bg-teal-50 rounded">
                      <p className="font-semibold text-teal-800">
                        {clinic.assessmentCount} patients selected this clinic
                      </p>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        {clinicsWithCounts.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No clinic data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}