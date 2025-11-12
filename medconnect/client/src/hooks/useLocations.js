import { useState, useEffect } from "react";
import { api } from "../lib/api";

/**
 * Custom hook to fetch available locations
 * @returns {Array} Array of location strings
 */
export function useLocations() {
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await api.get("/api/clinics/locations");
        if (response.success && response.data.locations) {
          setLocations(response.data.locations);
        } else {
          // Fallback to default locations
          setLocations([
            "Quận 1",
            "Quận 2",
            "Quận 3",
            "Quận 7",
            "Quận 10",
            "Hải Châu",
            "Thủ Đức",
            "Ninh Kiều",
          ]);
        }
      } catch (error) {
        console.error("Error fetching locations:", error);
        // Fallback to default locations if API fails
        setLocations([
          "Quận 1",
          "Quận 2",
          "Quận 3",
          "Quận 7",
          "Quận 10",
          "Hải Châu",
          "Thủ Đức",
          "Ninh Kiều",
        ]);
      }
    };

    fetchLocations();
  }, []);

  return locations;
}
