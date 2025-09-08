import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';

// Fix for default marker icon issue in react-leaflet
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Marker setup for Leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

// Define clinic data type
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
  
  // Calculate max count for scaling circle sizes
  const maxCount = Array.isArray(clinicStats) ? clinicStats.reduce((max: number, clinic: ClinicWithCount) => 
    clinic.assessmentCount > max ? clinic.assessmentCount : max, 0) : 1;
  
  // Scale circle radius based on assessment count
  const getCircleRadius = (count: number) => {
    const minRadius = 10;
    const maxRadius = 40;
    return count === 0 
      ? minRadius 
      : minRadius + ((count / maxCount) * (maxRadius - minRadius));
  };
  
  // Update map center if clinics data changes
  useEffect(() => {
    if (Array.isArray(clinics) && clinics.length > 0) {
      // Center the map on the average coordinates of all clinics
      const totalLat = clinics.reduce((sum: number, clinic: Clinic) => 
        sum + parseFloat(clinic.latitude), 0);
      const totalLng = clinics.reduce((sum: number, clinic: Clinic) => 
        sum + parseFloat(clinic.longitude), 0);
      
      setMapCenter([
        totalLat / clinics.length,
        totalLng / clinics.length
      ]);
    }
  }, [clinics]);
  
  const isLoading = isLoadingClinics || isLoadingStats;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Clinic Selection Map</CardTitle>
            <CardDescription>
              Geographic distribution of patient clinic selections
            </CardDescription>
          </div>
          <Select 
            value={timeRange} 
            onValueChange={setTimeRange}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="alltime">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : (
          <div style={{ height: '400px', width: '100%' }}>
            <MapContainer 
              center={mapCenter} 
              zoom={10} 
              style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {Array.isArray(clinicStats) && clinicStats.map((clinic: ClinicWithCount) => (
                <CircleMarker 
                  key={clinic.id}
                  center={[parseFloat(clinic.latitude), parseFloat(clinic.longitude)]}
                  radius={getCircleRadius(clinic.assessmentCount)}
                  pathOptions={{ 
                    fillColor: '#34B197', 
                    fillOpacity: 0.7,
                    color: '#127C67',
                    weight: 1,
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <h3 className="font-bold">{clinic.name}</h3>
                      <p>{clinic.address}</p>
                      <p>{clinic.city}, {clinic.state} {clinic.zipCode}</p>
                      <p className="mt-1">
                        <span className="font-semibold">{clinic.assessmentCount}</span> patients selected this clinic
                      </p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}