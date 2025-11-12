import { useState, useEffect } from "react";
import { api } from "../lib/api";

/**
 * Custom hook to fetch visit counts for doctors
 * @param {Object} user - Current user object
 * @param {Array} doctors - Array of doctor objects
 * @returns {Map} Map of doctorId to visitCount
 */
export function useDoctorVisitCounts(user, doctors) {
  const [doctorVisitCounts, setDoctorVisitCounts] = useState(new Map());

  useEffect(() => {
    if (!user || !doctors || doctors.length === 0) return;

    const fetchVisitCounts = async () => {
      try {
        const visitCountPromises = doctors.map(async (doctor) => {
          try {
            const response = await api.get(
              `/api/patients/me/doctors/${doctor._id}/visit-count`
            );
            if (response.success) {
              return { doctorId: doctor._id, count: response.data.visitCount };
            }
            return { doctorId: doctor._id, count: 0 };
          } catch (error) {
            console.error(
              `Error fetching visit count for doctor ${doctor._id}:`,
              error
            );
            return { doctorId: doctor._id, count: 0 };
          }
        });

        const results = await Promise.all(visitCountPromises);
        const countsMap = new Map();
        results.forEach(({ doctorId, count }) => {
          countsMap.set(doctorId, count);
        });
        setDoctorVisitCounts(countsMap);
      } catch (error) {
        console.error("Error fetching visit counts:", error);
      }
    };

    fetchVisitCounts();
  }, [user, doctors]);

  return doctorVisitCounts;
}
