// Google Maps API component helping users select and display locations
//Created by Dashnyam
import React, { useRef } from "react";
import { useLoadScript, Autocomplete } from "@react-google-maps/api";

const libraries = ["places"];

export default function MapEmbed({ location = "Adelphi University", onPlaceSelected }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const autocompleteRef = useRef(null);
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  });

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current.getPlace();
    if (onPlaceSelected) onPlaceSelected(place);
  };

  const safeLocation = location && location.trim() ? location : "Adelphi University";
  const src = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(safeLocation)}`;

  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <div className="flex flex-col w-full h-64 gap-2 md:h-full">
      <Autocomplete
        onLoad={ref => (autocompleteRef.current = ref)}
        onPlaceChanged={handlePlaceChanged}
      >
        <input
          type="text"
          defaultValue={location}
          placeholder="Enter a location"
          className="w-full px-2 py-1 mb-2 border rounded"
        />
      </Autocomplete>
      <iframe
        title="Meeting Location"
        width="100%"
        height="100%"
        style={{ border: 0, minHeight: 200 }}
        loading="lazy"
        allowFullScreen
        src={src}
      />
    </div>
  );
}